# Bitrix24 Funnel Mapping for SmetaOffice MVP

Документ описывает будущую безопасную синхронизацию SmetaOffice с Bitrix24.  
Реальный Bitrix24 API, webhook URL, токены, пароли и реальные клиентские данные в репозиторий не добавляются.

## Принцип

SmetaOffice не создаёт отдельную CRM. Он показывает операционный слой и проверяет структуру будущей интеграции.

```text
SmetaGO → Лид в Bitrix24 → Hunter → Farmer → Сделка направления → Проект SmetaOffice → Этапы → Акты/оплаты → NPS → допродажа
```

## Воронки MVP

| Воронка | Назначение | Комментарий |
|---|---|---|
| Общая воронка лидов | Первичная обработка всех заявок | Верхний слой контроля SLA и квалификации |
| Недвижимость | Подбор, показы, сделка, комиссия | Может вести партнёр/риелтор |
| Изыскания / обмеры / обследования | Полевые работы, отчёт, финальная оплата | Может быть входом в проектную документацию |
| Дизайн / архитектура / проектирование | Бриф, КП, договор, проектные этапы | После договора создаётся проект SmetaOffice |
| Ремонт / строительство | Смета, договор, график, этапы работ | Может получать допродажу из дизайна |
| Комплектация | Спецификация, поставщики, доставка, акт | Связано с проектом/ремонтом |
| Бытовые услуги / сервис | Разовые услуги после сдачи | Быстрый цикл заявки |
| Партнёры | Подключение и контроль партнёров | Отдельная партнёрская воронка |

## Карта полей

| SmetaOffice поле | Bitrix24 сущность | Bitrix24 поле | Направление обмена | Комментарий |
|---|---|---|---|---|
| `Lead.id` | Лид | ID | Bitrix24 → SmetaOffice | В SmetaOffice хранить внешний ID Bitrix, не генерировать боевой ID отдельно |
| `Lead.source` | Лид | SOURCE_ID | Bitrix24 ↔ SmetaOffice | `smetago_app`, website, phone, whatsapp, instagram, partner, referral |
| `Lead.city` | Лид / Контакт | UF_CRM_CITY | Bitrix24 ↔ SmetaOffice | Город заявки |
| `Lead.region` | Лид / Сделка | UF_CRM_REGION | Bitrix24 ↔ SmetaOffice | Регион ответственности: ЧР, Ростов, ДНР и т.д. |
| `Lead.direction` | Лид / Сделка | UF_CRM_DIRECTION | Bitrix24 ↔ SmetaOffice | Направление услуги |
| `Lead.clientName` | Контакт | NAME / FULL_NAME | Bitrix24 → SmetaOffice | В тестовых данных обезличено |
| `Lead.clientPhone` | Контакт | PHONE | Bitrix24 → SmetaOffice | Не публиковать реальные телефоны |
| `Lead.clientEmail` | Контакт | EMAIL | Bitrix24 → SmetaOffice | Не публиковать реальные email |
| `Lead.requestText` | Лид | COMMENTS / UF_CRM_REQUEST | Bitrix24 ↔ SmetaOffice | Текст запроса клиента |
| `Lead.budget` | Лид / Сделка | OPPORTUNITY | Bitrix24 ↔ SmetaOffice | Оценочный бюджет / сумма сделки |
| `Lead.area` | Лид / Сделка | UF_CRM_AREA | Bitrix24 ↔ SmetaOffice | Площадь объекта |
| `Lead.objectType` | Лид / Сделка | UF_CRM_OBJECT_TYPE | Bitrix24 ↔ SmetaOffice | Квартира, дом, школа, коммерция и т.д. |
| `Lead.status` | Лид | STATUS_ID | Bitrix24 → SmetaOffice | Открыт, в работе, архив |
| `Lead.funnelType` | Сделка | CATEGORY_ID | Bitrix24 → SmetaOffice | Воронка направления |
| `Lead.stage` | Лид / Сделка | STATUS_ID / STAGE_ID | Bitrix24 ↔ SmetaOffice | Стадия должна соответствовать воронке Bitrix24 |
| `Lead.hunterId` | Лид / Задача | ASSIGNED_BY_ID / UF_CRM_HUNTER | Bitrix24 ↔ SmetaOffice | Первичная обработка заявки |
| `Lead.hunterName` | Лид | ASSIGNED_BY_NAME | Bitrix24 → SmetaOffice | Отображение ответственного Hunter |
| `Lead.farmerId` | Сделка | UF_CRM_FARMER | Bitrix24 ↔ SmetaOffice | Менеджер направления / риелтор / дизайнер / прораб |
| `Lead.farmerName` | Сделка | UF_CRM_FARMER_NAME | Bitrix24 → SmetaOffice | Отображение ответственного Farmer |
| `Lead.headOfSalesId` | Лид / Сделка | UF_CRM_HEAD_OF_SALES | Bitrix24 ↔ SmetaOffice | РОП контролирует план, конверсию, SLA |
| `Lead.partnerId` | Компания / Контакт | COMPANY_ID / UF_CRM_PARTNER | Bitrix24 ↔ SmetaOffice | Партнёр видит только свои заявки |
| `Lead.projectId` | Сделка | UF_CRM_SMETAOFFICE_PROJECT | SmetaOffice → Bitrix24 | Ссылка на проект SmetaOffice после договора/аванса |
| `Lead.firstResponseAt` | Лид | UF_CRM_FIRST_RESPONSE_AT | SmetaOffice → Bitrix24 | Факт первого ответа Hunter |
| `Lead.createdAt` | Лид | DATE_CREATE | Bitrix24 → SmetaOffice | Дата создания лида |
| `Lead.slaDeadlineAt` | Лид / Задача | UF_CRM_SLA_DEADLINE | SmetaOffice ↔ Bitrix24 | `createdAt + 5 минут` |
| `Lead.slaStatus` | Лид / Отчёт | UF_CRM_SLA_STATUS | SmetaOffice → Bitrix24 | ok, warning, breached |
| `Lead.qualificationStatus` | Лид | UF_CRM_QUALIFICATION | Bitrix24 ↔ SmetaOffice | cold, warm, hot, not_qualified |
| `Lead.refusalReason` | Лид / Сделка | UF_CRM_REFUSAL_REASON | Bitrix24 ↔ SmetaOffice | Причина отказа/архива |
| `Lead.nextContactAt` | Задача / Лид | DEADLINE / UF_CRM_NEXT_CONTACT | Bitrix24 ↔ SmetaOffice | Следующий контакт |
| `Lead.lastActivityAt` | Лид / Таймлайн | DATE_MODIFY | Bitrix24 → SmetaOffice | Последняя активность |
| `Lead.notes` | Лид / Таймлайн | COMMENTS | Bitrix24 ↔ SmetaOffice | Рабочие заметки |
| `Project.contractAmount` | Сделка | OPPORTUNITY | Bitrix24 ↔ SmetaOffice | Сумма договора |
| `Project.paidByClient` | Сделка / Счёт | UF_CRM_PAID_FACT | Bitrix24 ↔ SmetaOffice | Фактическая оплата |
| `Project.paymentStatus` | Сделка | UF_CRM_PAYMENT_STATUS | Bitrix24 ↔ SmetaOffice | Статус оплаты |
| `Project.partnerPayouts` | Сделка / Компания | UF_CRM_PARTNER_COMMISSION | SmetaOffice → Bitrix24 | Партнёрская комиссия |
| `Commission.platform` | Сделка | UF_CRM_PLATFORM_COMMISSION | SmetaOffice → Bitrix24 | Комиссия платформы |
| `Commission.hunter` | Сделка | UF_CRM_HUNTER_COMMISSION | SmetaOffice → Bitrix24 | Комиссия Hunter |
| `Commission.farmer` | Сделка | UF_CRM_FARMER_COMMISSION | SmetaOffice → Bitrix24 | Комиссия Farmer |
| `NPS.score` | Сделка / Опрос | UF_CRM_NPS | SmetaOffice → Bitrix24 | После финала/акта |
| `Task.id` | Задача | ID | Bitrix24 ↔ SmetaOffice | Задачи Hunter/Farmer/РП |
| `Task.due` | Задача | DEADLINE | Bitrix24 ↔ SmetaOffice | Срок задачи |
| `Task.status` | Задача | STATUS | Bitrix24 ↔ SmetaOffice | Статус задачи |

## Что требует отдельной интеграции

- Получить реальные ID воронок Bitrix24 (`CATEGORY_ID`).
- Получить реальные ID стадий (`STAGE_ID` / `STATUS_ID`).
- Создать пользовательские поля `UF_CRM_*` в Bitrix24.
- Настроить read-only синхронизацию на тестовой сделке.
- После проверки разрешить точечную запись: первый ответ, SLA, ссылка на проект, статус оплаты.
