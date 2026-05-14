# Официальный запуск SmetaOffice

Цель: поднять не тестовую статическую витрину, а Node-приложение SmetaOffice с серверной авторизацией и постоянным хранением данных.

## Что уже подготовлено в коде

- `npm run build` собирает frontend в `dist`.
- `npm start` запускает Node-сервер.
- Node-сервер отдаёт frontend и API `/api/*`.
- `SMETA_AUTH_MODE=server` включает серверную авторизацию.
- `SMETA_DATA_DIR` задаёт папку для `database.json`.
- На Render добавлен persistent disk `/var/data/smetaoffice`, чтобы JSON-база не пропадала после перезапуска.

## Минимальные переменные окружения

На сервере/хостинге нужно задать:

```text
NODE_ENV=production
SMETA_AUTH_MODE=server
SMETA_SESSION_TTL_HOURS=24
SMETA_DATA_DIR=/var/data/smetaoffice
SMETA_BOOTSTRAP_OWNER_LOGIN=<создать на хостинге>
SMETA_BOOTSTRAP_OWNER_PASSWORD=<создать на хостинге>
SMETA_BOOTSTRAP_OWNER_NAME=Ахмед
```

Реальные значения логина и пароля нельзя хранить в GitHub.

## Первый запуск

1. Хостинг запускает:

```bash
npm ci
npm run build
npm start
```

2. Сервер создаёт владельца из `SMETA_BOOTSTRAP_OWNER_*`, если в базе ещё нет owner.
3. Проверить:

```text
/api/health
```

Ожидаемый результат:

```json
{
  "ok": true,
  "service": "SmetaOffice API",
  "storage": "json",
  "authMode": "server"
}
```

4. Зайти в интерфейс и проверить вход владельцем.
5. После создания реальных пользователей сменить bootstrap-пароль и включить 2FA на аккаунтах хостинга/GitHub/REG.RU.

## Домен

Тестовая версия:

```text
test.smeta.group -> GitHub Pages
```

Официальная версия:

```text
office.smeta.group -> Node-хостинг SmetaOffice
```

Когда хостинг выдаст адрес вида:

```text
smetaoffice-official.onrender.com
```

в REG.RU нужно добавить:

```text
office CNAME smetaoffice-official.onrender.com
```

Корневой `smeta.group` лучше не трогать до финального решения: его можно будет направить на официальный вход или оставить как страницу продукта SmetaOffice.

## Что ещё не боевой уровень

JSON-база с persistent disk подходит для первой закрытой проверки, но не для полноценной эксплуатации холдинга.

Следующий уровень:

- PostgreSQL/Supabase;
- row-level access на сервере;
- audit log всех изменений;
- резервные копии;
- нормальные пароли с reset-flow;
- 2FA;
- Bitrix24 OAuth/webhook интеграция.
