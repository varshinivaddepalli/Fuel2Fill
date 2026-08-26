"""Pydantic schemas for chat endpoints."""

from typing import Optional, Literal, Any
from pydantic import BaseModel, Field
from uuid import UUID


class ConversationMessage(BaseModel):
    """A single message from conversation history."""

    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    """Request body for chat endpoint."""

    query: str = Field(..., min_length=1, max_length=500, description="User's question")
    conversation_history: list[ConversationMessage] = Field(
        default_factory=list,
        description="Last 4 messages for follow-up context",
    )


class NavigationAction(BaseModel):
    """Navigation action for generative UI."""

    label: str
    path: str


class ChatResponse(BaseModel):
    """Response from chat endpoint (non-streaming)."""

    response_text: str
    visualization_hint: Literal["table", "chart", "card", "text"]
    chart_config: Optional[dict[str, Any]] = None
    query_results: Optional[list[dict[str, Any]]] = None
    generated_sql: Optional[str] = None
    error: Optional[str] = None
    navigation_actions: Optional[list[NavigationAction]] = None
    confidence_score: Optional[float] = None
    analytics_id: Optional[str] = None
    retry_count: int = 0
    query_classification: Optional[str] = None


class StreamEventData(BaseModel):
    """Data structure for SSE events."""

    event_type: Literal["token", "sql", "result", "metadata", "error", "done"]
    data: Any


class FormattedResult(BaseModel):
    """Formatted query result for display."""

    type: Literal["table", "chart", "card", "text"]
    data: Any
    title: Optional[str] = None


class TableData(BaseModel):
    """Table display data."""

    columns: list[dict[str, str]]
    rows: list[dict[str, Any]]


class ChartData(BaseModel):
    """Chart display data."""

    type: Literal["line", "bar", "pie"]
    data: list[dict[str, Any]]
    x_axis: Optional[str] = None
    y_axis: Optional[str] = None


class CardData(BaseModel):
    """Card (single value) display data."""

    value: str
    label: str
    change: Optional[str] = None
    change_type: Optional[Literal["increase", "decrease", "neutral"]] = None


class FeedbackRequest(BaseModel):
    """Request body for feedback endpoint."""

    analytics_id: str = Field(..., description="ID from the query log")
    feedback: Literal["positive", "negative"]
    comment: Optional[str] = Field(None, max_length=500)
