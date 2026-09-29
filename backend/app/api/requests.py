from typing import Literal
from uuid import UUID
from fastapi import APIRouter, Depends, Query, Request
from app.api.dependencies import CurrentUser, check_origin
from app.db import DbSession
from app.schemas.profile import ErrorResponse
from app.schemas.requests import RequestInput, RequestDecision, RequestResponse, ContactResponse
from app.services import requests as service

router = APIRouter(prefix="/api/requests", tags=["requests"], responses={
    status: {"model": ErrorResponse} for status in (401, 403, 404, 409, 422, 502, 503)
})


@router.post("", response_model=RequestResponse, dependencies=[Depends(check_origin)])
async def create(data: RequestInput, user: CurrentUser, db: DbSession):
    return await service.create_request(db, user, data)


@router.get("", response_model=list[RequestResponse])
async def collection(user: CurrentUser, db: DbSession, direction: Literal["incoming", "outgoing"],
                     limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0)):
    return await service.list_requests(db, user, direction, limit, offset)


@router.get("/{request_id}", response_model=RequestResponse)
async def detail(request_id: UUID, user: CurrentUser, db: DbSession):
    return await service.response(db, await service.participant_request(db, user, request_id))


@router.patch("/{request_id}", response_model=RequestResponse, dependencies=[Depends(check_origin)])
async def decide(request_id: UUID, data: RequestDecision, user: CurrentUser, db: DbSession):
    return await service.decide_request(db, user, request_id, data.status)


@router.post("/{request_id}/contact", response_model=ContactResponse, dependencies=[Depends(check_origin)])
async def contact(request_id: UUID, user: CurrentUser, db: DbSession, request: Request):
    return await service.get_contact(db, user, request_id, request.app.state.settings,
                                     getattr(request.app.state, "max_transport", None))
