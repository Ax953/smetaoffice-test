# SmetaOffice: онлайн-тестирование

## Что уже готово

- `npm run build` собирает фронт в `dist`.
- `npm start` запускает один production-сервер.
- Сервер отдает:
  - приложение SmetaOffice;
  - API по `/api`;
  - JSON-базу в `data/database.json`.

## Быстрый запуск на сервере

```bash
npm ci
npm run build
npm start
```

Проверка:

```bash
curl http://localhost:8787/api/health
```

## Render

1. Загрузить проект в GitHub.
2. В Render создать `New Web Service`.
3. Выбрать репозиторий.
4. Build command: `npm ci && npm run build`.
5. Start command: `npm start`.
6. После запуска открыть выданный Render URL.

## Важно для пилота

Текущая база хранится в JSON-файле. Для первого онлайн-теста этого достаточно, но для боевого режима нужно перейти на PostgreSQL/Supabase/Neon, чтобы данные не зависели от файловой системы хостинга.

Bitrix пока не перезаписываем автоматически. Сначала тестируем SmetaOffice как рабочий кабинет, затем подключаем webhooks/REST и одну тестовую сделку.
