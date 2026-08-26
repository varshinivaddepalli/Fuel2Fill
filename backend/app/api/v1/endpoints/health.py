from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "petro-astra-api",
        "version": "1.0.0",
    }


@router.get("/chat/health")
async def chat_health_check():
    """Health check for chat service."""
    return {
        "status": "healthy",
        "service": "ask-astra-chat",
        "version": "1.0.0",
    }
