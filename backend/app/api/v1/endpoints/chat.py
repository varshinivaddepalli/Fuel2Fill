"""Chat endpoint with SSE streaming for Ask Astra."""

import json
from typing import AsyncGenerator
from fastapi import APIRouter, Depends, HTTPException, status
from sse_starlette.sse import EventSourceResponse

from app.core.security import get_current_user, TokenData
from app.core.supabase import get_client_id_by_email
from app.schemas.chat import ChatRequest, ChatResponse, FeedbackRequest
from app.agents.ask_astra import AskAstraAgent
from app.utils.response_formatter import format_single_value, format_table_results, format_chart_data
from app.utils.analytics_logger import analytics_logger

router = APIRouter()

# Singleton agent instance
_agent: AskAstraAgent | None = None


def get_agent() -> AskAstraAgent:
    """Get or create agent instance."""
    global _agent
    if _agent is None:
        _agent = AskAstraAgent()
    return _agent


async def get_client_id(user: TokenData) -> str:
    """Get client_id from user's email."""
    if not user.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User email not found in token",
        )

    client_id = await get_client_id_by_email(user.email)
    if not client_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client profile not found. Please complete onboarding.",
        )

    return client_id


@router.post("/ask", response_model=ChatResponse)
async def ask_question(
    request: ChatRequest,
    user: TokenData = Depends(get_current_user),
):
    """
    Ask a question about your fuel station data.

    This endpoint processes natural language queries and returns
    structured analytics results.
    """
    client_id = await get_client_id(user)
    agent = get_agent()

    try:
        # Convert conversation_history to list of dicts
        conversation_history = [
            {"role": msg.role, "content": msg.content}
            for msg in request.conversation_history
        ]

        result = await agent.run(request.query, client_id, conversation_history)

        # Format results based on visualization type
        formatted_results = None
        if result.get("query_results"):
            viz_type = result.get("visualization_hint", "table")
            if viz_type == "card":
                formatted_results = [format_single_value(result["query_results"])]
            elif viz_type == "chart" and result.get("chart_config"):
                formatted_results = [format_chart_data(result["query_results"], result["chart_config"])]
            else:
                formatted_results = result["query_results"]

        return ChatResponse(
            response_text=result.get("response_text", ""),
            visualization_hint=result.get("visualization_hint", "text"),
            chart_config=result.get("chart_config"),
            query_results=formatted_results,
            generated_sql=result.get("generated_sql"),
            error=result.get("error"),
            navigation_actions=result.get("navigation_actions"),
            confidence_score=result.get("confidence_score"),
            analytics_id=result.get("analytics_id"),
            retry_count=result.get("retry_count", 0),
            query_classification=result.get("query_classification"),
        )
    except Exception as e:
        import traceback
        import logging
        logging.error(f"Ask Astra error: {type(e).__name__}: {e}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while processing your request: {type(e).__name__}: {str(e)}",
        )


@router.post("/ask/stream")
async def ask_question_stream(
    request: ChatRequest,
    user: TokenData = Depends(get_current_user),
):
    """
    Ask a question with SSE streaming response.

    Streams events as the agent processes the query:
    - token: Progress updates
    - sql: Generated SQL query
    - result: Query results preview
    - metadata: Visualization hints
    - error: Error messages
    - done: Final state
    """
    client_id = await get_client_id(user)
    agent = get_agent()

    conversation_history = [
        {"role": msg.role, "content": msg.content}
        for msg in request.conversation_history
    ]

    async def event_generator() -> AsyncGenerator[dict, None]:
        try:
            async for event in agent.stream(request.query, client_id, conversation_history):
                event_type = event["event_type"]
                data = event["data"]

                # Serialize data appropriately
                if event_type == "done":
                    # Convert full state to JSON-serializable format
                    serialized_data = {
                        "response_text": data.get("response_text", ""),
                        "visualization_hint": data.get("visualization_hint", "text"),
                        "chart_config": data.get("chart_config"),
                        "query_results": data.get("query_results"),
                        "generated_sql": data.get("generated_sql"),
                        "error": data.get("error"),
                        "navigation_actions": data.get("navigation_actions"),
                        "confidence_score": data.get("confidence_score"),
                        "analytics_id": data.get("analytics_id"),
                        "retry_count": data.get("retry_count", 0),
                        "query_classification": data.get("query_classification"),
                    }
                    yield {
                        "event": event_type,
                        "data": json.dumps(serialized_data, default=str),
                    }
                elif isinstance(data, dict):
                    yield {
                        "event": event_type,
                        "data": json.dumps(data, default=str),
                    }
                else:
                    yield {
                        "event": event_type,
                        "data": str(data),
                    }
        except Exception as e:
            yield {
                "event": "error",
                "data": json.dumps({"error": str(e)}),
            }

    return EventSourceResponse(event_generator())


@router.post("/feedback")
async def submit_feedback(
    request: FeedbackRequest,
    user: TokenData = Depends(get_current_user),
):
    """Store user feedback for a query response."""
    client_id = await get_client_id(user)
    try:
        await analytics_logger.log_feedback(
            log_id=int(request.analytics_id),
            client_id=client_id,
            feedback=request.feedback,
            comment=request.comment,
        )
        return {"status": "ok"}
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid analytics_id",
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit feedback",
        )


@router.get("/suggested-queries")
async def get_suggested_queries(
    user: TokenData = Depends(get_current_user),
):
    """
    Get suggested queries based on user's data.
    """
    return {
        "queries": [
            {
                "category": "Overview",
                "suggestions": [
                    "How many stations do I have?",
                    "Show me all my employees",
                    "What is my total tank capacity?",
                ],
            },
            {
                "category": "Employees",
                "suggestions": [
                    "How many employees do I have?",
                    "Show attendance for this week",
                    "Which employees are on shift today?",
                ],
            },
            {
                "category": "Fuel Prices",
                "suggestions": [
                    "What are the current fuel prices?",
                    "Show diesel price trend this month",
                    "Compare fuel prices across stations",
                ],
            },
            {
                "category": "Operations",
                "suggestions": [
                    "Show me tank stock levels",
                    "List all active pumps",
                    "What products do I sell?",
                ],
            },
        ]
    }
