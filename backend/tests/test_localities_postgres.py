from uuid import uuid4

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from app.services.localities import normalize_locality_query
from tests.auth_helpers import TEST_TOKEN
from tests.locality_helpers import locality_id
from tests.test_auth_postgres import database
from tests.test_listings_postgres import ORIGIN, login


def test_locality_query_normalization():
    assert normalize_locality_query("  Орёл,  г. ") == "орел г"
    assert normalize_locality_query("Ростов-на-Дону") == "ростов на дону"


def test_suggestions_resolution_and_strict_profile_selection(database):
    settings = Settings(
        database_url=database,
        max_bot_token=TEST_TOKEN,
        cookie_secure=False,
        allowed_origins=["http://localhost:5173"],
        _env_file=None,
    )
    with TestClient(create_app(settings)) as client:
        assert client.get("/api/localities/suggest", params={"q": "Ка"}).status_code == 401
        login(client, uuid4().int % (2**60))

        response = client.get("/api/localities/suggest", params={"q": "Ка", "limit": 5})
        assert response.status_code == 200, response.text
        locality = response.json()[0]
        assert locality == {
            "id": str(locality_id("Казань")),
            "name": "Казань",
            "type": "Город",
            "typeShort": "г.",
            "region": "Тестовый регион",
            "district": None,
            "shortLabel": "Казань",
            "fullLabel": "Казань, Тестовый регион",
        }
        assert "objectId" not in locality and "searchName" not in locality
        assert client.get(f"/api/localities/{locality['id']}").json() == locality

        invalid = client.patch(
            "/api/me",
            headers=ORIGIN,
            json={"localityId": str(uuid4()), "interests": ["Кино"]},
        )
        assert invalid.status_code == 422
        assert invalid.json()["error"]["code"] == "locality_not_found"
        invalid_search = client.get("/api/listings", params={"locality_id": str(uuid4())})
        assert invalid_search.status_code == 422
        assert invalid_search.json()["error"]["code"] == "locality_not_found"
