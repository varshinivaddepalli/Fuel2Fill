# Control Tower — Document Intelligence Platform

## Solution 1: Enterprise Document Processing System

This document describes the complete architecture and workflow of the **Control Tower**, an enterprise-grade document intelligence system designed for multi-organization, multi-tenant document processing. Control Tower accepts documents from multiple sources (manual uploads, ERP integrations via Kafka), classifies them using AI, extracts structured data, validates the results, and routes output based on confidence — all while tracking costs per processing step.

---

## Master Flow Overview

```
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                     CONTROL TOWER — COMPLETE FLOW                       │
  └─────────────────────────────────────────────────────────────────────────┘

   ┌──────────┐    ┌──────────┐    ┌───────────┐    ┌──────────┐    ┌──────────┐
   │  AUTH &   │───▶│ DOCUMENT │───▶│    AI     │───▶│  RESULT  │───▶│  COST &  │
   │  API KEY  │    │  UPLOAD  │    │ PROCESSING│    │  OUTPUT  │    │ TRACKING │
   └──────────┘    └──────────┘    └───────────┘    └──────────┘    └──────────┘
     Step 1           Step 2          Step 3           Step 4          Step 5
```

The Control Tower pipeline is a 5-step linear workflow:

1. **Authentication & API Key System** — Every request must first prove its identity (JWT or API key), its authorization (role-based permissions), and its right to consume resources (quota and rate limits).
2. **Document Upload** — Documents enter the system via manual upload (web UI / direct API) or automated Kafka events from external ERP systems. Files are validated, stored securely, and pushed to a processing queue.
3. **AI Processing Pipeline** — A multi-stage pipeline converts files to text, classifies the document type using AI, extracts structured fields using schema-specific prompts, and validates results with rule-based checks.
4. **Result Output & Review** — Extracted data is routed based on field-level confidence scores: high-confidence results are auto-approved, medium-confidence results go to human reviewers, and low-confidence results require manual entry.
5. **Cost & Tracking** — Every AI call, OCR operation, and processing step is metered. Per-document cost is tracked and attributed to the originating organization for billing and analytics.

Each step is described in detail below.

---

## Step 1: Authentication & API Key System

```
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                    AUTHENTICATION FLOW                                   │
  └─────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐
    │  ADMIN PANEL  │
    └──────┬───────┘
           │
           ▼
    ┌──────────────────────────────────────┐
    │  1. CREATE ORGANIZATION              │
    │     ├── org_name: "Al Adrak LLC"     │
    │     ├── plan: "enterprise"           │
    │     ├── monthly_scan_limit: 5000     │
    │     └── modules_enabled: [3, 4]      │
    └──────────────┬───────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────────┐
    │  2. CREATE USERS & ROLES             │
    │     ├── admin    → full access       │
    │     ├── manager  → view + approve    │
    │     ├── finance  → invoices only     │
    │     ├── procurement → BOQ/RFQ only   │
    │     └── viewer   → read-only         │
    └──────────────┬───────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────────┐
    │  3. GENERATE API KEYS               │
    │                                      │
    │  For Axpert ERP Integration:         │
    │  ┌────────────────────────────────┐  │
    │  │ api_key: ct_live_ak_xxxx...   │  │
    │  │ type: "erp_integration"       │  │
    │  │ permissions: [upload, read]   │  │
    │  │ rate_limit: 100 req/min      │  │
    │  │ ip_whitelist: [10.0.0.x]     │  │
    │  └────────────────────────────────┘  │
    │                                      │
    │  For Manual Upload (Web UI):         │
    │  ┌────────────────────────────────┐  │
    │  │ User logs in via email + pass │  │
    │  │ Gets JWT token (24hr expiry)  │  │
    │  │ Role determines access level  │  │
    │  └────────────────────────────────┘  │
    │                                      │
    │  For Kafka Consumer:                 │
    │  ┌────────────────────────────────┐  │
    │  │ api_key: ct_live_kf_xxxx...   │  │
    │  │ type: "kafka_consumer"        │  │
    │  │ permissions: [consume, fetch] │  │
    │  └────────────────────────────────┘  │
    └──────────────────────────────────────┘
```

### 1.1 Organization Provisioning

The Control Tower is a **multi-tenant** system. Before any document can be processed, an organization must be created in the admin panel. Each organization record includes:

- **org_name** — The company or entity name (e.g., "Al Adrak LLC").
- **plan** — The subscription tier (e.g., "starter", "professional", "enterprise"), which determines feature availability and limits.
- **monthly_scan_limit** — The maximum number of documents the organization can process per billing cycle. Once exceeded, further processing requests are rejected until the next cycle or until the limit is increased.
- **modules_enabled** — A list of document module IDs the organization has access to. For example, module 3 might be "Invoice Processing" and module 4 might be "BOQ/RFQ Processing." This allows the platform to sell modular capabilities rather than all-or-nothing access.

Organizations are the **billing boundary** — all cost tracking, usage quotas, and audit trails roll up to the organization level.

### 1.2 Users & Role-Based Access Control (RBAC)

Within each organization, users are created with specific roles. Each role maps to a set of permissions that control what a user can see and do:

| Role | Permissions | Typical Use Case |
|------|------------|------------------|
| **admin** | Full access — create users, manage API keys, view all documents, configure settings | IT administrators, system owners |
| **manager** | View documents, approve/reject review queue items | Department heads who approve extracted data |
| **finance** | Access limited to invoice-type documents only | Accounts payable team members |
| **procurement** | Access limited to BOQ (Bill of Quantities) and RFQ (Request for Quotation) documents | Procurement team members |
| **viewer** | Read-only access to processed results | Auditors, external stakeholders |

Roles are **organization-scoped** — a user with "admin" in one organization has no access to another organization's data.

### 1.3 API Key Generation

The system supports three authentication mechanisms, each suited to a different integration pattern:

**ERP Integration Keys** (machine-to-machine):
- Prefixed with `ct_live_ak_` for easy identification.
- Typed as `"erp_integration"` with specific permissions (e.g., `[upload, read]`).
- Rate-limited (e.g., 100 requests/minute) to protect the system from runaway scripts.
- IP-whitelisted so only known ERP servers (e.g., `10.0.0.x` internal network) can use the key.
- These keys are designed for Axpert ERP or similar systems that push documents programmatically.

**Web UI Authentication** (human users):
- Standard email + password login flow.
- On successful authentication, the user receives a **JWT token** with a 24-hour expiry.
- The JWT encodes the user's role, organization ID, and permissions — the backend validates these on every request.
- No IP restriction; intended for browser-based access from anywhere.

**Kafka Consumer Keys** (event-driven):
- Prefixed with `ct_live_kf_` for identification.
- Typed as `"kafka_consumer"` with permissions `[consume, fetch]`.
- Used by the Control Tower's internal Kafka consumer service to authenticate when fetching document payloads referenced in Kafka events.
- These keys are internal system keys, not exposed to end users.

### 1.4 Request Validation Pipeline

Every incoming API call passes through a three-gate validation pipeline before reaching the processing logic:

```
    EVERY API CALL:
    ┌─────────────────────────────────────────────────────────┐
    │                                                         │
    │  Request                                                │
    │  ┌───────────────────────────────────────────────┐      │
    │  │ POST /api/documents/upload                    │      │
    │  │ Headers:                                      │      │
    │  │   Authorization: Bearer <jwt_token>           │      │
    │  │   X-API-Key: ct_live_ak_xxxx (if ERP)        │      │
    │  │   X-Org-ID: org_aladrak                       │      │
    │  └───────────────────────────────────────────────┘      │
    │         │                                               │
    │         ▼                                               │
    │  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐   │
    │  │ Validate    │─▶│ Check Role   │─▶│ Check Quota  │   │
    │  │ Token/Key   │  │ Permission   │  │ & Rate Limit │   │
    │  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘   │
    │     FAIL│            FAIL│             FAIL │           │
    │     401 │            403 │             429  │           │
    │         │                │                  │           │
    │         ▼ PASS           ▼ PASS             ▼ PASS     │
    │  ┌─────────────────────────────────────────────────┐   │
    │  │           PROCEED TO PROCESSING                  │   │
    │  └─────────────────────────────────────────────────┘   │
    └─────────────────────────────────────────────────────────┘
```

**Gate 1 — Token/Key Validation (401 on failure):**
The system first checks whether the request carries a valid credential. For API key requests, it verifies the key exists, is not revoked, and (for ERP keys) that the request originates from a whitelisted IP. For JWT requests, it verifies the token signature and confirms it has not expired. A failure here returns HTTP 401 Unauthorized.

**Gate 2 — Role Permission Check (403 on failure):**
Once identity is established, the system checks whether the authenticated user/key has permission to perform the requested action. A `finance` role user attempting to access a BOQ document would be rejected here. A failure returns HTTP 403 Forbidden.

**Gate 3 — Quota & Rate Limit Check (429 on failure):**
Even with valid identity and permissions, the request must pass resource checks. The system verifies the organization has not exceeded its `monthly_scan_limit` and that the API key's per-minute rate limit has not been breached. A failure returns HTTP 429 Too Many Requests, signaling the client to back off.

Only when all three gates pass does the request proceed to document processing.

---

## Step 2: Document Upload Flow

```
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                    DOCUMENT UPLOAD FLOW                                  │
  └─────────────────────────────────────────────────────────────────────────┘

    TWO ENTRY POINTS:

    ┌─────────────────────┐          ┌─────────────────────┐
    │  A. MANUAL UPLOAD    │          │  B. KAFKA EVENT      │
    │  (Web UI / API)      │          │  (From Axpert ERP)   │
    │                      │          │                      │
    │  User drags & drops  │          │  axpert.document     │
    │  file on dashboard   │          │  .uploaded event     │
    └──────────┬──────────┘          └──────────┬──────────┘
               │                                │
               ▼                                ▼
    ┌──────────────────────────────────────────────────────┐
    │                 UPLOAD PROCESSOR                       │
    │                                                       │
    │  1. Validate file                                     │
    │     ├── Size check (max 50MB)                         │
    │     ├── Format check (PDF/Word/Excel/Image)           │
    │     ├── Virus scan                                    │
    │     └── Reject if invalid → return error              │
    │                                                       │
    │  2. Generate tracking ID                              │
    │     └── doc_id: "DOC-2026-00001"                      │
    │                                                       │
    │  3. Store original file                               │
    │     └── S3/Azure Blob → encrypted at rest             │
    │                                                       │
    │  4. Create DB record                                  │
    │     ├── doc_id, org_id, uploaded_by                   │
    │     ├── file_name, file_size, file_type               │
    │     ├── status: "uploaded"                            │
    │     ├── source: "manual" or "kafka"                   │
    │     └── created_at: timestamp                         │
    │                                                       │
    │  5. Push to processing queue                          │
    │     └── BullMQ job created                            │
    │                                                       │
    └──────────────────────┬───────────────────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   QUEUE       │
                    │  (BullMQ)     │
                    │  Waiting...   │
                    └──────┬───────┘
                           │
                           ▼
                      STEP 3...
```

### 2.1 Two Entry Points

Documents enter the Control Tower through one of two channels:

**A. Manual Upload (Web UI / API):**
Human users interact with the Control Tower dashboard — a web interface where they can drag and drop files or use a file picker. This is the primary interface for ad-hoc document processing, one-off uploads, and organizations that don't have ERP integration. The same upload endpoint (`POST /api/documents/upload`) can also be called directly via API for programmatic uploads that don't go through Kafka.

**B. Kafka Event (From Axpert ERP):**
For organizations using Axpert ERP (or similar integrated systems), documents flow in automatically. When a document is uploaded or generated in Axpert, the ERP publishes a Kafka event to the topic `axpert.document.uploaded`. The Control Tower's Kafka consumer service listens on this topic, receives the event (which contains metadata and a reference to the file location), and feeds it into the same upload processing pipeline. This enables **zero-touch automation** — documents flow from the ERP into AI processing without any human intervention.

Both entry points converge into a single **Upload Processor**, ensuring consistent handling regardless of source.

### 2.2 Upload Processor — 5-Step Ingestion

**Step 2.1 — File Validation:**
Before any storage or processing occurs, the file undergoes strict validation:
- **Size check**: Files larger than 50MB are rejected. This prevents abuse and ensures the processing pipeline can handle files within reasonable memory and time constraints.
- **Format check**: Only supported formats are accepted — PDF, Word (.docx), Excel (.xlsx), and image files (PNG, JPG, TIFF). Unsupported formats (e.g., .exe, .zip) are immediately rejected.
- **Virus scan**: The file is scanned for malware before being stored. This is critical since documents can come from external ERP systems or user uploads and must not introduce threats into the infrastructure.
- **Rejection**: If any validation fails, the system returns an error response immediately with a descriptive message. No database record is created, no file is stored — the invalid upload is discarded entirely.

**Step 2.2 — Tracking ID Generation:**
Each accepted document is assigned a unique, human-readable tracking ID following the format `DOC-YYYY-NNNNN` (e.g., `DOC-2026-00001`). This ID is used throughout the system — in the processing pipeline, in the review queue, in the audit trail, and in notifications. The sequential numbering is scoped per organization, so each org has its own clean sequence.

**Step 2.3 — Secure File Storage:**
The original file is stored in cloud object storage (S3 or Azure Blob Storage, depending on deployment). Files are **encrypted at rest** using the cloud provider's server-side encryption. The storage path includes the organization ID and document ID for clean namespacing (e.g., `s3://controltower-docs/org_aladrak/DOC-2026-00001/original.pdf`). The original file is preserved immutably — all processing operates on copies, ensuring the source document is always available for re-processing or auditing.

**Step 2.4 — Database Record Creation:**
A record is created in the `documents` table with the following fields:
- `doc_id` — The generated tracking ID.
- `org_id` — The organization this document belongs to (for multi-tenant isolation).
- `uploaded_by` — The user ID or API key that initiated the upload.
- `file_name` — The original filename (for display purposes).
- `file_size` — File size in bytes.
- `file_type` — MIME type or extension (e.g., `application/pdf`).
- `status` — Set to `"uploaded"` — the initial state in the document lifecycle.
- `source` — Either `"manual"` (web UI / API) or `"kafka"` (ERP integration).
- `created_at` — Timestamp of upload.

This record serves as the central tracking entity that all subsequent steps update.

**Step 2.5 — Push to Processing Queue:**
Finally, a job is created in the **BullMQ** queue with the document ID as the payload. BullMQ (a Redis-backed job queue for Node.js) provides reliable, persistent job processing with:
- **Retry logic** — Failed jobs can be automatically retried with configurable backoff.
- **Priority queues** — Enterprise-tier organizations could get higher priority.
- **Concurrency control** — The number of parallel processing workers is configurable.
- **Dead letter queue** — Jobs that fail after all retries are moved to a dead letter queue for manual investigation.

The document status remains `"uploaded"` while in the queue. Once a worker picks it up, the status transitions to `"processing"`.

---

## Step 3: AI Processing Pipeline

```
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                    AI PROCESSING PIPELINE                                │
  └─────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐
    │  FROM QUEUE   │
    │  Job picked   │
    └──────┬───────┘
           │
           ▼
    ┌──────────────────────────────────────┐
    │  1. FILE CONVERSION                  │
    │                                      │
    │  ┌─────────┐  ┌────────────────────┐ │
    │  │Digital  │─▶│ pdf-parse          │ │
    │  │PDF      │  │ (direct text)      │ │
    │  └─────────┘  └────────────────────┘ │
    │  ┌─────────┐  ┌────────────────────┐ │
    │  │Scanned  │─▶│ OCR Engine         │ │    ┌─────────────────┐
    │  │PDF/Image│  │ (image → text)     │─────▶│ COST: OCR CALL  │
    │  └─────────┘  └────────────────────┘ │    │ $0.01 per page  │
    │  ┌─────────┐  ┌────────────────────┐ │    └─────────────────┘
    │  │Word     │─▶│ mammoth            │ │
    │  │(.docx)  │  │ (extract text)     │ │
    │  └─────────┘  └────────────────────┘ │
    │  ┌─────────┐  ┌────────────────────┐ │
    │  │Excel    │─▶│ exceljs            │ │
    │  │(.xlsx)  │  │ (cells → text)     │ │
    │  └─────────┘  └────────────────────┘ │
    │                                      │
    │  status: "processing"                │
    └──────────────┬───────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────────┐
    │  2. DOCUMENT CLASSIFICATION          │
    │                                      │    ┌─────────────────┐
    │  Send text to Claude AI ─────────────────▶│ COST: AI CALL #1│
    │  "What type of document is this?"    │    │ ~$0.003         │
    │                                      │    └─────────────────┘
    │  Result:                             │
    │  ├── type: "INVOICE"                 │
    │  ├── confidence: 97%                 │
    │  └── language: "English"             │
    │                                      │
    └──────────────┬───────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────────┐
    │  3. FIELD EXTRACTION                 │
    │                                      │
    │  Based on detected type, send to     │    ┌─────────────────┐
    │  Claude AI with correct schema ──────────▶│ COST: AI CALL #2│
    │                                      │    │ ~$0.01-0.05     │
    │  Invoice → INVOICE_SCHEMA            │    │ (depends on     │
    │  BOQ     → BOQ_SCHEMA                │    │  document size) │
    │  Contract→ CONTRACT_SCHEMA           │    └─────────────────┘
    │  RFQ     → RFQ_SCHEMA                │
    │  Expense → EXPENSE_SCHEMA            │
    │                                      │
    │  Output: structured JSON with        │
    │  confidence per field                │
    │                                      │
    └──────────────┬───────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────────┐
    │  4. VALIDATION ENGINE (no AI cost)   │
    │                                      │
    │  ├── Math checks (qty × rate = amt)  │
    │  ├── Duplicate check (DB lookup)     │
    │  ├── PO/GRN match (DB lookup)        │
    │  ├── Vendor match (DB lookup)        │
    │  ├── Tax validation (rule-based)     │
    │  └── Tolerance checks (configured)   │
    │                                      │
    │  Cost: $0.00 (all local processing)  │
    └──────────────┬───────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────────┐
    │  5. SAVE RESULTS                     │
    │                                      │
    │  ├── extraction_results table        │
    │  ├── validation_results table        │
    │  ├── Update doc status:              │
    │  │   "completed" or "needs_review"   │
    │  ├── Log to audit_trail              │
    │  └── Log to cost_tracking            │
    │                                      │
    │  status: "completed"                 │
    └──────────────┬───────────────────────┘
                   │
                   ▼
                STEP 4...
```

This is the core of the system — where raw files become structured, validated data. The pipeline has 5 sub-steps, each with clear cost implications.

### 3.1 File Conversion

The first task is to extract raw text from the uploaded file. Different file formats require different extraction strategies:

| File Type | Library/Tool | Method | Cost |
|-----------|-------------|--------|------|
| **Digital PDF** | `pdf-parse` | Direct text extraction from the PDF's text layer | $0.00 (local) |
| **Scanned PDF / Image** | OCR Engine (e.g., Tesseract, Azure Document Intelligence) | Optical character recognition — the image is analyzed to produce text | **$0.01 per page** |
| **Word (.docx)** | `mammoth` | Parses the OOXML structure and extracts text content | $0.00 (local) |
| **Excel (.xlsx)** | `exceljs` | Iterates through sheets and cells, converting cell values to a text representation | $0.00 (local) |

The system detects whether a PDF is digital (has a text layer) or scanned (image-only) and routes accordingly. **OCR is the only conversion step that incurs cost**, at approximately $0.01 per page — this is tracked and attributed to the document's organization.

After conversion, the document's status is updated to `"processing"` in the database.

### 3.2 Document Classification (AI Call #1)

With the extracted text in hand, the system sends it to **Claude AI** with a classification prompt: *"What type of document is this?"*

The AI returns:
- **type** — The document category (e.g., `INVOICE`, `BOQ`, `CONTRACT`, `RFQ`, `EXPENSE`).
- **confidence** — A percentage indicating how certain the model is about its classification (e.g., 97%).
- **language** — The detected language of the document (e.g., "English", "Arabic").

**Cost: ~$0.003 per classification call.** This is the cheapest AI call in the pipeline because the prompt is short and the response is a small structured object. The classification result determines which extraction schema to use in the next step — getting this right is critical, because using the wrong schema would produce garbage output.

### 3.3 Field Extraction (AI Call #2)

Based on the classification result, the system selects the appropriate extraction schema and sends the full document text to Claude AI with a structured extraction prompt. The schema defines exactly which fields to extract:

- **INVOICE_SCHEMA** — Vendor name, invoice number, date, line items (description, quantity, rate, amount), subtotal, tax, total, payment terms, bank details, etc.
- **BOQ_SCHEMA** — Project name, section, item descriptions, quantities, units, unit rates, amounts, totals.
- **CONTRACT_SCHEMA** — Parties involved, contract number, effective date, expiry date, terms, obligations, values, signatures.
- **RFQ_SCHEMA** — Requester, items requested, specifications, quantities, delivery requirements, deadline.
- **EXPENSE_SCHEMA** — Claimant, expense category, date, amount, receipt details, approval status.

The AI returns a **structured JSON object** with the extracted field values, and critically, a **confidence score per field**. For example:

```json
{
  "vendor_name": { "value": "Al Adrak Building Materials", "confidence": 0.98 },
  "invoice_number": { "value": "INV-2026-0042", "confidence": 0.99 },
  "total_amount": { "value": 15750.00, "confidence": 0.95 },
  "line_items": [
    {
      "description": { "value": "Portland Cement 50kg", "confidence": 0.92 },
      "quantity": { "value": 200, "confidence": 0.96 },
      "rate": { "value": 45.00, "confidence": 0.88 },
      "amount": { "value": 9000.00, "confidence": 0.94 }
    }
  ]
}
```

**Cost: ~$0.01–$0.05 per extraction call**, depending on document size. Longer documents (multi-page invoices with many line items, detailed contracts) consume more tokens and thus cost more. This is the most expensive AI call in the pipeline.

### 3.4 Validation Engine (No AI Cost)

After extraction, the results pass through a **rule-based validation engine** — no AI calls are made, so this step costs $0.00. The validation engine performs:

- **Math checks** — Verifies arithmetic consistency. For invoices: does `quantity × rate = line amount`? Does the sum of line amounts equal the subtotal? Does `subtotal + tax = total`? Discrepancies are flagged.
- **Duplicate check** — Queries the database to see if a document with the same invoice number + vendor combination has already been processed. Prevents double-entry of the same invoice.
- **PO/GRN match** — For invoices that reference a Purchase Order (PO) or Goods Receipt Note (GRN), the system looks up the PO/GRN in the database and verifies that quantities and amounts match within tolerance.
- **Vendor match** — Checks if the extracted vendor name matches a known vendor in the organization's master data. Fuzzy matching may be used to handle minor spelling variations.
- **Tax validation** — Applies country/region-specific tax rules. For example, verifying that VAT is calculated at the correct rate, or that the tax registration number format is valid.
- **Tolerance checks** — Configurable per organization. For example, an org might allow a 2% variance between PO amount and invoice amount before flagging a mismatch.

Validation results are recorded per field — each check either passes or produces a warning/error that is attached to the field for downstream review.

### 3.5 Save Results

All outputs from the pipeline are persisted:

- **extraction_results table** — The full structured JSON with all extracted fields and their confidence scores.
- **validation_results table** — The results of each validation check (pass/fail/warning per field).
- **Document status update** — The document status is updated to either:
  - `"completed"` — All fields are high confidence and all validations pass. Ready for consumption.
  - `"needs_review"` — One or more fields have medium/low confidence, or a validation check flagged an issue.
- **audit_trail** — A log entry recording who/what processed the document, when each step occurred, and the outcome.
- **cost_tracking** — The total cost for processing this document (OCR cost + AI call #1 cost + AI call #2 cost), attributed to the organization.

---

## Step 4: Result Output & Review

```
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                    RESULT OUTPUT & REVIEW                                │
  └─────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────────────────────────────────────┐
    │           CONFIDENCE-BASED ROUTING                │
    │                                                   │
    │         All fields >= 95%                         │
    │  ┌──────────────────────────────────┐             │
    │  │  AUTO-APPROVED                    │             │
    │  │  -> Results saved directly        │             │
    │  │  -> Available on dashboard        │             │
    │  │  -> Notification sent             │             │
    │  └──────────────────────────────────┘             │
    │                                                   │
    │         Any field 70-95%                          │
    │  ┌──────────────────────────────────┐             │
    │  │  HUMAN REVIEW QUEUE              │             │
    │  │  -> Assigned to reviewer by role  │             │
    │  │  -> Side-by-side review screen    │             │
    │  │  -> User corrects -> saves        │             │
    │  │  -> Corrections feed training     │             │
    │  └──────────────────────────────────┘             │
    │                                                   │
    │         Any field < 70%                           │
    │  ┌──────────────────────────────────┐             │
    │  │  MANUAL ENTRY                     │             │
    │  │  -> Flagged as low confidence     │             │
    │  │  -> User manually fills fields    │             │
    │  │  -> Manual entries feed training  │             │
    │  └──────────────────────────────────┘             │
    └──────────────────────────────────────────────────┘

    NOTIFICATION:
    ┌──────────────────────────────────────────────────┐
    │  -> In-app notification (Control Tower dashboard) │
    │  -> Email notification (configurable)             │
    │  -> Kafka event back (for Axpert to consume)      │
    │     topic: controltower.document.processed        │
    └──────────────────────────────────────────────────┘
```

### 4.1 Confidence-Based Routing

The extracted data doesn't go to a single destination — it's **routed based on the confidence scores** of the extracted fields. This is the key to balancing automation speed with data accuracy:

**Tier 1 — Auto-Approved (All fields >= 95% confidence):**
When every extracted field has a confidence of 95% or higher and all validation checks pass, the document is **automatically approved** with no human involvement. The extracted data is saved as final, immediately appears on the organization's dashboard, and a notification is sent. This is the ideal path — maximum automation, minimum cost, fastest throughput.

**Tier 2 — Human Review Queue (Any field 70–95% confidence):**
If any field falls between 70% and 95% confidence, the document is routed to the **human review queue**. The system assigns it to a reviewer based on the user's role — for example, an invoice with a questionable amount goes to a finance-role user, while a BOQ with unclear quantities goes to procurement. The reviewer sees a **side-by-side screen**: the original document on the left, the extracted data on the right, with low-confidence fields highlighted. The reviewer corrects any errors and saves. Crucially, **corrections feed back into a training loop** — over time, the AI learns from reviewer corrections and the percentage of documents requiring review decreases.

**Tier 3 — Manual Entry (Any field < 70% confidence):**
When any field drops below 70% confidence, the system considers the extraction unreliable. The document is **flagged for manual entry** — the user must fill in the fields by hand, typically referring to the original document. This is the most expensive path in terms of human labor, but it ensures data quality is never compromised. Like Tier 2, manual entries are captured as training data to improve future extraction accuracy.

The confidence thresholds (95% and 70%) are likely configurable per organization, allowing each org to tune the trade-off between automation and accuracy based on their tolerance for errors.

### 4.2 Notifications

When a document completes processing (regardless of which confidence tier it falls into), notifications are dispatched through three channels:

- **In-app notification** — Appears on the Control Tower dashboard. Users see a real-time notification badge or toast indicating a new document has been processed or requires their review.
- **Email notification** — Sent to relevant users (configurable per organization). For example, a finance manager might opt to receive an email whenever an invoice over $10,000 is flagged for review.
- **Kafka event** — For organizations with ERP integration, the Control Tower publishes a Kafka event to the topic `controltower.document.processed`. Axpert ERP (or any subscribing system) consumes this event and can automatically update its records with the extracted data. This closes the loop — documents flow from ERP → Control Tower → back to ERP, fully automated for high-confidence extractions.

---

## Step 5: Cost & Tracking

Cost tracking is woven throughout the entire pipeline rather than being a standalone processing step. Every operation that incurs a cost is logged in real-time to the `cost_tracking` table.

### 5.1 Per-Document Cost Breakdown

Each processed document has an itemized cost record:

| Processing Step | Cost Component | Typical Cost |
|----------------|---------------|-------------|
| File Conversion — Digital PDF/Word/Excel | Local processing | $0.00 |
| File Conversion — Scanned PDF/Image (OCR) | OCR API call | ~$0.01 per page |
| Document Classification | AI Call #1 (Claude) | ~$0.003 |
| Field Extraction | AI Call #2 (Claude) | ~$0.01–$0.05 |
| Validation Engine | Local processing | $0.00 |
| **Total per document** | | **~$0.01–$0.07** |

For a typical 3-page digital PDF invoice, the cost is approximately: $0.00 (conversion) + $0.003 (classification) + $0.02 (extraction) = **~$0.023 per document**.

For a 10-page scanned PDF, the cost rises: $0.10 (OCR, 10 pages) + $0.003 (classification) + $0.05 (extraction, larger text) = **~$0.153 per document**.

### 5.2 Organization-Level Tracking

Costs roll up to the organization level for billing and analytics:

- **Monthly cost by org** — Total processing cost attributed to each organization during a billing cycle.
- **Cost by document type** — Which document types are most expensive to process (scanned vs. digital, invoices vs. contracts).
- **Cost by source** — Whether Kafka-ingested documents have different cost profiles than manual uploads (e.g., ERP documents might be more consistently formatted and thus cheaper to extract).
- **Usage vs. quota** — How many of the organization's `monthly_scan_limit` have been consumed, and how much budget remains.

### 5.3 Audit Trail

The `audit_trail` table provides a complete, immutable history of every action taken on every document:

- Upload events (who uploaded, when, from which source).
- Processing events (each pipeline step with timestamps and outcomes).
- Review events (who reviewed, what they changed, when they approved).
- Cost events (each billable operation with exact amounts).
- Access events (who viewed the document or its extracted data).

This audit trail is essential for compliance, dispute resolution, and operational visibility. In regulated industries, it provides the evidence chain needed for financial audits — proving that an invoice amount was AI-extracted, human-verified, and approved by an authorized user before payment.

---

## Technology Summary

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Job Queue | **BullMQ** (Redis-backed) | Reliable async job processing with retries, priorities, and dead letter queues |
| Event Streaming | **Apache Kafka** | Bidirectional ERP integration (ingest from Axpert, publish processed results) |
| Object Storage | **S3 / Azure Blob** | Encrypted-at-rest storage for original document files |
| AI Engine | **Claude AI** | Document classification and structured field extraction |
| PDF Parsing | **pdf-parse** | Text extraction from digital PDFs |
| OCR | OCR Engine (e.g., Tesseract / Azure DI) | Image-to-text for scanned documents |
| Word Parsing | **mammoth** | Text extraction from .docx files |
| Excel Parsing | **exceljs** | Cell-to-text extraction from .xlsx files |
| Auth | JWT + API Keys | Dual authentication: human users (JWT) and machine integrations (API keys) |
| RBAC | Custom role system | 5 roles (admin, manager, finance, procurement, viewer) with granular permissions |

---

## Document Lifecycle States

A document transitions through the following states during its lifecycle:

```
uploaded → processing → completed
                     → needs_review → completed (after human review)
                     → manual_entry → completed (after manual fill)
                     → failed (if pipeline error after retries)
```

- **uploaded** — File received, validated, stored, and queued.
- **processing** — Worker has picked up the job; conversion + AI pipeline is running.
- **completed** — All fields extracted, validated, and either auto-approved or human-approved.
- **needs_review** — Extraction done but some fields have medium confidence (70–95%); awaiting human reviewer.
- **manual_entry** — Some fields have low confidence (<70%); requires manual data entry.
- **failed** — Processing encountered an unrecoverable error after all retries are exhausted; moved to dead letter queue for investigation.
