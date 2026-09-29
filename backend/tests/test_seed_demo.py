from app.seed_demo import LISTINGS, REQUESTS, REVIEWS, USERS, demo_id
from app.schemas.listings import ListingInput
from app.schemas.requests import RequestInput
from app.schemas.reviews import ReviewInput


def test_demo_dataset_is_distinct_consistent_and_visibly_labelled():
    user_slugs = {row["slug"] for row in USERS}
    listings = {row["slug"]: row for row in LISTINGS}

    assert len(USERS) == 9
    assert len({row["max_user_id"] for row in USERS}) == len(USERS)
    assert all(row["max_user_id"] < 0 for row in USERS)
    assert len(LISTINGS) == 6
    assert {row["accommodation_type"] for row in LISTINGS} == {"room", "apartment", "house", "sofa"}
    assert len({row["city"] for row in LISTINGS}) == len(LISTINGS)
    assert all("Демо-данные" in row["tags"] for row in LISTINGS)

    for row in LISTINGS:
        assert row["owner"] in user_slugs
        assert row["available_from"] <= row["available_to"]
        assert 1 <= row["guests"] <= 8
        ListingInput(
            locality_id=demo_id("locality", row["city"]),
            **{key: value for key, value in row.items() if key not in {"slug", "owner", "city"}},
        )

    statuses = {row["status"] for row in REQUESTS}
    assert statuses == {"pending", "accepted", "declined"}
    for row in REQUESTS:
        assert row["guest"] in user_slugs
        assert row["listing"] in listings
        assert row["date_from"] >= listings[row["listing"]]["available_from"]
        assert row["date_to"] <= listings[row["listing"]]["available_to"]
        assert row["guests"] <= listings[row["listing"]]["guests"]
        RequestInput(
            client_request_id=demo_id("client-request", row["slug"]),
            listing_id=demo_id("listing", row["listing"]),
            **{key: value for key, value in row.items() if key not in {"slug", "guest", "listing", "status"}},
        )

    accepted_pairs = {
        (row["guest"], listings[row["listing"]]["owner"])
        for row in REQUESTS if row["status"] == "accepted"
    }
    for author, subject, rating, review_text in REVIEWS:
        assert (author, subject) in accepted_pairs or (subject, author) in accepted_pairs
        assert 1 <= rating <= 5
        ReviewInput(rating=rating, text=review_text)

    assert demo_id("user", "alina") == demo_id("user", "alina")
