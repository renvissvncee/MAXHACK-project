from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError


class AppError(Exception):
    def __init__(self, code: str, message: str, status: int):
        self.code, self.message, self.status = code, message, status


async def app_error_handler(request: Request, error: AppError):
    return JSONResponse(status_code=error.status, content={"error": {"code": error.code, "message": error.message}})


async def validation_error_handler(request: Request, error: RequestValidationError):
    # Default validation responses can echo initData or other sensitive input.
    return JSONResponse(status_code=422, content={"error": {"code": "validation_error", "message": "Проверьте формат и ограничения полей."}})


async def database_error_handler(request: Request, error: SQLAlchemyError):
    return JSONResponse(status_code=503, content={"error": {"code": "database_unavailable", "message": "Не удалось выполнить операцию. Попробуйте позже."}})
