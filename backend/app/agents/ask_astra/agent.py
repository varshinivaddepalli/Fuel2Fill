"""Ask Astra LangGraph agent for SQL analytics queries — Enterprise Architecture."""

import asyncio
import json
import re
import time
from typing import AsyncGenerator

import langsmith as ls
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from langgraph.graph import StateGraph, END

from app.config import get_settings
from app.agents.ask_astra.state import AgentState, StreamEvent
from app.agents.ask_astra.prompts import (
    SYSTEM_PROMPT,
    SQL_GENERATION_PROMPT,
    RESPONSE_GENERATION_PROMPT,
    QUERY_CLASSIFICATION_PROMPT,
    GREETING_RESPONSE_PROMPT,
    REWRITE_PROMPT,
    META_RESPONSE_PROMPT,
    CONFIDENCE_PROMPT,
    RETRY_SQL_PROMPT,
)
from app.utils.sql_validator import sanitize_and_validate
from app.utils.response_formatter import determine_visualization
from app.utils.navigation_mapper import get_navigation_from_keywords
from app.utils.analytics_logger import analytics_logger

settings = get_settings()


LANGSMITH_PROJECT = "ask astra production"


class AskAstraAgent:
    """LangGraph-based agent for natural language to SQL queries — enterprise architecture."""

    def __init__(self):
        self.llm = ChatGroq(
            api_key=settings.groq_api_key,
            model=settings.groq_model,
            temperature=0,
        )
        self.graph = self._build_graph()
        # In-memory rate limiting: {client_id: [timestamp, ...]}
        self._rate_limits: dict[str, list[float]] = {}
        self._rate_limit_lock = asyncio.Lock()

    def _build_graph(self) -> StateGraph:
        """Build the LangGraph workflow with enterprise architecture."""
        workflow = StateGraph(AgentState)

        # Add nodes
        workflow.add_node("input_guardrails", self._input_guardrails)
        workflow.add_node("classify_query", self._classify_query)
        workflow.add_node("rewrite_with_context", self._rewrite_with_context)
        workflow.add_node("answer_about_schema", self._answer_about_schema)
        workflow.add_node("respond_directly", self._respond_directly)
        workflow.add_node("generate_sql", self._generate_sql)
        workflow.add_node("validate_sql", self._validate_sql)
        workflow.add_node("execute_query", self._execute_query)
        workflow.add_node("retry_sql", self._retry_sql)
        workflow.add_node("format_response", self._format_response)
        workflow.add_node("output_guardrails", self._output_guardrails)
        workflow.add_node("log_analytics", self._log_analytics)
        workflow.add_node("handle_error", self._handle_error)

        # Entry point
        workflow.set_entry_point("input_guardrails")

        # Layer 0: Input guardrails → classify or block
        workflow.add_conditional_edges(
            "input_guardrails",
            lambda state: "blocked" if state.get("rate_limited") else "classify",
            {
                "blocked": "handle_error",
                "classify": "classify_query",
            },
        )

        # Layer 1: Classification → 4-way routing
        workflow.add_conditional_edges(
            "classify_query",
            self._route_after_classification,
            {
                "data": "generate_sql",
                "greeting": "respond_directly",
                "follow_up": "rewrite_with_context",
                "meta": "answer_about_schema",
            },
        )

        # Follow-up rewrite → generate SQL (treated as data query after rewriting)
        workflow.add_edge("rewrite_with_context", "generate_sql")

        # SQL generation → validation
        workflow.add_edge("generate_sql", "validate_sql")

        # Validation → execute or retry or error
        workflow.add_conditional_edges(
            "validate_sql",
            lambda state: (
                "execute" if state["sql_valid"]
                else "retry" if state.get("retry_count", 0) < 2
                else "error"
            ),
            {"execute": "execute_query", "retry": "retry_sql", "error": "handle_error"},
        )

        # Execute → format or retry or error
        workflow.add_conditional_edges(
            "execute_query",
            lambda state: (
                "format" if not state.get("error")
                else "retry" if state.get("retry_count", 0) < 2
                else "error"
            ),
            {"format": "format_response", "retry": "retry_sql", "error": "handle_error"},
        )

        # Retry loops back to validate
        workflow.add_edge("retry_sql", "validate_sql")

        # Format → output guardrails
        workflow.add_edge("format_response", "output_guardrails")

        # Output guardrails → log analytics
        workflow.add_edge("output_guardrails", "log_analytics")

        # Terminal edges
        workflow.add_edge("log_analytics", END)
        workflow.add_edge("handle_error", "log_analytics")
        workflow.add_edge("respond_directly", "log_analytics")
        workflow.add_edge("answer_about_schema", "log_analytics")

        return workflow.compile()

    def _route_after_classification(self, state: AgentState) -> str:
        """Route based on 4-way classification."""
        classification = state.get("query_classification", "data_query")
        if classification == "greeting":
            return "greeting"
        elif classification == "follow_up":
            return "follow_up"
        elif classification == "meta":
            return "meta"
        return "data"

    # ── Layer 0: Input Guardrails ──

    async def _input_guardrails(self, state: AgentState) -> AgentState:
        """Validate input before any LLM call."""
        query = state["user_query"].strip()

        # 1. Empty/whitespace check
        if not query:
            return {**state, "error": "Empty query", "rate_limited": True}

        # 2. Length check
        if len(query) > 500:
            return {**state, "error": "Query too long (max 500 characters)", "rate_limited": True}

        # 3. Rate limiting — sliding window per client_id (with lock for async safety)
        client_id = state["client_id"]
        async with self._rate_limit_lock:
            now = time.time()
            window = 600  # 10 minutes
            max_queries = 30

            self._rate_limits.setdefault(client_id, [])
            self._rate_limits[client_id] = [
                t for t in self._rate_limits[client_id] if now - t < window
            ]

            if len(self._rate_limits[client_id]) >= max_queries:
                return {**state, "error": "Rate limit exceeded. Please wait a few minutes.", "rate_limited": True}

            self._rate_limits[client_id].append(now)

        # 4. Prompt injection patterns
        injection_patterns = [
            r"ignore\s+(all\s+)?previous\s+instructions",
            r"you\s+are\s+now",
            r"system\s*:\s*",
            r"<\s*system\s*>",
            r"forget\s+(everything|all|your\s+instructions)",
        ]
        query_lower = query.lower()
        for pattern in injection_patterns:
            if re.search(pattern, query_lower):
                return {**state, "error": "Invalid query format.", "rate_limited": True}

        # 5. Normalize whitespace
        normalized_query = " ".join(query.split())

        return {**state, "user_query": normalized_query, "rate_limited": False}

    # ── Layer 1: Intent & Planning ──

    def _format_history_section(self, history: list[dict]) -> str:
        """Format conversation history for classification prompt."""
        if not history:
            return "Conversation History: (none — this is the first message)"

        lines = []
        for msg in history[-4:]:  # last 4 messages (2 turns)
            role = "User" if msg.get("role") == "user" else "Assistant"
            content = str(msg.get("content", ""))[:200]
            lines.append(f"{role}: {content}")

        return "Conversation History:\n" + "\n".join(lines)

    def _format_history_for_rewrite(self, history: list[dict]) -> str:
        """Format conversation history for the rewrite prompt."""
        if not history:
            return "(no history)"

        lines = []
        for msg in history[-4:]:
            role = "User" if msg.get("role") == "user" else "Assistant"
            content = str(msg.get("content", ""))[:300]
            lines.append(f"{role}: {content}")

        return "\n".join(lines)

    async def _classify_query(self, state: AgentState) -> AgentState:
        """Classify query into 4 categories with conversation history."""
        history = state.get("conversation_history", [])
        history_section = self._format_history_section(history)

        prompt = QUERY_CLASSIFICATION_PROMPT.format(
            query=state["user_query"],
            history_section=history_section,
        )

        messages = [HumanMessage(content=prompt)]
        response = await self.llm.ainvoke(messages)
        classification = response.content.strip().lower().strip('"').strip("'")

        # Parse classification
        if "follow_up" in classification:
            query_classification = "follow_up"
        elif "meta" in classification:
            query_classification = "meta"
        elif "greeting" in classification:
            query_classification = "greeting"
        else:
            query_classification = "data_query"

        # Can't be follow_up without history
        if query_classification == "follow_up" and not history:
            query_classification = "data_query"

        is_data_query = query_classification in ("data_query", "follow_up")

        return {
            **state,
            "is_data_query": is_data_query,
            "query_classification": query_classification,
        }

    async def _rewrite_with_context(self, state: AgentState) -> AgentState:
        """Rewrite follow-up query into a standalone question."""
        history = state.get("conversation_history", [])
        history_text = self._format_history_for_rewrite(history)

        prompt = REWRITE_PROMPT.format(
            history=history_text,
            query=state["user_query"],
        )

        messages = [HumanMessage(content=prompt)]
        response = await self.llm.ainvoke(messages)
        rewritten = response.content.strip()

        return {
            **state,
            "rewritten_query": rewritten,
            "user_query": rewritten,  # Replace query for downstream nodes
        }

    async def _answer_about_schema(self, state: AgentState) -> AgentState:
        """Answer meta questions about capabilities and how-to questions."""
        prompt = META_RESPONSE_PROMPT.format(query=state["user_query"])

        messages = [HumanMessage(content=prompt)]
        response = await self.llm.ainvoke(messages)
        response_text = response.content.strip()

        # Get navigation actions for how-to questions (e.g., "how to add employee?" → Add Employee page)
        navigation_actions = await self._get_navigation_actions(state["user_query"])

        return {
            **state,
            "response_text": response_text,
            "visualization_hint": "text",
            "query_results": None,
            "generated_sql": None,
            "navigation_actions": navigation_actions,
        }

    async def _respond_directly(self, state: AgentState) -> AgentState:
        """Respond conversationally without SQL for greetings/non-data queries."""
        prompt = GREETING_RESPONSE_PROMPT.format(query=state["user_query"])

        messages = [HumanMessage(content=prompt)]
        response = await self.llm.ainvoke(messages)
        response_text = response.content.strip()

        return {
            **state,
            "response_text": response_text,
            "visualization_hint": "text",
            "query_results": None,
            "generated_sql": None,
            "navigation_actions": None,
        }

    # ── Layer 2: Execution with Self-Correction ──

    async def _generate_sql(self, state: AgentState) -> AgentState:
        """Generate SQL from natural language query."""
        # Build history context for SQL generation
        history = state.get("conversation_history", [])
        history_context = ""
        if history:
            lines = []
            for msg in history[-4:]:
                role = "User" if msg.get("role") == "user" else "Assistant"
                content = str(msg.get("content", ""))[:200]
                lines.append(f"{role}: {content}")
            history_context = "Conversation Context:\n" + "\n".join(lines)

        prompt = SQL_GENERATION_PROMPT.format(
            query=state["user_query"],
            history_context=history_context,
            error_context="",
        )

        messages = [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=prompt),
        ]

        response = await self.llm.ainvoke(messages)
        sql = self._clean_sql(response.content)

        return {**state, "generated_sql": sql, "error": None}

    def _clean_sql(self, raw: str) -> str:
        """Remove markdown code blocks from LLM SQL output."""
        sql = raw.strip()
        if sql.startswith("```sql"):
            sql = sql[6:]
        if sql.startswith("```"):
            sql = sql[3:]
        if sql.endswith("```"):
            sql = sql[:-3]
        return sql.strip()

    async def _validate_sql(self, state: AgentState) -> AgentState:
        """Validate the generated SQL."""
        sql = state.get("generated_sql")

        if not sql:
            return {**state, "sql_valid": False, "error": "No SQL generated"}

        sanitized_sql, error = sanitize_and_validate(sql, settings.max_result_rows)

        if error:
            return {**state, "sql_valid": False, "error": f"SQL validation failed: {error}"}

        return {**state, "generated_sql": sanitized_sql, "sql_valid": True}

    async def _execute_query(self, state: AgentState) -> AgentState:
        """Execute the SQL query against the database."""
        from app.core.supabase import execute_read_query

        try:
            results = await execute_read_query(
                state["generated_sql"],
                {"client_id": state["client_id"]},
            )
            return {**state, "query_results": results, "error": None}
        except Exception as e:
            return {**state, "query_results": None, "error": f"Query execution failed: {str(e)}"}

    async def _retry_sql(self, state: AgentState) -> AgentState:
        """Retry SQL generation with error feedback."""
        retry_count = state.get("retry_count", 0)

        if retry_count >= 2:
            return {**state, "sql_valid": False}

        error = state.get("error", "Unknown error")
        previous_sql = state.get("generated_sql", "")

        prompt = RETRY_SQL_PROMPT.format(
            previous_sql=previous_sql,
            error=error,
            query=state["user_query"],
        )

        messages = [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=prompt),
        ]
        response = await self.llm.ainvoke(messages)
        new_sql = self._clean_sql(response.content)

        return {
            **state,
            "generated_sql": new_sql,
            "error": None,
            "sql_valid": False,
            "retry_count": retry_count + 1,
        }

    # ── Layer 3: Response & Observability ──

    async def _format_response(self, state: AgentState) -> AgentState:
        """Generate natural language response, determine visualization, score confidence."""
        results = state.get("query_results", [])
        error = state.get("error")

        if error:
            return {
                **state,
                "response_text": f"I encountered an error: {error}",
                "visualization_hint": "text",
                "navigation_actions": None,
            }

        # Generate response using LLM
        prompt = RESPONSE_GENERATION_PROMPT.format(
            query=state["user_query"],
            results=json.dumps(results[:10], default=str) if results else "No results",
            count=len(results) if results else 0,
        )

        messages = [
            SystemMessage(content="You are a helpful data analyst. Provide clear, concise insights."),
            HumanMessage(content=prompt),
        ]

        response = await self.llm.ainvoke(messages)
        response_text = response.content.strip()

        # Determine visualization
        viz_type, chart_config = determine_visualization(
            state["user_query"],
            results,
            response_text,
        )

        # Get navigation actions
        navigation_actions = await self._get_navigation_actions(state["user_query"])

        # Confidence scoring
        confidence_score = await self._score_confidence(state, results)

        return {
            **state,
            "response_text": response_text,
            "visualization_hint": viz_type,
            "chart_config": chart_config,
            "navigation_actions": navigation_actions,
            "confidence_score": confidence_score,
        }

    async def _score_confidence(self, state: AgentState, results: list) -> float | None:
        """Score confidence that SQL correctly answers the question."""
        if not state.get("generated_sql"):
            return None

        try:
            prompt = CONFIDENCE_PROMPT.format(
                query=state["user_query"],
                sql=state["generated_sql"],
                results_preview=json.dumps(results[:5], default=str) if results else "[]",
                total_rows=len(results) if results else 0,
                retry_count=state.get("retry_count", 0),
            )

            messages = [HumanMessage(content=prompt)]
            response = await self.llm.ainvoke(messages)
            score_text = response.content.strip()

            # Parse the score
            score = float(re.search(r"(\d+\.?\d*)", score_text).group(1))
            return max(0.0, min(1.0, score))
        except Exception:
            return None

    async def _get_navigation_actions(self, query: str) -> list[dict[str, str]] | None:
        """Get navigation actions using keyword-based matching."""
        actions = get_navigation_from_keywords(query)
        return actions if actions else None

    async def _output_guardrails(self, state: AgentState) -> AgentState:
        """Validate response quality before returning."""
        response = state.get("response_text", "")
        results = state.get("query_results", [])

        # 1. Hallucination check — if response mentions a count, it must match data
        if results and len(results) == 1 and len(results[0]) == 1:
            actual_value = list(results[0].values())[0]
            numbers_in_response = re.findall(r'\b\d+\b', response)
            actual_str = str(int(actual_value)) if isinstance(actual_value, (int, float)) else str(actual_value)

            has_wrong_number = any(
                n != actual_str and len(n) > 1 and n not in actual_str
                for n in numbers_in_response
            )
            if has_wrong_number:
                label = list(results[0].keys())[0].replace("_", " ")
                response = f"You have {actual_str} {label}."

        # 2. PII redaction — never expose Aadhaar or PAN in response text
        response = re.sub(r'\b\d{4}\s?\d{4}\s?\d{4}\b', '[AADHAAR REDACTED]', response)
        response = re.sub(r'\b[A-Z]{5}\d{4}[A-Z]\b', '[PAN REDACTED]', response)

        # 3. Length check — truncate overly verbose responses
        sentences = response.split('. ')
        if len(sentences) > 4:
            response = '. '.join(sentences[:3]) + '.'

        return {**state, "response_text": response}

    async def _log_analytics(self, state: AgentState) -> AgentState:
        """Fire-and-forget analytics logging."""
        try:
            end_time = time.time()
            start_time = state.get("execution_metadata", {}).get("start_time", end_time)
            total_latency_ms = int((end_time - start_time) * 1000)

            log_id = await analytics_logger.log_query({
                "client_id": state["client_id"],
                "user_query": state["user_query"],
                "query_classification": state.get("query_classification"),
                "generated_sql": state.get("generated_sql"),
                "sql_valid": state.get("sql_valid"),
                "retry_count": state.get("retry_count", 0),
                "query_results_count": len(state.get("query_results") or []),
                "confidence_score": state.get("confidence_score"),
                "visualization_hint": state.get("visualization_hint"),
                "error": state.get("error"),
                "total_latency_ms": total_latency_ms,
                "llm_calls_count": None,
                "was_follow_up": state.get("query_classification") == "follow_up",
            })
            return {**state, "analytics_id": str(log_id)}
        except Exception:
            # Never let logging break the response
            return state

    async def _handle_error(self, state: AgentState) -> AgentState:
        """Handle errors gracefully."""
        error = state.get("error", "An unknown error occurred")
        return {
            **state,
            "response_text": f"I'm sorry, I couldn't process your request. {error}",
            "visualization_hint": "text",
            "query_results": None,
            "navigation_actions": None,
        }

    @staticmethod
    def _tracing_metadata(client_id: str, query: str, conversation_history: list[dict] | None, **extra: object) -> dict:
        """Build common LangSmith tracing metadata."""
        meta = {
            "client_id": client_id,
            "query_length": len(query),
            "has_history": bool(conversation_history),
        }
        meta.update(extra)
        return meta

    def _create_initial_state(self, query: str, client_id: str, conversation_history: list[dict] | None = None) -> AgentState:
        """Create the initial state for agent execution."""
        return {
            "user_query": query,
            "client_id": client_id,
            "conversation_history": conversation_history or [],
            "rate_limited": False,
            "is_data_query": None,
            "query_classification": None,
            "rewritten_query": None,
            "generated_sql": None,
            "sql_valid": False,
            "query_results": None,
            "error": None,
            "retry_count": 0,
            "response_text": "",
            "visualization_hint": "text",
            "chart_config": None,
            "navigation_actions": None,
            "confidence_score": None,
            "analytics_id": None,
            "execution_metadata": {"start_time": time.time()},
        }

    async def run(self, query: str, client_id: str, conversation_history: list[dict] | None = None) -> AgentState:
        """Run the agent and return final state."""
        initial_state = self._create_initial_state(query, client_id, conversation_history)
        metadata = self._tracing_metadata(client_id, query, conversation_history)
        with ls.tracing_context(project_name=LANGSMITH_PROJECT):
            result = await self.graph.ainvoke(
                initial_state,
                config={
                    "run_name": "Ask Astra Query",
                    "tags": ["ask_astra", "production"],
                    "metadata": metadata,
                },
            )
        return result

    async def stream(self, query: str, client_id: str, conversation_history: list[dict] | None = None) -> AsyncGenerator[StreamEvent, None]:
        """Stream agent execution with events."""
        initial_state = self._create_initial_state(query, client_id, conversation_history)
        current_state = initial_state

        # Set LangSmith tracing context for all LLM calls within this stream
        metadata = self._tracing_metadata(client_id, query, conversation_history, mode="stream")
        with ls.tracing_context(
            project_name=LANGSMITH_PROJECT,
            metadata=metadata,
            tags=["ask_astra", "production", "streaming"],
        ):
            yield {"event_type": "token", "data": "Validating input..."}

            # Input guardrails
            current_state = await self._input_guardrails(current_state)
            if current_state.get("rate_limited"):
                current_state = await self._handle_error(current_state)
                current_state = await self._log_analytics(current_state)
                yield {"event_type": "error", "data": current_state.get("error")}
                yield {"event_type": "done", "data": current_state}
                return

            yield {"event_type": "token", "data": "Analyzing your question..."}

            # Classify query
            current_state = await self._classify_query(current_state)
            classification = current_state.get("query_classification", "data_query")

            # Handle greeting
            if classification == "greeting":
                current_state = await self._respond_directly(current_state)
                current_state = await self._log_analytics(current_state)
                yield {"event_type": "done", "data": current_state}
                return

            # Handle meta
            if classification == "meta":
                current_state = await self._answer_about_schema(current_state)
                current_state = await self._log_analytics(current_state)
                yield {"event_type": "done", "data": current_state}
                return

            # Handle follow-up
            if classification == "follow_up":
                yield {"event_type": "token", "data": "Understanding follow-up context..."}
                current_state = await self._rewrite_with_context(current_state)

            # Generate SQL
            yield {"event_type": "token", "data": "Generating SQL query..."}
            current_state = await self._generate_sql(current_state)

            if current_state.get("generated_sql"):
                yield {"event_type": "sql", "data": current_state["generated_sql"]}

            # Validate + Execute with retry loop
            for attempt in range(3):  # max 3 attempts (initial + 2 retries)
                yield {"event_type": "token", "data": "Validating query..."}
                current_state = await self._validate_sql(current_state)

                if not current_state.get("sql_valid"):
                    if current_state.get("retry_count", 0) < 2:
                        yield {"event_type": "token", "data": f"Retrying (attempt {attempt + 2})..."}
                        current_state = await self._retry_sql(current_state)
                        continue
                    else:
                        current_state = await self._handle_error(current_state)
                        yield {"event_type": "error", "data": current_state.get("error")}
                        yield {"event_type": "done", "data": current_state}
                        return

                yield {"event_type": "token", "data": "Fetching data..."}
                current_state = await self._execute_query(current_state)

                if current_state.get("error"):
                    if current_state.get("retry_count", 0) < 2:
                        yield {"event_type": "token", "data": f"Retrying (attempt {attempt + 2})..."}
                        current_state = await self._retry_sql(current_state)
                        continue
                    else:
                        current_state = await self._handle_error(current_state)
                        yield {"event_type": "error", "data": current_state.get("error")}
                        yield {"event_type": "done", "data": current_state}
                        return

                break  # Success

            # Format results
            results = current_state.get("query_results", [])
            yield {"event_type": "result", "data": {"count": len(results), "preview": results[:5]}}

            yield {"event_type": "token", "data": "Generating insights..."}
            current_state = await self._format_response(current_state)

            # Output guardrails
            current_state = await self._output_guardrails(current_state)

            # Log analytics
            current_state = await self._log_analytics(current_state)

            yield {
                "event_type": "metadata",
                "data": {
                    "visualization": current_state.get("visualization_hint"),
                    "chart_config": current_state.get("chart_config"),
                    "total_results": len(results),
                    "confidence_score": current_state.get("confidence_score"),
                },
            }

            yield {"event_type": "done", "data": current_state}
