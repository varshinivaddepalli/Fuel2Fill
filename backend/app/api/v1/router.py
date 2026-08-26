from fastapi import APIRouter

from app.api.v1.endpoints import health, chat, click_astra

api_router = APIRouter()

# Include routers
api_router.include_router(health.router, tags=["health"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(click_astra.router, prefix="/click-astra", tags=["click-astra"])
