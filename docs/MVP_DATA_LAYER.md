# SmetaOffice MVP Data Layer

This file describes the current non-private MVP data model. It contains no real company documents, passwords, personal data, or commercial records.

## Purpose

SmetaOffice must not depend only on browser `localStorage`. For internal online testing, the app needs one shared storage layer so projects, executors, users, partners, sales leads, and dictionaries do not disappear or differ between browsers.

## Current MVP Storage

The local backend is `server.mjs`.

It stores data in:

```text
data/database.json
```

This file is ignored by Git and must not be published.

## API Collections

Current API endpoints:

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | API health, storage type, and object counts |
| `GET /api/db` | Full local JSON database for development inspection |
| `GET/PUT /api/projects` | Project registry |
| `GET/PUT /api/executors` | Executor database |
| `GET/PUT /api/users` | Users, roles, regions, positions |
| `GET/PUT /api/partners` | Partner network |
| `GET/PUT /api/sales-leads` | Bitrix-aligned sales lead mirror for MVP |
| `GET/PUT /api/directories` | Regions, directions, project types, stage templates, finance templates |
| `GET/PUT /api/integration-settings` | Integration settings |
| `POST /api/sync-log` | Integration event log |

## Important Limitation

JSON storage is acceptable only for MVP testing. For real company use, move this layer to PostgreSQL or Supabase and enforce role access on the server.

## Next Required Step

Move these dictionaries from hardcoded frontend constants into editable admin-managed records:

- regions;
- directions;
- project types;
- stage templates;
- finance templates;
- partner categories;
- role permissions.

The frontend should read them from `/api/directories`, and only owner/admin should be able to change them.
