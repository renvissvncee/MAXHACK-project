# Чек-лист сдачи и ручной приёмки

## Автоматизировано

- Backend unit/integration tests и Alembic check: `python3 scripts/check_backend.py`.
- Frontend tests: `node --experimental-strip-types --test frontend/tests/*.test.mjs`.
- Frontend build/lint: `npm --prefix frontend run build` и `npm --prefix frontend run lint`.
- Актуальность API-артефактов: `backend/.venv/bin/python scripts/export_openapi.py --check`.
- Readiness production: `curl -fsS https://64.188.79.42/api/health/ready`.
- Публичные Swagger/OpenAPI: `https://64.188.79.42/docs` и `https://64.188.79.42/openapi.json`.
- Состояние delivery worker: `docker compose -f compose.yaml -f compose.full.yaml run --rm --no-deps notifications python -m app.workers.notifications --status`.

## Только вручную в MAX

- Пройти [демо-сценарий](demo-scenario.md) на двух аккаунтах.
- Проверить mobile и MAX Web: вход, cookie-сессию и возврат в приложение.
- Подтвердить три deep-link перехода: новый запрос, решение, новый отзыв.
- Проверить отсутствие дублей при одном нажатии; двойное сообщение возможно только при редком сбое между приёмом MAX и фиксацией `sent`.
- Проверить открытие личного чата по username. Если username нет, в MVP показывается MAX ID; формат прямой ID-ссылки нужно подтвердить на реальных клиентах.

## Перед показом жюри

- Оба аккаунта заранее запустили бота и могут получать его сообщения.
- В предложении даты покрывают даты запроса.
- `backend`, `web`, `bot`, `notifications`, `db` запущены; `backend` и `web` healthy.
- `/api/health/ready` возвращает `{"status":"ready"}`.
- Включена запись экрана для evidence и разбора UI-затруднений.
