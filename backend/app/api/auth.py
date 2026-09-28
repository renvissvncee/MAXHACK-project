from fastapi import APIRouter, Depends, Request, Response

from app.api.dependencies import check_origin
from app.db import DbSession
from app.errors import AppError
from app.max_bot.validation import validate_init_data
from app.schemas.profile import ErrorResponse, LoginRequest, ProfileResponse
from app.services import auth

router = APIRouter(prefix="/api/auth", tags=["auth"], dependencies=[Depends(check_origin)],
                   responses={401: {"model": ErrorResponse}, 403: {"model": ErrorResponse},
                              422: {"model": ErrorResponse}, 503: {"model": ErrorResponse}})


def session_cookie_samesite(secure: bool) -> str:
    # MAX Web embeds the mini-app cross-site. Browsers do not send Lax cookies
    # from that iframe, so HTTPS deployments must explicitly allow the cookie.
    # Keep Lax for plain-HTTP local development because SameSite=None requires
    # the Secure attribute in modern browsers.
    return "none" if secure else "lax"


@router.post("/max", response_model=ProfileResponse)
async def login(body: LoginRequest, request: Request, response: Response, db: DbSession):
    settings = request.app.state.settings
    if not settings.max_bot_token or not settings.max_bot_token.get_secret_value():
        raise AppError("auth_not_configured", "Вход через MAX пока не настроен.", 503)
    identity = validate_init_data(body.initData, settings.max_bot_token.get_secret_value(), settings.init_data_max_age_seconds)
    user, token = await auth.login(db, identity, settings.session_ttl_seconds, request.cookies.get(auth.COOKIE_NAME))
    response.set_cookie(auth.COOKIE_NAME, token, max_age=settings.session_ttl_seconds,
                        httponly=True, secure=settings.cookie_secure,
                        samesite=session_cookie_samesite(settings.cookie_secure), path="/api")
    return ProfileResponse.from_user(user)


@router.post("/logout", status_code=204)
async def logout(request: Request, db: DbSession):
    await auth.logout(db, request.cookies.get(auth.COOKIE_NAME))
    response = Response(status_code=204)
    response.delete_cookie(auth.COOKIE_NAME, path="/api", httponly=True,
                           secure=request.app.state.settings.cookie_secure,
                           samesite=session_cookie_samesite(request.app.state.settings.cookie_secure))
    return response
