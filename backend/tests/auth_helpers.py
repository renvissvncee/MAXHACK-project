import hashlib
import hmac
import json
import time
from urllib.parse import urlencode

TEST_TOKEN = 'synthetic-test-token-not-a-real-bot'


def signed_data(user_id=101, timestamp=None, **extra):
    values = {'auth_date': str(int(time.time()) if timestamp is None else timestamp),
              'user': json.dumps({'id': user_id, 'first_name': 'Тест + % & =', 'username': None}, ensure_ascii=False)}
    values.update(extra)
    key = hmac.new(b'WebAppData', TEST_TOKEN.encode(), hashlib.sha256).digest()
    signature = hmac.new(key, '\n'.join(f'{k}={v}' for k, v in sorted(values.items())).encode(), hashlib.sha256).hexdigest()
    return urlencode({**values, 'hash': signature})
