import pytest

from app.errors import AppError
from app.max_bot.validation import validate_init_data
from app.schemas.profile import ProfilePatch
from pydantic import ValidationError
from tests.auth_helpers import TEST_TOKEN, signed_data


def test_valid_signed_unicode_data_and_no_username():
    identity = validate_init_data(signed_data(timestamp=1000), TEST_TOKEN, 3600, now=1000)
    assert identity.id == 101
    assert identity.first_name == 'Тест + % & ='
    assert identity.username is None


@pytest.mark.parametrize('raw', [
    signed_data(timestamp=1000).replace('auth_date=1000', 'auth_date=1001'),
    signed_data(timestamp=1000) + '&auth_date=1000',
    signed_data(timestamp=1000) + '&hash=' + '0'*64,
    signed_data(timestamp=1000) + '&bad=%ZZ',
    'hash=' + '0'*64,
    signed_data(timestamp=1000, user='{"id":1,"id":2,"first_name":"A"}'),
    signed_data(timestamp=1000, user='{"id":true,"first_name":"A"}'),
    signed_data(timestamp=1000, user='{"id":"101","first_name":"A"}'),
])
def test_reject_tampering_duplicates_and_invalid_user(raw):
    with pytest.raises(AppError) as error:
        validate_init_data(raw, TEST_TOKEN, 3600, now=1000)
    assert error.value.status == 401


@pytest.mark.parametrize('timestamp', [0, 5061])
def test_expired_or_future_data(timestamp):
    with pytest.raises(AppError):
        validate_init_data(signed_data(timestamp=timestamp), TEST_TOKEN, 3600, now=5000)


def test_wrong_bot_cannot_validate_signature():
    with pytest.raises(AppError):
        validate_init_data(signed_data(), 'different-bot', 3600)


@pytest.mark.parametrize('body', [{}, {'name': '  '}, {'localityId': None}, {'id': 'other'}, {'verified': True}, {'maxUserId': 1}])
def test_profile_rejects_invalid_and_server_owned_fields(body):
    with pytest.raises(ValidationError):
        ProfilePatch.model_validate(body)


def test_profile_normalizes_values():
    patch = ProfilePatch.model_validate({'name': ' Анна ', 'interests': [' Музыка ', 'Музыка']})
    assert patch.name == 'Анна'
    assert patch.interests == ['Музыка']
