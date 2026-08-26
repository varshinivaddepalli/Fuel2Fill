from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.api.v1.router import api_router
from app.core.supabase import init_db_pool, close_db_pool

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle - startup and shutdown."""
    # Startup: Initialize database connection pool
    await init_db_pool()
    yield
    # Shutdown: Flush pending LangSmith traces before closing
    try:
        from langchain_core.tracers.langchain import wait_for_all_tracers
        wait_for_all_tracers()
    except Exception:
        pass  # Tracing flush is best-effort; don't block shutdown
    # Shutdown: Close database connection pool
    await close_db_pool()


app = FastAPI(
    title="Petro Astra API",
    description="Backend API for Petro Astra fuel station management",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {"message": "Petro Astra API", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
    )
