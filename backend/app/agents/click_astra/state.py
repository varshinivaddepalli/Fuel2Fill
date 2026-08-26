"""State schema for Click Astra agent."""

from typing import TypedDict, Any, Optional


class ClickAstraState(TypedDict):
    """State for the Click Astra OCR processing workflow."""

    # Input
    record_id: str
    image_url: str
    extraction_columns: list[str]
    llm_instructions: Optional[str]

    # Processing state
    ocr_result: Optional[dict[str, Any]]
    ocr_markdown: Optional[str]
    extracted_data: Optional[dict[str, Any]]

    # Output
    error: Optional[str]
    success: bool
