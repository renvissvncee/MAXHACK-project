"""Load a small deterministic demo dataset into PostgreSQL.

The records are synthetic and are meant for catalogue/UI demonstrations only.
They do not represent real MAX accounts or a live external integration.
"""

import argparse
import asyncio
from datetime import date, datetime, timezone
from uuid import NAMESPACE_URL, UUID, uuid5

from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.config import Settings
from app.models import Listing, Locality, Notification, Review, Session, StayRequest, User


def demo_id(kind: str, slug: str) -> UUID:
    return uuid5(NAMESPACE_URL, f"priut-demo:{kind}:{slug}")


def at(day: int, hour: int = 12) -> datetime:
    return datetime(2026, 9, day, hour, tzinfo=timezone.utc)


USERS = [
    dict(slug="alina", max_user_id=-9_000_000_001, name="Алина Гарипова", city="Казань", avatar_emoji="🌙", avatar_color="amber",
         bio="Гид-волонтёр. Люблю архитектуру, пешие маршруты и татарскую кухню.", interests=["Архитектура", "Прогулки", "Кухня"]),
    dict(slug="pavel", max_user_id=-9_000_000_002, name="Павел Лебедев", city="Нижний Новгород", avatar_emoji="🚲", avatar_color="forest",
         bio="Инженер и велотурист. Покажу набережные и видовые площадки без туристической спешки.", interests=["Велосипед", "Фотография", "История"]),
    dict(slug="irina", max_user_id=-9_000_000_003, name="Ирина Белова", city="Санкт-Петербург", avatar_emoji="📚", avatar_color="rose",
         bio="Редактор, исследую городскую историю и собираю коллекцию маршрутов по дворам.", interests=["Литература", "Музеи", "Городская история"]),
    dict(slug="roman", max_user_id=-9_000_000_004, name="Роман Савельев", city="Екатеринбург", avatar_emoji="🧗", avatar_color="ocean",
         bio="Разработчик и инструктор турклуба. Помогу спланировать безопасный маршрут по Уралу.", interests=["Походы", "Скалолазание", "IT"]),
    dict(slug="sofia", max_user_id=-9_000_000_005, name="Софья Маркова", city="Калининград", avatar_emoji="🎨", avatar_color="violet",
         bio="Иллюстратор и участница городского арт-сообщества. Знаю балтийские веломаршруты.", interests=["Искусство", "Море", "Велосипед"]),
    dict(slug="nikita", max_user_id=-9_000_000_006, name="Никита Орлов", city="Москва", avatar_emoji="🎸", avatar_color="midnight",
         bio="Музыкант, люблю небольшие концерты, парки и локальные кофейни.", interests=["Музыка", "Кофе", "Парки"]),
    dict(slug="mikhail", max_user_id=-9_000_000_007, name="Михаил Воронов", city="Москва", avatar_emoji="📷", avatar_color="sunset",
         bio="Путешествую на выходные, снимаю города и ищу местные истории.", interests=["Фотография", "История", "Путешествия"]),
    dict(slug="daria", max_user_id=-9_000_000_008, name="Дарья Ким", city="Казань", avatar_emoji="🌱", avatar_color="mint",
         bio="Езжу по России с ноутбуком, ценю тихие места и экологичный туризм.", interests=["Экотуризм", "Дизайн", "Коворкинги"]),
    dict(slug="lev", max_user_id=-9_000_000_009, name="Лев Чернов", city="Самара", avatar_emoji="🏃", avatar_color="amber",
         bio="Бегу полумарафоны и совмещаю старты с короткими поездками.", interests=["Бег", "Спорт", "Архитектура"]),
]


LISTINGS = [
    dict(slug="kazan-room", owner="alina", city="Казань", title="Комната в Старо-Татарской слободе", short_description="Тихий дом с двориком, 15 минут пешком до Кремля.",
         description="Отдельная комната в семейном доме. По выходным могу показать слободу и посоветовать места с татарской кухней.", guests=2, accommodation_type="room", available_from=date(2026, 10, 1), available_to=date(2026, 11, 15),
         tags=["Демо-данные", "Исторический район", "Центр"], amenities=["Wi-Fi", "Кухня", "Рабочее место"], rules=["Не курить", "Предупреждать о времени прихода"]),
    dict(slug="nizhny-house", owner="pavel", city="Нижний Новгород", title="Дом с видом на Волгу", short_description="Гостевая часть дома за городом для активных путешественников.",
         description="Две спальни, веранда и место для велосипедов. До центра 25 минут на автобусе; помогу с маршрутом по набережной.", guests=4, accommodation_type="house", available_from=date(2026, 10, 10), available_to=date(2026, 12, 20),
         tags=["Демо-данные", "Природа", "Для группы"], amenities=["Wi-Fi", "Парковка", "Веранда", "Кухня"], rules=["Можно с животными", "Не шуметь после 23:00"]),
    dict(slug="spb-apartment", owner="irina", city="Санкт-Петербург", title="Квартира у Фонтанки", short_description="Небольшая квартира в историческом доме, рядом с набережной.",
         description="Вся квартира на время моего отъезда. Оставлю подборку литературных музеев, книжных и нетуристических маршрутов.", guests=2, accommodation_type="apartment", available_from=date(2026, 10, 20), available_to=date(2026, 11, 8),
         tags=["Демо-данные", "Вся квартира", "Музеи рядом"], amenities=["Wi-Fi", "Стиральная машина", "Кухня"], rules=["Без вечеринок", "Нельзя с животными"]),
    dict(slug="ekb-sofa", owner="roman", city="Екатеринбург", title="Диван рядом с Плотинкой", short_description="Простой вариант на одну-две ночи для тех, кто путешествует налегке.",
         description="Раскладной диван в гостиной и место для снаряжения. В будни работаю из дома, поэтому важна тишина днём.", guests=1, accommodation_type="sofa", available_from=date(2026, 10, 5), available_to=date(2026, 10, 31),
         tags=["Демо-данные", "Бюджетно", "Центр"], amenities=["Wi-Fi", "Общая кухня", "Хранение снаряжения"], rules=["Один гость", "Тишина в рабочие часы"]),
    dict(slug="kaliningrad-room", owner="sofia", city="Калининград", title="Мансарда в районе Амалиенау", short_description="Светлая комната в старом доме рядом с парком и велодорожками.",
         description="Отдельная мансарда с рабочим столом. Есть два городских велосипеда и карта арт-объектов.", guests=2, accommodation_type="room", available_from=date(2026, 10, 12), available_to=date(2026, 12, 1),
         tags=["Демо-данные", "Велосипеды", "Тихий район"], amenities=["Wi-Fi", "Рабочее место", "2 велосипеда"], rules=["Не курить", "Бережно относиться к велосипедам"]),
    dict(slug="moscow-room", owner="nikita", city="Москва", title="Комната у парка Сокольники", short_description="Спокойная комната для одного гостя рядом с парком и метро.",
         description="Гостевая комната с отдельным столом. Рядом маршруты для бега, кофейни и небольшие концертные площадки.", guests=1, accommodation_type="room", available_from=date(2026, 10, 15), available_to=date(2026, 11, 30),
         tags=["Демо-данные", "Парк рядом", "Метро"], amenities=["Wi-Fi", "Рабочий стол", "Стиральная машина"], rules=["Не курить", "Без громкой музыки после 22:00"]),
]


REQUESTS = [
    dict(slug="mikhail-alina", guest="mikhail", listing="kazan-room", status="accepted", date_from=date(2026, 10, 24), date_to=date(2026, 10, 27), guests=1, message="Привет! Еду снимать Казань на выходных. Буду рад советам по маршруту."),
    dict(slug="daria-pavel", guest="daria", listing="nizhny-house", status="accepted", date_from=date(2026, 11, 3), date_to=date(2026, 11, 7), guests=2, message="Путешествуем вдвоём и хотим прокатиться по набережной."),
    dict(slug="mikhail-irina", guest="mikhail", listing="spb-apartment", status="pending", date_from=date(2026, 10, 30), date_to=date(2026, 11, 2), guests=1, message="Буду в городе три дня, ищу тихое место и маршруты для фотопрогулок."),
    dict(slug="lev-roman", guest="lev", listing="ekb-sofa", status="declined", date_from=date(2026, 10, 17), date_to=date(2026, 10, 19), guests=1, message="Приезжаю на старт, нужно место на две ночи."),
    dict(slug="daria-sofia", guest="daria", listing="kaliningrad-room", status="accepted", date_from=date(2026, 11, 15), date_to=date(2026, 11, 20), guests=1, message="Хочу совместить работу и велопрогулки у моря."),
]


REVIEWS = [
    ("mikhail", "alina", 5, "Алина помогла составить маршрут и очень тепло приняла."),
    ("alina", "mikhail", 5, "Аккуратный и самостоятельный гость, было интересно пообщаться."),
    ("daria", "pavel", 4, "Уютное место и отличные советы по веломаршруту."),
    ("pavel", "daria", 5, "Гости были на связи и бережно отнеслись к дому."),
    ("daria", "sofia", 5, "Светлая комната и продуманная карта города — особенно спасибо за велосипед."),
    ("sofia", "daria", 4, "Спокойная и вежливая гостья, рекомендую."),
]


async def seed(database_url: str) -> dict[str, int]:
    engine = create_async_engine(database_url, pool_pre_ping=True)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    user_ids = {row["slug"]: demo_id("user", row["slug"]) for row in USERS}
    listing_ids = {row["slug"]: demo_id("listing", row["slug"]) for row in LISTINGS}
    request_ids = {row["slug"]: demo_id("request", row["slug"]) for row in REQUESTS}

    try:
        async with session_factory() as db, db.begin():
            city_names = {row["city"] for row in USERS} | {row["city"] for row in LISTINGS}
            locality_rows = (await db.execute(
                select(Locality).where(Locality.name.in_(city_names), Locality.is_active.is_(True))
            )).scalars().all()
            locality_by_name = {}
            for locality in locality_rows:
                # Prefer actual cities over an identically named village/settlement.
                current = locality_by_name.get(locality.name)
                if current is None or (
                    locality.type_short.rstrip(".").casefold() == "г"
                    and current.type_short.rstrip(".").casefold() != "г"
                ):
                    locality_by_name[locality.name] = locality
            missing = sorted(city_names - locality_by_name.keys())
            if missing:
                raise RuntimeError(
                    "Import the official locality snapshot before demo data; missing: " + ", ".join(missing)
                )

            seeded_users = list(user_ids.values())
            seeded_listings = list(listing_ids.values())
            await db.execute(delete(Notification).where(or_(
                Notification.recipient_id.in_(seeded_users),
                Notification.event_key.like("demo:%"),
            )))
            await db.execute(delete(Review).where(or_(
                Review.author_id.in_(seeded_users), Review.subject_id.in_(seeded_users),
            )))
            await db.execute(delete(StayRequest).where(or_(
                StayRequest.guest_id.in_(seeded_users), StayRequest.host_id.in_(seeded_users),
                StayRequest.listing_id.in_(seeded_listings),
            )))
            await db.execute(delete(Listing).where(Listing.id.in_(seeded_listings)))
            await db.execute(delete(Session).where(Session.user_id.in_(seeded_users)))
            await db.execute(delete(User).where(User.id.in_(seeded_users)))

            for index, row in enumerate(USERS):
                values = {key: value for key, value in row.items() if key != "slug"}
                locality = locality_by_name[row["city"]]
                values.pop("city")
                db.add(User(id=user_ids[row["slug"]], max_username=None, photo_url=None,
                            locality_id=locality.id, city=locality.short_label,
                            created_at=at(20 + index % 7), **values))
            await db.flush()

            for index, row in enumerate(LISTINGS):
                values = {key: value for key, value in row.items() if key not in {"slug", "owner"}}
                locality = locality_by_name[row["city"]]
                values["city"] = locality.short_label
                db.add(Listing(id=listing_ids[row["slug"]], owner_id=user_ids[row["owner"]],
                               locality_id=locality.id,
                               photo_url=None, created_at=at(22 + index % 5), **values))
            await db.flush()

            for index, row in enumerate(REQUESTS):
                values = {key: value for key, value in row.items() if key not in {"slug", "guest", "listing"}}
                host_slug = next(item["owner"] for item in LISTINGS if item["slug"] == row["listing"])
                decided_at = at(27, 10 + index) if row["status"] != "pending" else None
                db.add(StayRequest(
                    id=request_ids[row["slug"]], client_request_id=demo_id("client-request", row["slug"]),
                    listing_id=listing_ids[row["listing"]], guest_id=user_ids[row["guest"]],
                    host_id=user_ids[host_slug], created_at=at(26, 9 + index), decided_at=decided_at,
                    **values,
                ))
            await db.flush()

            for index, (author, subject, rating, review_text) in enumerate(REVIEWS):
                db.add(Review(
                    id=demo_id("review", f"{author}-{subject}"), author_id=user_ids[author],
                    subject_id=user_ids[subject], rating=rating, text=review_text,
                    created_at=at(28, 9 + index), updated_at=at(28, 9 + index),
                ))

            notification_specs = [
                ("alina", "request_created", request_ids["mikhail-alina"], True),
                ("mikhail", "request_accepted", request_ids["mikhail-alina"], False),
                ("irina", "request_created", request_ids["mikhail-irina"], False),
                ("lev", "request_declined", request_ids["lev-roman"], True),
                ("sofia", "review_created", user_ids["sofia"], False),
            ]
            for index, (recipient, kind, target_id, is_read) in enumerate(notification_specs):
                event_key = f"demo:{kind}:{index}"
                db.add(Notification(
                    id=demo_id("notification", event_key), recipient_id=user_ids[recipient],
                    event_key=event_key, kind=kind, target_id=target_id,
                    created_at=at(29, 8 + index), read_at=at(29, 14) if is_read else None,
                    delivery_status="sent", attempts=0, next_attempt_at=at(29, 8 + index),
                    lease_until=None, lease_token=None, sent_at=at(29, 8 + index),
                    last_error=None, max_message_id="demo-local-only",
                ))
        return {"users": len(USERS), "listings": len(LISTINGS), "requests": len(REQUESTS),
                "reviews": len(REVIEWS), "notifications": len(notification_specs)}
    finally:
        await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description="Load synthetic demo data into the configured PostgreSQL database.")
    parser.add_argument("--confirm-test-data", action="store_true",
                        help="confirm that the target database may contain synthetic demo records")
    args = parser.parse_args()
    if not args.confirm_test_data:
        parser.error("pass --confirm-test-data; these records are synthetic and must not be treated as real users")

    settings = Settings()
    counts = asyncio.run(seed(settings.database_url.get_secret_value()))
    summary = ", ".join(f"{name}={count}" for name, count in counts.items())
    print(f"Synthetic demo data loaded ({summary}). Re-running refreshes only deterministic demo records.")


if __name__ == "__main__":
    main()
