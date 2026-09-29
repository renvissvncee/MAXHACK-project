import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { api, ApiError, setSessionToken } from '../src/services/api.ts';
const original = globalThis.fetch;
afterEach(() => { globalThis.fetch = original; setSessionToken(null); });
test('sends session cookies and JSON and decodes the response', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/me'); assert.equal(options.credentials, 'include');
    assert.equal(options.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(options.body), { city: 'Казань' });
    return Response.json({ city: 'Казань' });
  };
  assert.deepEqual(await api('/api/me', { method: 'PATCH', body: JSON.stringify({ city: 'Казань' }) }), { city: 'Казань' });
});
test('uses an in-memory bearer session when embedded cookies are blocked', async () => {
  setSessionToken('browser-independent-session');
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer browser-independent-session');
    return Response.json({ ok: true });
  };
  assert.deepEqual(await api('/api/me'), { ok: true });
});
test('logout accepts empty 204', async () => {
  globalThis.fetch = async () => new Response(null, { status: 204 });
  assert.equal(await api('/api/auth/logout', { method: 'POST' }), undefined);
});
test('preserves server error messages without retrying writes', async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({ error: { message: 'Заполните профиль' } }, { status: 409 }); };
  await assert.rejects(api('/api/me/listing', { method: 'PUT', body: '{}' }), error => error instanceof ApiError && error.status === 409 && error.message === 'Заполните профиль');
  assert.equal(calls, 1);
});
test('expired session asks for MAX re-entry; network failure stays an error', async () => {
  globalThis.fetch = async () => new Response(null, { status: 401 });
  await assert.rejects(api('/api/me'), /MAX/);
  globalThis.fetch = async () => { throw new TypeError('offline'); };
  await assert.rejects(api('/api/me'), /Сервер недоступен/);
});
