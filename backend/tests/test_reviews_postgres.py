from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4
import pytest
from pydantic import ValidationError
from fastapi.testclient import TestClient
from app.main import create_app
from app.config import Settings
from app.schemas.reviews import ReviewInput
from tests.auth_helpers import TEST_TOKEN
from tests.test_auth_postgres import database
from tests.test_listings_postgres import OFFER, ORIGIN, login


def test_review_validation():
    for rating in (0, 6, True, 2.5, "5"):
        with pytest.raises(ValidationError):
            ReviewInput(rating=rating)
    with pytest.raises(ValidationError):
        ReviewInput(rating=5, text="x"*2001)
    assert ReviewInput(rating=5, text="  Хорошо  ").text == "Хорошо"


def test_reviews_after_match_edit_reputation_and_concurrency(database):
    settings = Settings(database_url=database, max_bot_token=TEST_TOKEN, cookie_secure=False,
                        allowed_origins=["http://localhost:5173"], _env_file=None)
    ids = [uuid4().int % (2**60) for _ in range(3)]
    with TestClient(create_app(settings)) as c:
        host = login(c, ids[0]); hc = dict(c.cookies)
        c.patch('/api/me', headers=ORIGIN, json={'city':'Тула','interests':['Кино']})
        offer = c.put('/api/me/listing', headers=ORIGIN, json=OFFER).json()
        url = f"/api/users/{host['id']}"
        assert c.get(url+'/reviews').json() == {'rating': None, 'reviewsCount': 0, 'items': []}
        assert c.put(url+'/review', headers=ORIGIN, json={'rating':5}).status_code == 422
        c.cookies.clear(); guest = login(c, ids[1]); gc = dict(c.cookies)
        c.patch('/api/me', headers=ORIGIN, json={'city':'Тула','interests':['Кино']})
        assert c.get(url+'/review').json() is None
        assert c.put(url+'/review', headers=ORIGIN, json={'rating':5}).status_code == 403
        def request():
            return c.post('/api/requests', headers=ORIGIN, json={'clientRequestId':str(uuid4()),'listingId':offer['id'],'dateFrom':'2030-08-01','dateTo':'2030-08-02','guests':1}).json()['id']
        first = request()
        assert c.put(url+'/review', headers=ORIGIN, json={'rating':5}).status_code == 403
        c.cookies.clear(); c.cookies.update(hc)
        c.patch('/api/requests/'+first, headers=ORIGIN, json={'status':'declined'})
        c.cookies.clear(); c.cookies.update(gc)
        assert c.put(url+'/review', headers=ORIGIN, json={'rating':5}).status_code == 403
        second = request()
        c.cookies.clear(); c.cookies.update(hc)
        c.patch('/api/requests/'+second, headers=ORIGIN, json={'status':'accepted'})
        # Host can review guest, too, without waiting for the trip's end.
        assert c.put(f"/api/users/{guest['id']}/review", headers=ORIGIN, json={'rating':4}).status_code == 200
        c.cookies.clear(); c.cookies.update(gc)
        assert c.put(url+'/review', json={'rating':5}).status_code == 403
        created = c.put(url+'/review', headers=ORIGIN, json={'rating':5,'text':'Спасибо'})
        assert created.status_code == 200, created.text
        review = created.json()
        updated = c.put(url+'/review', headers=ORIGIN, json={'rating':3,'text':'Исправлено'}).json()
        assert updated['id'] == review['id'] and updated['createdAt'] == review['createdAt']
        assert updated['text'] == 'Исправлено'
        assert c.get(url+'/review').json()['rating'] == 3
        assert c.get(url+'/reviews?offset=100').json() == {'rating':3.0,'reviewsCount':1,'items':[]}
        card = c.get('/api/listings/'+offer['id']).json()
        assert card['rating'] == 3.0 and card['reviewsCount'] == 1
        more = request()
        c.cookies.clear(); c.cookies.update(hc)
        c.patch('/api/requests/'+more, headers=ORIGIN, json={'status':'accepted'})
        c.cookies.clear(); login(c, ids[2])
        assert c.put(url+'/review', headers=ORIGIN, json={'rating':1}).status_code == 403
        public = c.get(url+'/reviews').json()
        assert public['reviewsCount'] == 1
        assert 'maxUserId' not in str(public) and 'username' not in str(public)
        assert c.get(f'/api/users/{uuid4()}/reviews').status_code == 404
        assert c.get(url+'/reviews?limit=101').status_code == 422
    def save(rating):
        with TestClient(create_app(settings)) as c:
            c.cookies.update(gc)
            r = c.put(url+'/review', headers=ORIGIN, json={'rating':rating})
            assert r.status_code == 200, r.text
            return r.json()['id']
    with ThreadPoolExecutor(2) as pool:
        assert list(pool.map(save, [2, 4])) == [review['id'], review['id']]
    with TestClient(create_app(settings)) as c:
        c.cookies.update(gc)
        page = c.get(url+'/reviews').json()
        assert page['reviewsCount'] == 1 and page['rating'] in (2.0,4.0)
        assert c.get('/api/listings/'+offer['id']).json()['reviewsCount'] == 1
        # A second independent author contributes once to the aggregate.
        c.cookies.clear(); login(c, ids[2]); third_cookie = dict(c.cookies)
        c.patch('/api/me', headers=ORIGIN, json={'city':'Тула','interests':['Кино']})
        third_request = c.post('/api/requests', headers=ORIGIN, json={'clientRequestId':str(uuid4()),'listingId':offer['id'],'dateFrom':'2030-08-01','dateTo':'2030-08-02','guests':1}).json()['id']
        c.cookies.clear(); c.cookies.update(hc)
        c.patch('/api/requests/'+third_request, headers=ORIGIN, json={'status':'accepted'})
        c.cookies.clear(); c.cookies.update(third_cookie)
        assert c.put(url+'/review', headers=ORIGIN, json={'rating':5}).status_code == 200
        aggregate = c.get(url+'/reviews?limit=1').json()
        assert len(aggregate['items']) == 1 and aggregate['reviewsCount'] == 2
        assert aggregate['rating'] == (page['rating'] + 5) / 2
        assert c.get('/api/listings/'+offer['id']).json()['rating'] == aggregate['rating']
        assert c.get('/api/listings?limit=100').status_code == 200
        c.cookies.clear()
        assert c.get(url+'/reviews').status_code == 401
