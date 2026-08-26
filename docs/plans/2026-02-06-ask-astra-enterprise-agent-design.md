# Ask Astra: Enterprise-Level Agent Architecture

## Overview

Upgrade the Ask Astra LangGraph agent from a linear 3-LLM-call flow to a layered enterprise architecture with self-correction, multi-turn context, query planning, guardrails, confidence scoring, observability, and user feedback.

**Constraints:**
- No server-side conversation storage (frontend localStorage stays as-is)
- No semantic query caching layer
- No new Supabase tables — all new persistence uses SQLite on the backend
- Conversation history passed from frontend in the request body

---

## Current Flow (As-Built)

```
classify_query (LLM #1)
  ├── greeting → respond_directly (LLM #2) → END
  └── data → generate_sql (LLM #2) → validate_sql
                                        ├── invalid → handle_error → END
                                        └── valid → execute_query → format_response (LLM #3) → END
```

**Problems:**
1. No conversation context — follow-up queries fail completely
2. No self-correction — if SQL has a minor error, the agent just errors out
3. Binary classification only — "what can you query?" gets misclassified as data_query
4. No retry on DB execution errors
5. No confidence signal — user can't tell if results are reliable
6. No observability — no audit trail, no usage metrics, no feedback mechanism
7. Keyword-only visualization — misses many chart opportunities
8. No input/output validation beyond SQL sanitization

---

## Enterprise Flow (Target Architecture)

```
USER QUERY + conversation_history (from frontend)
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 0: INPUT GUARDRAILS                              │
│                                                         │
│  input_guardrails                                       │
│    ├── rate limiting (in-memory counter per client_id)  │
│    ├── input length check (max 500 chars)               │
│    ├── abuse/injection keyword filter                   │
│    └── query normalization (whitespace, unicode)        │
│                                                         │
│  (conversation_history already in state from request)   │
└───────┼─────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 1: INTENT & PLANNING                             │
│                                                         │
│  classify_query (4-way)                                 │
│    ├── greeting → respond_directly → END                │
│    ├── meta → answer_about_schema → END                 │
│    ├── follow_up → rewrite_with_context ──┐             │
│    └── data_query ◄───────────────────────┘             │
│              │                                          │
│              ▼                                          │
│       query_planner                                     │
│         ├── simple → generate_sql                       │
│         └── complex → decompose_query → [sub-queries]   │
└──────────────┼──────────────────────────────────────────┘
               ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 2: EXECUTION WITH SELF-CORRECTION                │
│                                                         │
│  generate_sql → validate_sql                            │
│                    ├── valid → execute_query             │
│                    │             ├── success → ─┐       │
│                    │             └── db_error ──┤       │
│                    └── invalid ─────────────────┤       │
│                                                 │       │
│                                          retry_sql      │
│                                     (max 2 retries,     │
│                                      error fed back     │
│                                      to LLM)            │
│                                          │              │
│                                     still failing?      │
│                                          │              │
│                                     handle_error → END  │
└──────────────────────────┼──────────────────────────────┘
                           │ success
                           ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 3: RESPONSE & OBSERVABILITY                      │
│                                                         │
│  format_response (+ confidence scoring)                 │
│       │                                                 │
│  output_guardrails                                      │
│    ├── hallucination check (numbers match results?)     │
│    └── PII redaction (Aadhaar, PAN in response text)    │
│       │                                                 │
│  log_analytics (fire-and-forget to SQLite)              │
│       │                                                 │
│       ▼                                                 │
│      END                                                │
└─────────────────────────────────────────────────────────┘
```

---

## Layer 0: Input Guardrails

### Node: `input_guardrails`

No LLM call. Pure Python validation. Runs before any AI processing.

```python
async def _input_guardrails(self, state: AgentState) -> AgentState:
    """Validate input before any LLM call."""
    query = state["user_query"].strip()

    # 1. Empty/whitespace check
    if not query:
        return {**state, "error": "Empty query", "rate_limited": True}

    # 2. Length check — reject extremely long inputs
    if len(query) > 500:
        return {**state, "error": "Query too long (max 500 characters)", "rate_limited": True}

    # 3. Rate limiting — in-memory sliding window per client_id
    #    Uses a class-level dict: {client_id: [timestamp, timestamp, ...]}
    #    Allow 30 queries per 10-minute window
    client_id = state["client_id"]
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

    # 5. Normalize
    normalized_query = " ".join(query.split())

    return {**state, "user_query": normalized_query, "rate_limited": False}
```

### Graph Edge After Guardrails

```python
workflow.add_conditional_edges(
    "input_guardrails",
    lambda state: "blocked" if state.get("rate_limited") else "classify",
    {
        "blocked": "handle_error",
        "classify": "classify_query",
    },
)
```

---

## Layer 1: Intent & Planning

### Node: `classify_query` (Upgraded — 4-Way)

**Current:** 2 categories (`data_query` | `greeting`)
**New:** 4 categories (`data_query` | `greeting` | `follow_up` | `meta`)

```python
QUERY_CLASSIFICATION_PROMPT = """Classify this user input into exactly one category.

{history_section}

Current Input: {query}

Categories:
- "data_query": A new standalone question about data — employees, stations, sales, prices,
  attendance, shifts, credit customers, tanks, pumps, nozzles, or any analytics question.
- "greeting": Greetings, casual chat, introductions ("hi", "hello", "who are you", "I am X").
- "follow_up": References the previous conversation. Indicators: pronouns ("those", "them",
  "it", "they"), relative phrases ("what about", "and for", "filter that", "show me more",
  "how about", "instead", "last month instead"), or incomplete questions that only make sense
  with prior context.
- "meta": Questions about the system's capabilities or available data ("what tables do you
  have?", "what data can you access?", "can you query attendance?", "what can you help with?",
  "explain the schema").

IMPORTANT: If there is no conversation history, a query cannot be "follow_up" — classify it
as "data_query" or "greeting" instead.

Respond with ONLY one word: "data_query", "greeting", "follow_up", or "meta"

Classification:"""
```

**History section formatting** (from frontend-provided conversation_history):

```python
def _format_history_section(self, history: list[dict]) -> str:
    """Format conversation history for classification prompt."""
    if not history:
        return "Conversation History: (none — this is the first message)"

    lines = []
    for msg in history[-4:]:  # last 4 messages (2 turns)
        role = "User" if msg["role"] == "user" else "Assistant"
        content = msg["content"][:200]  # truncate long responses
        lines.append(f"{role}: {content}")

    return "Conversation History:\n" + "\n".join(lines)
```

### Node: `rewrite_with_context` (NEW)

Only runs for `follow_up` classification. Resolves ambiguous follow-ups into standalone questions.

```python
REWRITE_PROMPT = """Rewrite this follow-up question into a complete standalone question.

Conversation History:
{history}

Follow-up Question: {query}

Rules:
1. The rewritten question must make complete sense WITHOUT any prior context.
2. Include all specific details from the conversation (station names, employee names,
   fuel types, date ranges, etc.)
3. Preserve the user's intent exactly — don't add assumptions.
4. Keep it as a natural language question (not SQL).

Rewritten Question:"""
```

**Example flow:**
- History: User asked "Show me employees at Mumbai station" → got 15 results
- Follow-up: "How many are managers?"
- Rewritten: "How many employees at Mumbai station have the role manager?"
- This rewritten query then enters `generate_sql` as a normal data query.

### Node: `answer_about_schema` (NEW)

For `meta` queries — questions about what the system can do. No SQL execution needed.

```python
META_RESPONSE_PROMPT = """You are Ask Astra, an AI analytics assistant for fuel station management.
The user is asking about your capabilities or available data.

Available Data:
- Stations: name, location (city, state, pincode), SAP code, GST number, GPS coordinates
- Employees: name, phone, role (manager/pump_boy), employment type, salary, joining date
- Fuel Types: petrol, diesel, CNG — with current prices and HSN codes
- Tanks: capacity, linked to fuel type and station
- Pumps & Nozzles: pump type (submersible/suction), nozzle-to-tank mapping
- Station Products: non-fuel items (lubricants, accessories) with stock levels
- Employee Shifts: start/end times, assigned pump/nozzle, assigned by (manager)
- Employee Attendance: daily records — present, absent, half_day, leave
- Daily Fuel Prices: current price per fuel type per station, plus full price history
- Daily Sale Records: per-nozzle — meter readings, liters sold, amounts by payment type
  (cash, UPI, card, credit)
- Credit Customers: outstanding balances, transactions, payments

User Question: {query}

Respond helpfully about what data you can access and what kinds of questions you can answer.
Be specific. Keep it under 4 sentences.

Response:"""
```

### Node: `query_planner` (NEW)

Decides whether a question needs a single SQL query or multiple sub-queries.

```python
QUERY_PLANNER_PROMPT = """Analyze this question and decide the execution strategy.

Question: {query}

Can this be answered with a single SQL query? Consider:
- Does it compare separate time periods? ("this month vs last month")
- Does it need multiple unrelated aggregations? ("total sales AND employee count AND...")
- Does it combine metrics from unrelated tables that can't be naturally JOINed?

Respond with ONLY valid JSON (no markdown, no explanation):
{{
  "strategy": "single" or "multi_step",
  "sub_queries": ["list of standalone sub-questions if multi_step, empty array if single"]
}}"""
```

**For `multi_step`:** The agent generates and executes SQL for each sub-query independently, then passes all results to a `merge_results` node.

**For `single`:** Proceeds directly to `generate_sql` (identical to current behavior).

### Node: `merge_results` (NEW)

Combines results from multiple sub-queries into a single coherent response.

```python
MERGE_RESULTS_PROMPT = """The user asked a complex question that required multiple queries.

Original Question: {original_query}

Sub-query Results:
{sub_results}

Synthesize a single coherent response that answers the original question using ALL the
sub-query results. Maximum 3-4 sentences. Reference specific numbers from the data.

Combined Response:"""
```

---

## Layer 2: Execution with Self-Correction

### Updated `generate_sql` (Context-Aware)

The SQL generation prompt now includes conversation context and any prior error for retry:

```python
SQL_GENERATION_PROMPT_V2 = """Based on the user's question, generate a PostgreSQL SELECT query.

{history_context}

User Question: {query}
Client ID Parameter: $1
{error_context}

Generate ONLY the SQL query, nothing else. The query must:
1. Filter by client_id using $1 parameter (JOIN through stations table)
2. Be a SELECT statement only
3. Include appropriate LIMIT
4. Use proper JOINs
5. Use fueltype_id (NOT fuel_type_id) when referencing fuel_types table

SQL Query:"""
```

Where `error_context` is empty on first attempt, but on retry:
```
Previous attempt failed.
Previous SQL: {previous_sql}
Error: {error_message}
Fix the issue and generate a corrected query.
```

### Node: `retry_sql` (NEW)

The critical self-correction node. Feeds the error message back to the LLM so it can fix its own mistake.

```python
async def _retry_sql(self, state: AgentState) -> AgentState:
    """Retry SQL generation with error feedback."""
    retry_count = state.get("retry_count", 0)

    if retry_count >= 2:
        # Give up after 2 retries
        return {**state, "sql_valid": False}

    error = state.get("error", "Unknown error")
    previous_sql = state.get("generated_sql", "")

    prompt = f"""Your previous SQL query failed. Generate a corrected version.

Previous SQL:
{previous_sql}

Error:
{error}

User's original question: {state["user_query"]}

Common fixes to consider:
- Wrong column name: check schema (fueltype_id NOT fuel_type_id)
- Missing JOIN: all tables must be reachable through stations for client_id filtering
- Ambiguous column reference: use table aliases (e.g., s.station_id, e.employee_id)
- Type mismatch: cast if needed (e.g., ::TEXT, ::DATE)
- Missing GROUP BY: if using aggregates, all non-aggregate columns must be in GROUP BY
- Syntax error near quotes: use single quotes for string literals

Generate ONLY the corrected SQL query:"""

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
        "retry_count": retry_count + 1,
    }
```

### Self-Correction Graph Edges

```python
# After validate_sql — retry if invalid, up to 2 times
workflow.add_conditional_edges(
    "validate_sql",
    lambda state: (
        "execute" if state["sql_valid"]
        else "retry" if state.get("retry_count", 0) < 2
        else "error"
    ),
    {"execute": "execute_query", "retry": "retry_sql", "error": "handle_error"},
)

# After execute_query — retry on DB errors too
workflow.add_conditional_edges(
    "execute_query",
    lambda state: (
        "format" if not state.get("error")
        else "retry" if state.get("retry_count", 0) < 2
        else "error"
    ),
    {"format": "format_response", "retry": "retry_sql", "error": "handle_error"},
)

# retry_sql loops back to validate_sql
workflow.add_edge("retry_sql", "validate_sql")
```

**The loop:**
```
generate_sql → validate_sql ─✗─► retry_sql → validate_sql ─✗─► retry_sql → validate_sql ─✗─► handle_error
                             ─✓─► execute_query ─error─► retry_sql (same loop)
                                               ─success─► format_response
```

---

## Layer 3: Response & Observability

### Confidence Scoring (in `format_response`)

Added to the existing format_response node. A second LLM call rates confidence:

```python
CONFIDENCE_PROMPT = """Rate confidence that this SQL correctly answers the question.

Question: {query}
Generated SQL: {sql}
Results Preview (first 5 rows): {results_preview}
Total Rows: {total_rows}
Retries Needed: {retry_count}

Scoring guide:
- 0.9-1.0: Simple, unambiguous query. Results clearly match the question.
- 0.7-0.8: Good match but some interpretation was needed.
- 0.5-0.6: Ambiguous question or complex query. Results might not fully match intent.
- 0.1-0.4: Very uncertain. Multiple valid interpretations exist.

Respond with ONLY a decimal number between 0.0 and 1.0:"""
```

**Frontend indicator:**
- >= 0.8: Green checkmark — high confidence
- 0.5 to 0.79: Yellow indicator — moderate confidence
- < 0.5: Orange warning — "Results may not fully match your question"

### Node: `output_guardrails` (NEW)

Post-processing validation before returning the response to the user.

```python
async def _output_guardrails(self, state: AgentState) -> AgentState:
    """Validate response quality before returning."""
    response = state["response_text"]
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
```

### Node: `log_analytics` (NEW — SQLite)

Lightweight, fire-and-forget logging to a local SQLite database on the backend server. No Supabase dependency.

**SQLite schema** (`backend/data/analytics.db`):

```sql
CREATE TABLE IF NOT EXISTS query_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT NOT NULL,
    user_query TEXT NOT NULL,
    query_classification TEXT,          -- data_query | greeting | follow_up | meta
    generated_sql TEXT,
    sql_valid INTEGER,                  -- 0 or 1
    retry_count INTEGER DEFAULT 0,
    query_results_count INTEGER,
    confidence_score REAL,
    visualization_hint TEXT,
    error TEXT,
    total_latency_ms INTEGER,
    llm_calls_count INTEGER,
    was_follow_up INTEGER DEFAULT 0,    -- 0 or 1
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    log_id INTEGER REFERENCES query_logs(id),
    client_id TEXT NOT NULL,
    feedback TEXT CHECK (feedback IN ('positive', 'negative')),
    comment TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_logs_client ON query_logs(client_id, created_at);
CREATE INDEX IF NOT EXISTS idx_logs_errors ON query_logs(error) WHERE error IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feedback_log ON user_feedback(log_id);
```

**Python logging utility:**

```python
# backend/app/utils/analytics_logger.py
import sqlite3
import asyncio
from pathlib import Path

DB_PATH = Path(__file__).parent.parent.parent / "data" / "analytics.db"

class AnalyticsLogger:
    """Fire-and-forget SQLite analytics logger."""

    def __init__(self):
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(str(DB_PATH)) as conn:
            conn.executescript(SCHEMA_SQL)

    def log_query(self, data: dict) -> int:
        """Log a query and return the log_id for feedback linking."""
        with sqlite3.connect(str(DB_PATH)) as conn:
            cursor = conn.execute(
                """INSERT INTO query_logs
                   (client_id, user_query, query_classification, generated_sql,
                    sql_valid, retry_count, query_results_count, confidence_score,
                    visualization_hint, error, total_latency_ms, llm_calls_count,
                    was_follow_up)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (data["client_id"], data["user_query"], ...),
            )
            return cursor.lastrowid

    def log_feedback(self, log_id: int, client_id: str, feedback: str, comment: str = None):
        """Store user feedback for a query."""
        with sqlite3.connect(str(DB_PATH)) as conn:
            conn.execute(
                "INSERT INTO user_feedback (log_id, client_id, feedback, comment) VALUES (?, ?, ?, ?)",
                (log_id, client_id, feedback, comment),
            )
```

**Called in the agent as the last step:**

```python
async def _log_analytics(self, state: AgentState) -> AgentState:
    """Fire-and-forget analytics logging."""
    try:
        log_id = self.analytics.log_query({
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
            "total_latency_ms": state.get("execution_metadata", {}).get("total_latency_ms"),
            "llm_calls_count": state.get("execution_metadata", {}).get("llm_calls_count"),
            "was_follow_up": state.get("query_classification") == "follow_up",
        })
        return {**state, "analytics_id": str(log_id)}
    except Exception:
        # Never let logging break the response
        return state
```

### User Feedback (Thumbs Up/Down)

**New API endpoint:**

```python
@router.post("/feedback")
async def submit_feedback(
    request: FeedbackRequest,
    user: TokenData = Depends(get_current_user),
):
    """Store user feedback for a query response."""
    client_id = await get_client_id(user)
    analytics_logger.log_feedback(
        log_id=request.analytics_id,
        client_id=client_id,
        feedback=request.feedback,  # "positive" or "negative"
        comment=request.comment,
    )
    return {"status": "ok"}
```

**Frontend:** Two small buttons below each assistant message:
- Thumbs up / Thumbs down
- On thumbs down, optional text input: "What was wrong?"
- The `analytics_id` is returned in the ChatResponse and stored with the message.

---

## Updated State Schema

```python
class AgentState(TypedDict):
    # ── Input ──
    user_query: str
    client_id: str
    conversation_history: list[dict]    # NEW: from frontend request body

    # ── Layer 0 ──
    rate_limited: bool                  # NEW

    # ── Layer 1 ──
    is_data_query: Optional[bool]
    query_classification: Optional[str] # NEW: data_query | greeting | follow_up | meta
    rewritten_query: Optional[str]      # NEW: resolved follow-up
    query_plan: Optional[dict]          # NEW: {strategy, sub_queries}

    # ── Layer 2 ──
    generated_sql: Optional[str]
    sql_valid: bool
    query_results: Optional[list[dict[str, Any]]]
    error: Optional[str]
    retry_count: int                    # NEW: 0, 1, or 2

    # ── Layer 3 ──
    response_text: str
    visualization_hint: Literal["table", "chart", "card", "text"]
    chart_config: Optional[dict[str, Any]]
    navigation_actions: Optional[list[dict[str, str]]]
    confidence_score: Optional[float]   # NEW: 0.0 - 1.0
    analytics_id: Optional[str]         # NEW: for feedback linking

    # ── Observability ──
    execution_metadata: Optional[dict]  # NEW: {total_latency_ms, llm_calls_count}
```

---

## Updated API Contract

### Request (Updated `ChatRequest`)

```python
class ChatRequest(BaseModel):
    query: str
    conversation_history: list[dict] = []  # NEW: [{role, content}, ...]
```

Frontend sends last 4 messages (2 user + 2 assistant) with each request. Backend remains stateless — no server-side conversation storage.

### Response (Updated `ChatResponse`)

```python
class ChatResponse(BaseModel):
    response_text: str
    visualization_hint: str
    chart_config: Optional[dict] = None
    query_results: Optional[list] = None
    generated_sql: Optional[str] = None
    error: Optional[str] = None
    navigation_actions: Optional[list[dict]] = None
    confidence_score: Optional[float] = None   # NEW
    analytics_id: Optional[str] = None         # NEW
    retry_count: int = 0                        # NEW
    query_classification: Optional[str] = None  # NEW
```

### New Endpoint: Feedback

```
POST /api/v1/chat/feedback
Body: { "analytics_id": "123", "feedback": "positive" | "negative", "comment": "..." }
```

---

## Complete Node Registry

| Node | Layer | LLM Call? | New? | Purpose |
|------|-------|-----------|------|---------|
| `input_guardrails` | 0 | No | NEW | Rate limit, length, injection filter |
| `classify_query` | 1 | Yes | UPGRADED | 4-way classification with history |
| `rewrite_with_context` | 1 | Yes | NEW | Resolve follow-up → standalone query |
| `answer_about_schema` | 1 | Yes | NEW | Answer meta questions about capabilities |
| `query_planner` | 1 | Yes | NEW | Single vs multi-step decision |
| `decompose_query` | 1 | Yes | NEW | Break complex query into sub-queries |
| `generate_sql` | 2 | Yes | UPGRADED | Now includes history context + error context |
| `validate_sql` | 2 | No | EXISTING | SQL validation (unchanged) |
| `execute_query` | 2 | No | EXISTING | DB execution (unchanged) |
| `retry_sql` | 2 | Yes | NEW | Self-correction with error feedback |
| `merge_results` | 2 | Yes | NEW | Combine multi-step sub-query results |
| `format_response` | 3 | Yes | UPGRADED | Now includes confidence scoring |
| `output_guardrails` | 3 | No | NEW | Hallucination check, PII redaction |
| `log_analytics` | 3 | No | NEW | Fire-and-forget SQLite logging |
| `respond_directly` | 1 | Yes | EXISTING | Greeting responses (unchanged) |
| `handle_error` | 3 | No | EXISTING | Error responses (unchanged) |

**Total: 16 nodes (7 new, 3 upgraded, 6 existing/unchanged)**

---

## LLM Call Comparison

| Scenario | Current | Enterprise | Notes |
|----------|---------|------------|-------|
| Greeting | 2 calls | 2 calls | Same (classify + respond) |
| Meta question | 2-3 calls (misclassified) | 2 calls | classify + schema answer |
| Simple data query | 3 calls | 4 calls | +confidence scoring |
| Follow-up query | **FAILS** | 5 calls | classify + rewrite + SQL + format + confidence |
| Complex multi-step | **FAILS or wrong** | 6-8 calls | +planner + sub-queries + merge |
| Self-corrected query | **FAILS** | 5-7 calls | +1-2 retry calls |
| Rate limited | 2 calls wasted | **0 calls** | Blocked before LLM |

---

## Implementation Priority

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| **P0** | Self-correction loop (`retry_sql` node) | Small | High — fixes 10-15% of failing queries |
| **P0** | 4-way classification + `rewrite_with_context` | Medium | High — enables follow-up queries |
| **P1** | Input guardrails (rate limit, injection filter) | Small | Medium — security & cost control |
| **P1** | Output guardrails (hallucination, PII) | Small | Medium — response quality |
| **P1** | Confidence scoring | Small | Medium — user trust signal |
| **P2** | SQLite analytics logging | Medium | High long-term — observability |
| **P2** | User feedback endpoint + frontend | Medium | High long-term — quality improvement |
| **P3** | `answer_about_schema` node | Small | Low — nice UX polish |
| **P3** | Query planner + decompose + merge | Large | Medium — handles edge cases |

**Recommended implementation order:**
1. Self-correction loop (biggest reliability win, smallest change)
2. 4-way classification + follow-up rewrite (biggest UX win)
3. Input + output guardrails (security hardening)
4. Confidence scoring (trust signal)
5. Analytics logging + feedback (observability foundation)
6. Schema meta answers (UX polish)
7. Query planner + multi-step (complex feature, do last)

---

## Files to Create/Modify

### New Files
- `backend/app/utils/analytics_logger.py` — SQLite analytics logger
- `backend/data/` — Directory for analytics.db (gitignored)

### Modified Files
- `backend/app/agents/ask_astra/agent.py` — New nodes, self-correction loop, updated graph
- `backend/app/agents/ask_astra/state.py` — New state fields
- `backend/app/agents/ask_astra/prompts.py` — New/upgraded prompts
- `backend/app/api/v1/endpoints/chat.py` — Updated request/response models, feedback endpoint
- `backend/app/schemas/chat.py` — Updated ChatRequest, ChatResponse, new FeedbackRequest
- `frontend/src/components/ask-astra/chat-interface.tsx` — Send conversation_history in requests
- `frontend/src/components/ask-astra/chat-message.tsx` — Confidence indicator, feedback buttons
- `frontend/src/types/ask-astra.ts` — Updated types for new fields
- `frontend/src/actions/ask-astra.ts` — Updated API call, new feedback action
