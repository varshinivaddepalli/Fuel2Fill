import os

import asyncpg
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from app.config import get_settings

settings = get_settings()

_IS_LAMBDA = bool(os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))

# Global connection pool
_pool: asyncpg.Pool | None = None


async def init_db_pool():
    """Initialize the database connection pool."""
    global _pool
    if _pool is None:
        # Lambda: small pool (containers are short-lived)
        # Server: larger pool for sustained connections
        min_sz = 1 if _IS_LAMBDA else 2
        max_sz = 3 if _IS_LAMBDA else 10
        _pool = await asyncpg.create_pool(
            settings.database_url,
            min_size=min_sz,
            max_size=max_sz,
            command_timeout=settings.query_timeout_seconds,
        )
    return _pool


async def close_db_pool():
    """Close the database connection pool."""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


async def get_db_pool() -> asyncpg.Pool:
    """Get the database connection pool, initializing if needed."""
    global _pool
    if _pool is None:
        _pool = await init_db_pool()
    return _pool


@asynccontextmanager
async def get_db_connection() -> AsyncGenerator[asyncpg.Connection, None]:
    """Context manager for database connections."""
    pool = await get_db_pool()
    async with pool.acquire() as connection:
        yield connection


async def execute_read_query(
    query: str, params: dict | None = None
) -> list[dict]:
    """
    Execute a read-only query and return results as list of dicts.

    Args:
        query: SQL query string with named parameters (e.g., $1, $2)
        params: Dictionary of parameter values

    Returns:
        List of dictionaries representing rows
    """
    async with get_db_connection() as conn:
        if params:
            # Convert dict params to positional args
            rows = await conn.fetch(query, *params.values())
        else:
            rows = await conn.fetch(query)

        return [dict(row) for row in rows]


async def get_client_id_by_email(email: str) -> str | None:
    """Get client_id from clients table by email."""
    query = """
        SELECT client_id
        FROM clients
        WHERE client_email = $1
        AND status = 'active'
    """
    async with get_db_connection() as conn:
        row = await conn.fetchrow(query, email)
        return str(row["client_id"]) if row else None


async def update_click_astra_record(
    record_id: str,
    processing_status: str,
    error_message: str | None = None,
    ocr_extracted_data: dict | None = None,
    ai_response: dict | None = None,
) -> bool:
    """Update a click_astra record with processing results."""
    import json

    async with get_db_connection() as conn:
        # Build update query dynamically
        updates = ["processing_status = $2", "updated_at = NOW()"]
        params = [record_id, processing_status]
        param_idx = 3

        if error_message is not None:
            updates.append(f"error_message = ${param_idx}")
            params.append(error_message)
            param_idx += 1

        if ocr_extracted_data is not None:
            updates.append(f"ocr_extracted_data = ${param_idx}")
            params.append(json.dumps(ocr_extracted_data))
            param_idx += 1

        if ai_response is not None:
            updates.append(f"ai_response = ${param_idx}")
            params.append(json.dumps(ai_response))
            param_idx += 1

        query = f"""
            UPDATE click_astra
            SET {', '.join(updates)}
            WHERE id = $1
        """

        try:
            await conn.execute(query, *params)
            return True
        except Exception as e:
            print(f"Failed to update click_astra record: {e}")
            return False
