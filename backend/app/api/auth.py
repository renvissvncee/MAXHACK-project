from fastapi import APIRouter, Depends, Request, Response

from app.api.dependencies import check_origin, request_session_token
from app.db import DbSession
from app.errors import AppError
from app.max_bot.validation import validate_init_data
from app.schemas.profile import ErrorResponse, LoginRequest, LoginResponse
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


def set_session_cookie(response: Response, token: str, lifetime: int, secure: bool) -> None:
    response.set_cookie(auth.COOKIE_NAME, token, max_age=lifetime,
                        httponly=True, secure=secure,
                        samesite=session_cookie_samesite(secure), path="/api")
    if secure:
        # Python 3.13's stdlib cannot serialize CHIPS yet, although browsers can.
        # Add the flag to Starlette's already validated Set-Cookie header. This
        # lets MAX Web keep our HttpOnly session in a partition of its iframe.
        name, value = response.raw_headers[-1]
        if name.lower() == b"set-cookie":
            response.raw_headers[-1] = (name, value + b"; Partitioned")


def delete_session_cookie(response: Response, secure: bool) -> None:
    response.delete_cookie(auth.COOKIE_NAME, path="/api", httponly=True,
                           secure=secure, samesite=session_cookie_samesite(secure))
    if secure:
        name, value = response.raw_headers[-1]
        if name.lower() == b"set-cookie":
            response.raw_headers[-1] = (name, value + b"; Partitioned")


@router.post("/max", response_model=LoginResponse)
async def login(body: LoginRequest, request: Request, response: Response, db: DbSession):
    settings = request.app.state.settings
    if not settings.max_bot_token or not settings.max_bot_token.get_secret_value():
        raise AppError("auth_not_configured", "Вход через MAX пока не настроен.", 503)
    identity = validate_init_data(body.initData, settings.max_bot_token.get_secret_value(), settings.init_data_max_age_seconds)
    user, token = await auth.login(db, identity, settings.session_ttl_seconds, request_session_token(request))
    set_session_cookie(response, token, settings.session_ttl_seconds, settings.cookie_secure)
    return LoginResponse.from_login(user, token)


@router.post("/logout", status_code=204)
async def logout(request: Request, db: DbSession):
    await auth.logout(db, request_session_token(request))
    response = Response(status_code=204)
    delete_session_cookie(response, request.app.state.settings.cookie_secure)
    return response
