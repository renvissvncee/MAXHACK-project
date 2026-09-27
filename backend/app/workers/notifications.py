"""Durable MAX delivery. Run one worker; PostgreSQL advisory lock enforces this."""
import argparse
import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from pydantic import Field, ValidationError
from sqlalchemy import and_, or_, select, update, text, func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.config import Settings
from app.models import Notification, User
from app.max_bot.client import MaxClient, MaxAPIError
from app.services.notifications import TEXTS

logger = logging.getLogger(__name__)
LOCK_ID = 712048531


class WorkerSettings(Settings):
    notification_delivery_enabled: bool = False
    notification_poll_seconds: float = Field(default=5, ge=1, le=60)
    notification_send_interval_seconds: float = Field(default=1.1, ge=1, le=60)
    notification_max_attempts: int = Field(default=6, ge=1, le=20)
    notification_lease_seconds: int = Field(default=120, ge=90, le=600)
    max_bot_username: str = Field(default="", pattern=r"^[A-Za-z0-9_]*$")
    max_mini_app_enabled: bool = False


@dataclass(frozen=True)
class Delivery:
    id: UUID
    lease_token: UUID
    recipient: int
    kind: str
    attempts: int


def now_utc():
    return datetime.now(timezone.utc)


async def claim(factory, settings, now=None):
    now = now or now_utc()
    async with factory() as db:
        async with db.begin():
            due = or_(and_(Notification.delivery_status == "pending", Notification.next_attempt_at <= now),
                      and_(Notification.delivery_status == "sending", Notification.lease_until <= now))
            # A crash on the final attempt cannot leave a job in sending forever.
            await db.execute(update(Notification).where(due, Notification.attempts >= settings.notification_max_attempts)
                             .values(delivery_status="failed", lease_token=None, lease_until=None,
                                     last_error="attempts_exhausted"))
            row = (await db.execute(select(Notification).where(due,
                Notification.attempts < settings.notification_max_attempts)
                .order_by(Notification.created_at, Notification.id)
                .with_for_update(skip_locked=True).limit(1))).scalar_one_or_none()
            if row is None:
                return None
            recipient = await db.scalar(select(User.max_user_id).where(User.id == row.recipient_id))
            row.delivery_status = "sending"
            row.attempts += 1
            row.lease_token = uuid4()
            row.lease_until = now + timedelta(seconds=settings.notification_lease_seconds)
            return Delivery(row.id, row.lease_token, recipient, row.kind, row.attempts)


def message_body(job, settings):
    body = {"text": TEXTS[job.kind]}
    if settings.max_mini_app_enabled and settings.max_bot_username:
        body["attachments"] = [{"type": "inline_keyboard", "payload": {"buttons": [[{
            "type": "link", "text": "Открыть Приют",
            "url": f"https://max.ru/{settings.max_bot_username}?startapp=notification_{job.id}",
        }]]}}]
    return body


def retryable(error):
    return error.status is None or error.status in (408, 429) or error.status >= 500


async def finish(factory, job, settings, *, message_id=None, error=None, now=None):
    now = now or now_utc()
    values = {"lease_until": None, "lease_token": None}
    if error is None:
        values.update(delivery_status="sent", sent_at=now, max_message_id=message_id, last_error=None)
    else:
        retry = retryable(error) and job.attempts < settings.notification_max_attempts
        delay = min(30 * 2 ** (job.attempts - 1), 1800)
        values.update(delivery_status="pending" if retry else "failed",
                      next_attempt_at=now + timedelta(seconds=delay),
                      last_error=f"http_{error.status}" if error.status else error.reason)
    async with factory() as db:
        result = await db.execute(update(Notification).where(Notification.id == job.id,
            Notification.delivery_status == "sending", Notification.lease_token == job.lease_token).values(**values))
        await db.commit()
        return result.rowcount == 1


async def deliver_one(factory, client, settings):
    job = await claim(factory, settings)
    if job is None:
        return False
    try:
        # Bound the whole operation, not only individual HTTP socket reads.
        async with asyncio.timeout(50):
            mid = await client.send_user_message(job.recipient, message_body(job, settings))
    except (MaxAPIError, TimeoutError) as failure:
        error = failure if isinstance(failure, MaxAPIError) else MaxAPIError(reason="timeout")
        await finish(factory, job, settings, error=error)
        logger.warning("notification_delivery_failed id=%s status=%s reason=%s attempt=%s",
                       job.id, error.status, error.reason, job.attempts)
        # Authentication/TLS config errors affect all recipients: stop, don't exhaust the entire queue.
        if error.status == 401 or error.reason == "tls_certificate_untrusted":
            raise error
    else:
        updated = await finish(factory, job, settings, message_id=mid)
        logger.info("notification_delivered id=%s recorded=%s", job.id, updated)
    return True


async def requeue(factory, notification_id):
    async with factory() as db:
        result = await db.execute(update(Notification).where(Notification.id == notification_id,
            Notification.delivery_status == "failed").values(delivery_status="pending", attempts=0,
            next_attempt_at=func.now(), lease_until=None, lease_token=None, last_error=None))
        await db.commit()
        return result.rowcount == 1


async def run(args):
    settings = WorkerSettings()
    if not (args.check or args.requeue or args.status) and not settings.notification_delivery_enabled:
        logger.info("notification_delivery_disabled; inbox events are still saved")
        return
    engine = create_async_engine(settings.database_url.get_secret_value(), pool_pre_ping=True,
                                 connect_args={"timeout": settings.database_timeout_seconds})
    factory = async_sessionmaker(engine, expire_on_commit=False)
    try:
        if args.status:
            async with factory() as db:
                rows = (await db.execute(select(Notification.delivery_status, func.count())
                                        .group_by(Notification.delivery_status))).all()
                for status, count in rows:
                    print(f"{status}: {count}")
            return
        if args.requeue:
            if not await requeue(factory, args.requeue):
                raise ValueError("Notification not found or not failed")
            logger.info("notification_requeued id=%s", args.requeue)
            return
        if settings.max_bot_token is None:
            raise ValueError("MAX_BOT_TOKEN required")
        async with MaxClient(settings.max_bot_token.get_secret_value()) as client:
            await client.get_me()
            if args.check:
                async with factory() as db:
                    await db.execute(select(Notification.id).limit(1))
                logger.info("notification_worker_check_ok")
                return
            # Keep this dedicated connection alive for the process lifetime. PostgreSQL
            # releases the session advisory lock when the worker crashes/disconnects.
            async with engine.connect() as leader:
                acquired = await leader.scalar(text("SELECT pg_try_advisory_lock(:key)"), {"key": LOCK_ID})
                await leader.commit()
                if not acquired:
                    raise ValueError("Another notification worker is already running")
                try:
                    while True:
                        # Fail if the lock connection is lost rather than silently becoming a second sender.
                        await leader.execute(text("SELECT 1"))
                        await leader.commit()
                        did_work = await deliver_one(factory, client, settings)
                        if args.once:
                            return
                        await asyncio.sleep(settings.notification_send_interval_seconds if did_work
                                            else settings.notification_poll_seconds)
                finally:
                    if not leader.invalidated:
                        await leader.execute(text("SELECT pg_advisory_unlock(:key)"), {"key": LOCK_ID})
                        await leader.commit()
    finally:
        await engine.dispose()


def main():
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true", help="Check DB schema and MAX credentials; no sends")
    mode.add_argument("--once", action="store_true", help="Attempt at most one due delivery, only if enabled")
    mode.add_argument("--status", action="store_true", help="Print counts by delivery status")
    mode.add_argument("--requeue", type=UUID, help="Requeue one failed notification after fixing the cause")
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")
    logging.getLogger("httpx").setLevel(logging.WARNING)
    try:
        asyncio.run(run(parser.parse_args()))
    except KeyboardInterrupt:
        pass
    except (MaxAPIError, SQLAlchemyError, ValidationError, ValueError, OSError, TimeoutError) as error:
        logger.error("notification_worker_stopped error_type=%s status=%s reason=%s",
                     type(error).__name__, getattr(error, "status", None), getattr(error, "reason", "configuration_or_database"))
        raise SystemExit(1) from None


if __name__ == "__main__":
    main()
