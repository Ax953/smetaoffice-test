# SmetaOffice test MVP

Внутренняя тестовая версия SmetaOffice для проверки логики холдинга, проектов, ролей, исполнителей, этапов и финансов.

## Тестовые входы

Это только демо-доступы для проверки интерфейса. Реальные пароли, базы знаний, документы SmetaGroup и экспорт ChatGPT в репозиторий не загружаются.

| Роль | Логин | Пароль |
| --- | --- | --- |
| Владелец | `owner` | `owner` |
| Администратор | `admin` | `admin` |
| Заместитель | `deputy` | `deputy` |
| Руководитель направления | `director` | `director` |
| Региональный менеджер | `regional` | `regional` |
| Руководитель проекта | `pm` | `pm` |
| Менеджер проекта | `project` | `project` |
| Менеджер продаж | `sales` | `sales` |
| Руководитель отдела продаж | `headsales` | `headsales` |
| Бухгалтер | `accountant` | `accountant` |
| Финансы | `finance` | `finance` |
| Исполнитель | `executor` | `executor` |
| Партнёр | `partner` | `partner` |

## Проверка локально

```bash
npm install
npm run build
npm start
```

Healthcheck API:

```text
http://127.0.0.1:8787/api/health
```
