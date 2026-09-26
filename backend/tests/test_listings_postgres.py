from datetime import date
from uuid import uuid4

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from tests.auth_helpers import TEST_TOKEN, signed_data as sign
from tests.test_auth_postgres import database

ORIGIN = {"Origin": "http://localhost:5173"}
OFFER = {
    "city": "Казань", "title": "Комната у Кремля", "shortDescription": "Тихая гостевая комната",
    "description": "Можно познакомиться с городом, интересы обсудим после матча.",
    "guests": 2, "accommodationType": "room", "availableFrom": "2030-08-01",
    "availableTo": "2030-08-15", "tags": ["центр", "центр"],
    "amenities": ["Wi-Fi"], "rules": ["Не курить"],
}


def login(client, user_id):
    response = client.post("/api/auth/max", headers=ORIGIN, json={"initData": sign(user_id=user_id)})
    assert response.status_code == 200, response.text
    return response.json()


def test_offer_upsert_search_ownership_and_contract(database):
    settings = Settings(database_url=database, max_bot_token=TEST_TOKEN,
                        cookie_secure=False, allowed_origins=["http://localhost:5173"], _env_file=None)
    app = create_app(settings)
    host_id, other_id, viewer_id = (uuid4().int % (2**60) for _ in range(3))
    city = f"Казань-{uuid4().hex[:8]}"
    host_offer = {**OFFER, "city": city}
    with TestClient(app) as client:
        host = login(client, host_id)
        assert client.get("/api/me/listing").json() == {"listing": None}
        incomplete = client.put("/api/me/listing", headers=ORIGIN, json=host_offer)
        assert incomplete.status_code == 409
        profile = client.patch("/api/me", headers=ORIGIN, json={
            "name": "Хозяин", "city": "Москва", "interests": ["История"],
        })
        assert profile.status_code == 200
        created = client.put("/api/me/listing", headers=ORIGIN, json=host_offer)
        assert created.status_code == 200, created.text
        first = created.json()
        assert first["host"]["id"] == host["id"]
        assert first["availableFrom"] == OFFER["availableFrom"]
        assert first["tags"] == ["центр"]
        assert first["rating"] is None and first["reviewsCount"] == 0 and first["photos"] == []
        assert "maxUserId" not in str(first) and "verified" not in first

        revised = {**host_offer, "title": "Обновлённое предложение", "guests": 3,
                   "availableTo": "2030-08-20"}
        updated = client.put("/api/me/listing", headers=ORIGIN, json=revised)
        assert updated.status_code == 200
        assert updated.json()["id"] == first["id"]
        assert updated.json()["title"] == revised["title"]
        assert client.get("/api/me/listing").json()["listing"]["id"] == first["id"]

        # A second host publishes a different city and period.
        client.post("/api/auth/logout", headers=ORIGIN)
        login(client, other_id)
        client.patch("/api/me", headers=ORIGIN, json={
            "name": "Второй хозяин", "city": "Тула", "interests": ["Архитектура"],
        })
        other_offer = {**host_offer, "city": f"Тула-{uuid4().hex[:8]}", "title": "Дом в Туле",
                       "availableFrom": "2030-09-01", "availableTo": "2030-09-30"}
        assert client.put("/api/me/listing", headers=ORIGIN, json=other_offer).status_code == 200

        # A third user sees only offers whose full availability interval contains the trip.
        client.post("/api/auth/logout", headers=ORIGIN)
        login(client, viewer_id)
        search = client.get("/api/listings", params={
            "city": city.casefold(), "date_from": "2030-08-10", "date_to": "2030-08-20", "guests": 2,
        })
        assert search.status_code == 200, search.text
        assert len(search.json()) == 1
        assert search.json()[0]["id"] == first["id"]
        assert client.get("/api/listings", params={"city": city, "date_from": "2030-08-21",
                                                     "date_to": "2030-08-22"}).json() == []
        assert client.get("/api/listings", params={"date_from": "2030-08-01"}).status_code == 422
        assert client.get("/api/listings", params={"date_from": "2030-08-10", "date_to": "2030-08-09"}).json()["error"]["code"] == "invalid_date_range"
        assert client.get(f"/api/listings/{first['id']}").status_code == 200
        assert client.get("/api/listings?limit=101").status_code == 422

        client.post("/api/auth/logout", headers=ORIGIN)
        login(client, host_id)
        assert client.get(f"/api/listings/{first['id']}").status_code == 404
