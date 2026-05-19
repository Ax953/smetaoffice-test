# SmetaOffice Finance Management Model

This document describes the MVP finance logic used in SmetaOffice. It contains only technical and anonymized business rules.

## Core Separation

SmetaOffice separates two finance layers:

1. Project gross economy.
2. Period net management result.

The 67/33 distribution is not calculated inside a project. It is calculated only for a financial period after operational expenses and accumulated losses.

## Project Gross Economy

Project finance is used to understand whether the production budget is under control.

Project-level fields:

- contract amount;
- paid by client;
- receivable from client;
- production budget for PM/team;
- sales center commission;
- executor and partner cost;
- paid to executors;
- payable to executors;
- PM budget left;
- planned gross company part.

The project does not include:

- rent;
- office salaries;
- marketing;
- branding;
- legal costs;
- other operational expenses;
- 67/33 distribution.

## Financial Period

A financial period can be:

- month;
- quarter;
- year.

The period belongs to a scope:

- whole holding;
- region;
- direction;
- region + direction.

Period calculation:

```text
revenue
- project costs
= gross profit

gross profit
- operational expenses
= net profit before carry

net profit before carry
- accumulated previous loss
= distribution base
```

If the distribution base is positive:

```text
holding share = distribution base * 67%
manager share = distribution base * 33%
```

If the distribution base is zero or negative:

```text
holding share = 0
manager share = 0
remaining loss is carried to the next period
```

## Operational Expenses

Operational expenses are entered at period/scope level, not at project level.

Examples:

- rent;
- salaries;
- marketing;
- advertising;
- IT;
- branding;
- legal;
- taxes and commissions;
- other expenses.

## Cash Accounts

Cash/accounts are tracked separately to show available funds:

- bank account;
- cashbox;
- reserve.

This is a management view. It is not a replacement for accounting software.

## Access Rules

Finance management can be viewed by:

- owner;
- deputy;
- finance;
- accountant;
- director for own scope;
- regional manager for own scope.

Finance management can be edited by:

- owner;
- deputy;
- finance;
- accountant.

System administrators do not automatically get finance editing rights.

## Current MVP Limitations

- No external accounting integration yet.
- No automatic bank statement import yet.
- No automatic Bitrix payment import yet.
- No formal accounting ledger.
- JSON storage is acceptable for MVP testing only.

