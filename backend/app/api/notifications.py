from uuid import UUID
from fastapi import APIRouter, Depends, Query
from app.api.dependencies import CurrentUser, check_origin
from app.db import DbSession
from app.schemas.notifications import NotificationPage, NotificationResponse
from app.schemas.profile import ErrorResponse
from app.services import notifications

router = APIRouter(prefix="/api/notifications", tags=["notifications"], responses={
    status: {"model": ErrorResponse} for status in (401, 403, 404, 422, 503)
})


@router.get("", response_model=NotificationPage)
async def collection(user: CurrentUser, db: DbSession, unread_only: bool = False,
                     limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0)):
    return await notifications.list_notifications(db, user, unread_only, limit, offset)


@router.post("/{notification_id}/read", response_model=NotificationResponse, dependencies=[Depends(check_origin)])
async def read(notification_id: UUID, user: CurrentUser, db: DbSession):
    return await notifications.mark_read(db, user, notification_id)


@router.get("/{notification_id}", response_model=NotificationResponse)
async def detail(notification_id: UUID, user: CurrentUser, db: DbSession):
    return await notifications.get_notification(db, user, notification_id)
