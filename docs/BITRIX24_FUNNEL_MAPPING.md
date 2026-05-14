# Bitrix24 Funnel Mapping for SmetaOffice MVP

Документ описывает будущую безопасную синхронизацию SmetaOffice с Bitrix24.  
Реальный Bitrix24 API, webhook URL, токены, пароли и реальные клиентские данные в репозиторий не добавляются.

## Принцип

SmetaOffice не создаёт отдельную CRM. Он показывает операционный слой и проверяет структуру будущей интеграции.

```text
SmetaGO → Лид в Bitrix24 → Hunter → Farmer → Сделка направления → Проект SmetaOffice → Этапы → Акты/оплаты → NPS → допродажа
```

## Read-only аудит Bitrix24 от 15.05.2026

Проверка сделана в интерфейсе Bitrix24 без изменения настроек и данных.

Что видно сейчас:

- В CRM сделки уже используются как вход продаж. В списке есть входящие Instagram Direct на стадии `Заявка получена`, часто с суммой `0 ₽`.
- Эти холодные входящие заявки не должны автоматически отображаться в SmetaOffice как рабочие лиды. Они остаются в Bitrix24 до квалификации.
- SmetaOffice должен получать только тёплые/квалифицированные сделки: замер, КП, договор, аванс, либо сделка, которую нужно превратить в проект.
- В сделках Bitrix24 уже есть пользовательские поля по регионам, типам услуг, датам проекта, авансу, объекту, городу, документам, фотоотчётам и исполнителям.

Наблюдаемые поля сделки, которые можно использовать в первой read-only синхронизации:

| Назначение SmetaOffice | Поле Bitrix24 | ID поля |
|---|---|---|
| Тип услуги / направление | Тип услуги | `UF_CRM_1749425490004` |
| Ответственный проект / РП | Ответственный проджект | `UF_CRM_1749425673` |
| Дата начала проекта | Дата начала проекта | `UF_CRM_1749425736` |
| Дата завершения проекта | Дата завершения проекта | `UF_CRM_1749425753` |
| ТЗ / файлы ТЗ | Уточненное ТЗ (шаблон + правки) | `UF_CRM_1749425819` |
| Вложения | Вложения | `UF_CRM_1749471380567` |
| Объект | Объект | `UF_CRM_1749471792` |
| Аванс | Аванс | `UF_CRM_1749472042582` |
| Регион | Регион | `UF_CRM_1760087366074` |
| Категория клиента | Категория клиента | `UF_CRM_1760331245581` |
| Причина отказа | Причина отказа | `UF_CRM_1760331351` |
| Предыдущее направление | Из какого направления пришла | `UF_CRM_1760356464734` |
| Город | Город | `UF_CRM_1761054834674` |
| Тип операции | Тип операции | `UF_CRM_1761055144924` |
| Тип объекта | Тип объекта | `UF_CRM_1761055201264` |
| Площадь | Площадь (кв.м) | `UF_CRM_1761055254141` |
| Бюджет клиента | Бюджет клиента или ожидаемая цена продажи | `UF_CRM_1761055274310` |
| Вид изысканий | Вид изысканий | `UF_CRM_1761055759421` |
| Стадия проекта | Стадия проекта | `UF_CRM_1761055830269` |
| Срок выполнения | Сроки выполнения (дней) | `UF_CRM_1761055856097` |
| Пакет документов | Требуемый пакет документов на выходе | `UF_CRM_1761055888873` |
| Дизайн: тип помещения | Тип помещения | `UF_CRM_1761056699241` |
| Дизайн: бюджет проекта | Бюджет на разработку проекта | `UF_CRM_1761056822049` |
| Обмерный план | Обмерный план | `UF_CRM_1761056854956` |
| Ремонт: общий бюджет | Общий бюджет ремонта | `UF_CRM_1761057716569` |
| Ремонт: старт работ | Дата планируемого старта работ | `UF_CRM_1761057766282` |
| Ссылка на дизайн-проект | Ссылка на дизайн-проект | `UF_CRM_1761057900111` |
| Договор / пакет | Номер договора и пакет | `UF_CRM_1761225812060` |
| Документы | Документы | `UF_CRM_1761286431` |
| Фотоотчёт | Фотоотчет | `UF_CRM_1761896233937` |
| Исполнитель дизайна | Исполнитель по дизайну | `UF_CRM_1766757314` |
| Исполнитель визуализации | Исполнитель по визуализации | `UF_CRM_1766757393` |
| Чертежи | Чертежи | `UF_CRM_1766757418672` |
| Визуализация | Визуализация | `UF_CRM_1766757447` |
| Исполнитель чертежей | Исполнитель по чертежам | `UF_CRM_1766757560` |
| Архитектурный файл | Архитектура | `UF_CRM_1766757664158` |
| Исполнитель АР | Исполнитель по АР | `UF_CRM_1766757679` |
| Конструктивный файл | Конструктив | `UF_CRM_1766757731663` |
| Исполнитель КР | Исполнитель по КР | `UF_CRM_1766757751` |

Вывод для SmetaOffice:

- Сначала нужен read-only импорт сделок из Bitrix24 с фильтром по стадии и/или признаку квалификации.
- Импортировать всё подряд нельзя: в Bitrix много холодных входящих обращений, которые ещё не являются рабочими лидами SmetaOffice.
- Для первой интеграции достаточно читать сделки, стадию, ответственного, источник/путь клиента, регион, город, тип услуги, сумму, аванс и проектные даты.
- Запись обратно в Bitrix24 включать только после отдельной проверки на тестовой сделке.

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
