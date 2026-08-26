"""Fire-and-forget analytics logger for Ask Astra queries.

On Lambda: no-op (returns dummy IDs, logs nothing).
On traditional server (Render/local): uses SQLite.
"""

import os
import asyncio
import sqlite3
from pathlib import Path

_IS_LAMBDA = bool(os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))

DB_PATH = Path(__file__).parent.parent.parent / "data" / "analytics.db"

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS query_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT NOT NULL,
    user_query TEXT NOT NULL,
    query_classification TEXT,
    generated_sql TEXT,
    sql_valid INTEGER,
    retry_count INTEGER DEFAULT 0,
    query_results_count INTEGER,
    confidence_score REAL,
    visualization_hint TEXT,
    error TEXT,
    total_latency_ms INTEGER,
    llm_calls_count INTEGER,
    was_follow_up INTEGER DEFAULT 0,
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
"""


class AnalyticsLogger:
    """Fire-and-forget analytics logger. No-op on Lambda."""

    def __init__(self):
        if not _IS_LAMBDA:
            DB_PATH.parent.mkdir(parents=True, exist_ok=True)
            self._init_db()

    def _init_db(self):
        with sqlite3.connect(str(DB_PATH)) as conn:
            conn.executescript(SCHEMA_SQL)

    def _log_query_sync(self, data: dict) -> int:
        """Synchronous log query — runs in thread pool."""
        with sqlite3.connect(str(DB_PATH)) as conn:
            cursor = conn.execute(
                """INSERT INTO query_logs
                   (client_id, user_query, query_classification, generated_sql,
                    sql_valid, retry_count, query_results_count, confidence_score,
                    visualization_hint, error, total_latency_ms, llm_calls_count,
                    was_follow_up)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    data["client_id"],
                    data["user_query"],
                    data.get("query_classification"),
                    data.get("generated_sql"),
                    1 if data.get("sql_valid") else 0,
                    data.get("retry_count", 0),
                    data.get("query_results_count"),
                    data.get("confidence_score"),
                    data.get("visualization_hint"),
                    data.get("error"),
                    data.get("total_latency_ms"),
                    data.get("llm_calls_count"),
                    1 if data.get("was_follow_up") else 0,
                ),
            )
            return cursor.lastrowid

    async def log_query(self, data: dict) -> int:
        """Log a query asynchronously. No-op on Lambda."""
        if _IS_LAMBDA:
            return 0
        return await asyncio.to_thread(self._log_query_sync, data)

    def _log_feedback_sync(self, log_id: int, client_id: str, feedback: str, comment: str | None = None):
        """Synchronous feedback log — runs in thread pool."""
        with sqlite3.connect(str(DB_PATH)) as conn:
            conn.execute(
                "INSERT INTO user_feedback (log_id, client_id, feedback, comment) VALUES (?, ?, ?, ?)",
                (log_id, client_id, feedback, comment),
            )

    async def log_feedback(self, log_id: int, client_id: str, feedback: str, comment: str | None = None):
        """Store user feedback asynchronously. No-op on Lambda."""
        if _IS_LAMBDA:
            return
        await asyncio.to_thread(self._log_feedback_sync, log_id, client_id, feedback, comment)


# Singleton instance
analytics_logger = AnalyticsLogger()
