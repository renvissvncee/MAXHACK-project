import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getNotifications,
  markNotificationRead,
  notificationDestination,
} from '../src/services/notificationsService.ts';
import { getOwnReview, saveReview } from '../src/services/reviewsService.ts';
import { currentStartParam, notificationIdFromStartParam } from '../src/services/startParam.ts';

const original = globalThis.fetch;
afterEach(() => { globalThis.fetch = original; });

test('accepts only a notification UUID start_param', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  assert.equal(notificationIdFromStartParam(`notification_${id}`), id);
  assert.equal(notificationIdFromStartParam(`request_${id}`), null);
  assert.equal(notificationIdFromStartParam('notification_../../admin'), null);
  assert.equal(notificationIdFromStartParam('x'.repeat(513)), null);
});

test('prefers MAX Bridge start_param and falls back to WebAppStartParam', () => {
  globalThis.window = { WebApp: { initDataUnsafe: { start_param: 'bridge' } }, location: { search: '?WebAppStartParam=url' } };
  assert.equal(currentStartParam(), 'bridge');
  globalThis.window = { location: { search: '?WebAppStartParam=url' } };
  assert.equal(currentStartParam(), 'url');
  delete globalThis.window;
});

test('maps notification targets to protected application routes', () => {
  const base = { id: 'n', text: '', createdAt: '', readAt: null };
  assert.equal(notificationDestination({ ...base, kind: 'request_created', targetType: 'request', targetId: 'r' }), '/requests?direction=incoming&focus=r');
  assert.equal(notificationDestination({ ...base, kind: 'request_accepted', targetType: 'request', targetId: 'r' }), '/requests?direction=outgoing&focus=r');
  assert.equal(notificationDestination({ ...base, kind: 'review_created', targetType: 'user_reviews', targetId: 'u' }), '/users/u/reviews');
});

test('uses notification inbox and read endpoints', async () => {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push([url, options.method]);
    return Response.json(url.endsWith('/read') ? { id: 'n', readAt: 'now' } : { unreadCount: 2, items: [] });
  };
  assert.equal((await getNotifications()).unreadCount, 2);
  assert.equal((await markNotificationRead('n')).readAt, 'now');
  assert.deepEqual(calls, [
    ['/api/notifications?unread_only=false&limit=100', undefined],
    ['/api/notifications/n/read', 'POST'],
  ]);
});

test('loads and saves one editable review', async () => {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push([url, options.method, options.body]);
    return Response.json(options.method === 'PUT' ? { id: 'review', rating: 4, text: 'Хорошо' } : null);
  };
  assert.equal(await getOwnReview('user'), null);
  assert.equal((await saveReview('user', 4, 'Хорошо')).rating, 4);
  assert.deepEqual(calls, [
    ['/api/users/user/review', undefined, undefined],
    ['/api/users/user/review', 'PUT', JSON.stringify({ rating: 4, text: 'Хорошо' })],
  ]);
});
