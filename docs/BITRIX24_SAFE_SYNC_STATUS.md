# Bitrix24 Safe Sync Status

## Current State

SmetaOffice has a safe read-only Bitrix24 integration contour.

It can:

- store an incoming Bitrix24 webhook on the server;
- test the webhook through `profile`;
- import deals through `crm.deal.list`;
- map Bitrix24 deals into SmetaOffice sales leads;
- show connection status in `/api/health` without exposing the webhook;
- keep a sync log.

It does not:

- store Bitrix24 login/password in code;
- publish webhook URLs in GitHub;
- write back to Bitrix24;
- import all deals by default.

## Guardrail

Import is blocked until qualified Bitrix `STAGE_ID` values are configured.

Reason: Bitrix24 contains cold incoming requests and Instagram Direct entries that must stay inside Bitrix24 until qualification. SmetaOffice should receive only warm deals: measurement, proposal, contract, advance, or deals ready to become projects.

## Operational Rule

Bitrix24 remains the CRM for sales. SmetaOffice is the production and project-control layer.

```text
Bitrix24 lead/deal
→ qualified warm deal
→ SmetaOffice sales lead mirror
→ SmetaOffice project after contract/advance
→ project stages, executors, approvals, payouts
```

## Next Required Manual Step

In Bitrix24, collect the exact `STAGE_ID` values for stages that are allowed to enter SmetaOffice. Add those values in SmetaOffice integrations as a comma-separated list.

Only after that should manual import be used.
