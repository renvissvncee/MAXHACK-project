from uuid import uuid4
from sqlalchemy import select, func, and_, or_, true
from sqlalchemy.dialects.postgresql import insert
from app.models import Review, StayRequest, User
from app.errors import AppError
from app.schemas.reviews import ReviewResponse, ReviewPage
from app.services.requests import public_profile
from app.services.notifications import enqueue


def response(row, author):
    return ReviewResponse(id=row.id, subject_id=row.subject_id, rating=row.rating, text=row.text,
                          author=public_profile(author), created_at=row.created_at, updated_at=row.updated_at)


async def save_review(db, author, subject_id, data):
    if author.id == subject_id:
        raise AppError("self_review", "Нельзя оставить отзыв о себе.", 422)
    if await db.get(User, subject_id) is None:
        raise AppError("user_not_found", "Пользователь не найден.", 404)
    matched = await db.scalar(select(StayRequest.id).where(
        StayRequest.status == "accepted", or_(
            and_(StayRequest.guest_id == author.id, StayRequest.host_id == subject_id),
            and_(StayRequest.host_id == author.id, StayRequest.guest_id == subject_id))).limit(1))
    if matched is None:
        raise AppError("match_required", "Отзыв доступен только после взаимного согласия на общение.", 403)
    values = data.model_dump()
    candidate_id = uuid4()
    statement = insert(Review).values(id=candidate_id, author_id=author.id, subject_id=subject_id, **values)
    # Atomic UPSERT preserves one vote even for simultaneous saves or several matches.
    statement = statement.on_conflict_do_update(
        index_elements=[Review.author_id, Review.subject_id],
        set_={**values, "updated_at": func.now()},
    ).returning(Review)
    row = (await db.execute(statement)).scalar_one()
    if row.id == candidate_id:
        await enqueue(db, subject_id, "review_created", f"review_created:{row.id}", subject_id)
    result = response(row, author)
    await db.commit()
    return result


async def reputation_map(db, user_ids):
    if not user_ids:
        return {}
    rows = (await db.execute(select(Review.subject_id, func.avg(Review.rating), func.count(Review.id))
                            .where(Review.subject_id.in_(user_ids)).group_by(Review.subject_id))).all()
    return {uid: (float(round(rating, 1)), count) for uid, rating, count in rows}


async def read_reviews(db, subject_id, limit, offset):
    if await db.get(User, subject_id) is None:
        raise AppError("user_not_found", "Пользователь не найден.", 404)
    # Aggregates and page rows share a single PostgreSQL snapshot.
    summary = select(func.avg(Review.rating).label("rating"), func.count(Review.id).label("count")).where(
        Review.subject_id == subject_id).subquery()
    page = select(Review.id.label("review_id")).where(Review.subject_id == subject_id).order_by(
        Review.created_at.desc(), Review.id).limit(limit).offset(offset).subquery()
    rows = (await db.execute(select(summary.c.rating, summary.c.count, Review, User).select_from(summary)
                            .outerjoin(page, true()).outerjoin(Review, Review.id == page.c.review_id)
                            .outerjoin(User, User.id == Review.author_id)
                            .order_by(Review.created_at.desc(), Review.id))).all()
    rating, count = rows[0][0:2]
    return ReviewPage(rating=float(round(rating, 1)) if rating is not None else None,
                      reviews_count=count, items=[response(row, author) for _, _, row, author in rows if row])


async def own_review(db, author, subject_id):
    if await db.get(User, subject_id) is None:
        raise AppError("user_not_found", "Пользователь не найден.", 404)
    row = await db.scalar(select(Review).where(Review.author_id == author.id, Review.subject_id == subject_id))
    return response(row, author) if row else None
