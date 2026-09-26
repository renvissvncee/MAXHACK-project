import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError

from app.api.auth import router as auth_router
from app.api.profiles import router as profiles_router
from app.errors import AppError, app_error_handler, validation_error_handler, database_error_handler
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api.health import router
from app.config import Settings


def create_app(settings: Settings | None = None) -> FastAPI:
    configuration = settings or Settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        engine = create_async_engine(
            configuration.database_url.get_secret_value(), pool_pre_ping=True,
            connect_args={"timeout": configuration.database_timeout_seconds},
        )
        app.state.settings = configuration
        app.state.engine = engine
        app.state.session_factory = async_sessionmaker(engine, expire_on_commit=False)
        logging.getLogger(__name__).info("backend_started")
        try:
            yield
        finally:
            await engine.dispose()
            logging.getLogger(__name__).info("backend_stopped")

    app = FastAPI(title="Приют API", version="0.1.0", lifespan=lifespan)
    app.add_middleware(CORSMiddleware, allow_origins=configuration.allowed_origins,
                       allow_credentials=True, allow_methods=["GET", "POST", "PATCH"],
                       allow_headers=["Content-Type"])
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(SQLAlchemyError, database_error_handler)

    @app.middleware("http")
    async def private_responses(request, call_next):
        response = await call_next(request)
        if request.url.path.startswith("/api"):
            response.headers["Cache-Control"] = "no-store"
        return response

    app.include_router(router)
    app.include_router(auth_router)
    app.include_router(profiles_router)
    return app


