from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from app.config import Settings
from app.main import create_app
from app.schemas.requests import RequestInput
from tests.auth_helpers import TEST_TOKEN
from tests.test_auth_postgres import database
from tests.test_listings_postgres import login, OFFER, ORIGIN
from tests.locality_helpers import locality_patch


def test_validation():
    data = dict(clientRequestId=str(uuid4()), listingId=str(uuid4()), dateFrom="2030-08-01", dateTo="2030-08-02", guests=1)
    assert RequestInput(**data).message == ""
    for patch in ({"dateTo": "2030-07-31"}, {"guests": 9}, {"message": "a" * 2001}, {"hostId": str(uuid4())}):
        with pytest.raises(ValidationError):
            RequestInput(**{**data, **patch})


def test_scenario_and_concurrency(database):
    settings = Settings(database_url=database, max_bot_token=TEST_TOKEN, cookie_secure=False,
                        allowed_origins=["http://localhost:5173"], _env_file=None)
    identities = [uuid4().int % (2**60) for _ in range(3)]
    with TestClient(create_app(settings)) as c:
        host = login(c, identities[0]); hc = dict(c.cookies)
        c.patch("/api/me", headers=ORIGIN, json=locality_patch("Москва", interests=["Кино"]))
        offer = c.put("/api/me/listing", headers=ORIGIN, json=OFFER).json()
        data = dict(clientRequestId=str(uuid4()), listingId=offer["id"], dateFrom="2030-08-01", dateTo="2030-08-15", guests=2)
        assert c.post("/api/requests", headers=ORIGIN, json=data).status_code == 404
        c.cookies.clear(); guest = login(c, identities[1]); gc = dict(c.cookies)
        assert c.post("/api/requests", headers=ORIGIN, json=data).status_code == 409
        c.patch("/api/me", headers=ORIGIN, json=locality_patch("Тула", interests=["Кино"]))
        assert c.post("/api/requests", json=data).status_code == 403
        for patch in ({"guests": 3}, {"dateTo": "2030-08-16"}):
            assert c.post("/api/requests", headers=ORIGIN, json={**data, **patch}).json()["error"]["code"] == "trip_not_available"
        r = c.post("/api/requests", headers=ORIGIN, json=data)
        assert r.status_code == 200, r.text
        row = r.json(); rid = row["id"]
        assert row["status"] == "pending" and row["decidedAt"] is None
        assert row["host"]["id"] == host["id"] and row["guest"]["id"] == guest["id"]
        assert "maxUserId" not in r.text and "username" not in r.text
        assert c.get(f"/api/requests/{rid}/contact").status_code == 403
        assert c.patch(f"/api/requests/{rid}", headers=ORIGIN, json={"status": "accepted"}).status_code == 403
        assert c.post("/api/requests", headers=ORIGIN, json=data).json()["id"] == rid
        assert c.post("/api/requests", headers=ORIGIN, json={**data, "message": "Другое"}).status_code == 409
        assert c.get("/api/requests?direction=outgoing").json()[0]["id"] == rid
        second = c.post("/api/requests", headers=ORIGIN, json={**data, "clientRequestId": str(uuid4())}).json()["id"]
        c.cookies.clear(); login(c, identities[2])
        for suffix in ("", "/contact"):
            assert c.get(f"/api/requests/{rid}{suffix}").status_code == 404
        assert c.patch(f"/api/requests/{rid}", headers=ORIGIN, json={"status": "accepted"}).status_code == 404
        assert c.get("/api/requests?direction=incoming").json() == []
        c.cookies.clear(); c.cookies.update(hc)
        assert len(c.get("/api/requests?direction=incoming").json()) == 2
        accepted = c.patch(f"/api/requests/{rid}", headers=ORIGIN, json={"status": "accepted"})
        assert accepted.status_code == 200 and accepted.json()["decidedAt"]
        assert c.patch(f"/api/requests/{rid}", headers=ORIGIN, json={"status": "accepted"}).json() == accepted.json()
        assert c.patch(f"/api/requests/{rid}", headers=ORIGIN, json={"status": "declined"}).status_code == 409
        assert c.get(f"/api/requests/{rid}/contact").json() == {"userId": guest["id"], "maxUserId": str(identities[1]), "username": None}
        assert c.patch(f"/api/requests/{second}", headers=ORIGIN, json={"status": "declined"}).status_code == 200
        assert c.get(f"/api/requests/{second}/contact").status_code == 403
        assert c.get("/api/me/listing").json()["listing"]["availableTo"] == OFFER["availableTo"]
        fresh = {**data, "clientRequestId": str(uuid4())}
    def create(_):
        with TestClient(create_app(settings)) as c:
            c.cookies.update(gc)
            r = c.post("/api/requests", headers=ORIGIN, json=fresh)
            assert r.status_code == 200, r.text
            return r.json()["id"]
    with ThreadPoolExecutor(2) as pool:
        ids = list(pool.map(create, range(2)))
    assert ids[0] == ids[1]
    def decide(status):
        with TestClient(create_app(settings)) as c:
            c.cookies.update(hc)
            return c.patch(f"/api/requests/{ids[0]}", headers=ORIGIN, json={"status": status}).status_code
    with ThreadPoolExecutor(2) as pool:
        assert sorted(pool.map(decide, ["accepted", "declined"])) == [200, 409]
    with TestClient(create_app(settings)) as c:
        c.cookies.update(hc)
        c.put("/api/me/listing", headers=ORIGIN, json={**OFFER, "availableFrom": "2031-01-01", "availableTo": "2031-01-10"})
        c.cookies.clear(); c.cookies.update(gc)
        assert c.post("/api/requests", headers=ORIGIN, json=data).json()["id"] == rid
        assert c.get(f"/api/requests/{rid}/contact").json()["maxUserId"] == str(identities[0])
        c.cookies.clear()
        assert c.get(f"/api/requests/{rid}/contact").status_code == 401
