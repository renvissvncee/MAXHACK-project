import logging

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.db import check_database

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/health", tags=["health"])


class HealthResponse(BaseModel):
    status: str


@router.get("/live", response_model=HealthResponse)
async def live() -> HealthResponse:
    return HealthResponse(status="ok")


@router.get("/ready", response_model=HealthResponse,
            responses={503: {"model": HealthResponse, "description": "Database unavailable"}})
async def ready(request: Request):
    try:
        await check_database(request.app.state.engine,
                             request.app.state.settings.database_timeout_seconds)
    except Exception:
        # Do not log driver exceptions: they may include connection credentials.
        logger.warning("database_readiness_failed")
        return JSONResponse(status_code=503, content={"status": "unavailable"})
    return HealthResponse(status="ready")
