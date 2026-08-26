"""Click Astra LangGraph agent for OCR document processing."""

import json
import httpx
from typing import Any

import langsmith as ls
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from langgraph.graph import StateGraph, END

from app.config import get_settings
from app.agents.click_astra.state import ClickAstraState
from app.agents.click_astra.prompts import EXTRACTION_SYSTEM_PROMPT, EXTRACTION_PROMPT

settings = get_settings()

LANGSMITH_PROJECT = "click astra production"


class ClickAstraAgent:
    """LangGraph-based agent for OCR document processing."""

    def __init__(self):
        self.llm = ChatGroq(
            api_key=settings.groq_api_key,
            model=settings.click_astra_model,
            temperature=0,
        )
        self.mistral_api_key = settings.mistral_api_key
        self.graph = self._build_graph()

    def _build_graph(self) -> StateGraph:
        """Build the LangGraph workflow."""
        workflow = StateGraph(ClickAstraState)

        # Add nodes
        workflow.add_node("perform_ocr", self._perform_ocr)
        workflow.add_node("extract_data", self._extract_data)
        workflow.add_node("handle_error", self._handle_error)

        # Set entry point
        workflow.set_entry_point("perform_ocr")

        # Add conditional edges after OCR
        workflow.add_conditional_edges(
            "perform_ocr",
            lambda state: "extract" if state.get("ocr_markdown") else "error",
            {
                "extract": "extract_data",
                "error": "handle_error",
            },
        )

        workflow.add_edge("extract_data", END)
        workflow.add_edge("handle_error", END)

        return workflow.compile()

    async def _perform_ocr(self, state: ClickAstraState) -> ClickAstraState:
        """Perform OCR using Mistral API."""
        if not self.mistral_api_key:
            return {
                **state,
                "error": "Mistral API key not configured",
                "success": False,
            }

        try:
            image_url = state["image_url"]

            # Determine document type based on URL
            is_pdf = image_url.lower().endswith(".pdf")

            # Build request payload
            payload: dict[str, Any] = {
                "model": "mistral-ocr-latest",
                "document": {
                    "type": "document_url" if is_pdf else "image_url",
                },
            }

            if is_pdf:
                payload["document"]["document_url"] = image_url
            else:
                payload["document"]["image_url"] = image_url

            # Call Mistral OCR API
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    "https://api.mistral.ai/v1/ocr",
                    headers={
                        "Authorization": f"Bearer {self.mistral_api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )

                if response.status_code != 200:
                    error_detail = response.text
                    try:
                        error_json = response.json()
                        error_detail = error_json.get("message", error_detail)
                    except Exception:
                        pass
                    return {
                        **state,
                        "error": f"OCR API error ({response.status_code}): {error_detail}",
                        "success": False,
                    }

                ocr_result = response.json()

            # Extract markdown from all pages
            pages = ocr_result.get("pages", [])
            markdown_parts = []
            for page in pages:
                markdown = page.get("markdown", "")
                if markdown:
                    markdown_parts.append(markdown)

            full_markdown = "\n\n---\n\n".join(markdown_parts)

            if not full_markdown.strip():
                return {
                    **state,
                    "error": "OCR did not extract any text from the document",
                    "success": False,
                }

            return {
                **state,
                "ocr_result": ocr_result,
                "ocr_markdown": full_markdown,
            }

        except httpx.TimeoutException:
            return {
                **state,
                "error": "OCR request timed out",
                "success": False,
            }
        except Exception as e:
            return {
                **state,
                "error": f"OCR failed: {str(e)}",
                "success": False,
            }

    async def _extract_data(self, state: ClickAstraState) -> ClickAstraState:
        """Extract structured data from OCR text using LLM."""
        ocr_markdown = state.get("ocr_markdown", "")
        extraction_columns = state.get("extraction_columns", [])
        llm_instructions = state.get("llm_instructions") or "None"

        if not extraction_columns:
            return {
                **state,
                "extracted_data": {},
                "success": True,
            }

        try:
            # Build the extraction prompt
            columns_list = "\n".join(f"- {col}" for col in extraction_columns)
            prompt = EXTRACTION_PROMPT.format(
                ocr_text=ocr_markdown,
                columns=columns_list,
                instructions=llm_instructions,
            )

            messages = [
                SystemMessage(content=EXTRACTION_SYSTEM_PROMPT),
                HumanMessage(content=prompt),
            ]

            response = await self.llm.ainvoke(messages)
            content = response.content.strip()

            # Clean up response - remove markdown code blocks
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()

            # Parse JSON
            try:
                extracted_data = json.loads(content)
            except json.JSONDecodeError:
                # Try to extract JSON from the response
                import re
                json_match = re.search(r'\{[^{}]*\}', content, re.DOTALL)
                if json_match:
                    extracted_data = json.loads(json_match.group())
                else:
                    return {
                        **state,
                        "error": "Failed to parse LLM response as JSON",
                        "success": False,
                    }

            return {
                **state,
                "extracted_data": extracted_data,
                "success": True,
            }

        except Exception as e:
            return {
                **state,
                "error": f"Data extraction failed: {str(e)}",
                "success": False,
            }

    async def _handle_error(self, state: ClickAstraState) -> ClickAstraState:
        """Handle errors gracefully."""
        return {
            **state,
            "success": False,
        }

    async def run(
        self,
        record_id: str,
        image_url: str,
        extraction_columns: list[str],
        llm_instructions: str | None = None,
    ) -> ClickAstraState:
        """Run the agent and return final state."""
        initial_state: ClickAstraState = {
            "record_id": record_id,
            "image_url": image_url,
            "extraction_columns": extraction_columns,
            "llm_instructions": llm_instructions,
            "ocr_result": None,
            "ocr_markdown": None,
            "extracted_data": None,
            "error": None,
            "success": False,
        }

        with ls.tracing_context(project_name=LANGSMITH_PROJECT):
            result = await self.graph.ainvoke(
                initial_state,
                config={
                    "run_name": "Click Astra OCR",
                    "tags": ["click_astra", "production"],
                    "metadata": {
                        "record_id": record_id,
                        "columns_count": len(extraction_columns),
                        "has_instructions": bool(llm_instructions),
                    },
                },
            )
        return result
