import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.upload import UPLOAD_DIR, router as upload_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Ensure uploads directory exists on startup."""
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(
    title="Tobira API",
    description="Backend API for panel-aware comic reader",
    version="0.1.0",
    lifespan=lifespan,
)

# Read frontend origin from environment, default to localhost for dev
frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")

# Configure CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(upload_router)
