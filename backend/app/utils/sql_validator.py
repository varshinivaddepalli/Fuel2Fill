"""SQL validation utilities to ensure read-only, safe queries."""

import re
import sqlparse
from sqlparse.sql import Statement
from sqlparse.tokens import Keyword, DML


class SQLValidationError(Exception):
    """Raised when SQL validation fails."""

    pass


# Dangerous keywords that should never appear in queries
BLOCKED_KEYWORDS = {
    "INSERT",
    "UPDATE",
    "DELETE",
    "DROP",
    "TRUNCATE",
    "ALTER",
    "CREATE",
    "GRANT",
    "REVOKE",
    "EXECUTE",
    "EXEC",
    "CALL",
    "INTO",  # SELECT INTO
    "COPY",
    "VACUUM",
    "REINDEX",
    "CLUSTER",
    "COMMENT",
    "SECURITY",
    "OWNER",
}

# Dangerous patterns
DANGEROUS_PATTERNS = [
    r";\s*\w",  # Multiple statements (semicolon followed by another statement)
    r"--",  # SQL comments
    r"/\*",  # Block comments
    r"pg_",  # PostgreSQL system tables/functions
    r"information_schema",  # System schema
    r"pg_catalog",  # System catalog
]


def validate_sql(sql: str) -> tuple[bool, str | None]:
    """
    Validate that SQL is safe for execution.

    Args:
        sql: The SQL query to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    if not sql or not sql.strip():
        return False, "Empty SQL query"

    # Normalize whitespace
    normalized_sql = " ".join(sql.split())

    # Check for dangerous patterns
    for pattern in DANGEROUS_PATTERNS:
        if re.search(pattern, normalized_sql, re.IGNORECASE):
            return False, f"Dangerous pattern detected: {pattern}"

    # Parse the SQL
    try:
        parsed = sqlparse.parse(normalized_sql)
    except Exception as e:
        return False, f"SQL parsing error: {str(e)}"

    if not parsed:
        return False, "Could not parse SQL"

    # Should be exactly one statement
    if len(parsed) > 1:
        return False, "Multiple SQL statements not allowed"

    statement = parsed[0]

    # Check statement type
    stmt_type = statement.get_type()
    if stmt_type != "SELECT":
        return False, f"Only SELECT statements allowed, got: {stmt_type}"

    # Check for blocked keywords in tokens
    sql_upper = normalized_sql.upper()
    for keyword in BLOCKED_KEYWORDS:
        # Use word boundary to avoid false positives
        if re.search(rf"\b{keyword}\b", sql_upper):
            return False, f"Blocked keyword detected: {keyword}"

    # Verify client_id parameter is present ($1)
    if "$1" not in normalized_sql:
        return False, "Query must include client_id parameter ($1)"

    return True, None


def ensure_limit(sql: str, max_rows: int = 1000) -> str:
    """
    Ensure the SQL query has a LIMIT clause.

    Args:
        sql: The SQL query
        max_rows: Maximum number of rows to return

    Returns:
        SQL with LIMIT clause added if not present
    """
    normalized = sql.strip().rstrip(";")
    sql_upper = normalized.upper()

    # Check if LIMIT already exists
    if "LIMIT" in sql_upper:
        # Extract existing limit and ensure it's not too high
        limit_match = re.search(r"LIMIT\s+(\d+)", sql_upper)
        if limit_match:
            existing_limit = int(limit_match.group(1))
            if existing_limit > max_rows:
                # Replace with max_rows
                normalized = re.sub(
                    r"LIMIT\s+\d+",
                    f"LIMIT {max_rows}",
                    normalized,
                    flags=re.IGNORECASE,
                )
        return normalized

    # Add LIMIT clause
    return f"{normalized} LIMIT {max_rows}"


def validate_client_scope(sql: str) -> tuple[bool, str | None]:
    """
    Validate that the query properly scopes to client_id.

    Args:
        sql: The SQL query

    Returns:
        Tuple of (is_valid, error_message)
    """
    sql_upper = sql.upper()

    # Must reference stations table or clients table with $1
    has_station_join = (
        "STATIONS" in sql_upper
        and "$1" in sql
        and ("CLIENT_ID" in sql_upper or "S.CLIENT_ID" in sql_upper)
    )

    has_client_direct = "CLIENTS" in sql_upper and "$1" in sql

    if not (has_station_join or has_client_direct):
        return False, "Query must filter by client_id through stations or clients table"

    return True, None


def sanitize_and_validate(sql: str, max_rows: int = 1000) -> tuple[str, None] | tuple[None, str]:
    """
    Full validation and sanitization of SQL query.

    Args:
        sql: The SQL query
        max_rows: Maximum rows to return

    Returns:
        Tuple of (sanitized_sql, None) or (None, error_message)
    """
    # Basic validation
    is_valid, error = validate_sql(sql)
    if not is_valid:
        return None, error

    # Client scope validation
    is_scoped, scope_error = validate_client_scope(sql)
    if not is_scoped:
        return None, scope_error

    # Ensure limit
    sanitized = ensure_limit(sql, max_rows)

    return sanitized, None
