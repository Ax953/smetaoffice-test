export const agentPhases = [
  { id: 0, label: "Подготовка", objective: "Hermes, база знаний, права, аудит и безопасный доступ к SmetaOffice." },
  { id: 1, label: "Продажи + ТЗ", objective: "Прием лида, консультация, квалификация, бриф и коммерческое предложение." },
  { id: 2, label: "Концепт", objective: "Проверка понимания клиента через предварительный визуальный результат." },
  { id: 3, label: "Запуск проекта", objective: "Договор, аванс, создание проекта, папок, этапов и команды." },
  { id: 4, label: "PM и отчеты", objective: "Контроль сроков, блокеров, клиента, передачи и завершения проекта." },
  { id: 5, label: "Финансы", objective: "План-факт, себестоимость, маржа и финансовые ограничения." },
  { id: 6, label: "Производство", objective: "Помощники специалистов, контроль комплектности и регламентов." },
  { id: 7, label: "Допродажи", objective: "Следующая услуга, партнерский сервис и удержание клиента." },
];

const phaseLabel = (phase) => `${phase}. ${agentPhases.find((item) => item.id === phase)?.label || "Этап"}`;

const definitions = [
  {
    id: "A0", name: "SmetaOS Orchestrator / Hermes", block: "Ядро", phase: 0, priority: "High", readiness: "RUNNING_LOCAL", mode: "HYBRID",
    purpose: "Принимает события, определяет контекст и передает работу нужным агентам.",
    humanApproval: "Обязателен для внешних сообщений, денег, договоров и изменений SmetaOffice",
    systems: ["Hermes", "SmetaOffice", "Очередь событий"], dependsOn: ["A23", "A24"], kpi: "Доля корректно маршрутизированных событий",
    currentState: "Hermes запущен локально в Docker с моделью smeta-hermes:20b; SmetaOffice подключается в read-only режиме.",
    nextStep: "Подключить журнал событий SmetaOffice и управляемые очереди задач без права автономной записи.",
  },
  {
    id: "A1", name: "Lead Router", block: "Продажи", phase: 1, priority: "High", readiness: "MVP_READY", mode: "AI",
    purpose: "Принимает и классифицирует лиды из сайта, CRM и мессенджеров.",
    humanApproval: "Не требуется для классификации; требуется перед сменой ответственного",
    systems: ["Bitrix24", "SmetaOffice", "Мессенджеры"], dependsOn: ["A0", "A24"], kpi: "Скорость реакции и доля лидов без потери",
    currentState: "Есть модель лида, статусы, mock-каналы и правила маршрутизации.", nextStep: "Подключить реальный входящий webhook Bitrix24 и дедупликацию контактов.",
  },
  {
    id: "A2", name: "Sales Consultant", block: "Продажи", phase: 1, priority: "High", readiness: "MVP_READY", mode: "HYBRID",
    purpose: "Консультирует клиента, выявляет потребность и ведет к следующему шагу.",
    humanApproval: "Менеджер подтверждает обещания, скидки и нестандартные условия",
    systems: ["CRM", "Чат", "Телефония"], dependsOn: ["A1", "A23"], kpi: "Конверсия в бриф и скорость ответа",
    currentState: "Сценарий квалификации и mock-ответы подготовлены.", nextStep: "Обучить на утвержденных услугах, ценах, возражениях и реальных диалогах.",
  },
  {
    id: "A3", name: "Brief / TZ Collector", block: "Продажи / ТЗ", phase: 1, priority: "High", readiness: "MVP_READY", mode: "HYBRID",
    purpose: "Собирает структурированный бриф и отмечает отсутствующие обязательные данные.",
    humanApproval: "Клиент подтверждает итоговое ТЗ; специалист проверяет технические ограничения",
    systems: ["SmetaOffice", "Формы", "База знаний"], dependsOn: ["A2", "A23"], kpi: "Полнота ТЗ до передачи в производство",
    currentState: "Структуры брифов для дизайна, архитектуры и недвижимости определены.", nextStep: "Привязать обязательные поля к типам услуг и документам SmetaOffice.",
  },
  {
    id: "A4", name: "Pricing & КП Agent", block: "Продажи / Финансы", phase: 1, priority: "High", readiness: "MVP_READY", mode: "HYBRID",
    purpose: "Считает цену по утвержденным пакетам и формирует черновик КП.",
    humanApproval: "РОП/OWNER подтверждает КП, скидку и нестандартную цену",
    systems: ["Прайс-лист", "SmetaOffice", "Шаблоны документов"], dependsOn: ["A3", "A17", "A23"], kpi: "Точность КП и время подготовки",
    currentState: "MVP pricing engine учитывает площадь, пакет, срочность, допуслуги, скидку и аванс.", nextStep: "Загрузить утвержденные прайсы и матрицу полномочий по скидкам.",
  },
  {
    id: "A5", name: "AI Concept Agent", block: "Креатив", phase: 2, priority: "High", readiness: "MVP_READY", mode: "HYBRID",
    purpose: "Готовит 1-3 предварительных концепта для проверки понимания клиента.",
    humanApproval: "Менеджер/дизайнер проверяет концепт до отправки клиенту",
    systems: ["Image Generation", "SmetaOffice", "Файлы"], dependsOn: ["A3", "A23"], kpi: "Доля концептов, подтвердивших понимание с первой итерации",
    currentState: "Prompt и mock-изображение сохраняются; предусмотрены статусы правок и согласования.", nextStep: "Подключить реальный image provider и безопасное хранение версий.",
  },
  {
    id: "A6", name: "Contract / Payment Agent", block: "Документы", phase: 3, priority: "High", readiness: "MVP_READY", mode: "HYBRID",
    purpose: "Готовит договор, счет и контролирует подтверждение аванса.",
    humanApproval: "Юрист/менеджер подтверждает договор; бухгалтер подтверждает оплату",
    systems: ["SmetaOffice", "Бухгалтерия", "Шаблоны договоров"], dependsOn: ["A4", "A24"], kpi: "Время от согласия до аванса",
    currentState: "Статусы договора, загрузка файла и фиксация аванса предусмотрены в MVP.", nextStep: "Связать шаблоны договоров, счета и подтверждение поступления денег.",
  },
  {
    id: "A7", name: "Project Setup Agent", block: "Администрирование", phase: 3, priority: "High", readiness: "MVP_READY", mode: "HYBRID",
    purpose: "После аванса создает карточку, этапы, папки, задачи и стартовый аудит.",
    humanApproval: "PM подтверждает состав этапов и руководителя проекта",
    systems: ["SmetaOffice", "Яндекс.Диск / NAS", "AuditLog"], dependsOn: ["A6", "A24"], kpi: "Время от аванса до готового проекта",
    currentState: "Структура проекта и папок определена; SmetaOffice остается источником истины.", nextStep: "Реализовать серверную команду создания проекта с идемпотентностью и откатом.",
  },
  {
    id: "A8", name: "Resource Allocation Agent", block: "Команда", phase: 3, priority: "High", readiness: "DESIGNED", mode: "HYBRID",
    purpose: "Подбирает кандидатов по роли, загрузке, рейтингу, сроку и стоимости.",
    humanApproval: "PM/руководитель утверждает назначение",
    systems: ["SmetaOffice", "Исполнители", "Внутренняя доска"], dependsOn: ["A7", "A17"], kpi: "Скорость комплектации команды и загрузка специалистов",
    currentState: "В SmetaOffice есть исполнители, рейтинг, загрузка и доска доступных работ.", nextStep: "Добавить прозрачный алгоритм ранжирования и журнал причин рекомендации.",
  },
  {
    id: "A9", name: "Project Manager Agent", block: "PM", phase: 4, priority: "High", readiness: "MVP_READY", mode: "HYBRID",
    purpose: "Контролирует этапы, задачи, сроки, блокеры и эскалации.",
    humanApproval: "PM подтверждает изменение сроков, состава работ и эскалации клиенту",
    systems: ["SmetaOffice", "Задачи", "Уведомления"], dependsOn: ["A7", "A8", "A24"], kpi: "Соблюдение сроков и время реакции на блокер",
    currentState: "Проекты, этапы, задачи, риски и уведомления уже представлены в SmetaOffice.", nextStep: "Добавить события просрочки, правила эскалации и ежедневный цикл контроля.",
  },
  {
    id: "A10", name: "Daily Client Report Agent", block: "Клиентский сервис", phase: 4, priority: "High", readiness: "MVP_READY", mode: "HYBRID",
    purpose: "Формирует понятный ежедневный отчет из подтвержденных статусов задач.",
    humanApproval: "PM подтверждает отчет перед внешней отправкой",
    systems: ["SmetaOffice", "Клиентский кабинет", "Мессенджеры"], dependsOn: ["A9", "A24"], kpi: "Регулярность отчетов и отсутствие неподтвержденных обещаний",
    currentState: "Структура отчета и mock-генерация из задач определены.", nextStep: "Подключить только подтвержденные факты из проекта и очередь согласования.",
  },
  {
    id: "A11", name: "Design Assistant", block: "Производство", phase: 6, priority: "Medium", readiness: "DESIGNED", mode: "HYBRID",
    purpose: "Помогает дизайнеру с ТЗ, референсами и заданиями визуализатору.",
    humanApproval: "Ведущий дизайнер утверждает решения",
    systems: ["SmetaOffice", "База материалов", "Файлы"], dependsOn: ["A3", "A9", "A23"], kpi: "Скорость подготовки заданий и число возвратов",
    currentState: "Роль и границы помощника описаны в матрице.", nextStep: "Собрать эталонные ТЗ, чек-листы и библиотеку материалов.",
  },
  {
    id: "A12", name: "Architecture Assistant", block: "Производство", phase: 6, priority: "Medium", readiness: "DESIGNED", mode: "HYBRID",
    purpose: "Готовит архитектурное ТЗ и задания смежным специалистам.",
    humanApproval: "Архитектор/ГИП утверждает технические решения",
    systems: ["SmetaOffice", "Нормативы", "Файлы"], dependsOn: ["A3", "A9", "A23"], kpi: "Полнота исходных данных и снижение переделок",
    currentState: "Архитектурный бриф и производственный контур спроектированы.", nextStep: "Разделить сценарии ИЖС, коммерции и проектного института.",
  },
  {
    id: "A13", name: "Visualization Assistant", block: "Производство", phase: 6, priority: "Medium", readiness: "DESIGNED", mode: "HYBRID",
    purpose: "Собирает описание сцен, материалов и вариантов для визуализатора.",
    humanApproval: "Дизайнер утверждает задание и финальный рендер",
    systems: ["SmetaOffice", "Image Generation", "Файлы"], dependsOn: ["A5", "A11"], kpi: "Число итераций визуализации",
    currentState: "Сценарий помощи визуализатору описан.", nextStep: "Создать структурированный формат задания и контроль версий изображений.",
  },
  {
    id: "A14", name: "Drafting Checker", block: "QA", phase: 6, priority: "Medium", readiness: "DESIGNED", mode: "HYBRID",
    purpose: "Проверяет комплектность чертежей, листов, названий и ссылок на ТЗ.",
    humanApproval: "Чертежник/ГИП принимает замечания и финальный комплект",
    systems: ["SmetaOffice", "Файлы", "Чек-листы"], dependsOn: ["A9", "A18", "A23"], kpi: "Доля ошибок, найденных до выдачи клиенту",
    currentState: "Функция предусмотрена, автоматический разбор CAD/PDF еще не подключен.", nextStep: "Сформировать чек-листы по типам проектов и подключить PDF-анализ.",
  },
  {
    id: "A15", name: "Engineering Coordinator", block: "Производство", phase: 6, priority: "Medium", readiness: "DESIGNED", mode: "HYBRID",
    purpose: "Формирует задания инженерам и контролирует смежные разделы.",
    humanApproval: "ГИП утверждает координационные решения",
    systems: ["SmetaOffice", "Задачи", "Файлы"], dependsOn: ["A9", "A12", "A18"], kpi: "Количество коллизий и просрочек смежных разделов",
    currentState: "Роль агента определена для сложных проектов.", nextStep: "Описать матрицу разделов, входов/выходов и контрольных точек ГИПа.",
  },
  {
    id: "A16", name: "Complectation Agent", block: "Комплектация", phase: 6, priority: "High", readiness: "DESIGNED", mode: "HYBRID",
    purpose: "Собирает спецификации, предложения поставщиков, аналоги и сроки.",
    humanApproval: "Комплектатор/PM подтверждает поставщика и закупку",
    systems: ["SmetaOffice", "Поставщики", "Финансы"], dependsOn: ["A11", "A17", "A22"], kpi: "Экономия, срок поставки и соответствие спецификации",
    currentState: "Направление и связи с проектом определены.", nextStep: "Создать каталог номенклатуры, поставщиков и правила сравнения аналогов.",
  },
  {
    id: "A17", name: "Finance / Margin Agent", block: "Финансы", phase: 5, priority: "High", readiness: "MVP_READY", mode: "HYBRID",
    purpose: "Считает план/факт, остаток, маржу и GREEN/YELLOW/RED.",
    humanApproval: "FINANCE/OWNER подтверждает RED и изменение суммы",
    systems: ["SmetaOffice", "Финучет", "BI"], dependsOn: ["A6", "A7", "A24"], kpi: "Доля проектов без RED-зоны",
    currentState: "Правила 35/50%, финансовые представления и read-only суммы реализованы.", nextStep: "Подключить сверку с бухгалтерией и журнал финансовых исключений.",
  },
  {
    id: "A18", name: "QA / Regulation Agent", block: "QA", phase: 6, priority: "High", readiness: "DESIGNED", mode: "HYBRID",
    purpose: "Проверяет соответствие ТЗ, регламентам и комплектность выдачи.",
    humanApproval: "Ответственный специалист подписывает результат проверки",
    systems: ["SmetaOffice", "Hermes Knowledge", "Чек-листы"], dependsOn: ["A23", "A24"], kpi: "Ошибки после выдачи и полнота финального комплекта",
    currentState: "Регламенты проиндексированы, но формализованные правила проверки еще не сведены в единый набор.", nextStep: "Преобразовать регламенты в версионируемые чек-листы с владельцами.",
  },
  {
    id: "A19", name: "Construction Handoff Agent", block: "Передача", phase: 4, priority: "Medium", readiness: "DESIGNED", mode: "HYBRID",
    purpose: "Передает проект в ремонт/строительство без потери решений и рисков.",
    humanApproval: "PM и руководитель строительства принимают передачу",
    systems: ["SmetaOffice", "Проекты", "Файлы"], dependsOn: ["A9", "A18"], kpi: "Полнота передачи и число уточнений после старта",
    currentState: "Сквозная передача предусмотрена в бизнес-процессе.", nextStep: "Определить обязательный пакет передачи и двусторонний акт готовности.",
  },
  {
    id: "A20", name: "Print / Delivery Agent", block: "Финал", phase: 4, priority: "Medium", readiness: "DESIGNED", mode: "HYBRID",
    purpose: "Выбирает сценарий печати, доставки, архива и финальной выдачи.",
    humanApproval: "Администратор подтверждает заказ печати и передачу клиенту",
    systems: ["SmetaOffice", "NAS", "Печать / доставка"], dependsOn: ["A18", "A24"], kpi: "Срок и стоимость финальной выдачи",
    currentState: "Сценарий описан, интеграция с печатью не подключена.", nextStep: "Добавить расчет вариантов и запрет печати неподтвержденного комплекта.",
  },
  {
    id: "A21", name: "Upsell Agent", block: "Продажи", phase: 7, priority: "High", readiness: "MVP_READY", mode: "HYBRID",
    purpose: "Предлагает следующий логичный продукт после завершенного этапа.",
    humanApproval: "Менеджер подтверждает предложение и время контакта",
    systems: ["SmetaOffice", "Bitrix24", "Каталог услуг"], dependsOn: ["A9", "A17", "A23"], kpi: "Конверсия в следующую услугу",
    currentState: "Блок рекомендаций и цепочка следующих услуг предусмотрены в MVP.", nextStep: "Привязать правила к типу завершенного проекта, городу и истории клиента.",
  },
  {
    id: "A22", name: "Partner Services Agent", block: "Партнеры", phase: 7, priority: "Medium", readiness: "DESIGNED", mode: "HYBRID",
    purpose: "Подбирает партнерскую услугу и контролирует качество исполнения.",
    humanApproval: "Менеджер подтверждает партнера; клиент подтверждает заказ",
    systems: ["SmetaOffice", "Партнеры", "Рейтинг"], dependsOn: ["A21", "A24"], kpi: "Качество, срок и доход партнерской услуги",
    currentState: "Партнеры, зоны покрытия и рейтинги представлены в SmetaOffice.", nextStep: "Добавить правила подбора, конфликт интересов и контроль закрывающих документов.",
  },
  {
    id: "A23", name: "Knowledge Base Agent", block: "База знаний", phase: 0, priority: "High", readiness: "RUNNING_LOCAL", mode: "AI",
    purpose: "Находит регламенты, прайсы, шаблоны и подтверждает ответы источниками.",
    humanApproval: "Не требуется для поиска; требуется для изменения правил",
    systems: ["Hermes Knowledge", "Яндекс.Диск", "NAS"], dependsOn: ["A24"], kpi: "Актуальность и доля ответов с источником",
    currentState: "918 файлов учтено, 416 документов проиндексировано, 65 учебных материалов Phone Link доступны.", nextStep: "Ввести владельцев документов, версии и регулярный контроль устаревания.",
  },
  {
    id: "A24", name: "Security / Audit Agent", block: "Безопасность", phase: 0, priority: "High", readiness: "CODE_READY", mode: "HYBRID",
    purpose: "Контролирует роли, журналы, секреты и критичные действия агентов.",
    humanApproval: "Обязателен для блокировок, доступов и критичных действий",
    systems: ["RBAC", "AuditLog", "Secret Store"], dependsOn: [], kpi: "Инциденты и доля аудируемых критичных действий",
    currentState: "Роль ai_agent и read-only API SmetaOffice развернуты в production; доступ Hermes ограничен чтением и журналируется.", nextStep: "Подключить централизованный secret store и оповещения по аномалиям доступа.",
  },
];

export const agentCatalog = definitions.map((agent) => ({ ...agent, phaseLabel: phaseLabel(agent.phase) }));

export const trainingSnapshot = {
  snapshotAt: "2026-07-24T21:24:36+03:00",
  inventoriedFiles: 2951,
  indexedDocuments: 964,
  phoneLinkLessons: 65,
  unsupportedFiles: 882,
  errors: 3,
  noText: 1101,
  status: "READY_WITH_EXCEPTIONS",
  note: "Корпоративная база на NAS проиндексирована по разрешенным папкам. Неподдерживаемые и нетекстовые файлы оставлены в index.jsonl для OCR и специальной обработки.",
};

export function buildAgentRegistry(now = new Date()) {
  const count = (readiness) => agentCatalog.filter((agent) => agent.readiness === readiness).length;
  return {
    generatedAt: now.toISOString(),
    source: "Smeta_AI_Agents_Implementation_Matrix_v1.xlsx + проверенное состояние SmetaOffice/Hermes",
    summary: {
      total: agentCatalog.length,
      runningLocal: count("RUNNING_LOCAL"),
      mvpReady: count("MVP_READY"),
      codeReady: count("CODE_READY"),
      designed: count("DESIGNED"),
      highPriority: agentCatalog.filter((agent) => agent.priority === "High").length,
    },
    training: trainingSnapshot,
    phases: agentPhases,
    agents: agentCatalog,
  };
}

export const agentRegistry = buildAgentRegistry(new Date("2026-07-24T21:24:36+03:00"));
