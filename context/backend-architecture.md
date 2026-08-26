# Backend Architecture

This document details the backend structure for Petro Astra V1.

## Directory Structure (`/backend`)

### Main Application (`app/`)
- `main.py` - FastAPI entry point with CORS
- `config.py` - Pydantic settings configuration

### Core Modules (`core/`)
- `supabase.py` - Database connection pool (asyncpg)
- `security.py` - JWT token verification

### API Version 1 (`api/v1/`)
- `router.py` - API router
- `endpoints/` - API endpoints
  - `health.py` - Health check endpoints
  - `chat.py` - SSE streaming chat endpoint
  - `click_astra.py` - OCR document processing endpoint

### LangGraph Agents (`agents/`)

#### Ask Astra Agent (`agents/ask_astra/`)
SQL analytics agent for natural language queries:
- `agent.py` - Main agent with graph workflow
- `state.py` - Agent state schema
- `prompts.py` - System prompts
- `schema_context.py` - Database schema context for LLM (covers all tables including station_expenses, purchases, purchase_fuel_items, purchase_fuel_tank_allocations, purchase_product_items, client_bank_accounts)

**Workflow**: input_guardrails → classify_query → [generate SQL → validate → execute (retry up to 2x)] → format_response → output_guardrails → log_analytics

#### Click Astra Agent (`agents/click_astra/`)
OCR processing agent for document extraction:
- `agent.py` - OCR + LLM extraction workflow
- `state.py` - Agent state schema
- `prompts.py` - Extraction prompts
- `schema_context.py` - Database schema for LLM

**Workflow**: fetch image → Mistral OCR → Groq LLM extraction → store results

### Schemas (`schemas/`)
- `chat.py` - Chat request/response models

### Utilities (`utils/`)
- `sql_validator.py` - SQL validation (SELECT only)
- `response_formatter.py` - Visualization hints
- `navigation_mapper.py` - Navigation button suggestions for Ask Astra
- `analytics_logger.py` - Fire-and-forget SQLite analytics logging (no-op on AWS Lambda)

---

## Ask Astra - SQL Analytics

### Features
- SSE streaming for real-time responses
- LangGraph workflow for SQL generation
- Groq LLM (llama-3.3-70b-versatile) for SQL generation
- 4-way query classification: `data_query`, `greeting`, `follow_up`, `meta`
- Concise response generation (2-3 sentences max)
- Navigation buttons (generative UI) for quick page access

### Query Classification (4-way)
- `data_query`: Questions about data — employees, stations, sales, etc. → generates SQL
- `greeting`: Casual chat, introductions → conversational response, no SQL
- `follow_up`: References previous conversation → rewrite to standalone, then SQL
- `meta`: Questions about capabilities, available data, or **how to use the app** (e.g., "How can I add an employee?", "Where can I see attendance?") → text response with navigation buttons, no SQL

### SQL Security
- SELECT-only queries (blocks INSERT, UPDATE, DELETE, DROP, etc.)
- Client-scoped queries (all queries filter by user's `client_id`)
- Query validation with sqlparse
- LIMIT 1000 enforced on all queries
- 30-second query timeout

### Input Guardrails
- Rate limiting: 30 queries per 10 minutes per client (in-memory sliding window with async lock)
- Query length limit: 500 characters max
- Prompt injection detection via regex patterns (blocks "ignore previous instructions", "you are now", etc.)
- Empty/whitespace query rejection

### Response Generation
- Strict prompt rules for accurate, concise responses
- Numbers must match data exactly - no guessing
- For counts: state exact number (e.g., "You have 4 employees")
- For lists: say "Here are your X [items]" without listing in text
- No filler phrases like "Based on the data"

### Smart Visualization & Conditional Display
The visualization type determines what UI elements appear:

| Visualization | Results | SQL toggle | Use case |
|---|---|---|---|
| `text` | Hidden | Hidden | Greetings, meta/how-to, explanatory responses |
| `card` | Show card | Hidden | Single values, counts, totals |
| `table` | Show table | Show | Lists of records, detailed data |
| `chart` | Show chart | Show | Time series, trends, comparisons |

- SQL toggle and results table are **not** shown for every response
- Only `table` and `chart` visualizations display the SQL toggle
- `text` visualization never renders a results section
- `card` shows the metric card but hides the SQL (trivial queries)

### Navigation Buttons (Generative UI)
- Keyword-based route detection (no extra LLM call)
- Up to 2 navigation suggestions per response
- Available on both data query responses AND meta/how-to responses
- Utility: `utils/navigation_mapper.py`
- State field: `navigation_actions: list[dict[str, str]]`
- 26 total routes in nav mapper covering all application pages:
  - Dashboard, View Stations, Add Station/Fuel Type/Tank/Pump/Nozzle/Product/Employee
  - View Employee, Shifts, Attendance
  - Daily Entry, Daily Fuel Price, Daily Sale Record, Product Sales
  - Credit Customers/Transactions/Payments, Purchases, Expenses, Stock View, Settlement
  - Ask Astra, Click Astra, Profile
- Note: Add Bank Account is in sidebar but not yet in nav mapper (27 sidebar items, 26 mapped)

---

## Click Astra - OCR Processing

### Endpoint
`/api/v1/click-astra/process`

### Processing Workflow
1. Fetch image from Supabase storage
2. Call Mistral OCR API to extract text
3. Pass OCR text + extraction columns + instructions to Groq LLM (llama-3.3-70b-versatile)
4. Store structured response for human verification

### Models Used
- **OCR**: Mistral OCR API
- **Extraction**: Groq LLM (llama-3.3-70b-versatile)
