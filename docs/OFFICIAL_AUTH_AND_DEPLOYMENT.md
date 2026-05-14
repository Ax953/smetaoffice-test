# SmetaOffice official auth and deployment baseline

This document describes the first official backend/auth layer for SmetaOffice.

## Current split

- `https://test.smeta.group/` is the public test build on GitHub Pages.
- The official production app must run with the Node server, not only static GitHub Pages.
- GitHub must contain only code, test data and anonymized docs.
- Real passwords, documents, ChatGPT exports and company files stay outside GitHub.

## Auth modes

### Demo mode

Default mode:

```bash
SMETA_AUTH_MODE=demo
```

Behavior:

- keeps the current test flow working;
- demo logins can still be used in the browser;
- API reads/writes stay open for local MVP testing.

### Server mode

Official mode:

```bash
SMETA_AUTH_MODE=server
```

Behavior:

- login goes through `/api/auth/login`;
- server returns a session token;
- API writes require an authenticated user;
- write permissions are checked by role;
- `/api/users` hides password fields from the client;
- bootstrap owner is created from environment variables if the database has no owner.

Required first-run variables:

```bash
SMETA_BOOTSTRAP_OWNER_LOGIN=<set on server>
SMETA_BOOTSTRAP_OWNER_PASSWORD=<set on server>
SMETA_BOOTSTRAP_OWNER_NAME=<set on server>
```

Do not put real values into GitHub.

## New endpoints

| Endpoint | Method | Purpose |
|---|---:|---|
| `/api/health` | GET | API status, storage type, auth mode, record counts |
| `/api/auth/login` | POST | Server login, returns `{ token, user }` |
| `/api/auth/me` | GET | Validates bearer token and returns current user |
| `/api/auth/logout` | POST | Invalidates current token |
| `/api/access-requests` | POST | Public access request without immediate role assignment |
| `/api/access-requests` | GET | Owner/admin review queue in server mode |

## Role write baseline

| Role | Write access |
|---|---|
| owner | all MVP collections |
| admin | users, directories, projects, executors, partners, settings |
| deputy | projects, executors, partners, sales leads |
| director | projects, executors, partners |
| regional_manager | projects, executors, partners |
| pm | projects, executors |
| project_manager | projects |
| head_of_sales | sales leads |
| sales_manager | sales leads |
| finance/accountant | finance fields later; no broad project mutation baseline yet |
| executor/partner | no broad collection write baseline |

This is still MVP-level protection. The next required step is row-level filtering on the server, so each role receives only its own projects, tasks, partners and finance scope from the API.

## Deployment recommendation

For an official version, use a backend-capable host:

- Render, Railway, VPS or similar Node hosting for the current MVP;
- later Supabase/PostgreSQL for stable multi-user storage and audit logs.

GitHub Pages is suitable only for the current static test build. It cannot safely run real backend authentication or persistent multi-user writes.
