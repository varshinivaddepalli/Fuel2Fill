from typing import TypedDict, Literal, Optional, Any


class AgentState(TypedDict):
    """State schema for the Ask Astra agent."""

    # ── Input ──
    user_query: str
    client_id: str
    conversation_history: list[dict]  # [{role, content}, ...] from frontend

    # ── Layer 0 ──
    rate_limited: bool

    # ── Layer 1 ──
    is_data_query: Optional[bool]
    query_classification: Optional[str]  # data_query | greeting | follow_up | meta
    rewritten_query: Optional[str]  # resolved follow-up as standalone query

    # ── Layer 2 ──
    generated_sql: Optional[str]
    sql_valid: bool
    query_results: Optional[list[dict[str, Any]]]
    error: Optional[str]
    retry_count: int  # 0, 1, or 2

    # ── Layer 3 ──
    response_text: str
    visualization_hint: Literal["table", "chart", "card", "text"]
    chart_config: Optional[dict[str, Any]]
    navigation_actions: Optional[list[dict[str, str]]]  # [{label, path}]
    confidence_score: Optional[float]  # 0.0 - 1.0
    analytics_id: Optional[str]  # for feedback linking

    # ── Observability ──
    execution_metadata: Optional[dict]  # {total_latency_ms, llm_calls_count}


class StreamEvent(TypedDict):
    """Event emitted during streaming."""

    event_type: Literal["token", "sql", "result", "metadata", "error", "done"]
    data: Any
