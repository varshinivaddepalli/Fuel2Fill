"""Utilities for formatting query results and determining visualization types."""

from typing import Any, Literal
import re


VisualizationType = Literal["table", "chart", "card", "text"]


def determine_visualization(
    query: str,
    results: list[dict[str, Any]],
    response_text: str,
) -> tuple[VisualizationType, dict[str, Any] | None]:
    """
    Determine the best visualization type for the query results.

    Args:
        query: The user's original question
        results: The query results
        response_text: The LLM's response text

    Returns:
        Tuple of (visualization_type, chart_config or None)
    """
    query_lower = query.lower()
    response_lower = response_text.lower()

    # No results - just text
    if not results:
        return "text", None

    # Single value result
    if len(results) == 1 and len(results[0]) == 1:
        return "card", None

    # Count/aggregate results (single row with named aggregates)
    if len(results) == 1:
        keys = list(results[0].keys())
        aggregate_indicators = ["count", "total", "sum", "avg", "average", "min", "max"]
        if any(ind in key.lower() for key in keys for ind in aggregate_indicators):
            return "card", None

    # Check for time-series data
    time_columns = ["date", "month", "year", "week", "day", "time", "created_at", "effective_date"]
    has_time_column = any(
        any(tc in col.lower() for tc in time_columns) for col in results[0].keys()
    )

    # Check for numeric columns
    numeric_columns = [
        key
        for key, val in results[0].items()
        if isinstance(val, (int, float)) and val is not None
    ]

    # Trend/time-series queries
    trend_indicators = ["trend", "over time", "history", "last week", "last month", "past", "daily", "weekly", "monthly"]
    if has_time_column and numeric_columns and any(ind in query_lower for ind in trend_indicators):
        # Determine chart type
        chart_type = "line"
        if "compare" in query_lower or "comparison" in query_lower:
            chart_type = "bar"

        return "chart", {
            "type": chart_type,
            "x_axis": next(
                (col for col in results[0].keys() if any(tc in col.lower() for tc in time_columns)),
                list(results[0].keys())[0],
            ),
            "y_axis": numeric_columns[0] if numeric_columns else list(results[0].keys())[1],
        }

    # Comparison queries
    comparison_indicators = ["compare", "comparison", "vs", "versus", "by station", "per station", "breakdown"]
    if any(ind in query_lower for ind in comparison_indicators) and numeric_columns:
        return "chart", {
            "type": "bar",
            "x_axis": list(results[0].keys())[0],
            "y_axis": numeric_columns[0],
        }

    # Distribution/proportion queries
    distribution_indicators = ["distribution", "breakdown", "percentage", "proportion", "share"]
    if any(ind in query_lower for ind in distribution_indicators) and len(results) <= 10:
        return "chart", {
            "type": "pie",
            "label_key": list(results[0].keys())[0],
            "value_key": numeric_columns[0] if numeric_columns else list(results[0].keys())[1],
        }

    # Default to table for list results
    return "table", None


def format_single_value(results: list[dict[str, Any]]) -> dict[str, Any]:
    """Format a single value result for card display."""
    if not results or not results[0]:
        return {"value": "No data", "label": "Result"}

    first_row = results[0]
    key = list(first_row.keys())[0]
    value = first_row[key]

    # Format the value
    if isinstance(value, float):
        if value == int(value):
            formatted_value = str(int(value))
        else:
            formatted_value = f"{value:.2f}"
    elif isinstance(value, int):
        formatted_value = f"{value:,}"
    else:
        formatted_value = str(value) if value is not None else "N/A"

    # Create label from column name
    label = key.replace("_", " ").title()

    return {"value": formatted_value, "label": label}


def format_table_results(results: list[dict[str, Any]]) -> dict[str, Any]:
    """Format results for table display."""
    if not results:
        return {"columns": [], "rows": []}

    columns = [
        {"key": key, "label": key.replace("_", " ").title()}
        for key in results[0].keys()
    ]

    rows = []
    for row in results:
        formatted_row = {}
        for key, value in row.items():
            if value is None:
                formatted_row[key] = "-"
            elif isinstance(value, float):
                if value == int(value):
                    formatted_row[key] = str(int(value))
                else:
                    formatted_row[key] = f"{value:.2f}"
            else:
                formatted_row[key] = str(value)
        rows.append(formatted_row)

    return {"columns": columns, "rows": rows}


def format_chart_data(
    results: list[dict[str, Any]], chart_config: dict[str, Any]
) -> dict[str, Any]:
    """Format results for chart display."""
    chart_type = chart_config.get("type", "bar")

    if chart_type == "pie":
        label_key = chart_config.get("label_key")
        value_key = chart_config.get("value_key")
        return {
            "type": "pie",
            "data": [
                {"name": str(row.get(label_key, "")), "value": row.get(value_key, 0)}
                for row in results
            ],
        }

    x_axis = chart_config.get("x_axis")
    y_axis = chart_config.get("y_axis")

    return {
        "type": chart_type,
        "x_axis": x_axis,
        "y_axis": y_axis,
        "data": [
            {
                "x": str(row.get(x_axis, "")),
                "y": row.get(y_axis, 0),
                **{k: v for k, v in row.items() if k not in [x_axis, y_axis]},
            }
            for row in results
        ],
    }
