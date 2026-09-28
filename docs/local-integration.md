# Локальная проверка MAX → frontend → API → PostgreSQL

Frontend по умолчанию использует реальные API. MockUserRepository и data/listings.ts не подключены к основному сценарию. В обычном браузере без сессии показывается предложение открыть приложение через MAX; обхода авторизации нет.

## Запуск

1. Из корня проекта: `docker compose up --build -d`. Корневой .env и backend/.env уже должны содержать настройки, включая токен выданного бота. Не перезаписывайте их шаблонами.
2. Из frontend: `npm ci`, затем `npm run dev`. Vite использует 127.0.0.1:5173 и proxy /api → 127.0.0.1:8000. Порт фиксирован: если занят, остановите прежний Vite.
3. Из корня: `npx --yes localtunnel --port 5173 --local-host 127.0.0.1`. Оставьте процесс работающим. Скопируйте выданный HTTPS URL.
4. Для нового URL обновите точное имя хоста в frontend/vite.config.ts → server.allowedHosts. В корневом .env добавьте HTTPS origin (без завершающего слеша) в JSON-массив ALLOWED_ORIGINS, установите COOKIE_SECURE=true. Выполните `docker compose up -d backend`; Vite перечитает конфигурацию.
5. Проверьте HTTPS URL и URL/api/health/ready. Второй должен вернуть {"status":"ready"}. LocalTunnel может показывать собственную страницу доступа; если она появилась, это ещё не mini-app. В таком случае завершите проверку доступа в браузере или используйте постоянный HTTPS-хостинг.
6. Организатор/владелец выданного бота должен привязать этот HTTPS URL к mini-app. Токен API не подтверждает доступ к настройкам. Ссылка не была привязана автоматически.
7. Из backend запустите ровно один `.venv/bin/python -m app.max_bot.polling`, откройте бота и отправьте /start.

Туннель и Vite нужны только для разработки. После перезапуска туннеля адрес может измениться: повторите пункты 4–6. Для постоянного сервера используйте один HTTPS origin, отдающий собранный frontend и проксирующий /api к FastAPI; PostgreSQL не публикуйте наружу.

## Проверка на двух аккаунтах

- Открыть приложение через MAX: GET /api/me; при 401 — POST /api/auth/max с оригинальным window.WebApp.initData. Backend проверяет подпись, создаёт пользователя и HttpOnly сессию. initData не сохраняется в localStorage и не логируется.
- Заполнить город и интересы, сохранить: PATCH /api/me. Ошибка оставляет форму на экране.
- В профиле заполнить «Мои варианты», сохранить: PUT /api/me/listing. GET восстанавливает предложение после повторного открытия.
- Второй аккаунт проходит вход и видит предложение первого в каталоге. Проверить фильтры города, гостей и обеих дат; открыть карточку.
- Владелец не видит своё предложение в публичном каталоге — это правило backend.
- Перезапустить backend и открыть приложение повторно: данные сохраняются в PostgreSQL.
- Выйти: POST /api/auth/logout отзывает сессию и очищает состояние интерфейса.

Данные UI адаптируются к контракту: id — внутренний UUID, photo ← photoUrl, onboardingCompleted ← profileCompleted. Рейтинги null скрыты. Тип размещения фильтруется на клиенте после загрузки страниц, поскольку серверный фильтр типа пока отсутствует. Избранное остаётся локальным. Фото берётся из MAX. Заявки, входящие/исходящие, решения хозяина и контакты после матча подключены к реальному API. Загрузка фото, frontend отзывов и ленты уведомлений ещё не подключены.

## Проверки

- `npm --prefix frontend run build`
- `npm --prefix frontend run lint` (есть предупреждения React hooks/Fast Refresh)
- `node --experimental-strip-types --test frontend/tests/api.test.mjs` (Node 26)
- Из backend: `.venv/bin/python -m pytest -q`. PostgreSQL integration tests требуют отдельной TEST_DATABASE_URL и иначе пропускаются.

Проверено в этой итерации: сборка, тесты HTTP-клиента, backend unit tests, живой /api/health/ready и 401 /api/me через Vite; публичный HTML и readiness через LocalTunnel. Вход с реальными initData, сохранение профиля в MAX и сценарий двух аккаунтов ещё требуют привязки URL и ручной проверки.

## Запуск всех частей одной командой

Из корня проекта при запущенном Docker Desktop:

```sh
docker compose -f compose.yaml -f compose.full.yaml up --build -d
```

Это поднимает PostgreSQL, FastAPI с миграциями, polling-бота и собранный frontend под nginx. Web доступен по http://localhost:8080 (WEB_PORT меняет порт), `/api` проксируется к FastAPI. `/docs` остаётся на http://localhost:8000/docs. Frontend здесь собирается: изменения появятся после повторной команды с --build. Для горячего обновления интерфейса остаётся обычный Vite.

Перед первым полным запуском остановите ранее запущенный вручную `app.max_bot.polling` (Ctrl+C в его терминале): один токен должен обслуживаться одним polling-процессом. Курсор контейнерного бота хранится в отдельном bot_state volume; при переходе с локального запуска возможна повторная обработка доступных старых событий, поскольку старый файл курсора автоматически не переносится. Бот читает токен/username/флаг mini-app из backend/.env. Приложение не отправляет тестовых сообщений автоматически.

Для проверки через MAX нужен уже привязанный HTTPS URL. Туннель направьте на порт 8080; если сменится публичный адрес, нужна новая привязка и обновление ALLOWED_ORIGINS в корневом .env. Для HTTPS COOKIE_SECURE=true. Для обычного HTTP localhost cookie Secure нужно отключать только в локальном окружении и добавлять точный http://localhost:8080 в ALLOWED_ORIGINS. Само открытие в браузере не выдаёт initData MAX и не заменяет вход через MAX.

Не переключайте работающий туннель до проверки nginx: отправленная организаторам ссылка должна оставаться доступной. Полный Compose не запускает туннель и не привязывает адрес в MAX.

Логи и остановка:

```sh
docker compose -f compose.yaml -f compose.full.yaml logs --tail=80 backend bot web
docker compose -f compose.yaml -f compose.full.yaml down
```

Без `-v` данные БД и курсор сохраняются. При сбое polling смотрите logs bot; автоматического бесконечного перезапуска при неправильном токене нет.

## TLS бота в Docker на macOS

Установка сертификата в Keychain macOS не обновляет доверенные CA внутри Linux-контейнера. Если локальный бот работает, а контейнер пишет `tls_certificate_untrusted`, подключите уже проверенные CA через read-only каталог `.certs/`. Не отключайте TLS-проверку.

Для CA MAX, уже установленных в `/Library/Keychains/System.keychain`, из корня проекта:

```sh
mkdir -p .certs
security find-certificate -c 'Russian Trusted Root CA' -p /Library/Keychains/System.keychain > .certs/max-ca.pem
security find-certificate -c 'Russian Trusted Sub CA' -p /Library/Keychains/System.keychain >> .certs/max-ca.pem
```

В корневом `.env` задайте `MAX_CA_FILE=/run/max-certs/max-ca.pem`. Это путь внутри контейнера; Compose монтирует локальный `.certs` в `/run/max-certs` только для чтения. Сертификаты публичные, закрытые ключи не экспортируются. Каталог исключён из Git. На другом компьютере/сервере файл нужно подготовить отдельно из проверенного источника; он не запекается в Docker image. Без MAX_CA_FILE бот использует стандартный Linux bundle `/etc/ssl/certs/ca-certificates.crt`.

Проверка и применение:

```sh
docker compose -f compose.yaml -f compose.full.yaml run --rm --no-deps bot python -m app.max_bot.polling --check
docker compose -f compose.yaml -f compose.full.yaml up -d bot
docker compose -f compose.yaml -f compose.full.yaml logs --tail=30 bot
```

`--check` вызывает только GET /me и /subscriptions. Успех: `max_connection_ok`. После перезапуска отправьте `/start` вручную. Обычная команда полного запуска остаётся прежней. Надпись Docker `Started` означает только старт процесса: при ошибке он может сразу завершиться; проверяйте `ps -a` и логи.

## Очередь уведомлений

Полный Compose включает сервис notifications. Он использует тот же backend image, БД и CA bundle, но запускает `python -m app.workers.notifications`. По умолчанию отправка выключена: сервис завершится успешно с `notification_delivery_disabled`, события остаются в БД и видны через API.

Проверки без отправки сообщений (после обновления image/миграций):

```sh
docker compose -f compose.yaml -f compose.full.yaml run --rm --no-deps notifications python -m app.workers.notifications --check
docker compose -f compose.yaml -f compose.full.yaml run --rm --no-deps notifications python -m app.workers.notifications --status
```

--check проверяет GET /me и таблицу уведомлений. --status показывает только количества pending/sending/sent/failed. Тексты, контакты и токены не выводятся.

Для включения настоящей доставки задайте в корневом .env `NOTIFICATION_DELIVERY_ENABLED=true`, затем:

```sh
docker compose -f compose.yaml -f compose.full.yaml up --build -d notifications
```

Начнётся отправка накопленных pending-событий реальным пользователям. Для остановки: `docker compose -f compose.yaml -f compose.full.yaml stop notifications`. Не меняйте старые события вручную ради проверки; синтетические тесты запускаются на отдельной БД.

По умолчанию: опрос 5 сек, пауза между отправками 1.1 сек, максимум 6 попыток, lease 120 сек. Переменные NOTIFICATION_POLL_SECONDS, NOTIFICATION_SEND_INTERVAL_SECONDS, NOTIFICATION_MAX_ATTEMPTS, NOTIFICATION_LEASE_SECONDS читаются из env_file; NOTIFICATION_DELIVERY_ENABLED в полном Compose задаётся корневым .env. Worker ограничивает сетевую операцию 50 сек.

Временные ошибки сети, HTTP 408/429/5xx повторяются через 30, 60, 120, 240, 480 сек (задержка ограничена 1800 сек). Прочие 4xx становятся failed. Ошибка токена 401 или доверия TLS останавливает worker, чтобы не исчерпать попытки всей очереди. Ошибка БД тоже останавливает процесс; очередь остаётся сохранённой. После исправления причины перезапустите notifications. Автоматического бесконечного рестарта нет.

Запись берётся с FOR UPDATE SKIP LOCKED, затем lease записывается и транзакция завершается до HTTP-вызова. Истёкший lease позволяет повтор после аварии. Lease token не даёт запоздавшему worker перезаписать новое состояние. Один активный процесс отправки на БД обеспечивается advisory lock; не запускайте несколько независимых БД с одним bot token. Потеря ответа после принятия MAX или авария перед записью sent может дать повтор сообщения.

Для повторного запуска конкретного failed-уведомления после исправления причины (UUID берётся из логов notification_delivery_failed):

```sh
docker compose -f compose.yaml -f compose.full.yaml run --rm --no-deps notifications python -m app.workers.notifications --requeue UUID
```

Команда только переводит failed → pending и сбрасывает счётчик; сама не отправляет. Не принимает sent/pending ID. Лента и readAt при этом сохраняются.

## Полная проверка backend одной командой

Из корня, при наличии Docker и backend/.venv с requirements-dev.txt:

```sh
python3 scripts/check_backend.py
```

Скрипт создаёт отдельный контейнер PostgreSQL со случайным локальным портом, применяет миграции через тесты, запускает весь pytest и alembic check. Контейнер удаляется после выполнения, включая ошибку/обычное прерывание. Рабочая БД и токен MAX не используются; доставка сообщений имитируется. Если процесс был убит принудительно до cleanup, оставшийся контейнер имеет префикс priut-check-.

## Сохранение зарегистрированного LocalTunnel-адреса

Для текущей заявки зарегистрирован `https://all-hoops-look.loca.lt`. Туннель можно запускать контейнером вместо отдельного npx-процесса:

```sh
docker compose -f compose.yaml -f compose.full.yaml -f compose.tunnel.yaml up --build -d
```

Сначала остановите ручной LocalTunnel с тем же именем. Контейнер обращается к `web:80` и перезапускается при завершении. Если сервис выдаёт другой адрес, контейнер отказывается его использовать и повторяет попытку; право на прежнее имя бесплатный LocalTunnel не гарантирует. Логи: та же команда compose с `logs --tail=30 tunnel`. Туннель работает пока запущены Mac/Docker и доступна сеть; сон ноутбука прерывает соединения.

HTTP 503 Tunnel Unavailable означает отсутствие работающего туннеля. Страница Tunnel website ahead — отдельное предупреждение LocalTunnel до загрузки приложения; эта конфигурация его не убирает. Ввод IP/Continue выполняется пользователем. Успешный curl health не доказывает прохождение этой страницы в MAX WebView. Добавление заголовка bypass-tunnel-reminder в наш frontend не меняет начальную навигацию MAX.
