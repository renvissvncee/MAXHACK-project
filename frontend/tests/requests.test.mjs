import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createStayRequest,
  decideStayRequest,
  getMatchContact,
  getStayRequests,
} from '../src/services/requestsService.ts';

const original = globalThis.fetch;
afterEach(() => { globalThis.fetch = original; });

test('creates a real stay request with its idempotency key', async () => {
  const input = {
    clientRequestId: '11111111-1111-4111-8111-111111111111',
    listingId: '22222222-2222-4222-8222-222222222222',
    dateFrom: '2030-08-01',
    dateTo: '2030-08-05',
    guests: 2,
    message: 'Еду на выходные',
  };
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/requests');
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), input);
    return Response.json({ id: 'request-id' });
  };
  assert.equal((await createStayRequest(input)).id, 'request-id');
});

test('loads, decides and reveals contacts through participant-only endpoints', async () => {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push([url, options.method]);
    if (url.endsWith('/contact')) return Response.json({ maxUserId: '123', username: null });
    if (options.method === 'PATCH') {
      assert.deepEqual(JSON.parse(options.body), { status: 'accepted' });
      return Response.json({ id: 'request-id', status: 'accepted' });
    }
    return Response.json([]);
  };
  assert.deepEqual(await getStayRequests('incoming'), []);
  assert.equal((await decideStayRequest('request-id', 'accepted')).status, 'accepted');
  assert.equal((await getMatchContact('request-id')).maxUserId, '123');
  assert.deepEqual(calls, [
    ['/api/requests?direction=incoming&limit=100', undefined],
    ['/api/requests/request-id', 'PATCH'],
    ['/api/requests/request-id/contact', undefined],
  ]);
});
