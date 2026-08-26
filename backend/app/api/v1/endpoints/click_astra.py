"""Click Astra OCR processing endpoints."""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from app.core.security import get_current_user, TokenData
from app.core.supabase import update_click_astra_record, get_client_id_by_email, get_db_connection
from app.agents.click_astra import ClickAstraAgent

router = APIRouter()


class ProcessRequest(BaseModel):
    """Request model for OCR processing."""
    record_id: str
    image_url: str
    extraction_columns: list[str]
    llm_instructions: Optional[str] = None


class ProcessResponse(BaseModel):
    """Response model for OCR processing."""
    success: bool
    record_id: str
    ocr_markdown: Optional[str] = None
    extracted_data: Optional[dict] = None
    error: Optional[str] = None


async def verify_record_ownership(record_id: str, client_id: str) -> bool:
    """Verify that the record belongs to the client."""
    async with get_db_connection() as conn:
        row = await conn.fetchrow(
            "SELECT client_id FROM click_astra WHERE id = $1",
            record_id
        )
        if not row:
            return False
        return str(row["client_id"]) == client_id


@router.post("/process", response_model=ProcessResponse)
async def process_document(
    request: ProcessRequest,
    current_user: TokenData = Depends(get_current_user),
):
    """
    Process a document with OCR and extract structured data.

    This endpoint:
    1. Calls Mistral OCR API to extract text from the image
    2. Uses Groq LLM to extract specified fields from the OCR text
    3. Returns the extracted data for human verification
    """
    # Validate user has email
    if not current_user.email:
        raise HTTPException(status_code=401, detail="Invalid token: missing email")

    # Get client_id for the user
    client_id = await get_client_id_by_email(current_user.email)
    if not client_id:
        raise HTTPException(status_code=403, detail="Client profile not found")

    # Verify record ownership
    if not await verify_record_ownership(request.record_id, client_id):
        raise HTTPException(status_code=403, detail="Access denied: record not found or not owned by user")

    try:
        agent = ClickAstraAgent()

        result = await agent.run(
            record_id=request.record_id,
            image_url=request.image_url,
            extraction_columns=request.extraction_columns,
            llm_instructions=request.llm_instructions,
        )

        if not result.get("success"):
            # Update database record with error
            await update_click_astra_record(
                record_id=request.record_id,
                processing_status="failed",
                error_message=result.get("error"),
            )

            return ProcessResponse(
                success=False,
                record_id=request.record_id,
                error=result.get("error"),
            )

        # Update database record with results
        await update_click_astra_record(
            record_id=request.record_id,
            processing_status="completed",
            ocr_extracted_data=result.get("ocr_result"),
            ai_response=result.get("extracted_data"),
        )

        return ProcessResponse(
            success=True,
            record_id=request.record_id,
            ocr_markdown=result.get("ocr_markdown"),
            extracted_data=result.get("extracted_data"),
        )

    except Exception as e:
        await update_click_astra_record(
            record_id=request.record_id,
            processing_status="failed",
            error_message=str(e),
        )
        raise HTTPException(status_code=500, detail=str(e))
