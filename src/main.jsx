import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const roles = [
  { id: "owner", name: "Владелец", hint: "видит весь холдинг" },
  { id: "admin", name: "Администратор", hint: "пользователи, роли, справочники" },
  { id: "deputy", name: "Заместитель", hint: "контроль направлений и регионов" },
  { id: "director", name: "Руководитель направления", hint: "своё направление и свои регионы" },
  { id: "regional_manager", name: "Региональный менеджер", hint: "свой регион" },
  { id: "pm", name: "Руководитель проекта", hint: "свои проекты и исполнители проекта" },
  { id: "project_manager", name: "Менеджер проекта", hint: "ведение операционных задач" },
  { id: "sales_manager", name: "Менеджер продаж", hint: "лиды, клиенты, сделки" },
  { id: "head_of_sales", name: "Руководитель отдела продаж", hint: "продажи и показатели отдела" },
  { id: "accountant", name: "Бухгалтер", hint: "счета, акты, выплаты" },
  { id: "finance", name: "Финансы", hint: "деньги, оплаты, задолженность" },
  { id: "executor", name: "Исполнитель", hint: "только свои этапы и задачи" },
  { id: "partner", name: "Партнёр", hint: "только назначенные работы" },
];

const rolePermissions = {
  owner: ["viewAll", "viewClient", "viewFinance", "viewProductionBudget", "manageUsers", "manageProjects", "manageExecutors", "assignExecutors", "viewExecutorContacts", "editFinance", "viewOwnerDashboard"],
  admin: ["viewAll", "viewClient", "manageUsers", "manageProjects", "manageExecutors", "assignExecutors", "viewExecutorContacts", "viewOwnerDashboard"],
  deputy: ["viewAll", "viewClient", "viewFinance", "viewProductionBudget", "manageProjects", "manageExecutors", "assignExecutors", "viewExecutorContacts", "viewOwnerDashboard"],
  director: ["viewClient", "viewFinance", "viewProductionBudget", "manageProjects", "manageExecutors", "assignExecutors", "viewExecutorContacts", "viewOwnerDashboard"],
  regional_manager: ["viewClient", "viewProductionBudget", "manageProjects", "manageExecutors", "assignExecutors", "viewExecutorContacts", "viewOwnerDashboard"],
  pm: ["viewClient", "viewProductionBudget", "manageProjects", "manageExecutors", "assignExecutors", "viewExecutorContacts"],
  project_manager: ["viewClient", "manageProjects", "assignExecutors"],
  sales_manager: ["viewClient", "manageProjects"],
  head_of_sales: ["viewClient", "manageProjects", "viewOwnerDashboard"],
  accountant: ["viewFinance", "editFinance"],
  finance: ["viewFinance", "editFinance"],
  executor: [],
  partner: [],
};

const roleCan = (role, permission) => role === "owner" || (rolePermissions[role] || []).includes(permission);
const userCan = (user, permission) => roleCan(user?.role, permission);

const API_BASE = import.meta.env.VITE_API_BASE || (window.location.port === "5173" ? "http://127.0.0.1:8787/api" : "/api");

const demoUsers = [
  { id: "USR-001", login: "owner", password: "owner", role: "owner", name: "Владелец", status: "active", region: "Все регионы", regions: ["Все регионы"], direction: "Все направления", position: "Основатель / владелец" },
  { id: "USR-002", login: "admin", password: "admin", role: "admin", name: "Администратор системы", status: "active", region: "Все регионы", regions: ["Все регионы"], direction: "Все направления", position: "Администратор SmetaOffice" },
  { id: "USR-003", login: "deputy", password: "deputy", role: "deputy", name: "Заместитель", status: "active", region: "Все регионы", regions: ["Все регионы"], direction: "Все направления", position: "Заместитель операционного контура" },
  { id: "USR-004", login: "director", password: "director", role: "director", name: "Руководитель направления", status: "active", region: "ЧР", regions: ["ЧР", "ДНР", "ЛНР"], direction: "Проектный институт", position: "Руководитель направления" },
  { id: "USR-005", login: "regional", password: "regional", role: "regional_manager", name: "Региональный менеджер", status: "active", region: "Ростов", regions: ["Ростов"], direction: "Все направления", position: "Управляющий региона" },
  { id: "USR-006", login: "pm", password: "pm", role: "pm", name: "Руководитель проекта", status: "active", region: "ДНР", regions: ["ДНР"], direction: "Проектный институт", position: "Руководитель проекта" },
  { id: "USR-007", login: "project", password: "project", role: "project_manager", name: "Менеджер проекта", status: "active", region: "ЧР", regions: ["ЧР"], direction: "Бюро архитектуры и дизайна", position: "Менеджер проекта" },
  { id: "USR-008", login: "sales", password: "sales", role: "sales_manager", name: "Менеджер продаж", status: "active", region: "ЧР", regions: ["ЧР"], direction: "Единый центр продаж", position: "Менеджер продаж" },
  { id: "USR-009", login: "headsales", password: "headsales", role: "head_of_sales", name: "Руководитель отдела продаж", status: "active", region: "Все регионы", regions: ["Все регионы"], direction: "Единый центр продаж", position: "Руководитель отдела продаж" },
  { id: "USR-010", login: "accountant", password: "accountant", role: "accountant", name: "Бухгалтер", status: "active", region: "Все регионы", regions: ["Все регионы"], direction: "Финансы", position: "Бухгалтер" },
  { id: "USR-011", login: "finance", password: "finance", role: "finance", name: "Финансист", status: "active", region: "Все регионы", regions: ["Все регионы"], direction: "Финансы", position: "Финансовый контроль" },
  { id: "USR-012", login: "executor", password: "executor", role: "executor", name: "Исполнитель", status: "active", region: "ЧР", regions: ["ЧР"], direction: "Бюро архитектуры и дизайна", position: "Исполнитель / визуализатор", executorId: "EX-063" },
  { id: "USR-013", login: "partner", password: "partner", role: "partner", name: "Партнёр", status: "active", region: "Ростов", regions: ["Ростов"], direction: "Строительство и ремонт", position: "Партнёр", executorId: "EX-017" },
];

const regionOptions = ["Все регионы", "ЧР", "ДНР", "ЛНР", "Ростов", "Москва", "Федеральные проекты"];

const positionOptions = [
  "Не назначена",
  "Основатель / владелец",
  "Генеральный директор",
  "Управляющий региона",
  "Руководитель направления",
  "Руководитель проекта",
  "ГИП",
  "Архитектор",
  "Дизайнер",
  "Инженер раздела",
  "Сметчик",
  "Комплектатор",
  "Финансовый контроль",
  "Исполнитель / проектировщик",
  "Партнёр",
];

const seedProjects = [
  {
    id: "SG-154",
    title: "Дизайн-проект квартиры 96 м²",
    client: "Мусаев Р.",
    city: "Грозный",
    region: "ЧР",
    projectType: "Дизайн-проект",
    direction: "Дизайн / интерьер",
    manager: "Али",
    executor: "Марьям",
    partner: "—",
    budget: "240 000 ₽",
    margin: "58 000 ₽",
    contractAmount: 240000,
    paidByClient: 120000,
    productionBudget: 182000,
    directCosts: 0,
    status: "В работе",
    stage: "Визуализация",
    progress: 45,
    risk: "yellow",
    deadline: "14 мая",
    source: "SmetaGo",
    yandexFolder: "https://disk.yandex.ru/",
    visibleFor: ["owner", "director", "pm", "executor", "finance"],
    clientStatus: "Проект в работе. Готовим визуализацию. Следующий отчёт — 14 мая.",
    tasks: [
      { name: "Утвердить планировку", owner: "РП", status: "Принято", due: "10 мая" },
      { name: "Собрать референсы по стилю", owner: "Дизайнер", status: "Принято", due: "11 мая" },
      { name: "Сделать визуализацию кухни-гостиной", owner: "Дизайнер", status: "В работе", due: "14 мая" },
      { name: "Подготовить отчёт клиенту", owner: "РП", status: "Новая", due: "14 мая" },
    ],
    sections: [
      { name: "Замеры / 3D-скан", executor: "Обмерщик", executorId: "", due: "10 мая", clientBudget: 15000, executorCost: 8000, status: "Принято", yandexLink: "https://disk.yandex.ru/" },
      { name: "ТЗ", executor: "Дизайнер", executorId: "", due: "11 мая", clientBudget: 25000, executorCost: 12000, status: "Принято", yandexLink: "https://disk.yandex.ru/" },
      { name: "Планировка", executor: "Марьям", executorId: "EX-001", due: "12 мая", clientBudget: 35000, executorCost: 18000, status: "Принято", yandexLink: "https://disk.yandex.ru/" },
      { name: "Визуализация", executor: "Визуализатор интерьеров", executorId: "EX-063", due: "14 мая", clientBudget: 90000, executorCost: 54000, status: "В работе", yandexLink: "https://disk.yandex.ru/" },
      { name: "Рабочая документация", executor: "Чертежник", executorId: "", due: "20 мая", clientBudget: 75000, executorCost: 45000, status: "Новая", yandexLink: "https://disk.yandex.ru/" },
    ],
  },
  {
    id: "SG-181",
    title: "Проектирование МКД, Волноваха",
    client: "Застройщик Юг",
    city: "Донецк",
    region: "ДНР",
    projectType: "Проектная документация по 87 постановлению",
    direction: "Проектный институт",
    manager: "Игорь",
    executor: "Разделы АР / КР / ОВ / ВК",
    partner: "Геология-Партнёр",
    budget: "3 800 000 ₽",
    margin: "920 000 ₽",
    contractAmount: 3800000,
    paidByClient: 1200000,
    productionBudget: 2880000,
    directCosts: 0,
    status: "Красная зона",
    stage: "Исходные данные",
    progress: 28,
    risk: "red",
    deadline: "20 мая",
    source: "Ручное создание",
    yandexFolder: "https://disk.yandex.ru/",
    visibleFor: ["owner", "director", "pm", "partner", "finance"],
    clientStatus: "Проект ждёт недостающие документы по земле. Команда готова продолжить после получения данных.",
    tasks: [
      { name: "Получить документы по земле", owner: "Клиент", status: "Просрочено", due: "8 мая" },
      { name: "Проверить ТЭП", owner: "ГИП", status: "В работе", due: "12 мая" },
      { name: "Собрать замечания по ППТ", owner: "РП", status: "На проверке", due: "13 мая" },
      { name: "Выдать график разделов", owner: "ГИП", status: "Новая", due: "15 мая" },
    ],
    sections: [
      { name: "Обследование", executor: "Обследователь", executorId: "", due: "12 мая", clientBudget: 280000, executorCost: 180000, status: "В работе", yandexLink: "https://disk.yandex.ru/" },
      { name: "ТЗК / техническое заключение", executor: "ГИП", executorId: "", due: "16 мая", clientBudget: 320000, executorCost: 210000, status: "Новая", yandexLink: "https://disk.yandex.ru/" },
      { name: "Дефектный акт", executor: "Сметчик по сложным объектам", executorId: "EX-041", due: "18 мая", clientBudget: 180000, executorCost: 90000, status: "Новая", yandexLink: "https://disk.yandex.ru/" },
      { name: "АР", executor: "Ведущий архитектор", executorId: "EX-001", due: "5 июня", clientBudget: 520000, executorCost: 280000, status: "Новая", yandexLink: "https://disk.yandex.ru/" },
      { name: "КР", executor: "Команда конструкторов", executorId: "EX-017", due: "10 июня", clientBudget: 680000, executorCost: 420000, status: "Новая", yandexLink: "https://disk.yandex.ru/" },
      { name: "ОВ", executor: "Инженер ОВиК", executorId: "EX-033", due: "14 июня", clientBudget: 220000, executorCost: 110000, status: "Новая", yandexLink: "https://disk.yandex.ru/" },
      { name: "ПОС", executor: "Специалист ПОС/ППР/ПОД/ПЗ", executorId: "EX-052", due: "18 июня", clientBudget: 190000, executorCost: 95000, status: "Новая", yandexLink: "https://disk.yandex.ru/" },
      { name: "ОДИ / МОДИ", executor: "Не назначен", executorId: "", due: "20 июня", clientBudget: 120000, executorCost: 0, status: "Новая", yandexLink: "https://disk.yandex.ru/" },
      { name: "Сметная документация", executor: "Сметчик по сложным объектам", executorId: "EX-041", due: "25 июня", clientBudget: 310000, executorCost: 160000, status: "Новая", yandexLink: "https://disk.yandex.ru/" },
      { name: "Экспертиза", executor: "ГИП", executorId: "", due: "после выдачи", clientBudget: 260000, executorCost: 120000, status: "Новая", yandexLink: "https://disk.yandex.ru/" },
    ],
  },
  {
    id: "SG-206",
    title: "Ремонт квартиры под ключ 72 м²",
    client: "Исаева А.",
    city: "Ростов-на-Дону",
    region: "Ростов",
    projectType: "Ремонт / строительство",
    direction: "Ремонт / строительство",
    manager: "Сайд-Эмин",
    executor: "Бригада №3",
    partner: "BuildPro Ростов",
    budget: "2 520 000 ₽",
    margin: "420 000 ₽",
    contractAmount: 2520000,
    paidByClient: 900000,
    productionBudget: 2100000,
    directCosts: 0,
    status: "В работе",
    stage: "Инженерные системы",
    progress: 61,
    risk: "green",
    deadline: "29 мая",
    source: "SmetaGo",
    yandexFolder: "https://disk.yandex.ru/",
    visibleFor: ["owner", "director", "pm", "partner", "finance"],
    clientStatus: "Работы идут по графику. Завершён этап электрики, идёт разводка ВК.",
    tasks: [
      { name: "Загрузить фото электрики", owner: "Партнёр", status: "Принято", due: "9 мая" },
      { name: "Подписать акт этапа", owner: "РП", status: "На проверке", due: "12 мая" },
      { name: "Согласовать закупку сантехники", owner: "Клиент", status: "В работе", due: "13 мая" },
      { name: "Передать статус в приложение", owner: "Система", status: "Новая", due: "13 мая" },
    ],
    sections: [
      { name: "Черновые работы", executor: "BuildPro Ростов", executorId: "", due: "18 мая", clientBudget: 780000, executorCost: 650000, status: "Принято", yandexLink: "https://disk.yandex.ru/" },
      { name: "Инженерные системы", executor: "Бригада №3", executorId: "", due: "29 мая", clientBudget: 620000, executorCost: 510000, status: "В работе", yandexLink: "https://disk.yandex.ru/" },
      { name: "Чистовая отделка", executor: "BuildPro Ростов", executorId: "", due: "15 июня", clientBudget: 1120000, executorCost: 940000, status: "Новая", yandexLink: "https://disk.yandex.ru/" },
    ],
  },
  {
    id: "SG-219",
    title: "Подбор квартиры до 12 млн ₽",
    client: "Хамидова Л.",
    city: "Москва",
    region: "Москва",
    projectType: "Недвижимость",
    direction: "Недвижимость",
    manager: "Анна",
    executor: "Агентство-партнёр",
    partner: "CityRealty",
    budget: "Комиссия 360 000 ₽",
    margin: "36 000 ₽",
    contractAmount: 360000,
    paidByClient: 0,
    productionBudget: 324000,
    directCosts: 0,
    status: "Новая",
    stage: "Квалификация запроса",
    progress: 10,
    risk: "green",
    deadline: "Сегодня",
    source: "SmetaGo",
    yandexFolder: "https://disk.yandex.ru/",
    visibleFor: ["owner", "director", "pm", "partner", "finance"],
    clientStatus: "Запрос принят. Менеджер уточняет параметры и подбирает варианты.",
    tasks: [
      { name: "Связаться с клиентом до 5 минут", owner: "Hunter", status: "Принято", due: "Сегодня" },
      { name: "Уточнить район и форму оплаты", owner: "Фермер", status: "В работе", due: "Сегодня" },
      { name: "Передать подборку 5 вариантов", owner: "Партнёр", status: "Новая", due: "11 мая" },
    ],
    sections: [
      { name: "Квалификация запроса", executor: "Анна", executorId: "", due: "Сегодня", clientBudget: 0, executorCost: 0, status: "В работе", yandexLink: "https://disk.yandex.ru/" },
      { name: "Подбор вариантов", executor: "CityRealty", executorId: "", due: "11 мая", clientBudget: 360000, executorCost: 324000, status: "Новая", yandexLink: "https://disk.yandex.ru/" },
    ],
  },
];

const demoProductionProjects = [
  {
    id: "SG-401",
    title: "Архитектурный проект дома 2 этажа",
    client: "Новый клиент / частный дом",
    city: "Грозный",
    region: "ЧР",
    projectType: "Архитектурный проект",
    direction: "Проектный институт",
    manager: "РП архитектуры",
    executor: "АР / КР / инженерные консультации",
    partner: "—",
    contractAmount: 1000000,
    paidByClient: 500000,
    productionAllocationPercent: 35,
    productionBudget: 350000,
    directCosts: 0,
    operatingCosts: 60000,
    payrollCosts: 50000,
    budget: "1 000 000 ₽",
    margin: "650 000 ₽",
    status: "Новая",
    stage: "ТЗ и исходные данные",
    progress: 12,
    risk: "green",
    deadline: "30 июня",
    source: "SmetaOffice",
    yandexFolder: "https://disk.yandex.ru/",
    visibleFor: ["owner", "director", "pm", "finance"],
    clientStatus: "Проект создан. Команда собирает исходные данные и готовит архитектурную концепцию.",
    tasks: [
      { name: "Сформировать ТЗ на архитектурный проект", owner: "РП архитектуры", status: "В работе", due: "15 мая" },
      { name: "Подготовить планировочные решения", owner: "Архитектор", status: "Новая", due: "25 мая" },
      { name: "Оценить необходимость КР", owner: "Конструктор", status: "Новая", due: "28 мая" },
    ],
    sections: [
      { name: "ТЗ / исходные данные", executor: "РП архитектуры", executorId: "", due: "15 мая", clientBudget: 50000, executorCost: 25000, status: "В работе", yandexLink: "https://disk.yandex.ru/" },
      { name: "АР: планировки и фасады", executor: "Ведущий архитектор", executorId: "EX-001", due: "5 июня", clientBudget: 220000, executorCost: 140000, status: "Новая", yandexLink: "https://disk.yandex.ru/" },
      { name: "КР: предварительная конструктивная схема", executor: "Команда конструкторов", executorId: "EX-017", due: "12 июня", clientBudget: 120000, executorCost: 75000, status: "Новая", yandexLink: "https://disk.yandex.ru/" },
      { name: "Сводная выдача клиенту", executor: "РП архитектуры", executorId: "", due: "30 июня", clientBudget: 60000, executorCost: 30000, status: "Новая", yandexLink: "https://disk.yandex.ru/" },
    ],
  },
  {
    id: "SG-402",
    title: "Дизайн-проект квартиры 113 м²",
    client: "Клиент дизайн-проекта",
    city: "Грозный",
    region: "ЧР",
    projectType: "Дизайн-проект",
    direction: "Дизайн / интерьер",
    manager: "Управляющий дизайн-направления",
    executor: "Дизайнер / визуализатор / чертежник / комплектатор",
    partner: "—",
    contractAmount: 565000,
    paidByClient: 282500,
    productionAllocationPercent: 45,
    productionBudget: 254250,
    directCosts: 0,
    operatingCosts: 45000,
    payrollCosts: 70000,
    budget: "565 000 ₽",
    margin: "310 750 ₽",
    status: "Новая",
    stage: "Обмеры и планировка",
    progress: 8,
    risk: "green",
    deadline: "20 июля",
    source: "SmetaOffice",
    yandexFolder: "https://disk.yandex.ru/",
    visibleFor: ["owner", "director", "pm", "executor", "finance"],
    clientStatus: "Дизайн-проект запущен. Идёт подготовка обмеров и планировочного решения.",
    tasks: [
      { name: "Организовать обмеры", owner: "РП дизайна", status: "В работе", due: "14 мая" },
      { name: "Сделать планировочное решение", owner: "Дизайнер", status: "Новая", due: "23 мая" },
      { name: "Подготовить концепцию", owner: "Дизайнер", status: "Новая", due: "5 июня" },
    ],
    sections: [
      { name: "Обмеры", executor: "Обмерщик", executorId: "", due: "14 мая", clientBudget: 25000, executorCost: 12000, status: "В работе", yandexLink: "https://disk.yandex.ru/" },
      { name: "Планировочное решение", executor: "Дизайнер", executorId: "", due: "23 мая", clientBudget: 75000, executorCost: 42000, status: "Новая", yandexLink: "https://disk.yandex.ru/" },
      { name: "Концепция", executor: "Дизайнер", executorId: "", due: "5 июня", clientBudget: 90000, executorCost: 52000, status: "Новая", yandexLink: "https://disk.yandex.ru/" },
      { name: "Визуализация", executor: "Визуализатор интерьеров", executorId: "EX-063", due: "25 июня", clientBudget: 190000, executorCost: 98000, status: "Новая", yandexLink: "https://disk.yandex.ru/" },
      { name: "Рабочая документация", executor: "Чертежник", executorId: "", due: "15 июля", clientBudget: 145000, executorCost: 80000, status: "Новая", yandexLink: "https://disk.yandex.ru/" },
      { name: "Комплектация / ведомости", executor: "Комплектатор", executorId: "", due: "20 июля", clientBudget: 40000, executorCost: 18000, status: "Новая", yandexLink: "https://disk.yandex.ru/" },
    ],
  },
  {
    id: "SG-403",
    title: "ПД: восстановление здания школы",
    client: "Муниципальный заказчик",
    city: "Мариуполь",
    region: "ДНР",
    projectType: "Проектная документация по 87 постановлению",
    direction: "Проектный институт",
    manager: "РП Мариуполь",
    executor: "Обследование / ТЗК / АР / КР / ИОС / ПОС / ОДИ / сметы",
    partner: "Изыскания-партнёр",
    contractAmount: 10000000,
    paidByClient: 3000000,
    productionAllocationPercent: 35,
    productionBudget: 3500000,
    directCosts: 0,
    operatingCosts: 350000,
    payrollCosts: 450000,
    budget: "10 000 000 ₽",
    margin: "6 500 000 ₽",
    status: "Новая",
    stage: "Обследование и исходные данные",
    progress: 6,
    risk: "yellow",
    deadline: "30 сентября",
    source: "SmetaOffice",
    yandexFolder: "https://disk.yandex.ru/",
    visibleFor: ["owner", "director", "pm", "partner", "finance"],
    clientStatus: "Проект запущен. Начинаем обследование, ТЗК, дефектный акт и подготовку состава проектной документации.",
    tasks: [
      { name: "Провести обследование здания", owner: "Обследователь", status: "Новая", due: "25 мая" },
      { name: "Подготовить ТЗК и дефектный акт", owner: "ГИП", status: "Новая", due: "5 июня" },
      { name: "Выдать график разделов 87 постановления", owner: "РП", status: "Новая", due: "8 июня" },
    ],
    sections: [
      { name: "Обследование здания", executor: "Обследователь", executorId: "", due: "25 мая", clientBudget: 600000, executorCost: 380000, status: "Новая", yandexLink: "https://disk.yandex.ru/" },
      { name: "ТЗК / техническое заключение", executor: "ГИП", executorId: "", due: "5 июня", clientBudget: 450000, executorCost: 260000, status: "Новая", yandexLink: "https://disk.yandex.ru/" },
      { name: "Дефектный акт и первичная смета", executor: "Сметчик по сложным объектам", executorId: "EX-041", due: "10 июня", clientBudget: 350000, executorCost: 170000, status: "Новая", yandexLink: "https://disk.yandex.ru/" },
      { name: "ПЗ / пояснительная записка", executor: "ГИП", executorId: "", due: "20 июня", clientBudget: 300000, executorCost: 150000, status: "Новая", yandexLink: "https://disk.yandex.ru/" },
      { name: "АР", executor: "Ведущий архитектор", executorId: "EX-001", due: "10 июля", clientBudget: 850000, executorCost: 500000, status: "Новая", yandexLink: "https://disk.yandex.ru/" },
      { name: "КР", executor: "Команда конструкторов", executorId: "EX-017", due: "20 июля", clientBudget: 1050000, executorCost: 650000, status: "Новая", yandexLink: "https://disk.yandex.ru/" },
      { name: "ОВ / ВК / ЭОМ / СС", executor: "Инженеры ИОС", executorId: "EX-033", due: "5 августа", clientBudget: 900000, executorCost: 520000, status: "Новая", yandexLink: "https://disk.yandex.ru/" },
      { name: "ПОС", executor: "Специалист ПОС/ППР/ПОД/ПЗ", executorId: "EX-052", due: "20 августа", clientBudget: 300000, executorCost: 160000, status: "Новая", yandexLink: "https://disk.yandex.ru/" },
      { name: "ОДИ / МОДИ", executor: "Не назначен", executorId: "", due: "25 августа", clientBudget: 180000, executorCost: 90000, status: "Новая", yandexLink: "https://disk.yandex.ru/" },
      { name: "Сметная документация", executor: "Сметчик по сложным объектам", executorId: "EX-041", due: "5 сентября", clientBudget: 520000, executorCost: 280000, status: "Новая", yandexLink: "https://disk.yandex.ru/" },
      { name: "Сопровождение экспертизы", executor: "ГИП / РП", executorId: "", due: "30 сентября", clientBudget: 450000, executorCost: 240000, status: "Новая", yandexLink: "https://disk.yandex.ru/" },
    ],
  },
];

function mergeDemoProductionProjects(projects) {
  const demoProjectIds = new Set(["SG-154", "SG-181", "SG-206", "SG-219", "SG-401", "SG-402", "SG-403"]);
  const source = Array.isArray(projects) ? projects : [];
  return source.filter((project) => !demoProjectIds.has(project.id)).map(normalizeProjectAccess);
}

function normalizeProjectAccess(project) {
  const isProjectInstitute = project.direction === "Проектный институт";
  const isDesign = project.direction === "Дизайн / интерьер" || project.direction === "Бюро архитектуры и дизайна";
  const isRostov = project.region === "Ростов";
  const isDnr = project.region === "ДНР";
  const isSmetaGoLead = project.source === "SmetaGo";

  const defaultsById = {
    "SG-154": { directorUserId: "USR-007", projectManagerId: "USR-007", salesManagerId: "USR-008" },
    "SG-181": { directorUserId: "USR-004", pmUserId: "USR-006" },
    "SG-206": { regionalManagerId: "USR-005", partnerUserId: "USR-013" },
    "SG-219": { headOfSalesId: "USR-009", salesManagerId: "USR-008", partnerUserId: "USR-013" },
    "SG-401": { directorUserId: "USR-004", pmUserId: "USR-006" },
    "SG-402": { directorUserId: "USR-007", projectManagerId: "USR-007", salesManagerId: "USR-008" },
    "SG-403": { directorUserId: "USR-004", pmUserId: "USR-006" },
  };

  return {
    ...project,
    directorUserId: project.directorUserId || defaultsById[project.id]?.directorUserId || (isProjectInstitute ? "USR-004" : ""),
    regionalManagerId: project.regionalManagerId || defaultsById[project.id]?.regionalManagerId || (isRostov ? "USR-005" : ""),
    pmUserId: project.pmUserId || defaultsById[project.id]?.pmUserId || (isDnr || isProjectInstitute ? "USR-006" : ""),
    projectManagerId: project.projectManagerId || defaultsById[project.id]?.projectManagerId || (isDesign ? "USR-007" : ""),
    salesManagerId: project.salesManagerId || defaultsById[project.id]?.salesManagerId || (isSmetaGoLead ? "USR-008" : ""),
    headOfSalesId: project.headOfSalesId || defaultsById[project.id]?.headOfSalesId || (isSmetaGoLead ? "USR-009" : ""),
    partnerUserId: project.partnerUserId || defaultsById[project.id]?.partnerUserId || "",
  };
}

const partners = [
  { name: "BuildPro Ростов", category: "Ремонт", rating: 91, active: 4, overdue: 0, level: "Проверенный" },
  { name: "CityRealty", category: "Недвижимость", rating: 78, active: 2, overdue: 1, level: "Надёжный" },
  { name: "Геология-Партнёр", category: "Изыскания", rating: 64, active: 1, overdue: 1, level: "Базовый" },
  { name: "CleanHome", category: "Сервис", rating: 88, active: 0, overdue: 0, level: "Надёжный" },
];

const quickStats = [
  { label: "Активные проекты", value: "42", tone: "blue" },
  { label: "Просрочено", value: "7", tone: "red" },
  { label: "Красная зона", value: "3", tone: "orange" },
  { label: "Ожидают оплаты", value: "5", tone: "green" },
];

const menuItems = [
  { id: "dashboard", label: "Панель управления" },
  { id: "sales", label: "Продажи / Лиды" },
  { id: "projects", label: "Проекты" },
  { id: "tasks", label: "Задачи" },
  { id: "executors", label: "Исполнители" },
  { id: "partners", label: "Партнёры" },
  { id: "analytics", label: "Аналитика" },
  { id: "finance", label: "Финансы" },
  { id: "integrations", label: "Интеграции" },
  { id: "admin", label: "Админка" },
  { id: "client", label: "Клиентское приложение" },
];
const directionOptions = ["Все", "Проектный институт", "Бюро архитектуры и дизайна", "Строительство и ремонт", "Агентство недвижимости", "Изыскания / обследования / обмеры", "Комплектация", "Бытовые услуги / сервис", "Продажи", "Обучение"];

const salesSources = {
  smetago_app: "SmetaGO приложение",
  website: "Сайт",
  phone: "Телефон",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  partner: "Партнёр",
  referral: "Рекомендация",
};

const salesDirections = {
  real_estate: "Недвижимость",
  surveys: "Изыскания / обмеры / обследования",
  design: "Дизайн / архитектура / проектирование",
  architecture: "Архитектура / проектирование",
  repair: "Ремонт / строительство",
  construction: "Строительство",
  equipment: "Комплектация",
  service: "Бытовые услуги / сервис",
  partners: "Партнёры / подключение",
};

const universalSalesStages = [
  ["new_lead", "Новый лид"],
  ["qualified", "Квалифицирован"],
  ["proposal_sent", "КП отправлено"],
  ["contract_and_advance", "Договор и аванс"],
  ["in_progress", "В работе"],
  ["final_act", "Финал / акт"],
  ["nps_and_upsell", "NPS / допродажа"],
  ["archive", "Архив / отказ"],
];

const bitrixFunnels = {
  universal: {
    label: "Универсальная воронка",
    stages: ["new_lead", "qualified", "proposal_sent", "contract_and_advance", "in_progress", "final_act", "nps_and_upsell", "archive"],
  },
  real_estate: {
    label: "Недвижимость",
    stages: ["new_lead", "qualified", "objects_selection", "object_showing", "offer_negotiation", "deposit", "legal_check_mortgage", "main_contract", "registration", "commission_payment", "nps", "archive"],
  },
  surveys: {
    label: "Изыскания",
    stages: ["new_lead", "qualified", "proposal_sent", "contract_advance", "field_work", "report_ready", "final_payment", "commission", "nps", "archive"],
  },
  design: {
    label: "Дизайн / архитектура / проектирование",
    stages: ["new_lead", "qualified", "brief_and_measurement", "proposal_sent", "contract_advance", "planning", "visualization", "drawings", "internal_check", "final_delivery", "final_payment", "commission", "nps", "transfer_to_repair", "archive"],
  },
  repair: {
    label: "Ремонт / строительство",
    stages: ["new_lead", "qualified", "measurement_and_estimate", "contract_advance", "work_schedule", "demolition", "rough_work", "engineering_systems", "finishing", "stage_acceptance", "final_act", "commission", "nps_and_upsell", "archive"],
  },
  equipment: {
    label: "Комплектация",
    stages: ["new_lead", "qualified", "specification", "supplier_quotes", "client_approval", "order_payment", "procurement", "delivery", "installation", "final_act", "commission", "nps", "archive"],
  },
  service: {
    label: "Бытовые услуги / сервис",
    stages: ["new_lead", "qualified", "service_scope", "price_confirmation", "executor_assigned", "work_in_progress", "client_acceptance", "payment", "nps", "archive"],
  },
  partners: {
    label: "Партнёры / подключение",
    stages: ["new_lead", "qualified", "partner_check", "terms_agreed", "contract_and_access", "first_orders", "rating_control", "archive"],
  },
};

const salesStageLabels = {
  new_lead: "Новый лид",
  qualified: "Квалифицирован",
  proposal_sent: "КП отправлено",
  contract_and_advance: "Договор и аванс",
  contract_advance: "Договор / аванс",
  in_progress: "В работе",
  final_act: "Финал / акт",
  nps_and_upsell: "NPS / допродажа",
  archive: "Архив / отказ",
  objects_selection: "Подбор объектов",
  object_showing: "Показы",
  offer_negotiation: "Переговоры",
  deposit: "Задаток",
  legal_check_mortgage: "Проверка / ипотека",
  main_contract: "Основной договор",
  registration: "Регистрация",
  commission_payment: "Комиссия",
  nps: "NPS",
  field_work: "Полевые работы",
  report_ready: "Отчёт готов",
  final_payment: "Финальная оплата",
  commission: "Комиссия",
  brief_and_measurement: "Бриф / замер",
  planning: "Планировка",
  visualization: "Визуализация",
  drawings: "Рабочка",
  internal_check: "Внутренняя проверка",
  final_delivery: "Выдача клиенту",
  transfer_to_repair: "Передача в ремонт",
  measurement_and_estimate: "Замер / смета",
  work_schedule: "График работ",
  demolition: "Демонтаж",
  rough_work: "Черновые работы",
  engineering_systems: "Инженерные системы",
  finishing: "Отделка",
  stage_acceptance: "Приёмка этапа",
  specification: "Спецификация",
  supplier_quotes: "Счета поставщиков",
  client_approval: "Согласование",
  order_payment: "Оплата заказа",
  procurement: "Закупка",
  delivery: "Доставка",
  installation: "Монтаж",
  service_scope: "Объём услуги",
  price_confirmation: "Подтверждение цены",
  executor_assigned: "Исполнитель назначен",
  work_in_progress: "Работа идёт",
  client_acceptance: "Приёмка клиентом",
  payment: "Оплата",
  partner_check: "Проверка партнёра",
  terms_agreed: "Условия согласованы",
  contract_and_access: "Договор и доступ",
  first_orders: "Первые заявки",
  rating_control: "Контроль рейтинга",
};

const salesBoardBuckets = [
  { id: "new", title: "Новые лиды", stages: ["new_lead"] },
  { id: "sla", title: "Просроченные по SLA", sla: "breached" },
  { id: "hunter", title: "В работе у Hunter", stages: ["new_lead", "qualified"], requiresHunter: true },
  { id: "farmer", title: "Переданы Farmer", stages: ["qualified", "brief_and_measurement", "measurement_and_estimate", "objects_selection", "service_scope"], requiresFarmer: true },
  { id: "proposal", title: "КП отправлено", stages: ["proposal_sent"] },
  { id: "contract", title: "Договор / аванс", stages: ["contract_and_advance", "contract_advance", "deposit"] },
  { id: "project", title: "Переведены в проект", projectLinked: true },
  { id: "archive", title: "Отказ / архив", stages: ["archive"] },
];

const seedSalesLeads = [
  {
    id: "SL-001",
    source: "smetago_app",
    city: "Грозный",
    region: "ЧР",
    direction: "design",
    clientName: "Тестовый клиент 01",
    clientPhone: "+7 *** ***-**-01",
    clientEmail: "client01@example.test",
    requestText: "Дизайн-проект квартиры, нужен расчёт сроков и состава проекта.",
    budget: 240000,
    area: 96,
    objectType: "Квартира",
    status: "open",
    funnelType: "design",
    stage: "new_lead",
    hunterId: "USR-008",
    hunterName: "Менеджер продаж",
    farmerId: "",
    farmerName: "",
    headOfSalesId: "USR-009",
    partnerId: "",
    projectId: "",
    firstResponseAt: "",
    createdAt: "2026-05-12T12:00:00.000Z",
    slaDeadlineAt: "2026-05-12T12:05:00.000Z",
    qualificationStatus: "warm",
    refusalReason: "",
    nextContactAt: "2026-05-12T15:00:00.000Z",
    lastActivityAt: "2026-05-12T12:00:00.000Z",
    notes: "Тестовый лид из SmetaGO. Без реальных данных.",
    history: ["Создан лид из SmetaGO"],
  },
  {
    id: "SL-002",
    source: "partner",
    city: "Ростов-на-Дону",
    region: "Ростов",
    direction: "repair",
    clientName: "Тестовый клиент партнёра",
    clientPhone: "+7 *** ***-**-02",
    clientEmail: "client02@example.test",
    requestText: "Ремонт квартиры под ключ, партнёрская заявка.",
    budget: 2520000,
    area: 72,
    objectType: "Квартира",
    status: "open",
    funnelType: "repair",
    stage: "qualified",
    hunterId: "USR-008",
    hunterName: "Менеджер продаж",
    farmerId: "USR-013",
    farmerName: "Партнёр",
    headOfSalesId: "USR-009",
    partnerId: "USR-013",
    projectId: "",
    firstResponseAt: "2026-05-12T12:02:00.000Z",
    createdAt: "2026-05-12T12:01:00.000Z",
    slaDeadlineAt: "2026-05-12T12:06:00.000Z",
    qualificationStatus: "hot",
    refusalReason: "",
    nextContactAt: "2026-05-13T10:00:00.000Z",
    lastActivityAt: "2026-05-12T12:10:00.000Z",
    notes: "Партнёр видит только свою заявку.",
    history: ["Создан лид", "Передан Farmer/партнёру"],
  },
  {
    id: "SL-003",
    source: "website",
    city: "Донецк",
    region: "ДНР",
    direction: "surveys",
    clientName: "Тестовый заказчик обследования",
    clientPhone: "+7 *** ***-**-03",
    clientEmail: "client03@example.test",
    requestText: "Нужно обследование здания и дефектный акт.",
    budget: 3800000,
    area: 1400,
    objectType: "Школа",
    status: "open",
    funnelType: "surveys",
    stage: "proposal_sent",
    hunterId: "USR-008",
    hunterName: "Менеджер продаж",
    farmerId: "USR-006",
    farmerName: "Руководитель проекта",
    headOfSalesId: "USR-009",
    partnerId: "",
    projectId: "",
    firstResponseAt: "2026-05-12T12:03:00.000Z",
    createdAt: "2026-05-12T12:00:30.000Z",
    slaDeadlineAt: "2026-05-12T12:05:30.000Z",
    qualificationStatus: "hot",
    refusalReason: "",
    nextContactAt: "2026-05-12T16:30:00.000Z",
    lastActivityAt: "2026-05-12T12:20:00.000Z",
    notes: "Связано с проектной документацией, без реальных контактов.",
    history: ["Создан лид", "КП отправлено"],
  },
];

const holdingAreas = [
  {
    id: "central",
    title: "Центральный контур",
    subtitle: "Холдинг, управляющая компания, финансы, IT, маркетинг и SmetaGo. Эти компании работают на всю группу, а не внутри одного региона.",
    manager: "Основатель / высшее звено",
    risk: "green",
  },
  {
    id: "institute",
    title: "Проектный институт",
    subtitle: "Децентрализованный проектный блок: обследование, ТЗК, разделы 87 постановления, сметы и экспертиза по нескольким регионам.",
    manager: "Руководитель проектного института / ГИПы",
    risk: "yellow",
  },
  {
    id: "regions",
    title: "Регионы",
    subtitle: "Локальные направления: продажи, архитектура и дизайн, изыскания, реализация проектов, обучение и партнёры.",
    manager: "Региональные управляющие",
    risk: "yellow",
  },
];

const centralCompanies = [
  {
    id: "holding",
    title: "Холдинговая компания",
    manager: "Основатель / совет управления",
    purpose: "Стратегия, владение, контроль всей экосистемы SmetaGroup и правил развития.",
    processes: ["Стратегия группы", "Контроль регионов", "Запуск новых направлений", "Ключевые решения по партнёрам"],
    risk: "green",
  },
  {
    id: "management",
    title: "Центральная управляющая компания",
    manager: "Операционный управляющий",
    purpose: "Регламенты, доступы, управленческий контроль, стандарты работы и связка всех направлений.",
    processes: ["Оргструктура", "Права доступа", "Регламенты", "Контроль руководителей направлений"],
    risk: "yellow",
  },
  {
    id: "financeAudit",
    title: "Финансы и аудит",
    manager: "Финансовый директор / аудит",
    purpose: "Деньги, договоры, выплаты, акты, налоги, юридические вопросы и аудит проектов.",
    processes: ["Финансовая аналитика", "Выплаты исполнителям", "Акты и задолженности", "Юридическое сопровождение"],
    risk: "green",
  },
  {
    id: "it",
    title: "IT",
    manager: "Технический руководитель",
    purpose: "Разработка SmetaOffice, SmetaGo, интеграций с Bitrix, Яндекс.Диском и внутренних продуктов.",
    processes: ["SmetaOffice", "SmetaGo", "Интеграции", "Безопасность и роли"],
    risk: "yellow",
  },
  {
    id: "marketing",
    title: "Маркетинг",
    manager: "Директор по маркетингу",
    purpose: "Общий маркетинг бренда, продвижение всей линейки услуг и поддержка регионов.",
    processes: ["Бренд SmetaGroup", "Лидогенерация", "Контент", "Региональные кампании"],
    risk: "green",
  },
  {
    id: "smetago",
    title: "SmetaGo",
    manager: "Продуктовый управляющий",
    purpose: "Клиентское приложение, через которое приходят заявки во всех регионах и клиент видит статусы проектов.",
    processes: ["Заявки клиентов", "Клиентский чат", "Статусы проектов", "Передача заявок в офис"],
    risk: "yellow",
  },
];

const regionalDirections = [
  {
    id: "architectureDesign",
    title: "Бюро архитектуры и дизайна",
    manager: "Управляющий архитектурой и дизайном",
    hint: "Архитектурные проекты, дизайн-проекты, рабочая документация, визуализация и комплектация.",
    projectDirection: "Бюро архитектуры и дизайна",
    risk: "green",
    match: (project) => {
      const text = `${project.direction || ""} ${project.projectType || ""}`.toLowerCase();
      return text.includes("бюро архитектуры") || text.includes("дизайн") || text.includes("архитектур") || text.includes("визуализац");
    },
  },
  {
    id: "surveys",
    title: "Изыскания / обследования / обмеры",
    manager: "Управляющий изысканиями",
    hint: "Локальные выезды, обследования, обмеры, геология, исходные данные и техническое заключение.",
    projectDirection: "Изыскания / обследования / обмеры",
    risk: "yellow",
    match: (project) => {
      const text = `${project.direction || ""} ${project.projectType || ""} ${(project.sections || []).map((item) => item.name).join(" ")}`.toLowerCase();
      return text.includes("изыск") || text.includes("обслед") || text.includes("тзк") || text.includes("дефект");
    },
  },
  {
    id: "sales",
    title: "Агентство недвижимости",
    manager: "Руководитель продаж региона",
    hint: "Покупка, продажа, аренда, подбор объектов и передача клиента в дизайн / ремонт.",
    projectDirection: "Агентство недвижимости",
    risk: "green",
    match: (project) => {
      const text = `${project.direction || ""} ${project.projectType || ""} ${project.source || ""}`.toLowerCase();
      return text.includes("недвиж") || text.includes("продаж") || text.includes("smetago");
    },
  },
  {
    id: "implementation",
    title: "Строительство и ремонт",
    manager: "Управляющий реализацией",
    hint: "Строительство, ремонт, контроль подрядчиков, фотоотчёты, акты и локальная реализация.",
    projectDirection: "Строительство и ремонт",
    risk: "yellow",
    match: (project) => {
      const text = `${project.direction || ""} ${project.projectType || ""}`.toLowerCase();
      return text.includes("ремонт") || text.includes("строитель") || text.includes("реализац");
    },
  },
  {
    id: "procurement",
    title: "Комплектация",
    manager: "Управляющий комплектацией",
    hint: "Подбор, закупка, поставка мебели, техники, света, сантехники и материалов.",
    projectDirection: "Комплектация",
    risk: "green",
    match: (project) => `${project.direction || ""} ${project.projectType || ""}`.toLowerCase().includes("комплектац"),
  },
  {
    id: "service",
    title: "Бытовые услуги / сервис",
    manager: "Управляющий сервисом",
    hint: "Клининг, мелкий ремонт, установка техники, сервис после ремонта и бытовые задачи.",
    projectDirection: "Бытовые услуги / сервис",
    risk: "green",
    match: (project) => {
      const text = `${project.direction || ""} ${project.projectType || ""}`.toLowerCase();
      return text.includes("бытов") || text.includes("сервис") || text.includes("клининг");
    },
  },
  {
    id: "education",
    title: "Центр обучения",
    manager: "Управляющий обучением",
    hint: "Обучение сотрудников, партнёров и исполнителей по стандартам компании в регионе.",
    projectDirection: "Обучение",
    risk: "green",
    match: (project) => {
      const text = `${project.direction || ""} ${project.projectType || ""}`.toLowerCase();
      return text.includes("обуч");
    },
  },
];
const executorSections = [
  "Все",
  "АР",
  "Дизайн",
  "3D",
  "Рабочка",
  "КР",
  "ОВиК",
  "ВК",
  "ЭОМ",
  "СС",
  "ПОС/ППР/ПОД/ПЗ",
  "ГИП",
  "Сметы",
];

const executorStats = [
  { label: "Всего контактов", value: "436", tone: "blue" },
  { label: "Рабочая база", value: "50", tone: "green" },
  { label: "Нужно проверить", value: "386", tone: "orange" },
  { label: "Ключевые роли", value: "13", tone: "red" },
];

const executorGroups = [
  { name: "Архитекторы", count: 164, source: "Экспресс-Дизайн + рабочая база", sections: "АР, планировки, фасады" },
  { name: "Дизайнеры", count: 159, source: "Экспресс-Дизайн + рабочая база", sections: "Дизайн, концепции, интерьер" },
  { name: "Визуализаторы", count: 81, source: "Экспресс-Дизайн + рабочая база", sections: "3D, рендеры, визуализация" },
  { name: "Чертежники", count: 5, source: "Рабочая база", sections: "Рабочка, оформление, комплекты" },
  { name: "Конструкторы", count: 8, source: "Рабочая база", sections: "КР, расчёты, узлы" },
  { name: "Инженеры ОВиК", count: 3, source: "Рабочая база", sections: "Отопление, вентиляция, кондиционирование" },
  { name: "Инженеры ВК", count: 2, source: "Рабочая база", sections: "Водоснабжение, канализация" },
  { name: "Инженеры ЭОМ", count: 2, source: "Рабочая база", sections: "Электрика, освещение, щиты" },
  { name: "Инженеры СС", count: 2, source: "Рабочая база", sections: "Слаботочные системы" },
  { name: "ПОС / ППР / ПОД / ПЗ", count: 1, source: "Рабочая база", sections: "Организация строительства и пояснительные разделы" },
  { name: "ГИПы", count: 1, source: "Рабочая база", sections: "Координация разделов, проверка, выдача" },
  { name: "Сметчики", count: 8, source: "Рабочая база", sections: "Сметы, ведомости, экспертиза стоимости" },
];

const executorProfiles = [
  {
    id: "EX-001",
    name: "Ведущий архитектор",
    type: "физлицо",
    city: "Грозный",
    sections: ["АР", "Рабочка"],
    rank: 4,
    status: "Проверенный",
    rating: 88,
    workload: 62,
    onTime: 91,
    firstAccept: 74,
    price: "средний",
    contacts: { phone: "+7 *** ***-**-**", email: "hidden@smeta.local", telegram: "@hidden_arch" },
    note: "Можно давать стандартные архитектурные задачи и рабочую документацию после проверки РП.",
    chat: [
      { id: "m1", author: "Ахмед", text: "Проверить портфолио и закрепить за простыми задачами АР.", at: "10 мая, 03:40" },
    ],
  },
  {
    id: "EX-017",
    name: "Команда конструкторов",
    type: "партнёр",
    city: "Москва / удалённо",
    sections: ["КР"],
    rank: 5,
    status: "Сильный",
    rating: 94,
    workload: 78,
    onTime: 87,
    firstAccept: 81,
    price: "выше среднего",
    contacts: { phone: "+7 *** ***-**-**", email: "hidden@smeta.local", telegram: "@hidden_struct" },
    note: "Подходит для сложных расчётов и ответственных узлов. В SmetaOffice лучше вести как партнёра.",
    chat: [{ id: "m2", author: "ГИП", text: "Можно привлекать на сложные КР, но сроки фиксировать этапами.", at: "10 мая, 03:42" }],
  },
  {
    id: "EX-033",
    name: "Инженер ОВиК",
    type: "физлицо",
    city: "Ростов-на-Дону",
    sections: ["ОВиК"],
    rank: 3,
    status: "На проверке",
    rating: 76,
    workload: 35,
    onTime: 80,
    firstAccept: 68,
    price: "средний",
    contacts: { phone: "+7 *** ***-**-**", email: "hidden@smeta.local", telegram: "@hidden_ovik" },
    note: "Нужна тестовая задача и проверка ГИПом перед сложными объектами.",
    chat: [],
  },
  {
    id: "EX-041",
    name: "Сметчик по сложным объектам",
    type: "физлицо",
    city: "Грозный / удалённо",
    sections: ["Сметы"],
    rank: 5,
    status: "Эксперт",
    rating: 96,
    workload: 71,
    onTime: 93,
    firstAccept: 86,
    price: "дорогой",
    contacts: { phone: "+7 *** ***-**-**", email: "hidden@smeta.local", telegram: "@hidden_estimate" },
    note: "Сильный специалист для спорных ведомостей, коммерческих смет и проверки чужих расчётов.",
    chat: [],
  },
  {
    id: "EX-052",
    name: "Специалист ПОС/ППР/ПОД/ПЗ",
    type: "физлицо",
    city: "удалённо",
    sections: ["ПОС/ППР/ПОД/ПЗ"],
    rank: 3,
    status: "Проверенный",
    rating: 82,
    workload: 40,
    onTime: 84,
    firstAccept: 72,
    price: "средний",
    contacts: { phone: "+7 *** ***-**-**", email: "hidden@smeta.local", telegram: "@hidden_pos" },
    note: "Закрывает организационные разделы, которые нельзя терять в общей массе проектировщиков.",
    chat: [],
  },
  {
    id: "EX-063",
    name: "Визуализатор интерьеров",
    type: "физлицо",
    city: "удалённо",
    sections: ["3D", "Дизайн"],
    rank: 2,
    status: "Новый контакт",
    rating: 64,
    workload: 12,
    onTime: 0,
    firstAccept: 0,
    price: "не проверен",
    contacts: { phone: "+7 *** ***-**-**", email: "hidden@smeta.local", telegram: "@hidden_viz" },
    note: "Из большой базы. Сначала портфолио, потом тестовая задача, потом допуск к обычным заказам.",
    chat: [],
  },
];

const executorAccount = {
  name: "Марьям",
  role: "Проектировщик / визуализатор",
  city: "Грозный / удалённо",
  rank: 3,
  level: 12,
  xp: 7420,
  nextLevelXp: 9000,
  rating: 88,
  balance: "42 000 ₽",
  bonusPoints: 1860,
  streak: "5 задач без просрочки",
  badges: ["Сроки", "Качество", "Визуализация"],
  permissions: ["Дизайн", "3D", "Рабочка до ранга 3"],
  projects: [
    {
      id: "SG-154",
      title: "Дизайн-проект квартиры 96 м²",
      stage: "Визуализация",
      task: "Сделать визуализацию кухни-гостиной",
      status: "В работе",
      due: "14 мая",
      reward: "18 000 ₽",
      bonus: "+220 XP",
      progress: 62,
    },
    {
      id: "SG-233",
      title: "Рабочая документация спальни",
      stage: "Правки",
      task: "Поправить листы освещения и развертки",
      status: "Правки",
      due: "Сегодня",
      reward: "9 500 ₽",
      bonus: "+90 XP",
      progress: 80,
    },
    {
      id: "SG-198",
      title: "Концепция интерьера гостиной",
      stage: "Принято",
      task: "Подбор референсов и мудборд",
      status: "Принято",
      due: "Закрыто",
      reward: "7 000 ₽",
      bonus: "+140 XP",
      progress: 100,
    },
  ],
  rewards: [
    { title: "Бонус за сдачу без правок", value: "+500 ₽", status: "доступно" },
    { title: "Открыть задачи ранга 4", value: "нужно 1 580 XP", status: "цель" },
    { title: "Приоритетные срочные задачи", value: "+25% к ставке", status: "после ранга 4" },
  ],
  payouts: [
    { title: "SG-198 · Концепция интерьера", value: "7 000 ₽", status: "к выплате" },
    { title: "SG-154 · Визуализация", value: "18 000 ₽", status: "после приёмки" },
    { title: "Бонус качества", value: "1 500 ₽", status: "начислен" },
  ],
  feed: [
    "РП принял мудборд по SG-198 без правок.",
    "По SG-233 пришли правки: уточнить лист освещения.",
    "До уровня 13 осталось 1 580 XP.",
  ],
};

const mvpScope = [
  { day: "День 1", title: "Ядро", items: ["роли", "проекты", "задачи", "исполнители", "личный кабинет"] },
  { day: "День 2", title: "Bitrix24", items: ["вебхук", "карта полей", "сделка → проект", "задача → SmetaTasks"] },
  { day: "День 3", title: "Пилот", items: ["проверка прав", "тестовые заявки", "статусы", "инструкция команде"] },
];

const bitrixMappings = [
  { smeta: "Заявка SmetaGo", bitrix: "Лид / сделка", direction: "Bitrix → SmetaOffice", status: "обязательно" },
  { smeta: "Проект", bitrix: "Сделка + пользовательские поля", direction: "двусторонне", status: "обязательно" },
  { smeta: "Этап проекта", bitrix: "Стадия сделки / список задач", direction: "SmetaOffice → Bitrix", status: "MVP" },
  { smeta: "Задача исполнителя", bitrix: "Задача Bitrix24", direction: "двусторонне", status: "обязательно" },
  { smeta: "Исполнитель", bitrix: "Контакт / пользователь / внешний исполнитель", direction: "SmetaOffice → Bitrix", status: "MVP" },
  { smeta: "Файл / отчёт", bitrix: "Диск / комментарий к задаче", direction: "двусторонне", status: "после MVP" },
  { smeta: "Внутренний чат", bitrix: "Комментарий / таймлайн", direction: "SmetaOffice → Bitrix", status: "MVP" },
  { smeta: "Статус клиенту", bitrix: "Поле сделки + событие", direction: "SmetaOffice → SmetaGo", status: "обязательно" },
];

const projectDirectionCatalog = {
  "Проектный институт": {
    hint: "Серьёзное проектирование зданий и объектов: ПД/РД, разделы, сметы, обследования, согласования.",
    financeModel: "Бюджет реализации обычно выделяется РП/ГИПу, дальше распределяется по разделам и исполнителям.",
    roles: ["Руководитель направления", "ГИП", "Руководитель проекта", "Инженеры разделов", "Сметчик"],
    projectTypes: ["Проектная документация по 87 постановлению", "Рабочая документация", "Капитальный ремонт", "Реконструкция", "Многоквартирный дом", "Административное здание", "Коммерческий объект", "Инженерные разделы", "Сметная документация", "Обследование / техническое заключение"],
  },
  "Бюро архитектуры и дизайна": {
    hint: "Частные и коммерческие объекты: дизайн, архитектура, визуализация, рабочая документация.",
    financeModel: "Экономика строится по этапам: планировка, визуализация, рабочая документация, ведомости.",
    roles: ["Руководитель направления", "РП", "Дизайнер", "Архитектор", "Визуализатор", "Чертежник"],
    projectTypes: ["Дизайн интерьера", "Архитектурный проект частного дома", "Архитектурная концепция", "Фасады / экстерьер", "Конструктивный проект частного дома", "Рабочие чертежи", "Визуализация", "Перепланировка", "Коммерческий интерьер", "Малый коммерческий объект"],
  },
  "Строительство и ремонт": {
    hint: "Реализация: ремонт квартир и коммерции, строительство домов, реконструкция, инженерные работы.",
    financeModel: "Важно разделять договор, материалы, работы подрядчиков, акты, авансы и фактические расходы.",
    roles: ["Управляющий реализацией", "Прораб", "РП", "Подрядчик", "Снабжение", "Финансы"],
    projectTypes: ["Ремонт квартиры", "Ремонт коммерческого помещения", "Строительство частного дома", "Реконструкция", "Отделочные работы", "Инженерные работы", "Черновые работы", "Чистовые работы", "Гарантийные работы"],
  },
  "Агентство недвижимости": {
    hint: "Покупка, продажа, аренда, подбор и сопровождение сделки.",
    financeModel: "Основные деньги: комиссия, оплачено, партнёрская доля, передача в дизайн/ремонт.",
    roles: ["РОП", "Hunter", "Farmer", "Партнёр-риелтор", "Юрист"],
    projectTypes: ["Покупка квартиры", "Продажа квартиры", "Аренда", "Подбор объекта", "Коммерческая недвижимость", "Сопровождение сделки"],
  },
  "Изыскания / обследования / обмеры": {
    hint: "Самостоятельные проекты или подготовительные этапы для проектирования: геология, геодезия, обмеры, ТЗК.",
    financeModel: "Экономика зависит от выезда, полевых работ, обработки данных и отчёта.",
    roles: ["Управляющий изысканиями", "Геодезист", "Геолог", "Обследователь", "Обмерщик"],
    projectTypes: ["Геология", "Геодезия", "Топосъёмка", "Техническое обследование", "Обмеры помещения", "Дефектный акт", "Техническое заключение"],
  },
  "Комплектация": {
    hint: "Подбор, закупка, поставка мебели, техники, света, сантехники, материалов.",
    financeModel: "Нужно видеть спецификацию, поставщиков, оплату клиента, закуп и маржу.",
    roles: ["Комплектатор", "Снабжение", "Поставщик", "РП", "Финансы"],
    projectTypes: ["Комплектация квартиры", "Комплектация дома", "Комплектация коммерческого объекта", "Мебель", "Техника", "Свет", "Сантехника", "Отделочные материалы"],
  },
  "Бытовые услуги / сервис": {
    hint: "Сервис после сдачи объекта и мелкие бытовые задачи.",
    financeModel: "Малые заявки: цена клиенту, исполнитель, подтверждение клиента, выплата.",
    roles: ["Сервис-менеджер", "Исполнитель", "Партнёр", "Финансы"],
    projectTypes: ["Клининг", "Мелкий ремонт", "Установка техники", "Обслуживание кондиционера", "Сантехнические работы", "Электромонтажные мелкие работы", "Сервис после ремонта"],
  },
};

const projectStageTemplates = {
  "Проектная документация по 87 постановлению": [
    { name: "Исходные данные / договор / бриф", due: "готово до старта", progress: 100, status: "Принято", note: "Без исходных данных проект не запускается." },
    { name: "Техническое задание", due: "готово до старта", progress: 100, status: "Принято", note: "Фиксируется до начала проектирования." },
    { name: "Обследование / ТЗК", due: "по отдельному договору", note: "Если требуется восстановление, реконструкция или повреждённое здание." },
    { name: "Изыскания", due: "по отдельному договору", note: "Самостоятельная услуга; без неё часть ПСД нельзя начинать." },
    { name: "Эскиз / концепция", due: "по регламенту проекта", note: "Создаётся только если нужен по договору." },
    { name: "ПЗ — пояснительная записка", due: "по графику ПСД" },
    { name: "АР — архитектурные решения", due: "по графику ПСД" },
    { name: "КР — конструктивные решения", due: "по графику ПСД" },
    { name: "ОВиК — отопление, вентиляция и кондиционирование", due: "по графику ПСД" },
    { name: "ВК — водоснабжение и канализация", due: "по графику ПСД" },
    { name: "ЭОМ — электроснабжение и освещение", due: "по графику ПСД" },
    { name: "СС — слаботочные системы", due: "по графику ПСД" },
    { name: "ОДИ / МОДИ — доступность инвалидов", due: "по графику ПСД" },
    { name: "ПОС — проект организации строительства", due: "по графику ПСД" },
    { name: "СД — сметная документация", due: "по графику ПСД" },
    { name: "Внутренняя проверка", due: "1-3 рабочих дня" },
    { name: "Выдача заказчику", due: "1-2 рабочих дня" },
    { name: "Сопровождение согласования / экспертизы", due: "по факту замечаний" },
    { name: "Закрытие проекта", due: "1 рабочий день" },
  ],
  "Рабочая документация": ["Исходные данные", "Техническое задание", "АР", "КР", "ОВиК", "ВК", "ЭОМ", "СС", "Сводная проверка", "Выдача комплекта", "Закрытие"],
  "Капитальный ремонт": ["Исходные данные", "Обследование", "Дефектный акт", "ТЗК", "Проектные решения", "Сметная документация", "Проверка", "Выдача заказчику", "Сопровождение согласования", "Закрытие"],
  "Реконструкция": ["Исходные данные", "Обследование", "Концепция реконструкции", "АР", "КР", "Инженерные разделы", "Сметы", "Проверка", "Выдача", "Экспертиза", "Закрытие"],
  "Многоквартирный дом": ["Исходные данные", "ТЗ", "ПЗ", "АР", "КР", "ОВ", "ВК", "ЭОМ", "СС", "ПОС", "ОДИ / МОДИ", "Сметы", "Проверка", "Экспертиза", "Закрытие"],
  "Административное здание": ["Исходные данные", "ТЗ", "Обследование", "АР", "КР", "Инженерные разделы", "ПОС", "ОДИ / МОДИ", "Сметы", "Проверка", "Выдача", "Закрытие"],
  "Коммерческий объект": ["Исходные данные", "ТЗ", "Концепция", "АР", "КР", "Инженерные разделы", "Сметы", "Проверка", "Выдача", "Закрытие"],
  "Инженерные разделы": ["Исходные данные", "ТЗ", "ОВ", "ВК", "ЭОМ", "СС", "Согласование решений", "Проверка", "Выдача", "Закрытие"],
  "Сметная документация": ["Исходные данные", "Ведомости объёмов", "Локальные сметы", "Сводный сметный расчёт", "Проверка", "Выдача", "Корректировка", "Закрытие"],
  "Обследование / техническое заключение": ["Заявка", "Исходные данные", "Выезд / обследование", "Фотофиксация", "Обмеры", "Техническое заключение", "Дефектный акт", "Первичная смета", "Передача", "Закрытие"],
  "Дизайн интерьера": [
    { name: "Заявка / бриф", due: "готово до старта", progress: 100, status: "Принято", note: "Преддоговорный этап. Отдельно исполнителю не оплачивается." },
    { name: "Замеры", due: "готово до старта", progress: 100, status: "Принято", note: "Преддоговорный этап. Отдельно исполнителю не оплачивается." },
    { name: "Техническое задание", due: "готово до старта", progress: 100, status: "Принято", note: "Преддоговорный этап. Отдельно исполнителю не оплачивается." },
    { name: "Планировочное решение", due: "3 рабочих дня" },
    { name: "Меблировка / расстановка", due: "2-3 рабочих дня" },
    { name: "Концепция", due: "3 рабочих дня" },
    { name: "Визуализация", due: "2 рабочих дня на помещение / ракурс" },
    { name: "Рабочие чертежи", due: "7 рабочих дней" },
    { name: "Ведомость / комплектация", due: "2-3 рабочих дня" },
    { name: "Проверка РП", due: "1 рабочий день" },
    { name: "Выдача клиенту", due: "1-2 рабочих дня" },
    { name: "Закрытие", due: "1 рабочий день" },
  ],
  "Архитектурный проект частного дома": [
    { name: "Заявка / бриф", due: "готово до старта", progress: 100, status: "Принято", note: "Преддоговорный этап. Отдельно исполнителю не оплачивается." },
    { name: "Замеры / исходные данные", due: "готово до старта", progress: 100, status: "Принято", note: "Преддоговорный этап. Отдельно исполнителю не оплачивается." },
    { name: "Техническое задание", due: "готово до старта", progress: 100, status: "Принято", note: "Преддоговорный этап. Отдельно исполнителю не оплачивается." },
    { name: "Планировочные решения", due: "3 рабочих дня" },
    { name: "Эскиз / концепция", due: "3 рабочих дня" },
    { name: "Фасады", due: "3 рабочих дня" },
    { name: "Архитектурный раздел / АР", due: "7 рабочих дней" },
    { name: "Конструктивный раздел / КР", due: "по договору, если нужен" },
    { name: "Инженерные вводные", due: "по договору, если нужны" },
    { name: "Проверка РП", due: "1 рабочий день" },
    { name: "Выдача клиенту", due: "1-2 рабочих дня" },
    { name: "Закрытие", due: "1 рабочий день" },
  ],
  "Архитектурная концепция": ["Заявка", "Исходные данные", "ТЗ", "Эскиз", "Объёмно-планировочные решения", "Фасады", "Презентация", "Выдача", "Закрытие"],
  "Фасады / экстерьер": ["Заявка", "Исходные данные", "Обмеры", "Концепция фасада", "Визуализация", "Материалы", "Рабочие узлы", "Выдача", "Закрытие"],
  "Конструктивный проект частного дома": ["Исходные данные", "ТЗ", "Расчётная схема", "Фундаменты", "Перекрытия", "Кровля", "Узлы", "Проверка", "Выдача", "Закрытие"],
  "Рабочие чертежи": ["Исходные данные", "ТЗ", "Обмерный план", "Планы демонтажа/монтажа", "Электрика", "Сантехника", "Развертки", "Ведомости", "Проверка", "Выдача"],
  "Визуализация": ["Бриф", "Референсы", "Модель", "Черновые ракурсы", "Правки", "Финальные рендеры", "Выдача"],
  "Перепланировка": ["Заявка", "Исходные данные", "Обмеры", "Варианты планировки", "Согласование", "Комплект чертежей", "Выдача"],
  "Коммерческий интерьер": ["Бриф", "Замеры", "ТЗ", "Планировка", "Концепция", "Визуализация", "Рабочая документация", "Ведомости", "Выдача"],
  "Малый коммерческий объект": ["Заявка", "Исходные данные", "Концепция", "АР", "КР при необходимости", "Инженерные вводные", "Проверка", "Выдача"],
  "Ремонт квартиры": ["Заявка", "Осмотр / замер", "Смета", "Договор", "График работ", "Аванс", "Подготовка объекта", "Демонтаж", "Черновые работы", "Инженерные системы", "Чистовые работы", "Закуп материалов", "Проверка качества", "Сдача этапа", "Акт", "Закрытие объекта"],
  "Ремонт коммерческого помещения": ["Заявка", "Осмотр", "Смета", "Договор", "График", "Аванс", "Демонтаж", "Черновые работы", "Инженерные системы", "Отделка", "Проверка качества", "Сдача объекта", "Акт", "Закрытие"],
  "Строительство частного дома": ["Заявка", "Исходные данные", "Смета", "Договор", "График", "Фундамент", "Коробка", "Кровля", "Инженерные системы", "Отделка", "Проверка", "Сдача", "Закрытие"],
  "Отделочные работы": ["Заявка", "Осмотр", "Смета", "Материалы", "Работы", "Фотоотчёт", "Проверка", "Акт", "Закрытие"],
  "Инженерные работы": ["Заявка", "Осмотр", "Схема", "Смета", "Закуп", "Монтаж", "Проверка", "Акт", "Закрытие"],
  "Черновые работы": ["Заявка", "Осмотр", "Смета", "Демонтаж", "Черновой монтаж", "Инженерия", "Проверка", "Акт", "Закрытие"],
  "Чистовые работы": ["Заявка", "Смета", "Закуп", "Чистовая отделка", "Проверка качества", "Фотоотчёт", "Акт", "Закрытие"],
  "Гарантийные работы": ["Заявка", "Диагностика", "Назначение исполнителя", "Исправление", "Фотоотчёт", "Подтверждение клиента", "Закрытие"],
  "Покупка квартиры": ["Новый лид", "Квалификация", "Подбор объектов", "Показ", "Переговоры", "Торг", "Задаток", "Юридическая проверка", "Договор", "Регистрация", "Комиссия", "NPS", "Передача в дизайн / ремонт", "Архив"],
  "Продажа квартиры": ["Новый лид", "Оценка", "Подготовка объекта", "Реклама", "Показы", "Переговоры", "Задаток", "Договор", "Регистрация", "Комиссия", "Архив"],
  "Аренда": ["Новый лид", "Квалификация", "Подбор", "Показ", "Договор", "Заселение", "Комиссия", "Архив"],
  "Подбор объекта": ["Новый лид", "Квалификация", "Подбор", "Показы", "Согласование", "Сделка", "Передача в дизайн / ремонт", "Архив"],
  "Коммерческая недвижимость": ["Новый лид", "Квалификация", "Подбор", "Показы", "Переговоры", "Проверка", "Договор", "Комиссия", "Архив"],
  "Сопровождение сделки": ["Заявка", "Проверка документов", "Переговоры", "Договор", "Регистрация", "Закрытие"],
  "Геология": ["Заявка", "Квалификация", "Исходные данные", "Выезд", "Полевые работы", "Лаборатория", "Обработка данных", "Отчёт", "Проверка", "Выдача", "Закрытие"],
  "Геодезия": ["Заявка", "Квалификация", "Исходные данные", "Выезд", "Полевые работы", "Камеральная обработка", "Отчёт", "Проверка", "Выдача", "Закрытие"],
  "Топосъёмка": ["Заявка", "Исходные данные", "Выезд", "Съёмка", "Обработка", "План", "Проверка", "Выдача", "Закрытие"],
  "Техническое обследование": ["Заявка", "Исходные данные", "Выезд", "Обследование", "Фотофиксация", "Обработка", "Заключение", "Проверка", "Выдача", "Закрытие"],
  "Обмеры помещения": ["Заявка", "Квалификация", "Выезд", "Обмеры", "План", "Проверка", "Выдача", "Закрытие"],
  "Дефектный акт": ["Заявка", "Исходные данные", "Выезд", "Фиксация дефектов", "Дефектный акт", "Проверка", "Выдача", "Закрытие"],
  "Техническое заключение": ["Заявка", "Исходные данные", "Обследование", "Расчёты", "Заключение", "Проверка", "Выдача", "Закрытие"],
  "Комплектация квартиры": ["Заявка", "Спецификация", "Подбор поставщиков", "Коммерческие предложения", "Согласование с клиентом", "Заказ", "Оплата", "Закуп", "Доставка", "Монтаж / установка", "Закрытие"],
  "Комплектация дома": ["Заявка", "Спецификация", "Подбор", "КП", "Согласование", "Заказ", "Оплата", "Закуп", "Доставка", "Монтаж", "Закрытие"],
  "Комплектация коммерческого объекта": ["Заявка", "Спецификация", "Поставщики", "КП", "Согласование", "Заказ", "Оплата", "Логистика", "Монтаж", "Закрытие"],
  "Мебель": ["Заявка", "Спецификация", "Подбор", "КП", "Согласование", "Заказ", "Доставка", "Монтаж", "Закрытие"],
  "Техника": ["Заявка", "Спецификация", "Подбор", "КП", "Согласование", "Заказ", "Доставка", "Установка", "Закрытие"],
  "Свет": ["Заявка", "Спецификация", "Подбор", "КП", "Согласование", "Заказ", "Доставка", "Монтаж", "Закрытие"],
  "Сантехника": ["Заявка", "Спецификация", "Подбор", "КП", "Согласование", "Заказ", "Доставка", "Монтаж", "Закрытие"],
  "Отделочные материалы": ["Заявка", "Спецификация", "Подбор", "КП", "Согласование", "Заказ", "Доставка", "Закрытие"],
  "Клининг": ["Заявка", "Квалификация", "Назначение исполнителя", "Согласование цены", "Выполнение", "Фотоотчёт", "Подтверждение клиента", "Оплата", "Закрытие"],
  "Мелкий ремонт": ["Заявка", "Квалификация", "Назначение исполнителя", "Согласование цены", "Выполнение", "Фотоотчёт", "Подтверждение клиента", "Оплата", "Закрытие"],
  "Установка техники": ["Заявка", "Квалификация", "Назначение исполнителя", "Согласование цены", "Установка", "Проверка", "Оплата", "Закрытие"],
  "Обслуживание кондиционера": ["Заявка", "Квалификация", "Назначение исполнителя", "Сервис", "Фотоотчёт", "Подтверждение клиента", "Оплата", "Закрытие"],
  "Сантехнические работы": ["Заявка", "Квалификация", "Назначение исполнителя", "Согласование цены", "Работы", "Проверка", "Оплата", "Закрытие"],
  "Электромонтажные мелкие работы": ["Заявка", "Квалификация", "Назначение исполнителя", "Согласование цены", "Работы", "Проверка", "Оплата", "Закрытие"],
  "Сервис после ремонта": ["Заявка", "Диагностика", "Назначение исполнителя", "Выполнение", "Фотоотчёт", "Подтверждение клиента", "Закрытие"],
  "Дизайн-проект": ["Заявка / бриф", "Замеры", "Техническое задание", "Планировочное решение", "Концепция", "Визуализация", "Рабочая документация", "Ведомость / комплектация", "Проверка", "Выдача клиенту", "Закрытие"],
  "Архитектурный проект": ["Заявка", "Исходные данные", "Техническое задание", "Эскиз / концепция", "Архитектурные решения", "Фасады", "АР", "КР", "Инженерные разделы", "Комплектация альбома", "Выдача клиенту", "Закрытие проекта"],
  "Изыскания": ["Заявка", "Исходные данные", "Выезд", "Геодезия", "Геология", "Камеральная обработка", "Технический отчёт", "Передача заказчику", "Закрытие"],
  "Ремонт / строительство": ["Заявка", "Смета / договор", "График", "Аванс", "Черновые работы", "Сети", "Отделочные работы", "Фотоотчёт", "Приёмка", "Исправления", "Закрытие этапа", "Акт", "Закрытие"],
  "Недвижимость": ["Заявка", "Квалификация", "Подбор объектов", "Показы", "Переговоры", "Проверка документов", "Сделка", "Закрытие"],
};

const projectCreationModes = [
  { id: "smetago_app", label: "Приложение SmetaGO" },
  { id: "direct_client", label: "Прямой клиент" },
  { id: "referral", label: "Сарафан / рекомендация" },
  { id: "partner", label: "Партнёр" },
  { id: "social", label: "Соцсети" },
  { id: "website", label: "Сайт" },
  { id: "phone", label: "Телефон" },
  { id: "sales_manager", label: "Менеджер сам привёл" },
  { id: "owner_direct", label: "Владелец сам продал" },
  { id: "director_direct", label: "Управляющий сам продал" },
  { id: "bitrix_deal", label: "Сделка Bitrix24" },
  { id: "existing", label: "Существующий проект / перенос" },
  { id: "other", label: "Другое" },
];

const defaultProjectForm = {
  wizardStep: 1,
  creationMode: "existing",
  title: "",
  client: "",
  country: "Россия",
  city: "",
  address: "",
  region: "ЧР",
  projectType: "Дизайн интерьера",
  direction: "Бюро архитектуры и дизайна",
  status: "Новая",
  stage: "Заявка / бриф",
  progress: 5,
  risk: "green",
  deadline: "",
  sourceComment: "",
  directorUserId: "",
  pmUserId: "",
  projectManagerId: "",
  salesManagerId: "",
  partnerUserId: "",
  contractAmount: "",
  paidByClient: "",
  productionAllocationPercent: 35,
  productionBudget: "",
  salesCommissionPercent: 10,
  salesCommissionAmount: "",
  directCosts: "",
  operatingCosts: "",
  payrollCosts: "",
  yandexFolder: "",
  bitrixDealId: "",
};

function makeTemplateSections(projectType) {
  const template = projectStageTemplates[projectType] || projectStageTemplates["Дизайн интерьера"];
  return template.map((item, index) => {
    const stage = typeof item === "string" ? { name: item } : item;
    const progress = Number.isFinite(Number(stage.progress)) ? Number(stage.progress) : (index === 0 ? 5 : 0);
    return {
      id: `stage-${Date.now()}-${index + 1}`,
      name: stage.name,
      executor: "не назначен",
      executorId: "",
      due: stage.due || "не указан",
      progress,
      status: stage.status || (index === 0 ? "Новая" : "Ожидает"),
      clientBudget: 0,
      executorCost: 0,
      paid: 0,
      balance: 0,
      financeStatus: "не рассчитан",
      yandexLink: "",
      documents: [],
      comments: stage.note ? [stage.note] : [],
    };
  });
}

const integrationEvents = [
  { time: "10:05", source: "Bitrix24", text: "Новая сделка SG-219 создана как проект в SmetaOffice.", tone: "green" },
  { time: "10:12", source: "SmetaOffice", text: "Задача визуализатору отправлена в Bitrix24 как task.item.add.", tone: "blue" },
  { time: "10:18", source: "SmetaTasks", text: "Исполнитель принял задачу. Статус ушёл в карточку проекта.", tone: "green" },
  { time: "10:24", source: "Bitrix24", text: "Нет обязательного поля budget. Нужно заполнить карту полей.", tone: "orange" },
];

const appScreens = {
  dashboard: {
    title: "Панель управления",
    eyebrow: "Сводка владельца",
    desc: "Главный экран: где горит, какие проекты просрочены, кто отвечает и что нужно сделать сегодня.",
  },
  sales: {
    title: "Продажи / Лиды",
    eyebrow: "Зеркало Bitrix24",
    desc: "Лиды, Hunter, Farmer, РОП, SLA 5 минут, направления и связь с проектами. Это не отдельная CRM, а модель будущей синхронизации с Bitrix24.",
  },
  projects: {
    title: "Проекты",
    eyebrow: "Операционная база",
    desc: "Карточки проектов, этапы, задачи, файлы, риски, ответственные и статус для клиента.",
  },
  tasks: {
    title: "Задачи",
    eyebrow: "Производственная доска",
    desc: "Все задачи по проектам: кто делает, срок, статус, проверка, правки, принятие и выплата.",
  },
  partners: {
    title: "Партнёры",
    eyebrow: "Внешние команды",
    desc: "Партнёры, подрядчики и мини-команды: активные проекты, рейтинг, просрочки и уровень допуска.",
  },
  analytics: {
    title: "Аналитика",
    eyebrow: "Контроль владельца",
    desc: "Сроки, красные зоны, загрузка, выплаты, качество исполнителей, эффективность направлений.",
  },
  finance: {
    title: "Финансы",
    eyebrow: "Деньги без лишнего доступа",
    desc: "Суммы договоров, оплаты клиентов, бюджеты исполнителей, валовая прибыль, дебиторка и выплаты. Без доступа к админке пользователей.",
  },
  admin: {
    title: "Админка доступа",
    eyebrow: "Роли, регионы, должности",
    desc: "Новый пользователь только подаёт заявку. Роль, регион, должность и доступ к проектам назначает админ или владелец.",
  },
  projectDetail: {
    title: "Карточка проекта",
    eyebrow: "Полный провал внутрь проекта",
    desc: "Разделы, исполнители, сроки, бюджет клиента, выплаты исполнителям, файлы и задачи внутри одного проекта.",
  },
  client: {
    title: "Клиентское приложение",
    eyebrow: "Что видит клиент",
    desc: "Внешний спокойный статус: этап, прогресс, отчёты, документы и связь с менеджером.",
  },
};

function flattenTasks(projectItems) {
  return projectItems.flatMap((project) => {
    const operationTasks = (project.tasks || []).map((task, index) => ({
      id: task.id || `${project.id}-T${index + 1}`,
      kind: "Задача",
      projectId: project.id,
      projectTitle: project.title,
      projectRegion: project.region || project.city || "Без региона",
      projectManager: project.manager,
      direction: project.direction,
      section: task.sectionName || task.section || project.direction,
      description: task.description || "",
      documents: task.documents || [],
      comments: task.comments || [],
      chat: task.chat || [],
      clientBudget: Number(task.clientBudget) || 0,
      executorCost: Number(task.executorCost) || 0,
      ...task,
    }));

    const sectionTasks = projectSections(project).map((section, index) => ({
      id: section.id || `${project.id}-S${index + 1}`,
      kind: "Раздел",
      projectId: project.id,
      projectTitle: project.title,
      projectRegion: project.region || project.city || "Без региона",
      projectManager: project.manager,
      direction: project.direction,
      section: section.name,
      name: section.name,
      owner: section.executor,
      executorId: section.executorId || "",
      due: section.due,
      status: section.status,
      yandexLink: section.yandexLink,
      clientBudget: Number(section.clientBudget) || 0,
      executorCost: Number(section.executorCost) || 0,
    }));

    return [...operationTasks, ...sectionTasks];
  });
}

function userRegionList(user) {
  const list = Array.isArray(user?.regions) && user.regions.length ? user.regions : [user?.region].filter(Boolean);
  return list.length ? list : ["Все регионы"];
}

function canAccessRegion(user, project) {
  if (!user || user.role === "owner") return true;
  const userRegions = userRegionList(user);
  return userRegions.includes("Все регионы") || userRegions.includes(project.region || project.city);
}

function canAccessProject(user, project, viewRole = user?.role) {
  const role = viewRole || user?.role;
  if (!project || !user) return false;
  if (role === "owner") return true;
  if (role === "admin" || role === "deputy") return true;
  if (role === "finance" || role === "accountant") return true;

  if (role === "executor" || role === "partner") {
    const executorId = user?.executorId;
    if (role === "partner" && project.partnerUserId === user.id) return true;
    if (!executorId) return false;
    const assignedTasks = [...(project.tasks || []), ...(project.sections || [])];
    return assignedTasks.some((task) => task.executorId === executorId || task.assigneeId === executorId);
  }

  if (!canAccessRegion(user, project)) return false;

  if (role === "director") {
    return project.directorUserId === user.id || project.direction === user.direction;
  }
  if (role === "regional_manager") {
    return true;
  }
  if (role === "pm") {
    return project.pmUserId === user.id || project.managerId === user.id || project.manager === user.name;
  }
  if (role === "project_manager") {
    return project.projectManagerId === user.id || project.managerId === user.id || project.manager === user.name;
  }
  if (role === "sales_manager") {
    return project.salesManagerId === user.id || project.source === "SmetaGo" || project.direction === "Агентство недвижимости" || project.direction === "Недвижимость";
  }
  if (role === "head_of_sales") {
    return project.headOfSalesId === user.id || project.source === "SmetaGo" || project.direction === "Агентство недвижимости" || project.direction === "Недвижимость";
  }

  return canAccessRegion(user, project);
}

function sectionAllowed(role, sectionId) {
  const common = ["dashboard", "sales", "projects", "tasks", "analytics", "client"];
  if (role === "owner" || role === "deputy") return true;
  if (role === "admin") return ["dashboard", "sales", "projects", "tasks", "executors", "partners", "analytics", "integrations", "admin", "client"].includes(sectionId);
  if (role === "finance" || role === "accountant") return ["dashboard", "sales", "projects", "tasks", "analytics", "finance"].includes(sectionId);
  if (role === "executor") return ["dashboard", "tasks"].includes(sectionId);
  if (role === "partner") return ["dashboard", "sales", "projects", "tasks", "analytics"].includes(sectionId);
  if (role === "sales_manager" || role === "head_of_sales") return common.includes(sectionId);
  return ["dashboard", "sales", "projects", "tasks", "executors", "analytics", "client"].includes(sectionId);
}

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function readStoredValue(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStoredValue(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // In production this should be reported to the monitoring layer.
  }
}

async function apiGet(path, fallback) {
  try {
    const response = await fetch(`${API_BASE}${path}`);
    if (!response.ok) throw new Error(`API ${response.status}`);
    return await response.json();
  } catch {
    return fallback;
  }
}

async function apiPut(path, value) {
  try {
    await fetch(`${API_BASE}${path}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    });
  } catch {
    // LocalStorage remains the offline fallback.
  }
}

function riskText(risk) {
  if (risk === "red") return "Красная зона";
  if (risk === "yellow") return "Есть риск";
  return "В норме";
}

function statusClass(status) {
  if (status === "Просрочено") return "overdue";
  if (status === "На проверке") return "review";
  if (status === "Правки") return "review";
  if (status === "Принято") return "accepted";
  if (status === "В работе") return "active";
  return "new";
}

function executorStatusClass(status) {
  if (status === "Эксперт" || status === "Сильный") return "strong";
  if (status === "Проверенный") return "verified";
  if (status === "На проверке") return "review";
  if (status === "Новый контакт") return "new";
  return "limited";
}

function money(value) {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function formatShortDateTime(value) {
  if (!value) return "не указано";
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function showAction(message) {
  window.dispatchEvent(new CustomEvent("smeta-action", { detail: message }));
}

function formatMoscowDateTime(date = new Date()) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    weekday: "short",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function toMoneyNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  return Number(String(value || "").replace(/\s/g, "").replace(",", ".")) || 0;
}

function canCreateProjectRole(role) {
  return ["owner", "admin", "deputy", "director", "regional_manager", "pm", "project_manager"].includes(role);
}

function projectSourceLabel(mode) {
  return projectCreationModes.find((item) => item.id === mode)?.label || "Ручное создание";
}

function projectDirectionNames() {
  return Object.keys(projectDirectionCatalog);
}

function directionConfig(direction) {
  return projectDirectionCatalog[direction] || projectDirectionCatalog["Бюро архитектуры и дизайна"];
}

function projectTypesForDirection(direction) {
  return directionConfig(direction).projectTypes || [];
}

function firstProjectTypeForDirection(direction) {
  return projectTypesForDirection(direction)[0] || "Дизайн интерьера";
}

function firstStageForType(projectType) {
  const first = (projectStageTemplates[projectType] || projectStageTemplates["Дизайн интерьера"] || ["Заявка"])[0];
  return typeof first === "string" ? first : first.name;
}

function userNameById(users, userId, fallback = "") {
  return users.find((user) => user.id === userId)?.name || fallback;
}

function roleUserOptions(users, roles) {
  return users.filter((user) => roles.includes(user.role) && user.status !== "disabled");
}

function validateProjectForm(form) {
  const required = [
    ["title", "Название проекта"],
    ["client", "Клиент"],
    ["direction", "Направление"],
    ["projectType", "Тип проекта / продукт"],
    ["region", "Регион"],
    ["city", "Город / населённый пункт"],
    ["address", "Адрес"],
    ["creationMode", "Источник"],
    ["contractAmount", "Сумма договора"],
    ["directorUserId", "Руководитель направления"],
    ["pmUserId", "Руководитель проекта"],
    ["deadline", "Контрольный срок"],
    ["yandexFolder", "Главная папка Яндекс.Диска"],
  ];
  return required
    .filter(([key]) => String(form[key] || "").trim() === "")
    .map(([, label]) => label);
}

function projectSections(project) {
  return Array.isArray(project?.sections) ? project.sections : [];
}

function isBillableProductionStage(section) {
  const name = String(section?.name || "").toLowerCase();
  const nonBillable = ["заявка", "бриф", "замер", "исходные", "техническое задание", "тз"];
  return !nonBillable.some((word) => name.includes(word));
}

function stageDurationWeight(section) {
  const due = String(section?.due || "");
  const numbers = due.match(/\d+/g)?.map(Number) || [];
  if (!numbers.length) return 1;
  return Math.max(1, Math.round(numbers.reduce((sum, value) => sum + value, 0) / numbers.length));
}

function projectEconomy(project) {
  const sections = projectSections(project);
  const executorCost = sections.reduce((sum, item) => sum + (Number(item.executorCost) || 0), 0);
  const paidToExecutors = sections.reduce((sum, item) => sum + (Number(item.paid) || 0), 0);
  const contractAmount = Number(project.contractAmount) || 0;
  const paidByClient = Number(project.paidByClient) || 0;
  const directCosts = 0;
  const plannedExpenses = Number(project.plannedExpenses) || 0;
  const factualExpenses = 0;
  const partnerPayouts = Number(project.partnerPayouts) || 0;
  const productionAllocationPercent = Number(project.productionAllocationPercent) || (Number(project.productionBudget) ? Math.round((Number(project.productionBudget) / Math.max(contractAmount, 1)) * 100) : 35);
  const allocatedProductionBudget = Number(project.productionBudget) || Math.round(contractAmount * (productionAllocationPercent / 100));
  const salesCommissionPercent = Number(project.salesCommissionPercent) || 0;
  const salesCommissionAmount = Number(project.salesCommissionAmount) || Math.round(contractAmount * (salesCommissionPercent / 100));
  const productionCost = executorCost + partnerPayouts;
  const realizationCost = productionCost + salesCommissionAmount;
  const pmBudgetLeft = allocatedProductionBudget - productionCost;
  const companyPlannedGross = contractAmount - allocatedProductionBudget - salesCommissionAmount;
  const grossProfit = paidByClient - realizationCost;
  const contractProfit = contractAmount - realizationCost;
  const receivable = Math.max(contractAmount - paidByClient, 0);
  const operatingCosts = 0;
  const payrollCosts = 0;
  const netProfit = grossProfit - operatingCosts - payrollCosts;
  const splitBase = Math.max(netProfit, 0);
  const companyShare = Math.round(splitBase * 0.67);
  const managerShare = Math.round(splitBase * 0.33);
  const margin = contractAmount ? Math.round((grossProfit / contractAmount) * 100) : 0;

  return {
    sections,
    clientBudget: 0,
    executorCost,
    paidToExecutors,
    productionCost,
    contractAmount,
    paidByClient,
    directCosts,
    plannedExpenses,
    factualExpenses,
    partnerPayouts,
    salesCommissionPercent,
    salesCommissionAmount,
    productionAllocationPercent,
    allocatedProductionBudget,
    realizationCost,
    pmBudgetLeft,
    companyPlannedGross,
    grossProfit,
    contractProfit,
    receivable,
    operatingCosts,
    payrollCosts,
    netProfit,
    splitBase,
    companyShare,
    managerShare,
    margin,
  };
}

function financeSummary(projectItems) {
  return projectItems.reduce(
    (summary, project) => {
      const economy = projectEconomy(project);
      summary.contractAmount += economy.contractAmount;
      summary.paidByClient += economy.paidByClient;
      summary.executorCost += economy.executorCost;
      summary.directCosts += economy.directCosts;
      summary.salesCommissionAmount += economy.salesCommissionAmount;
      summary.allocatedProductionBudget += economy.allocatedProductionBudget;
      summary.realizationCost += economy.realizationCost;
      summary.pmBudgetLeft += economy.pmBudgetLeft;
      summary.companyPlannedGross += economy.companyPlannedGross;
      summary.grossProfit += economy.grossProfit;
      summary.contractProfit += economy.contractProfit;
      summary.receivable += economy.receivable;
      summary.operatingCosts += economy.operatingCosts;
      summary.payrollCosts += economy.payrollCosts;
      summary.netProfit += economy.netProfit;
      summary.splitBase += economy.splitBase;
      summary.companyShare += economy.companyShare;
      summary.managerShare += economy.managerShare;
      summary.payable += economy.realizationCost;
      if (project.risk === "red") summary.redProjects += 1;
      return summary;
    },
    {
      contractAmount: 0,
      paidByClient: 0,
      executorCost: 0,
      directCosts: 0,
      salesCommissionAmount: 0,
      allocatedProductionBudget: 0,
      realizationCost: 0,
      pmBudgetLeft: 0,
      companyPlannedGross: 0,
      grossProfit: 0,
      contractProfit: 0,
      receivable: 0,
      operatingCosts: 0,
      payrollCosts: 0,
      netProfit: 0,
      splitBase: 0,
      companyShare: 0,
      managerShare: 0,
      payable: 0,
      redProjects: 0,
    }
  );
}

function rankName(rank) {
  if (rank >= 5) return "Эксперт";
  if (rank === 4) return "Старший специалист";
  if (rank === 3) return "Исполнитель";
  if (rank === 2) return "Младший исполнитель";
  return "Новичок";
}

function groupToSection(groupName) {
  if (groupName.includes("Архитектор")) return "АР";
  if (groupName.includes("Дизайнер")) return "Дизайн";
  if (groupName.includes("Визуализ")) return "3D";
  if (groupName.includes("Чертеж")) return "Рабочка";
  if (groupName.includes("Конструкт")) return "КР";
  if (groupName.includes("ОВ")) return "ОВиК";
  if (groupName.includes("ВК")) return "ВК";
  if (groupName.includes("ЭОМ")) return "ЭОМ";
  if (groupName.includes("СС")) return "СС";
  if (groupName.includes("ПОС")) return "ПОС/ППР/ПОД/ПЗ";
  if (groupName.includes("Смет")) return "Сметы";
  return "Все";
}

function leadStageLabel(stage) {
  return salesStageLabels[stage] || stage || "без стадии";
}

function leadFunnelLabel(lead) {
  return bitrixFunnels[lead.funnelType]?.label || salesDirections[lead.direction] || "Воронка не указана";
}

function addMinutesIso(iso, minutes) {
  const base = iso ? new Date(iso) : new Date();
  return new Date(base.getTime() + minutes * 60 * 1000).toISOString();
}

function leadSlaStatus(lead, now = new Date()) {
  if (lead.firstResponseAt) return "ok";
  const deadline = lead.slaDeadlineAt ? new Date(lead.slaDeadlineAt) : new Date(addMinutesIso(lead.createdAt, 5));
  const diff = deadline.getTime() - now.getTime();
  if (diff <= 0) return "breached";
  if (diff <= 2 * 60 * 1000) return "warning";
  return "ok";
}

function slaText(status) {
  if (status === "breached") return "SLA нарушен";
  if (status === "warning") return "SLA скоро";
  return "SLA в норме";
}

function slaTone(status) {
  if (status === "breached") return "red";
  if (status === "warning") return "yellow";
  return "green";
}

function leadCanAccess(user, lead, viewRole = user?.role) {
  const role = viewRole || user?.role;
  if (!lead || !user) return false;
  if (["owner", "admin", "deputy", "head_of_sales"].includes(role)) return true;
  if (role === "finance" || role === "accountant") return true;
  if (role === "partner") return lead.partnerId === user.id || lead.farmerId === user.id;
  if (role === "sales_manager") return lead.hunterId === user.id || lead.farmerId === user.id;
  if (role === "project_manager" || role === "pm") return lead.farmerId === user.id || lead.projectId;
  if (role === "director") return user.direction === "Все направления" || salesDirections[lead.direction]?.includes(user.direction) || lead.region === user.region;
  if (role === "regional_manager") return userRegionList(user).includes(lead.region) || userRegionList(user).includes("Все регионы");
  return false;
}

function normalizeSalesLead(lead) {
  const createdAt = lead.createdAt || new Date().toISOString();
  return {
    ...lead,
    createdAt,
    slaDeadlineAt: lead.slaDeadlineAt || addMinutesIso(createdAt, 5),
    history: Array.isArray(lead.history) ? lead.history : [],
  };
}

function mergeSalesLeads(leads) {
  const source = Array.isArray(leads) ? leads : [];
  const existing = new Set(source.map((lead) => lead.id));
  const missing = seedSalesLeads.filter((lead) => !existing.has(lead.id));
  return [...missing, ...source].map(normalizeSalesLead);
}

function salesLeadStats(leads) {
  const now = new Date();
  const breached = leads.filter((lead) => leadSlaStatus(lead, now) === "breached").length;
  const linked = leads.filter((lead) => lead.projectId).length;
  const proposal = leads.filter((lead) => lead.stage === "proposal_sent").length;
  const contract = leads.filter((lead) => ["contract_and_advance", "contract_advance", "deposit"].includes(lead.stage)).length;
  return { breached, linked, proposal, contract };
}

function StatCard({ item }) {
  return (
    <div className="stat-card">
      <div>
        <p>{item.label}</p>
        <strong>{item.value}</strong>
      </div>
      <span className={cn("stat-dot", item.tone)}>•</span>
    </div>
  );
}

function ProjectCard({ project, active, onClick }) {
  const economy = projectEconomy(project);

  return (
    <button type="button" onClick={onClick} className={cn("project-card", active && "active")}>
      <div className="project-card-top">
        <div>
          <div className="chips">
            <span className="muted-chip">{project.id}</span>
            <span className={cn("risk-chip", project.risk)}>{riskText(project.risk)}</span>
          </div>
          <h3>{project.title}</h3>
          <p>{project.client} · {project.city}</p>
        </div>
        <span className="arrow">›</span>
      </div>
      <div className="progress-block">
        <div>
          <span>{project.stage}</span>
          <span>{project.progress}%</span>
        </div>
        <div className="bar">
          <span className={cn("bar-fill", project.risk)} style={{ width: `${project.progress}%` }} />
        </div>
      </div>
      <div className="project-meta">
        <span>РП: {project.manager}</span>
        <span>Срок: {project.deadline}</span>
      </div>
      <div className="card-money-row">
        <span>Договор: <b>{money(economy.contractAmount)}</b></span>
        <span>Бюджет РП: <b>{money(economy.allocatedProductionBudget)}</b></span>
        <span>Остаток: <b>{money(economy.pmBudgetLeft)}</b></span>
      </div>
    </button>
  );
}

function DrillCard({ title, subtitle, risk, metrics, onClick, manager }) {
  return (
    <button type="button" className="drill-card" onClick={onClick}>
      <div className="drill-card-head">
        <div>
          <span className={cn("risk-chip", risk)}>{riskText(risk)}</span>
          <h3>{title}</h3>
          <p>{subtitle}</p>
          {manager ? <p className="drill-manager">Управляющий: {manager}</p> : null}
        </div>
        <span className="arrow">›</span>
      </div>
      <div className="drill-metrics">
        {metrics.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <b>{value}</b>
          </div>
        ))}
      </div>
    </button>
  );
}

function AccessMatrix({ role }) {
  const rows = [
    { label: "Клиенты", allowed: ["owner", "director", "pm"].includes(role) },
    { label: "Все проекты", allowed: role === "owner" },
    { label: "Свои проекты", allowed: ["owner", "director", "pm", "executor", "partner"].includes(role) },
    { label: "Финансы и маржа", allowed: ["owner", "finance"].includes(role) },
    { label: "Чужие партнёры", allowed: ["owner", "director"].includes(role) },
    { label: "Настройки прав", allowed: role === "owner" },
  ];

  return (
    <aside className="side-card">
      <h3>Что видит выбранная роль</h3>
      <div className="access-list">
        {rows.map((row) => (
          <div key={row.label}>
            <span>{row.label}</span>
            <b className={row.allowed ? "yes" : "no"}>{row.allowed ? "Да" : "Нет"}</b>
          </div>
        ))}
      </div>
    </aside>
  );
}

function Info({ label, value }) {
  return (
    <div className="info">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function ExternalLinkValue({ url, empty = "не привязан" }) {
  if (!url || !String(url).startsWith("http")) return empty;
  return <a className="inline-link" href={url} rel="noreferrer">Открыть папку</a>;
}

function projectBitrixLink(project) {
  const bitrix = project.bitrix || {};
  return {
    dealId: bitrix.dealId || project.bitrixDealId || "",
    dealUrl: bitrix.dealUrl || project.bitrixDealUrl || "",
    stage: bitrix.stage || project.bitrixStage || "Не связано",
    source: bitrix.source || project.source || "SmetaOffice",
    syncStatus: bitrix.syncStatus || project.bitrixSyncStatus || "Черновая связь",
    responsibleRegion: project.responsibleRegion || project.region || "Не назначен",
    objectRegion: project.objectRegion || project.region || "Не указан",
    objectCity: project.objectCity || project.city || "Не указан",
  };
}

function projectClientParticipants(project) {
  if (Array.isArray(project.clientParticipants) && project.clientParticipants.length) return project.clientParticipants;
  return [
    {
      id: `${project.id}-client-main`,
      name: project.client || "Клиент",
      role: "Основной заказчик",
      access: "статус, файлы, чат, согласования",
      canApprove: true,
      status: "активен",
    },
  ];
}

function projectApprovals(project) {
  if (Array.isArray(project.approvals) && project.approvals.length) return project.approvals;
  return [
    {
      id: `${project.id}-approval-status`,
      title: `Статус этапа: ${project.stage}`,
      status: project.risk === "red" ? "нужна реакция РП" : "можно отправить клиенту",
      owner: project.manager || "РП",
      channel: "SmetaGo",
    },
  ];
}

function Panel({ title, items }) {
  return (
    <div className="panel-card">
      <h3>{title}</h3>
      <div className="panel-list">
        {items.map((item) => {
          const value = typeof item === "string" ? { label: item } : item;
          return value.url ? (
            <a key={value.label} href={value.url} rel="noreferrer">
              <span>{value.label}</span>
              <b>›</b>
            </a>
          ) : (
            <button key={value.label} type="button" onClick={() => showAction(value.action || `Открыт раздел: ${value.label}`)}>
              <span>{value.label}</span>
              <b>›</b>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProjectChat({ project, role, session, onProjectMessage }) {
  const [channel, setChannel] = useState(role === "executor" ? "executor" : "internal");
  const [text, setText] = useState("");
  const messages = Array.isArray(project.chat) && project.chat.length
    ? project.chat
    : [
        { id: `chat-${project.id}-seed-1`, channel: "internal", author: "SmetaOffice", role: "system", text: "Проектный чат создан. Здесь фиксируем решения, вопросы, файлы и клиентские сообщения.", at: "сейчас" },
        { id: `chat-${project.id}-seed-2`, channel: "client", author: "SmetaGo", role: "client", text: project.clientStatus || "Клиент видит спокойный статус проекта.", at: "сейчас" },
      ];
  const channelLabels = {
    internal: "Команда",
    executor: "Исполнители",
    client: "SmetaGo клиент",
  };
  const visibleMessages = messages.filter((message) => {
    if (role === "executor") return ["executor", "client"].includes(message.channel);
    return true;
  });

  function send() {
    const message = text.trim();
    if (!message) return;
    if (!onProjectMessage) {
      showAction("Чат доступен только в полной карточке проекта");
      return;
    }
    onProjectMessage(project.id, {
      channel,
      text: message,
      author: session?.name || roles.find((item) => item.id === role)?.name || "SmetaOffice",
      role,
    });
    setText("");
  }

  return (
    <section className="office-card project-chat-card">
      <div className="section-row">
        <div>
          <h3>Чат проекта</h3>
          <p className="section-hint">Единое место общения: руководство, РП, менеджеры, исполнители и клиентский канал SmetaGo.</p>
        </div>
        <select className="status-select" value={channel} onChange={(event) => setChannel(event.target.value)}>
          <option value="internal">Команда</option>
          <option value="executor">Исполнители</option>
          <option value="client">SmetaGo клиент</option>
        </select>
      </div>
      <div className="project-chat-layout">
        <div className="chat-thread">
          {visibleMessages.map((message) => (
            <div key={message.id} className={cn("project-message", message.channel)}>
              <div>
                <b>{message.author}</b>
                <span>{channelLabels[message.channel] || message.channel} · {message.at}</span>
              </div>
              <p>{message.text}</p>
            </div>
          ))}
        </div>
        <aside className="chat-rules">
          <b>Правило</b>
          <span>Клиентский канал уходит в SmetaGo. Внутренний канал остаётся внутри SmetaOffice. Исполнитель видит только свои рабочие сообщения и клиентский контекст.</span>
        </aside>
      </div>
      <div className="project-chat-input">
        <input value={text} onChange={(event) => setText(event.target.value)} placeholder={channel === "client" ? "Сообщение клиенту в SmetaGo" : "Сообщение внутри проекта"} />
        <button type="button" className="primary" onClick={send} disabled={!text.trim()}>Отправить</button>
      </div>
    </section>
  );
}

function BitrixBridgeCard({ project }) {
  const link = projectBitrixLink(project);
  const mappingRows = [
    { bitrix: "Сделка CRM", office: "Карточка проекта", smetago: "Проект клиента" },
    { bitrix: "Регион / Город", office: "Регион ответственности и регион объекта", smetago: "Город объекта" },
    { bitrix: "Тип услуги", office: "Направление и тип проекта", smetago: "Услуга клиента" },
    { bitrix: "Сумма договора", office: "Финансы проекта", smetago: "Оплачено / к оплате" },
    { bitrix: "Открытая линия", office: "Контроль РП", smetago: "Клиентский чат" },
    { bitrix: "Документы", office: "Яндекс.Диск и файлы проекта", smetago: "Документы для просмотра" },
  ];

  return (
    <section className="office-card bitrix-bridge-card">
      <div className="section-row">
        <div>
          <h3>Связь Bitrix ↔ SmetaOffice ↔ SmetaGo</h3>
          <p className="section-hint">Bitrix остается входом продаж и CRM. SmetaOffice ведет производство. SmetaGo показывает клиенту статус, чат, файлы и согласования.</p>
        </div>
        <button type="button" className="secondary" onClick={() => showAction(link.dealId ? `Открыть сделку Bitrix: ${link.dealId}` : "Сделка Bitrix пока не привязана")}>
          {link.dealId ? "Открыть сделку" : "Привязать сделку"}
        </button>
      </div>

      <div className="bitrix-bridge-grid">
        <Info label="Bitrix сделка" value={link.dealId || "не связана"} />
        <Info label="Стадия Bitrix" value={link.stage} />
        <Info label="Регион ответственности" value={link.responsibleRegion} />
        <Info label="Регион объекта" value={link.objectRegion} />
        <Info label="Город объекта" value={link.objectCity} />
        <Info label="Синхронизация" value={link.syncStatus} />
      </div>

      <div className="bitrix-map-table">
        <div className="bitrix-map-head">
          <b>Bitrix</b>
          <b>SmetaOffice</b>
          <b>SmetaGo</b>
        </div>
        {mappingRows.map((row) => (
          <div key={row.bitrix}>
            <span>{row.bitrix}</span>
            <span>{row.office}</span>
            <span>{row.smetago}</span>
          </div>
        ))}
      </div>

      <div className="integration-warning">
        <b>Безопасное правило:</b>
        <span>пока SmetaOffice читает и отображает связь, но не переписывает поля Bitrix автоматически. Автозапись включим только после утверждения карты полей и тестовой сделки.</span>
      </div>
    </section>
  );
}

function ClientParticipantsCard({ project, onAddParticipant }) {
  const [form, setForm] = useState({ name: "", role: "Дополнительный участник", canApprove: false });
  const participants = projectClientParticipants(project);

  function addParticipant() {
    const name = form.name.trim();
    if (!name || !onAddParticipant) return;
    onAddParticipant(project.id, {
      id: `client-${Date.now()}`,
      name,
      role: form.role,
      access: form.canApprove ? "статус, файлы, чат, согласования" : "статус, файлы, чат",
      canApprove: form.canApprove,
      status: "активен",
    });
    setForm({ name: "", role: "Дополнительный участник", canApprove: false });
  }

  return (
    <section className="office-card client-access-card">
      <div className="section-row">
        <div>
          <h3>Участники клиента в SmetaGo</h3>
          <p className="section-hint">В проекте может быть несколько клиентов: муж, жена, представитель, технадзор. Права согласования задаются отдельно.</p>
        </div>
      </div>

      <div className="client-participants-list">
        {participants.map((participant) => (
          <div key={participant.id}>
            <div>
              <b>{participant.name}</b>
              <span>{participant.role}</span>
            </div>
            <em>{participant.access}</em>
            <strong className={participant.canApprove ? "good" : ""}>{participant.canApprove ? "может согласовывать" : "без согласования"}</strong>
          </div>
        ))}
      </div>

      <div className="client-participant-form">
        <input value={form.name} onChange={(event) => setForm((next) => ({ ...next, name: event.target.value }))} placeholder="ФИО участника клиента" />
        <select value={form.role} onChange={(event) => setForm((next) => ({ ...next, role: event.target.value }))}>
          <option>Основной заказчик</option>
          <option>Супруг / супруга</option>
          <option>Представитель</option>
          <option>Технический надзор</option>
          <option>Дополнительный участник</option>
        </select>
        <label>
          <input type="checkbox" checked={form.canApprove} onChange={(event) => setForm((next) => ({ ...next, canApprove: event.target.checked }))} />
          Может согласовывать
        </label>
        <button type="button" className="primary" onClick={addParticipant} disabled={!form.name.trim()}>Добавить</button>
      </div>
    </section>
  );
}

function ClientApprovalsCard({ project }) {
  const approvals = projectApprovals(project);

  return (
    <section className="office-card approvals-card">
      <div className="section-row">
        <div>
          <h3>Согласования клиента</h3>
          <p className="section-hint">Все правки и утверждения фиксируются в проекте, чтобы Bitrix, SmetaOffice и SmetaGo не спорили между собой.</p>
        </div>
        <button type="button" className="secondary" onClick={() => showAction("MVP: согласования будут отправляться клиенту через SmetaGO/Bitrix24 после подключения канала")}>MVP: согласование в разработке</button>
      </div>
      <div className="approval-list">
        {approvals.map((approval) => (
          <div key={approval.id}>
            <div>
              <b>{approval.title}</b>
              <span>Ответственный: {approval.owner}</span>
            </div>
            <em>{approval.channel}</em>
            <strong>{approval.status}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProjectEditPanel({ project, users, canEdit, onUpdateProject }) {
  const [form, setForm] = useState(() => ({
    title: project.title || "",
    client: project.client || "",
    region: project.region || "ЧР",
    city: project.city || "",
    address: project.address || "",
    status: project.status || "Новая",
    stage: project.stage || "",
    progress: Number(project.progress) || 0,
    risk: project.risk || "green",
    deadline: project.deadline || "",
    yandexFolder: project.yandexFolder === "не привязан" ? "" : project.yandexFolder || "",
    contractAmount: Number(project.contractAmount) || 0,
    paidByClient: Number(project.paidByClient) || 0,
    productionAllocationPercent: Number(project.productionAllocationPercent) || 35,
    productionBudget: Number(project.productionBudget) || 0,
    salesCommissionPercent: Number(project.salesCommissionPercent) || 0,
    salesCommissionAmount: Number(project.salesCommissionAmount) || 0,
    pmUserId: project.pmUserId || "",
    projectManagerId: project.projectManagerId || "",
    salesManagerId: project.salesManagerId || "",
  }));

  useEffect(() => {
    setForm({
      title: project.title || "",
      client: project.client || "",
      region: project.region || "ЧР",
      city: project.city || "",
      address: project.address || "",
      status: project.status || "Новая",
      stage: project.stage || "",
      progress: Number(project.progress) || 0,
      risk: project.risk || "green",
      deadline: project.deadline || "",
      yandexFolder: project.yandexFolder === "не привязан" ? "" : project.yandexFolder || "",
      contractAmount: Number(project.contractAmount) || 0,
      paidByClient: Number(project.paidByClient) || 0,
      productionAllocationPercent: Number(project.productionAllocationPercent) || 35,
      productionBudget: Number(project.productionBudget) || 0,
      salesCommissionPercent: Number(project.salesCommissionPercent) || 0,
      salesCommissionAmount: Number(project.salesCommissionAmount) || 0,
      pmUserId: project.pmUserId || "",
      projectManagerId: project.projectManagerId || "",
      salesManagerId: project.salesManagerId || "",
    });
  }, [project.id]);

  if (!canEdit) return null;

  const projectStages = projectSections(project).map((section) => section.name);
  const projectLeads = roleUserOptions(users, ["pm", "project_manager", "director", "regional_manager", "deputy", "owner"]);
  const salesManagers = roleUserOptions(users, ["sales_manager", "head_of_sales", "owner", "director"]);
  const calculatedProductionBudget = Math.round((Number(form.contractAmount) || 0) * ((Number(form.productionAllocationPercent) || 0) / 100));
  const calculatedSalesCommission = Math.round((Number(form.contractAmount) || 0) * ((Number(form.salesCommissionPercent) || 0) / 100));

  function update(patch) {
    setForm((next) => ({ ...next, ...patch }));
  }

  function save() {
    const contractAmount = Number(form.contractAmount) || 0;
    const paidByClient = Number(form.paidByClient) || 0;
    const productionAllocationPercent = Number(form.productionAllocationPercent) || 0;
    const productionBudget = Number(form.productionBudget) || Math.round(contractAmount * (productionAllocationPercent / 100));
    const salesCommissionPercent = Number(form.salesCommissionPercent) || 0;
    const salesCommissionAmount = Number(form.salesCommissionAmount) || Math.round(contractAmount * (salesCommissionPercent / 100));
    onUpdateProject(project.id, {
      ...form,
      progress: Math.max(0, Math.min(100, Number(form.progress) || 0)),
      contractAmount,
      paidByClient,
      productionAllocationPercent,
      productionBudget,
      salesCommissionPercent,
      salesCommissionAmount,
      yandexFolder: form.yandexFolder.trim() || "не привязан",
    });
  }

  return (
    <section className="office-card project-edit-card">
      <div className="section-row">
        <div>
          <h3>Редактирование проекта</h3>
          <p className="section-hint">Здесь админ/владелец исправляет ошибочно внесённые данные: договор, оплату клиента, бюджет РП, комиссию продаж и ссылку на Яндекс.Диск.</p>
        </div>
        <button type="button" className="primary" onClick={save}>Сохранить изменения</button>
      </div>
      <div className="quick-form">
        <label><span>Название проекта</span><input value={form.title} onChange={(event) => update({ title: event.target.value })} /></label>
        <label><span>Клиент</span><input value={form.client} onChange={(event) => update({ client: event.target.value })} /></label>
        <label><span>Регион</span><select value={form.region} onChange={(event) => update({ region: event.target.value })}>{regionOptions.filter((region) => region !== "Все регионы").map((region) => <option key={region}>{region}</option>)}</select></label>
        <label><span>Город</span><input value={form.city} onChange={(event) => update({ city: event.target.value })} /></label>
        <label className="wide"><span>Адрес</span><input value={form.address} onChange={(event) => update({ address: event.target.value })} /></label>
        <label><span>Статус</span><select value={form.status} onChange={(event) => update({ status: event.target.value })}>{["Новая", "В работе", "На проверке", "Ожидает клиента", "Ожидает оплаты", "Красная зона", "Завершён"].map((status) => <option key={status}>{status}</option>)}</select></label>
        <label><span>Текущий этап</span><select value={form.stage} onChange={(event) => update({ stage: event.target.value })}>{projectStages.map((stage) => <option key={stage}>{stage}</option>)}</select></label>
        <label><span>Готовность, %</span><input type="number" value={form.progress} onChange={(event) => update({ progress: event.target.value })} /></label>
        <label><span>Светофор</span><select value={form.risk} onChange={(event) => update({ risk: event.target.value })}><option value="green">В норме</option><option value="yellow">Есть риск</option><option value="red">Красная зона</option></select></label>
        <label><span>Контрольный срок</span><input value={form.deadline} onChange={(event) => update({ deadline: event.target.value })} /></label>
        <label><span>Руководитель проекта</span><select value={form.pmUserId} onChange={(event) => update({ pmUserId: event.target.value })}><option value="">Не назначен</option>{projectLeads.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.position}</option>)}</select></label>
        <label><span>Менеджер проекта</span><select value={form.projectManagerId} onChange={(event) => update({ projectManagerId: event.target.value })}><option value="">Не назначен</option>{projectLeads.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.position}</option>)}</select></label>
        <label><span>Менеджер продаж</span><select value={form.salesManagerId} onChange={(event) => update({ salesManagerId: event.target.value })}><option value="">Нет / не из продаж</option>{salesManagers.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.position}</option>)}</select></label>
        <label><span>Сумма договора, ₽</span><input type="number" value={form.contractAmount} onChange={(event) => update({ contractAmount: event.target.value })} /></label>
        <label><span>Оплачено клиентом, ₽</span><input type="number" value={form.paidByClient} onChange={(event) => update({ paidByClient: event.target.value })} /></label>
        <label><span>% бюджета РП</span><input type="number" value={form.productionAllocationPercent} onChange={(event) => update({ productionAllocationPercent: event.target.value })} /></label>
        <label><span>Бюджет РП вручную, ₽</span><input type="number" value={form.productionBudget} onChange={(event) => update({ productionBudget: event.target.value })} /></label>
        <label><span>% единого центра продаж</span><input type="number" value={form.salesCommissionPercent} onChange={(event) => update({ salesCommissionPercent: event.target.value })} /></label>
        <label><span>Комиссия продаж вручную, ₽</span><input type="number" value={form.salesCommissionAmount} onChange={(event) => update({ salesCommissionAmount: event.target.value })} /></label>
        <label className="wide"><span>Главная папка Яндекс.Диска</span><input value={form.yandexFolder} onChange={(event) => update({ yandexFolder: event.target.value })} /></label>
        <div className="wide form-hint">Расчёт по текущим полям: бюджет РП {money(calculatedProductionBudget)} по проценту; комиссия продаж {money(calculatedSalesCommission)} по проценту. Если вручную указана сумма в ₽, она перебивает процентный расчёт.</div>
      </div>
    </section>
  );
}

function ProjectSectionsEditor({ project, sections, executors, canEdit, onUpdateSection, onAddSection, onDeleteSection, onDistributeSectionBudget }) {
  const columnLabels = ["Этап / раздел", "Исполнитель", "Срок", "Статус", "%", "Сумма задачи исполнителя, ₽", "Выплачено исполнителю, ₽", "Финстатус", "Действие"];
  return (
    <div className="sections-editor">
      <div className="section-row">
        <div>
          <h3>Редактируемые этапы проекта</h3>
          <p className="section-hint">Этап — крупный блок работы. Задачи создаются внутри этапа ниже в карточке проекта.</p>
        </div>
        {canEdit ? (
          <div className="section-actions">
            <button type="button" className="secondary" onClick={() => onDistributeSectionBudget(project.id)}>Распределить бюджет исполнителя</button>
            <button type="button" className="primary" onClick={() => onAddSection(project.id)}>Добавить этап</button>
          </div>
        ) : <span className="muted-chip">Редактирует только владелец / админ</span>}
      </div>
      <div className="stage-editor-head">
        {columnLabels.map((label) => <span key={label}>{label}</span>)}
      </div>
      {sections.length ? sections.map((section) => {
        const sectionId = section.id || section.name;
        return (
          <div key={sectionId} className="stage-editor-row">
            <input disabled={!canEdit} value={section.name} onChange={(event) => onUpdateSection(project.id, sectionId, { name: event.target.value })} placeholder="Название этапа" />
            <select
              disabled={!canEdit}
              value={section.executorId || ""}
              onChange={(event) => {
                const executor = executors.find((item) => item.id === event.target.value);
                onUpdateSection(project.id, sectionId, { executorId: event.target.value, executor: executor ? executor.name : "не назначен" });
              }}
            >
              <option value="">Исполнитель не назначен</option>
              {executors.map((executor) => <option key={executor.id} value={executor.id}>{executor.name} · {executor.sections.join(", ")}</option>)}
            </select>
            <input disabled={!canEdit} value={section.due} onChange={(event) => onUpdateSection(project.id, sectionId, { due: event.target.value })} placeholder="Срок" />
            <select disabled={!canEdit} value={section.status} onChange={(event) => onUpdateSection(project.id, sectionId, { status: event.target.value })}>
              {["Ожидает", "Новая", "В работе", "На проверке", "Правки", "Принято", "Просрочено"].map((status) => <option key={status}>{status}</option>)}
            </select>
            <input disabled={!canEdit} type="number" value={section.progress || 0} onChange={(event) => onUpdateSection(project.id, sectionId, { progress: Number(event.target.value) })} placeholder="%" />
            <input disabled={!canEdit} type="number" value={section.executorCost || 0} onChange={(event) => onUpdateSection(project.id, sectionId, { executorCost: Number(event.target.value), balance: (Number(event.target.value) || 0) - (Number(section.paid) || 0) })} placeholder="Сумма задачи, ₽" />
            <input disabled={!canEdit} type="number" value={section.paid || 0} onChange={(event) => onUpdateSection(project.id, sectionId, { paid: Number(event.target.value), balance: (Number(section.executorCost) || 0) - (Number(event.target.value) || 0) })} placeholder="Выплачено, ₽" />
            <select disabled={!canEdit} value={section.financeStatus || "не рассчитан"} onChange={(event) => onUpdateSection(project.id, sectionId, { financeStatus: event.target.value })}>
              {["не рассчитан", "план", "счёт", "к выплате", "частично выплачено", "выплачено", "удержание"].map((status) => <option key={status}>{status}</option>)}
            </select>
            <input disabled={!canEdit} className="stage-editor-wide" value={section.yandexLink || ""} onChange={(event) => onUpdateSection(project.id, sectionId, { yandexLink: event.target.value, documents: event.target.value ? [event.target.value] : [] })} placeholder="Ссылка на Яндекс.Диск этапа" />
            <input disabled={!canEdit} className="stage-editor-wide" value={(section.comments || []).join("; ")} onChange={(event) => onUpdateSection(project.id, sectionId, { comments: event.target.value ? [event.target.value] : [] })} placeholder="Комментарий к этапу" />
            {!isBillableProductionStage(section) ? <span className="stage-note">Без доп. оплаты</span> : null}
            {section.yandexLink ? <a className="stage-link" href={section.yandexLink} rel="noreferrer">Открыть</a> : null}
            <button type="button" className="secondary danger" disabled={!canEdit} onClick={() => onDeleteSection(project.id, sectionId)}>Удалить</button>
          </div>
        );
      }) : <div className="empty">Этапы пока не созданы.</div>}
    </div>
  );
}

function ProjectDetails({ project, role, onUpdateProject, onTaskStatusChange, onProjectMessage, onAddClientParticipant, session, onUpdateSection, onAddSection, onDeleteSection, onDistributeSectionBudget, executors, users }) {
  const canSeeMoney = roleCan(role, "viewFinance");
  const canSeeProductionBudget = roleCan(role, "viewProductionBudget") || canSeeMoney;
  const canSeeClient = roleCan(role, "viewClient") || roleCan(role, "manageProjects") || canSeeMoney;
  const canAdminProject = ["owner", "admin"].includes(role);
  const economy = projectEconomy(project);

  return (
    <div className="details-stack">
      <section className="project-details">
        <div className="details-head">
          <div>
            <div className="chips">
              <span className="muted-chip">{project.id}</span>
              <span className={cn("risk-chip", project.risk)}>{riskText(project.risk)}</span>
              <span className="blue-chip">{project.source}</span>
              <span className="muted-chip">{project.status}</span>
            </div>
            <h2>{project.title}</h2>
            <p>{project.projectType || project.direction} · {project.region || project.city} · {project.city}</p>
          </div>
          <div className="stage-card">
            <span>Текущий этап</span>
            <b>{project.stage}</b>
            <small>Срок: {project.deadline}</small>
          </div>
        </div>

        <div className="info-grid">
          <Info label="Клиент" value={canSeeClient ? project.client : "Скрыто"} />
          <Info label="РП" value={project.manager} />
          <Info label="Исполнитель" value={project.executor} />
          <Info label="Партнёр" value={project.partner} />
          <Info label="Адрес" value={[project.country, project.region, project.city, project.address].filter(Boolean).join(", ")} />
          <Info label="Яндекс.Диск" value={<ExternalLinkValue url={project.yandexFolder} />} />
        </div>

        <div className="progress-block large">
          <div>
            <span>Готовность проекта</span>
            <span>{project.progress}%</span>
          </div>
          <div className="bar">
            <span className={cn("bar-fill", project.risk)} style={{ width: `${project.progress}%` }} />
          </div>
        </div>
      </section>

      <BitrixBridgeCard project={project} />
      <ClientParticipantsCard project={project} onAddParticipant={onAddClientParticipant} />
      <ClientApprovalsCard project={project} />
      <ProjectEditPanel project={project} users={users} canEdit={canAdminProject} onUpdateProject={onUpdateProject} />

      <section className="office-card economy-card">
        <div className="section-row">
          <div>
            <h3>Разделы и экономика</h3>
            <p className="section-hint">Каждый раздел - отдельная работа: исполнитель, срок, бюджет клиента, оплата исполнителю, валовая прибыль.</p>
          </div>
        </div>

        {canSeeProductionBudget ? (
          <div className="production-budget-card">
            <div>
              <span>Бюджет реализации для РП / направления</span>
              <b>{money(economy.allocatedProductionBudget)}</b>
              <small>{economy.productionAllocationPercent}% от суммы договора</small>
            </div>
            <div>
              <span>Уже распределено по исполнителям</span>
              <b>{money(economy.productionCost)}</b>
              <small>только суммы задач исполнителям внутри бюджета РП</small>
            </div>
            <div>
              <span>Комиссия единого центра продаж</span>
              <b>{money(economy.salesCommissionAmount)}</b>
              <small>{economy.salesCommissionPercent}% от суммы договора, если продажа шла через продажи</small>
            </div>
            <div>
              <span>Остаток бюджета РП</span>
              <b className={economy.pmBudgetLeft >= 0 ? "good" : "bad"}>{money(economy.pmBudgetLeft)}</b>
              <small>то, что остаётся внутри выделенного бюджета</small>
            </div>
            <div>
              <span>Плановая валовая часть компании</span>
              <b>{money(economy.companyPlannedGross)}</b>
              <small>договор минус выделенный бюджет реализации</small>
            </div>
          </div>
        ) : null}

        <div className="economy-summary">
          <Info label="Сумма договора" value={money(economy.contractAmount)} />
          <Info label="Оплачено клиентом" value={money(economy.paidByClient)} />
          <Info label="Остаток оплаты клиента" value={money(economy.receivable)} />
          <Info label="Доступный бюджет" value={money(economy.allocatedProductionBudget)} />
          <Info label="Себестоимость исполнителей" value={money(economy.productionCost)} />
          <Info label="К выплате исполнителям" value={money(Math.max(economy.executorCost - economy.paidToExecutors, 0))} />
          <Info label="Плановая валовая часть компании" value={money(economy.companyPlannedGross)} />
        </div>

        {economy.sections.every((section) => !Number(section.clientBudget) && !Number(section.executorCost)) ? (
          <div className="form-hint">Суммы этапов пока не заполнены. Заполни бюджет этапов, назначь исполнителей и обнови факт выплат — экономика пересчитается автоматически.</div>
        ) : null}

        <ProjectSectionsEditor
          project={project}
          sections={economy.sections}
          executors={executors}
          canEdit={canAdminProject}
          onUpdateSection={onUpdateSection}
          onAddSection={onAddSection}
          onDeleteSection={onDeleteSection}
          onDistributeSectionBudget={onDistributeSectionBudget}
        />
      </section>

      <div className="details-grid">
        <section className="tasks-card">
          <div className="section-row">
            <h3>Задачи этапа</h3>
            <button type="button" className="primary" onClick={() => { const form = document.getElementById("project-task-create"); if (form) form.scrollIntoView({ behavior: "smooth", block: "start" }); else showAction("Открой полную карточку проекта, чтобы добавить задачу"); }}>Добавить задачу</button>
          </div>
          <div className="task-table">
            {project.tasks.map((task) => (
              <div key={`${project.id}-${task.name}`}>
                <div>
                  <b>{task.name}</b>
                  <span>Ответственный: {task.owner}{task.executorId ? ` · ${task.executorId}` : ""}</span>
                </div>
                {onTaskStatusChange ? (
                  <select className="status-select" value={task.status} onChange={(event) => onTaskStatusChange(project.id, task.name, event.target.value)}>
                    <option>Новая</option>
                    <option>В работе</option>
                    <option>На проверке</option>
                    <option>Правки</option>
                    <option>Принято</option>
                    <option>Просрочено</option>
                  </select>
                ) : (
                  <em className={cn("status", statusClass(task.status))}>{task.status}</em>
                )}
                <span>{task.due}</span>
                <button type="button" onClick={() => showAction("Открой раздел «Задачи»: там доступна карточка задачи с этапом, файлами и комментариями")}>Открыть</button>
              </div>
            ))}
          </div>
        </section>

        <aside className="details-side">
          <section className="panel-card">
            <h3>Финансы</h3>
            {canSeeMoney ? (
              <div className="finance-list">
                <Info label="Бюджет" value={project.budget} />
                <Info label="Маржа" value={project.margin} />
                <Info label="Следующая оплата" value="после приёмки этапа" />
              </div>
            ) : (
              <p className="hidden-money">Финансы скрыты для этой роли. Лишние глаза — лишние проблемы.</p>
            )}
          </section>

          <section className="panel-card client-view">
            <h3>Что видит клиент</h3>
            <p>{project.clientStatus}</p>
            <button type="button" onClick={() => showAction("MVP: передача статуса в SmetaGO будет включена после подключения клиентского API")}>MVP: передача статуса в разработке</button>
          </section>
        </aside>
      </div>

      <ProjectChat project={project} role={role} session={session} onProjectMessage={onProjectMessage} />

      <div className="bottom-panels">
        <Panel title="Файлы" items={(project.files || []).map((file) => ({ label: `${file.type}: ${file.title}`, url: file.url }))} />
        <Panel
          title="Структура Яндекс.Диска"
          items={["Главная папка проекта", "Исходные данные", "Чертежи / разделы", "Согласования", "Акты", "Фото / видео"].map((label) => ({
            label,
            url: project.yandexFolder && project.yandexFolder.startsWith("http") ? project.yandexFolder : "",
            action: "Папка Яндекс.Диска не привязана к проекту",
          }))}
        />
        <Panel title="История действий" items={(project.chat || []).slice(-3).map((message) => ({ label: message.text, action: "История действий будет вынесена в отдельный журнал" }))} />
      </div>
    </div>
  );
}

function PartnerTable() {
  return (
    <section className="office-card">
      <div className="section-row">
        <h3>Партнёры</h3>
        <button type="button" className="primary" onClick={() => showAction("Открыта заявка на подключение партнёра")}>Подключить</button>
      </div>
      <div className="partner-table">
        {partners.map((partner) => (
          <div key={partner.name}>
            <div>
              <b>{partner.name}</b>
              <span>{partner.category}</span>
            </div>
            <em>{partner.level}</em>
            <span>Рейтинг {partner.rating}</span>
            <span>Активно {partner.active}</span>
            <strong className={partner.overdue ? "bad" : "good"}>Просрочки {partner.overdue}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function Pipeline() {
  const steps = [
    { title: "Заявка", desc: "пришла из SmetaGo" },
    { title: "Квалификация", desc: "Hunter уточнил задачу" },
    { title: "Проект", desc: "создана карточка" },
    { title: "Этапы", desc: "разбивка работ" },
    { title: "Приёмка", desc: "РП проверил" },
    { title: "Клиент", desc: "видит понятный статус" },
  ];

  return (
    <section className="office-card">
      <h3>Сквозной путь проекта</h3>
      <div className="pipeline">
        {steps.map((step, index) => (
          <div key={step.title}>
            <span>{index + 1}</span>
            <b>{step.title}</b>
            <p>{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ExecutorCard({ executor, active, onClick }) {
  const completed = executor.completedProjects ?? Math.max(0, Math.round((executor.rating || 50) / 4));
  return (
    <button type="button" onClick={onClick} className={cn("executor-card", active && "active")}>
      <div className="executor-card-head">
        <div>
          <span className="muted-chip">{executor.id}</span>
          <h3>{executor.name}</h3>
          <p>{executor.type} · {executor.city}</p>
        </div>
        <b>{executor.rating}</b>
      </div>
      <div className="executor-chips">
        {executor.sections.map((section) => (
          <span key={section}>{section}</span>
        ))}
      </div>
      <div className="executor-meta">
        <span>{rankName(executor.rank)}</span>
        <em className={cn("executor-status", executorStatusClass(executor.status))}>{executor.status}</em>
      </div>
      <div className="executor-mini-stats">
        <span>Выполнено: {completed}</span>
        <span>Сроки: {executor.onTime || 0}%</span>
      </div>
    </button>
  );
}

function ExecutorDetails({ executor, canSeeContacts, onMessage, assignedTasks = [] }) {
  const [message, setMessage] = useState("");
  const completed = executor.completedProjects ?? Math.max(0, Math.round((executor.rating || 50) / 4));
  const activeProjects = executor.activeProjects ?? Math.max(0, Math.round((executor.workload || 0) / 22));

  function sendMessage() {
    const text = message.trim();
    if (!text) return;
    onMessage(executor.id, text);
    setMessage("");
  }

  return (
    <section className="executor-details">
      <div className="details-head">
        <div>
          <div className="chips">
            <span className="muted-chip">{executor.id}</span>
            <span className={cn("executor-status", executorStatusClass(executor.status))}>{executor.status}</span>
            <span className="blue-chip">{rankName(executor.rank)} · ранг {executor.rank}</span>
          </div>
          <h2>{executor.name}</h2>
          <p>{executor.city} · {executor.type}</p>
        </div>
        <div className="score-card">
          <span>Рейтинг Smeta</span>
          <b>{executor.rating}</b>
          <small>допуск к задачам по фактической работе</small>
        </div>
      </div>

      <div className="info-grid executor-info">
        <Info label="Разделы" value={executor.sections.join(", ")} />
        <Info label="Стоимость" value={executor.price} />
        <Info label="Загрузка" value={`${executor.workload}%`} />
        <Info label="Сдача в срок" value={executor.onTime ? `${executor.onTime}%` : "нет истории"} />
        <Info label="Выполнено проектов" value={completed} />
        <Info label="Активных работ" value={activeProjects} />
        <Info label="Приёмка с первого раза" value={executor.firstAccept ? `${executor.firstAccept}%` : "нет истории"} />
        <Info label="Градация" value={rankName(executor.rank)} />
      </div>

      <div className="executor-metrics">
        <div>
          <span>Загрузка</span>
          <div className="bar">
            <i style={{ width: `${executor.workload}%` }} />
          </div>
        </div>
        <div>
          <span>Сроки</span>
          <div className="bar">
            <i style={{ width: `${executor.onTime}%` }} />
          </div>
        </div>
        <div>
          <span>Приёмка с первого раза</span>
          <div className="bar">
            <i style={{ width: `${executor.firstAccept}%` }} />
          </div>
        </div>
      </div>

      <div className="executor-note">
        <h3>Комментарий руководства</h3>
        <p>{executor.note}</p>
      </div>

      <div className="executor-history">
        <h3>История результата</h3>
        <div>
          {(executor.history || [
            `Закрыто работ: ${completed}`,
            `Средняя сдача в срок: ${executor.onTime || 0}%`,
            `Приёмка с первого раза: ${executor.firstAccept || 0}%`,
            `Текущий допуск: ${rankName(executor.rank)}`,
          ]).map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </div>

      <div className="executor-history">
        <h3>Назначенные работы в SmetaOffice</h3>
        <div>
          {assignedTasks.length ? (
            assignedTasks.map((task) => (
              <span key={task.id}>
                {task.projectId} · {task.name} · {task.status} · срок {task.due}
              </span>
            ))
          ) : (
            <span>Сейчас нет активных назначений в системе.</span>
          )}
        </div>
      </div>

      <div className="executor-two-cols">
        <section className="executor-contact-box">
          <h3>Контакты</h3>
          {canSeeContacts ? (
            <div className="contact-list">
              <Info label="Телефон" value={executor.contacts?.phone || "—"} />
              <Info label="Почта" value={executor.contacts?.email || "—"} />
              <Info label="Telegram / WhatsApp" value={executor.contacts?.telegram || "—"} />
            </div>
          ) : (
            <p>
              Контакты скрыты. Менеджеры, РП, партнёры и исполнители работают через внутренний чат и задачи, без прямого доступа к базе.
            </p>
          )}
        </section>

        <section className="executor-chat-box">
          <h3>Внутренний чат</h3>
          <div className="executor-chat">
            {(executor.chat || []).length ? (
              executor.chat.map((item) => (
                <div key={item.id}>
                  <b>{item.author}</b>
                  <span>{item.at}</span>
                  <p>{item.text}</p>
                </div>
              ))
            ) : (
              <p className="chat-empty">Сообщений пока нет.</p>
            )}
          </div>
          <div className="chat-input">
            <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Написать внутри приложения" />
            <button type="button" className="primary" onClick={sendMessage}>Отправить</button>
          </div>
        </section>
      </div>
    </section>
  );
}

function ExecutorsModule({ role, executors, setExecutors, allTasks = [] }) {
  const [section, setSection] = useState("Все");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(executorProfiles[0].id);
  const [form, setForm] = useState({
    name: "",
    type: "физлицо",
    city: "",
    section: "АР",
    rank: 1,
    status: "Новый контакт",
    phone: "",
    email: "",
    telegram: "",
    note: "",
  });
  const canSeeContacts = roleCan(role, "viewExecutorContacts");
  const canManageExecutors = roleCan(role, "manageExecutors");
  const liveExecutorStats = useMemo(() => {
    const verified = executors.filter((executor) => ["Проверенный", "Сильный", "Эксперт"].includes(executor.status)).length;
    const needsCheck = executors.filter((executor) => ["Новый контакт", "На проверке"].includes(executor.status)).length;
    const experts = executors.filter((executor) => Number(executor.rank) >= 4).length;
    const overloaded = executors.filter((executor) => Number(executor.workload) >= 75).length;
    return [
      { label: "В базе", value: String(executors.length), tone: "blue" },
      { label: "Проверенные", value: String(verified), tone: "green" },
      { label: "Нужно проверить", value: String(needsCheck), tone: "orange" },
      { label: "Перегружены", value: String(overloaded), tone: overloaded ? "red" : "green" },
      { label: "Экспертный допуск", value: String(experts), tone: "blue" },
    ];
  }, [executors]);

  const filteredExecutors = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return executors.filter((executor) => {
      const sectionMatch = section === "Все" || executor.sections.includes(section);
      const haystack = `${executor.name} ${executor.city} ${executor.type} ${executor.sections.join(" ")} ${executor.status}`.toLowerCase();
      const queryMatch = !normalizedQuery || haystack.includes(normalizedQuery);
      return sectionMatch && queryMatch;
    });
  }, [executors, query, section]);

  const selectedExecutor = filteredExecutors.find((executor) => executor.id === selectedId) ?? filteredExecutors[0] ?? null;
  const selectedExecutorTasks = selectedExecutor ? allTasks.filter((task) => task.executorId === selectedExecutor.id) : [];

  function addExecutor() {
    if (!canManageExecutors) {
      showAction("Добавлять исполнителей могут владелец, администратор, заместитель, руководитель направления, региональный менеджер или РП");
      return;
    }
    const name = form.name.trim();
    if (!name) return;
    const created = {
      id: `EX-${String(executors.length + 1).padStart(3, "0")}`,
      name,
      type: form.type,
      city: form.city.trim() || "не указан",
      sections: [form.section],
      rank: Number(form.rank),
      status: form.status,
      rating: 50,
      workload: 0,
      accrued: 0,
      paid: 0,
      payable: 0,
      overdue: 0,
      activeTasks: 0,
      onTime: 0,
      firstAccept: 0,
      price: "не указан",
      contacts: {
        phone: form.phone.trim() || "—",
        email: form.email.trim() || "—",
        telegram: form.telegram.trim() || "—",
      },
      note: form.note.trim() || "Новый исполнитель. Нужно проверить портфолио, условия и дать тестовую задачу.",
      chat: [{ id: `m-${Date.now()}`, author: "Система", text: "Исполнитель добавлен в базу SmetaOffice.", at: "сейчас" }],
    };
    setExecutors((items) => [created, ...items]);
    setSelectedId(created.id);
    setForm({
      name: "",
      type: "физлицо",
      city: "",
      section: "АР",
      rank: 1,
      status: "Новый контакт",
      phone: "",
      email: "",
      telegram: "",
      note: "",
    });
  }

  function updateExecutor(executorId, patch) {
    if (!canManageExecutors) return;
    setExecutors((items) => items.map((item) => (item.id === executorId ? { ...item, ...patch } : item)));
  }

  function addChatMessage(executorId, text) {
    setExecutors((items) =>
      items.map((item) =>
        item.id === executorId
          ? {
              ...item,
              chat: [...(item.chat || []), { id: `m-${Date.now()}`, author: "SmetaOffice", text, at: "сейчас" }],
            }
          : item
      )
    );
  }

  return (
    <section className="executors-module">
      <div className="module-head">
        <div>
          <p>Импорт из таблицы исполнителей → нормализация → SmetaTasks</p>
          <h2>База исполнителей</h2>
        </div>
        <button type="button" className="primary" onClick={() => showAction("Импорт Excel: файл исполнителей будет загружаться через backend/Яндекс.Диск")}>Импорт Excel</button>
      </div>

      <div className="stats-grid compact">
        {liveExecutorStats.map((item) => (
          <StatCard key={item.label} item={item} />
        ))}
      </div>

      <div className="executors-layout">
        <section className="office-card">
          <div className="section-row">
            <div>
              <h3>Карта специализаций</h3>
              <p className="section-hint">Это не контакты, а производственная структура: кто закрывает какой раздел.</p>
            </div>
          </div>
          <div className="executor-groups">
            {executorGroups.map((group) => (
              <button type="button" key={group.name} onClick={() => setSection(groupToSection(group.name))}>
                <strong>{group.count}</strong>
                <div>
                  <b>{group.name}</b>
                  <span>{group.sections}</span>
                  <small>{group.source}</small>
                </div>
              </button>
            ))}
          </div>
        </section>

        <aside className="side-card access-warning">
          <h3>Доступ к контактам</h3>
          <p>
            {canSeeContacts
              ? "Вы вошли как владелец: контакты открыты."
              : "Для этой роли телефоны и почты скрыты."}
          </p>
          <div className="auto-list">
            <div>✓ телефоны и почты не показываем в демо</div>
            <div>✓ партнёрам не отдаём чужую базу</div>
            <div>✓ доступ только через права SmetaOffice</div>
          </div>
        </aside>
      </div>

      <section className="office-card executor-process-card">
        <div className="section-row">
          <div>
            <h3>Логика допуска исполнителей</h3>
            <p className="section-hint">Исполнитель не просто контакт. У него есть специализация, ранг, загрузка, история качества, доступ к задачам и внутренняя коммуникация.</p>
          </div>
        </div>
        <div className="executor-process-grid">
          {[
            ["1", "Контакт", "Внесли человека, контакты закрыты от неуправленцев"],
            ["2", "Проверка", "Портфолио, тестовая задача, комментарий руководства"],
            ["3", "Допуск", "Разделы, ранг, лимит активных задач"],
            ["4", "Работа", "Задачи, сроки, файлы, чат внутри приложения"],
            ["5", "Рейтинг", "Сроки, правки, приёмка с первого раза, выплаты"],
          ].map(([number, title, text]) => (
            <button key={title} type="button" onClick={() => showAction(`${title}: ${text}`)}>
              <b>{number}</b>
              <strong>{title}</strong>
              <span>{text}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="workspace-card add-executor-card">
        <div className="workspace-head">
          <div>
            <h2>Добавить исполнителя</h2>
            <p>Вносить людей можно прямо в приложении. Контакты увидит только владелец.</p>
          </div>
          <button type="button" className="primary" onClick={addExecutor} disabled={!form.name.trim()}>Добавить</button>
        </div>
        <div className="executor-form">
          <input value={form.name} onChange={(event) => setForm((next) => ({ ...next, name: event.target.value }))} placeholder="ФИО / название команды" />
          <select value={form.type} onChange={(event) => setForm((next) => ({ ...next, type: event.target.value }))}>
            <option>физлицо</option>
            <option>ИП</option>
            <option>компания</option>
            <option>партнёр</option>
            <option>внутренняя команда</option>
          </select>
          <input value={form.city} onChange={(event) => setForm((next) => ({ ...next, city: event.target.value }))} placeholder="Город / удалённо" />
          <select value={form.section} onChange={(event) => setForm((next) => ({ ...next, section: event.target.value }))}>
            {executorSections.filter((item) => item !== "Все").map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select value={form.rank} onChange={(event) => setForm((next) => ({ ...next, rank: event.target.value }))}>
            <option value="1">Ранг 1 — новый</option>
            <option value="2">Ранг 2 — простые задачи</option>
            <option value="3">Ранг 3 — стандартные задачи</option>
            <option value="4">Ранг 4 — сложные задачи</option>
            <option value="5">Ранг 5 — эксперт</option>
          </select>
          <select value={form.status} onChange={(event) => setForm((next) => ({ ...next, status: event.target.value }))}>
            <option>Новый контакт</option>
            <option>На проверке</option>
            <option>Проверенный</option>
            <option>Сильный</option>
            <option>Эксперт</option>
            <option>Ограничен</option>
          </select>
          <input value={form.phone} onChange={(event) => setForm((next) => ({ ...next, phone: event.target.value }))} placeholder="Телефон (закрыто для неуправленцев)" />
          <input value={form.email} onChange={(event) => setForm((next) => ({ ...next, email: event.target.value }))} placeholder="Почта" />
          <input value={form.telegram} onChange={(event) => setForm((next) => ({ ...next, telegram: event.target.value }))} placeholder="Telegram / WhatsApp" />
          <input className="wide" value={form.note} onChange={(event) => setForm((next) => ({ ...next, note: event.target.value }))} placeholder="Комментарий руководства" />
        </div>
      </section>

      <section className="workspace-card">
        <div className="workspace-head">
          <div>
            <h2>Карточки исполнителей</h2>
            <p>Нажимай на специализацию выше или на карточку исполнителя: внутри рейтинг, ранг, загрузка, история и закрытые контактные данные.</p>
          </div>
          <div className="filters">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск исполнителя" />
            <select value={section} onChange={(event) => setSection(event.target.value)}>
              {executorSections.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="executor-profile-layout">
          <div className="executor-list">
            {filteredExecutors.length ? (
              filteredExecutors.map((executor) => (
                <ExecutorCard
                  key={executor.id}
                  executor={executor}
                  active={selectedExecutor?.id === executor.id}
                  onClick={() => setSelectedId(executor.id)}
                />
              ))
            ) : (
              <div className="empty">По этому фильтру пока нет исполнителей.</div>
            )}
          </div>
          {selectedExecutor ? (
            <ExecutorDetails executor={selectedExecutor} canSeeContacts={canSeeContacts} onMessage={addChatMessage} assignedTasks={selectedExecutorTasks} />
          ) : (
            <div className="empty">Выбери исполнителя.</div>
          )}
        </div>
      </section>
    </section>
  );
}

function ExecutorPersonalAccount({ allTasks }) {
  const personalTasks = allTasks.filter((task) => task.executorId === "EX-001");
  const visibleProjects = personalTasks.length
    ? personalTasks.map((task) => ({
        id: task.projectId,
        title: task.projectTitle,
        task: task.name,
        status: task.status,
        due: task.due,
        reward: "по задаче",
        bonus: "+XP после приёмки",
        progress: task.status === "Принято" ? 100 : task.status === "На проверке" ? 80 : task.status === "В работе" ? 55 : 15,
      }))
    : executorAccount.projects;
  const xpPercent = Math.round((executorAccount.xp / executorAccount.nextLevelXp) * 100);

  return (
    <section className="executor-account">
      <div className="account-hero">
        <div>
          <p>Личный кабинет исполнителя</p>
          <h2>{executorAccount.name}</h2>
          <span>{executorAccount.role} · {executorAccount.city}</span>
          <div className="executor-chips">
            {executorAccount.badges.map((badge) => (
              <span key={badge}>{badge}</span>
            ))}
          </div>
        </div>
        <div className="account-level-card">
          <span>Уровень</span>
          <b>{executorAccount.level}</b>
          <small>Ранг {executorAccount.rank} · рейтинг {executorAccount.rating}</small>
        </div>
      </div>

      <div className="stats-grid compact">
        <StatCard item={{ label: "Баланс к выплате", value: executorAccount.balance, tone: "green" }} />
        <StatCard item={{ label: "Бонусные баллы", value: String(executorAccount.bonusPoints), tone: "blue" }} />
        <StatCard item={{ label: "Текущий XP", value: String(executorAccount.xp), tone: "orange" }} />
        <StatCard item={{ label: "Серия", value: "5", tone: "red" }} />
      </div>

      <section className="office-card xp-card">
        <div className="section-row">
          <div>
            <h3>Прогресс уровня</h3>
            <p className="section-hint">{executorAccount.streak}. До следующего уровня осталось {executorAccount.nextLevelXp - executorAccount.xp} XP.</p>
          </div>
          <b>{xpPercent}%</b>
        </div>
        <div className="bar">
          <span className="bar-fill green" style={{ width: `${xpPercent}%` }} />
        </div>
      </section>

      <div className="account-layout">
        <section className="office-card">
          <div className="section-row">
            <div>
              <h3>Мои проекты и задачи</h3>
              <p className="section-hint">Исполнитель видит только свои задачи, сроки, оплату и статус проверки.</p>
            </div>
          </div>
          <div className="executor-task-list">
            {visibleProjects.map((project) => (
              <div key={project.id}>
                <div>
                  <span className="muted-chip">{project.id}</span>
                  <h3>{project.title}</h3>
                  <p>{project.task}</p>
                </div>
                <div className="project-account-meta">
                  <em className={cn("status", statusClass(project.status))}>{project.status}</em>
                  <span>Срок: {project.due}</span>
                  <b>{project.reward}</b>
                  <small>{project.bonus}</small>
                </div>
                <div className="bar">
                  <span className="bar-fill green" style={{ width: `${project.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="account-side">
          <section className="panel-card">
            <h3>Что мне доступно</h3>
            <div className="panel-list">
              {executorAccount.permissions.map((item) => (
                <button key={item} type="button" onClick={() => showAction(`Раздел личного кабинета: ${item}`)}>
                  <span>{item}</span>
                  <b>✓</b>
                </button>
              ))}
            </div>
          </section>

          <section className="panel-card">
            <h3>Бонусы и цели</h3>
            <div className="reward-list">
              {executorAccount.rewards.map((item) => (
                <div key={item.title}>
                  <b>{item.title}</b>
                  <span>{item.value}</span>
                  <em>{item.status}</em>
                </div>
              ))}
            </div>
          </section>

          <section className="panel-card">
            <h3>Выплаты</h3>
            <div className="reward-list">
              {executorAccount.payouts.map((item) => (
                <div key={item.title}>
                  <b>{item.title}</b>
                  <span>{item.value}</span>
                  <em>{item.status}</em>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <section className="office-card">
        <h3>Лента событий</h3>
        <div className="auto-list account-feed">
          {executorAccount.feed.map((item) => (
            <div key={item}>✓ {item}</div>
          ))}
        </div>
      </section>
    </section>
  );
}

function IntegrationsModule() {
  const [integrationSettings, setIntegrationSettingsState] = useState(() =>
    readStoredValue("smeta.integrationSettings", { webhookUrl: "", syncMode: "manual", lastCheck: "не запускалась" })
  );

  function setIntegrationSettings(patch) {
    setIntegrationSettingsState((current) => {
      const next = { ...current, ...patch };
      writeStoredValue("smeta.integrationSettings", next);
      return next;
    });
  }

  const webhookUrl = integrationSettings.webhookUrl;
  const syncMode = integrationSettings.syncMode;
  const lastCheck = integrationSettings.lastCheck;

  const isConfigured = webhookUrl.trim().length > 12;

  return (
    <section className="integrations-module">
      <div className="module-head integration-hero">
        <div>
          <p>Рабочий MVP на 3 дня</p>
          <h2>Bitrix24 и основная система</h2>
          <span>Цель: сделки и задачи не живут отдельно. Bitrix даёт вход, SmetaOffice управляет производством.</span>
        </div>
        <div className={cn("integration-status", isConfigured ? "ready" : "wait")}>
          <b>{isConfigured ? "Готово к тесту" : "Ждёт вебхук"}</b>
          <small>{isConfigured ? "можно запускать пилотную синхронизацию" : "нужен входящий вебхук Bitrix24"}</small>
        </div>
      </div>

      <section className="stats-grid compact">
        <StatCard item={{ label: "Срок MVP", value: "3 дня", tone: "red" }} />
        <StatCard item={{ label: "Потоки", value: "4", tone: "blue" }} />
        <StatCard item={{ label: "Обязательные поля", value: "12", tone: "orange" }} />
        <StatCard item={{ label: "Роли доступа", value: "6", tone: "green" }} />
      </section>

      <section className="office-card">
        <div className="section-row">
          <div>
            <h3>План на 3 дня</h3>
            <p className="section-hint">Это рабочий объём. Всё остальное не трогаем до пилота.</p>
          </div>
        </div>
        <div className="mvp-days">
          {mvpScope.map((day) => (
            <div key={day.day}>
              <span>{day.day}</span>
              <h3>{day.title}</h3>
              {day.items.map((item) => (
                <p key={item}>✓ {item}</p>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="office-card bitrix-safe-plan">
        <div className="section-row">
          <div>
            <h3>Как связываем, не ломая Bitrix</h3>
            <p className="section-hint">Сначала SmetaOffice создает собственную карточку проекта и хранит ссылку на сделку. Bitrix продолжает жить как CRM продаж, а не превращается в перегруженную производственную систему.</p>
          </div>
        </div>
        <div className="safe-sync-grid">
          <div>
            <b>1. Bitrix</b>
            <span>Лид, сделка, клиент, регион, тип услуги, открытая линия, сумма договора.</span>
          </div>
          <div>
            <b>2. SmetaOffice</b>
            <span>Проект, разделы, исполнители, бюджеты реализации, сроки, риски, внутренний чат.</span>
          </div>
          <div>
            <b>3. SmetaGo</b>
            <span>Клиентский статус, участники клиента, чат, файлы, согласования и понятный прогресс.</span>
          </div>
        </div>
        <div className="integration-warning">
          <b>Что не делаем автоматически:</b>
          <span>не создаем десятки новых полей в Bitrix и не перезаписываем сделки. Сначала фиксируем ID сделки, регион ответственности, регион объекта и направление в SmetaOffice.</span>
        </div>
      </section>

      <section className="integration-grid">
        <div className="workspace-card">
          <div className="workspace-head">
            <div>
              <h2>Подключение Bitrix24</h2>
              <p>Вставляем входящий вебхук, выбираем режим, запускаем тестовую синхронизацию.</p>
            </div>
            <button type="button" className="primary" onClick={() => setIntegrationSettings({ lastCheck: isConfigured ? "тест пройден сейчас" : "нужен вебхук" })}>
              Проверить
            </button>
          </div>
          <div className="integration-form">
            <label>
              Входящий вебхук Bitrix24
              <input value={webhookUrl} onChange={(event) => setIntegrationSettings({ webhookUrl: event.target.value })} placeholder="https://...bitrix24.ru/rest/..." />
            </label>
            <label>
              Режим синхронизации
              <select value={syncMode} onChange={(event) => setIntegrationSettings({ syncMode: event.target.value })}>
                <option value="manual">Ручной запуск для пилота</option>
                <option value="hourly">Каждый час</option>
                <option value="realtime">Реальное время через события</option>
              </select>
            </label>
            <div className="integration-result">
              <b>Последняя проверка</b>
              <span>{lastCheck}</span>
              <small>Режим: {syncMode === "manual" ? "ручной пилот" : syncMode === "hourly" ? "периодическая синхронизация" : "событийная синхронизация"}</small>
            </div>
          </div>
        </div>

        <aside className="side-card">
          <h3>Что нужно от Bitrix</h3>
          <div className="auto-list">
            <div>✓ входящий вебхук с правами CRM и задач</div>
            <div>✓ список стадий сделок по направлениям</div>
            <div>✓ список ответственных пользователей</div>
            <div>✓ ID пользовательских полей для проекта</div>
            <div>✓ правило: кто главный источник статуса</div>
          </div>
        </aside>
      </section>

      <section className="office-card">
        <div className="section-row">
          <div>
            <h3>Карта данных</h3>
            <p className="section-hint">Минимальный контракт, чтобы Bitrix24 и SmetaOffice понимали друг друга.</p>
          </div>
        </div>
        <div className="mapping-table">
          {bitrixMappings.map((row) => (
            <div key={`${row.smeta}-${row.bitrix}`}>
              <b>{row.smeta}</b>
              <span>{row.bitrix}</span>
              <em>{row.direction}</em>
              <strong className={row.status === "обязательно" ? "bad" : row.status === "MVP" ? "good" : ""}>{row.status}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="office-card">
        <h3>Журнал синхронизации</h3>
        <div className="sync-log">
          {integrationEvents.map((event) => (
            <div key={`${event.time}-${event.text}`}>
              <span className={cn("stat-dot mini", event.tone)}>•</span>
              <b>{event.time}</b>
              <em>{event.source}</em>
              <p>{event.text}</p>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function SectionIntro({ section }) {
  const data = appScreens[section] ?? appScreens.dashboard;
  return (
    <section className="section-intro">
      <span>{data.eyebrow}</span>
      <h2>{data.title}</h2>
      <p>{data.desc}</p>
    </section>
  );
}

function SalesLeadsModule({ leads, setSalesLeads, projectItems, users, role, session }) {
  const [directionFilter, setDirectionFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [slaFilter, setSlaFilter] = useState("all");
  const [selectedLeadId, setSelectedLeadId] = useState(leads[0]?.id || "");
  const [transferForm, setTransferForm] = useState({ direction: "design", farmerId: "USR-007", stage: "qualified" });
  const [projectLinkId, setProjectLinkId] = useState(projectItems[0]?.id || "");
  const canChangeSales = ["owner", "admin", "deputy", "head_of_sales", "sales_manager"].includes(role);
  const canSeeMoney = roleCan(role, "viewFinance") || ["owner", "deputy", "head_of_sales", "sales_manager"].includes(role);

  const visibleLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (!leadCanAccess(session, lead, role)) return false;
      const slaStatus = leadSlaStatus(lead);
      if (directionFilter !== "all" && lead.direction !== directionFilter) return false;
      if (regionFilter !== "all" && lead.region !== regionFilter) return false;
      if (sourceFilter !== "all" && lead.source !== sourceFilter) return false;
      if (slaFilter !== "all" && slaStatus !== slaFilter) return false;
      return true;
    });
  }, [leads, session, role, directionFilter, regionFilter, sourceFilter, slaFilter]);

  const selectedLead = visibleLeads.find((lead) => lead.id === selectedLeadId) || visibleLeads[0] || null;
  const stats = salesLeadStats(visibleLeads);
  const farmers = users.filter((user) => ["project_manager", "pm", "sales_manager", "partner", "director", "regional_manager"].includes(user.role));

  function patchLead(leadId, patchFactory) {
    if (!canChangeSales) {
      showAction("Менять продажные стадии могут владелец, РОП, админ, заместитель или назначенный Hunter");
      return;
    }
    setSalesLeads((items) =>
      items.map((lead) => {
        if (lead.id !== leadId) return lead;
        const patch = typeof patchFactory === "function" ? patchFactory(lead) : patchFactory;
        const historyNote = patch.historyNote;
        const { historyNote: _drop, ...cleanPatch } = patch;
        return normalizeSalesLead({
          ...lead,
          ...cleanPatch,
          lastActivityAt: new Date().toISOString(),
          history: [...(lead.history || []), historyNote || "Обновление лида"].filter(Boolean),
        });
      })
    );
  }

  function markFirstResponse(lead) {
    patchLead(lead.id, {
      firstResponseAt: new Date().toISOString(),
      historyNote: "Hunter отметил первый ответ клиенту",
    });
    showAction("Первый ответ зафиксирован. SLA закрыт.");
  }

  function transferLead(lead) {
    const farmer = users.find((user) => user.id === transferForm.farmerId);
    patchLead(lead.id, {
      direction: transferForm.direction,
      funnelType: bitrixFunnels[transferForm.direction] ? transferForm.direction : "universal",
      stage: transferForm.stage,
      farmerId: farmer?.id || "",
      farmerName: farmer?.name || "Farmer не назначен",
      partnerId: farmer?.role === "partner" ? farmer.id : lead.partnerId,
      historyNote: `Передан в направление: ${salesDirections[transferForm.direction] || transferForm.direction}`,
    });
    showAction("Лид передан в направление и закреплён за Farmer");
  }

  function linkProject(lead) {
    if (!projectLinkId) return;
    patchLead(lead.id, {
      projectId: projectLinkId,
      stage: ["new_lead", "qualified", "proposal_sent"].includes(lead.stage) ? "contract_and_advance" : lead.stage,
      historyNote: `Связан с проектом ${projectLinkId}`,
    });
    showAction(`Лид связан с проектом ${projectLinkId}`);
  }

  const bucketLeads = (bucket) =>
    visibleLeads.filter((lead) => {
      const slaStatus = leadSlaStatus(lead);
      if (bucket.sla && slaStatus !== bucket.sla) return false;
      if (bucket.projectLinked && !lead.projectId) return false;
      if (bucket.requiresHunter && !lead.hunterId) return false;
      if (bucket.requiresFarmer && !lead.farmerId) return false;
      if (bucket.stages && !bucket.stages.includes(lead.stage)) return false;
      return true;
    });

  return (
    <>
      <SectionIntro section="sales" />
      <section className="stats-grid">
        <StatCard item={{ label: "Лиды в доступе", value: String(visibleLeads.length), tone: "blue" }} />
        <StatCard item={{ label: "SLA нарушен", value: String(stats.breached), tone: stats.breached ? "red" : "green" }} />
        <StatCard item={{ label: "КП отправлено", value: String(stats.proposal), tone: "orange" }} />
        <StatCard item={{ label: "Связаны с проектом", value: String(stats.linked), tone: "green" }} />
      </section>

      <section className="workspace-card">
        <div className="workspace-head">
          <div>
            <h2>Фильтры Bitrix-воронки</h2>
            <p>Фильтры отражают будущие поля Bitrix24. Реальный API пока не подключён.</p>
          </div>
        </div>
        <div className="filters sales-filters">
          <select value={directionFilter} onChange={(event) => setDirectionFilter(event.target.value)}>
            <option value="all">Все направления</option>
            {Object.entries(salesDirections).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          <select value={regionFilter} onChange={(event) => setRegionFilter(event.target.value)}>
            <option value="all">Все регионы</option>
            {regionOptions.filter((item) => item !== "Все регионы").map((item) => <option key={item}>{item}</option>)}
          </select>
          <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
            <option value="all">Все источники</option>
            {Object.entries(salesSources).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          <select value={slaFilter} onChange={(event) => setSlaFilter(event.target.value)}>
            <option value="all">Любой SLA</option>
            <option value="ok">SLA в норме</option>
            <option value="warning">SLA скоро</option>
            <option value="breached">SLA нарушен</option>
          </select>
        </div>
      </section>

      <section className="sales-grid">
        <div className="office-card">
          <div className="section-row">
            <div>
              <h3>Доска лидов</h3>
              <p className="section-hint">Это не самостоятельная CRM. Стадии и роли бьются с будущими воронками Bitrix24.</p>
            </div>
          </div>
          <div className="sales-board">
            {salesBoardBuckets.map((bucket) => {
              const items = bucketLeads(bucket);
              return (
                <div key={bucket.id} className="sales-column">
                  <strong>{bucket.title}</strong>
                  <span>{items.length}</span>
                  {items.slice(0, 4).map((lead) => {
                    const slaStatus = leadSlaStatus(lead);
                    return (
                      <button key={lead.id} type="button" className={selectedLead?.id === lead.id ? "active" : ""} onClick={() => setSelectedLeadId(lead.id)}>
                        <b>{lead.id}</b>
                        <em className={cn("risk-chip", slaTone(slaStatus))}>{slaText(slaStatus)}</em>
                        <small>{salesDirections[lead.direction]} · {lead.region}</small>
                        <span>{leadStageLabel(lead.stage)}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        <aside className="office-card">
          <h3>Карточка лида</h3>
          {selectedLead ? (
            <div className="lead-details">
              <div className="chips">
                <span className="muted-chip">{selectedLead.id}</span>
                <span className={cn("risk-chip", slaTone(leadSlaStatus(selectedLead)))}>{slaText(leadSlaStatus(selectedLead))}</span>
              </div>
              <h4>{selectedLead.clientName}</h4>
              <p>{selectedLead.requestText}</p>
              <div className="info-grid compact-info">
                <Info label="Источник" value={salesSources[selectedLead.source] || selectedLead.source} />
                <Info label="Воронка" value={leadFunnelLabel(selectedLead)} />
                <Info label="Стадия" value={leadStageLabel(selectedLead.stage)} />
                <Info label="Регион" value={selectedLead.region} />
                <Info label="Hunter" value={selectedLead.hunterName || "не назначен"} />
                <Info label="Farmer" value={selectedLead.farmerName || "не назначен"} />
                <Info label="Первый ответ" value={formatShortDateTime(selectedLead.firstResponseAt)} />
                <Info label="SLA deadline" value={formatShortDateTime(selectedLead.slaDeadlineAt)} />
                {canSeeMoney ? <Info label="Бюджет" value={money(selectedLead.budget)} /> : null}
                <Info label="Проект" value={selectedLead.projectId || "не связан"} />
              </div>
              <div className="lead-actions">
                <button type="button" className="primary" onClick={() => markFirstResponse(selectedLead)} disabled={!canChangeSales || Boolean(selectedLead.firstResponseAt)}>Первый ответ</button>
                <select value={transferForm.direction} onChange={(event) => setTransferForm((next) => ({ ...next, direction: event.target.value }))}>
                  {Object.entries(salesDirections).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
                <select value={transferForm.farmerId} onChange={(event) => setTransferForm((next) => ({ ...next, farmerId: event.target.value }))}>
                  {farmers.map((user) => <option key={user.id} value={user.id}>{user.name} · {roles.find((item) => item.id === user.role)?.name}</option>)}
                </select>
                <button type="button" onClick={() => transferLead(selectedLead)} disabled={!canChangeSales}>Передать в направление</button>
                <select value={projectLinkId} onChange={(event) => setProjectLinkId(event.target.value)}>
                  {projectItems.map((project) => <option key={project.id} value={project.id}>{project.id} · {project.title}</option>)}
                </select>
                <button type="button" onClick={() => linkProject(selectedLead)} disabled={!canChangeSales}>Связать с проектом</button>
              </div>
              <div className="auto-list">
                {(selectedLead.history || []).slice(-5).map((item) => <div key={item}>✓ {item}</div>)}
              </div>
            </div>
          ) : (
            <div className="empty">Для этой роли нет доступных лидов.</div>
          )}
        </aside>
      </section>

      <section className="office-card">
        <h3>Стадии по направлениям</h3>
        <div className="bitrix-stage-map">
          {Object.entries(bitrixFunnels).map(([id, funnel]) => (
            <div key={id}>
              <b>{funnel.label}</b>
              <span>{funnel.stages.map((stage) => leadStageLabel(stage)).join(" → ")}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function LoginScreen({ users, onLogin, onRegister }) {
  const [login, setLogin] = useState("owner");
  const [password, setPassword] = useState("owner");
  const [mode, setMode] = useState("login");
  const [requestForm, setRequestForm] = useState({ name: "", login: "", password: "", region: "ЧР" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function submit(event) {
    event.preventDefault();
    const user = users.find((item) => item.login === login.trim() && item.password === password);
    if (!user) {
      setError("Неверный логин или пароль.");
      return;
    }
    if (user.status !== "active") {
      setError("Аккаунт ожидает назначения роли, региона и должности админом.");
      return;
    }
    setError("");
    onLogin(user);
  }

  function register(event) {
    event.preventDefault();
    const nextLogin = requestForm.login.trim();
    if (!requestForm.name.trim() || !nextLogin || !requestForm.password) {
      setError("Заполни имя, логин и пароль.");
      return;
    }
    if (users.some((item) => item.login === nextLogin)) {
      setError("Такой логин уже есть.");
      return;
    }
    onRegister({
      id: `USR-${Date.now()}`,
      login: nextLogin,
      password: requestForm.password,
      role: "executor",
      name: requestForm.name.trim(),
      status: "pending",
      region: requestForm.region,
      regions: [requestForm.region],
      position: "Не назначена",
    });
    setRequestForm({ name: "", login: "", password: "", region: "ЧР" });
    setError("");
    setNotice("Заявка создана. Теперь админ должен назначить роль, регион и должность.");
    setMode("login");
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="office-logo login-logo">
          <div className="logo-image-wrap">
            <img src="/smeta-emblem.png" alt="SMETA" />
          </div>
          <span>
            <b>SmetaOffice</b>
            <small>вход в операционный центр</small>
          </span>
        </div>

        <form onSubmit={mode === "login" ? submit : register} className="login-form">
          <h1>{mode === "login" ? "Авторизация" : "Заявка на доступ"}</h1>
          <p>{mode === "login" ? "Вход только для активированных пользователей. Роль, регион и должность назначает админ." : "Пользователь сам не выбирает должность. Он оставляет заявку, админ распределяет его по структуре холдинга."}</p>
          {mode === "login" ? (
            <>
              <input value={login} onChange={(event) => setLogin(event.target.value)} placeholder="Логин" />
              <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Пароль" type="password" />
            </>
          ) : (
            <>
              <input value={requestForm.name} onChange={(event) => setRequestForm((next) => ({ ...next, name: event.target.value }))} placeholder="ФИО" />
              <input value={requestForm.login} onChange={(event) => setRequestForm((next) => ({ ...next, login: event.target.value }))} placeholder="Логин" />
              <input value={requestForm.password} onChange={(event) => setRequestForm((next) => ({ ...next, password: event.target.value }))} placeholder="Пароль" type="password" />
              <select value={requestForm.region} onChange={(event) => setRequestForm((next) => ({ ...next, region: event.target.value }))}>
                {regionOptions.filter((region) => region !== "Все регионы").map((region) => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </>
          )}
          {error ? <span className="login-error">{error}</span> : null}
          {notice ? <span className="login-notice">{notice}</span> : null}
          <button type="submit" className="primary">{mode === "login" ? "Войти" : "Отправить заявку"}</button>
          <button type="button" className="secondary" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
            {mode === "login" ? "Подать заявку на доступ" : "Уже есть доступ"}
          </button>
        </form>

        <div className="demo-logins">
          <b>Демо-доступы</b>
          <span>owner / owner</span>
          <span>pm / pm</span>
          <span>executor / executor</span>
          <span>finance / finance</span>
        </div>
      </section>
    </main>
  );
}

function ProjectCreationWizard({ projectForm, setProjectForm, users, onCreateProject, errors, canCreateProject }) {
  const step = Number(projectForm.wizardStep) || 1;
  const selectedDirection = directionConfig(projectForm.direction);
  const projectTypes = projectTypesForDirection(projectForm.direction);
  const stages = projectStageTemplates[projectForm.projectType] || [];
  const directors = roleUserOptions(users, ["owner", "deputy", "director", "regional_manager"]);
  const projectLeads = roleUserOptions(users, ["pm", "project_manager", "director", "regional_manager", "deputy", "owner"]);
  const projectManagers = roleUserOptions(users, ["project_manager", "pm", "director", "regional_manager"]);
  const salesManagers = roleUserOptions(users, ["sales_manager", "head_of_sales", "owner", "director"]);
  const partners = roleUserOptions(users, ["partner"]);
  const contractAmount = Number(projectForm.contractAmount) || 0;
  const productionPercent = Number(projectForm.productionAllocationPercent) || 0;
  const calculatedProductionBudget = Math.round(contractAmount * (productionPercent / 100));
  const salesPercent = Number(projectForm.salesCommissionPercent) || 0;
  const calculatedSalesCommission = Math.round(contractAmount * (salesPercent / 100));

  function update(patch) {
    setProjectForm((next) => ({ ...next, ...patch }));
  }

  function setDirectionValue(direction) {
    const projectType = firstProjectTypeForDirection(direction);
    update({ direction, projectType, stage: firstStageForType(projectType) });
  }

  function setProjectTypeValue(projectType) {
    update({ projectType, stage: firstStageForType(projectType) });
  }

  return (
    <div className="project-wizard">
      <div className="wizard-header">
        <div>
          <h3>Мастер создания проекта</h3>
          <p>Цепочка: регион и адрес → направление → тип продукта → данные проекта → этапы.</p>
        </div>
        <div className="wizard-steps">
          {[1, 2, 3, 4, 5].map((item) => (
            <button key={item} type="button" className={step === item ? "active" : ""} onClick={() => update({ wizardStep: item })}>{item}</button>
          ))}
        </div>
      </div>

      {errors.length ? <div className="form-errors"><b>Не заполнено:</b> {errors.join(", ")}</div> : <div className="form-ok">Минимальные обязательные поля заполнены.</div>}

      {step === 1 ? (
        <div className="quick-form">
          <div className="quick-form-title"><h3>Шаг 1. Регион, город и адрес</h3><p>Для аналитики отдельно фиксируем страну, регион, город и адрес.</p></div>
          <label><span>Страна</span><input value={projectForm.country} onChange={(event) => update({ country: event.target.value })} placeholder="Россия" /></label>
          <label><span>Регион</span><select value={projectForm.region} onChange={(event) => update({ region: event.target.value })}>{regionOptions.filter((region) => region !== "Все регионы").map((region) => <option key={region}>{region}</option>)}</select></label>
          <label><span>Город / населённый пункт</span><input className={!projectForm.city.trim() ? "invalid" : ""} value={projectForm.city} onChange={(event) => update({ city: event.target.value })} placeholder="Например: Грозный" /></label>
          <label><span>Полный адрес</span><input className={!projectForm.address.trim() ? "invalid" : ""} value={projectForm.address} onChange={(event) => update({ address: event.target.value })} placeholder="Улица, дом, объект" /></label>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="quick-form">
          <div className="quick-form-title"><h3>Шаг 2. Направление</h3><p>Направление определяет продукты, этапы, роли и финансовую модель.</p></div>
          <label className="wide"><span>Направление SmetaGroup</span><select value={projectForm.direction} onChange={(event) => setDirectionValue(event.target.value)}>{projectDirectionNames().map((direction) => <option key={direction}>{direction}</option>)}</select></label>
          <div className="wide direction-memo"><h4>{projectForm.direction}</h4><p>{selectedDirection.hint}</p><div><b>Роли:</b> {selectedDirection.roles.join(", ")}</div><div><b>Финансы:</b> {selectedDirection.financeModel}</div></div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="quick-form">
          <div className="quick-form-title"><h3>Шаг 3. Тип проекта / продукт</h3><p>По типу система подставит памятку этапов и создаст редактируемые этапы.</p></div>
          <label className="wide"><span>Тип проекта / продукт</span><select value={projectForm.projectType} onChange={(event) => setProjectTypeValue(event.target.value)}>{projectTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
          <div className="wide stage-memo"><h4>Памятка этапов</h4><div>{stages.map((stage) => {
            const item = typeof stage === "string" ? { name: stage } : stage;
            return <span key={item.name}>{item.name}{item.due ? ` · ${item.due}` : ""}</span>;
          })}</div></div>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="quick-form">
          <div className="quick-form-title">
            <h3>Шаг 4. Карточка проекта</h3>
            <p>Ответственные выбираются из зарегистрированных пользователей. Если человека нет, его нужно добавить через админку.</p>
            <button type="button" className="secondary" onClick={() => showAction("Создание пользователя выполняется в разделе «Админка»; после добавления он появится в списках ответственных")}>Создать / пригласить пользователя</button>
          </div>
          <label><span>Источник</span><select value={projectForm.creationMode} onChange={(event) => update({ creationMode: event.target.value })}>{projectCreationModes.map((mode) => <option key={mode.id} value={mode.id}>{mode.label}</option>)}</select></label>
          <label><span>Название проекта</span><input className={!projectForm.title.trim() ? "invalid" : ""} value={projectForm.title} onChange={(event) => update({ title: event.target.value })} placeholder="Например: ПД школы после обследования" /></label>
          <label><span>Клиент</span><input className={!projectForm.client.trim() ? "invalid" : ""} value={projectForm.client} onChange={(event) => update({ client: event.target.value })} placeholder="ФИО или компания" /></label>
          <label><span>Контрольный срок</span><input className={!projectForm.deadline.trim() ? "invalid" : ""} value={projectForm.deadline} onChange={(event) => update({ deadline: event.target.value })} placeholder="Например: 30 июня" /></label>
          <label><span>Текущий статус</span><select value={projectForm.status} onChange={(event) => update({ status: event.target.value })}>{["Новая", "В работе", "На проверке", "Ожидает клиента", "Ожидает оплаты", "Красная зона", "Завершён"].map((status) => <option key={status}>{status}</option>)}</select></label>
          <label><span>Текущий этап</span><select value={projectForm.stage} onChange={(event) => update({ stage: event.target.value })}>{stages.map((stage) => {
            const item = typeof stage === "string" ? { name: stage } : stage;
            return <option key={item.name} value={item.name}>{item.name}</option>;
          })}</select></label>
          <label><span>Готовность, %</span><input type="number" min="0" max="100" value={projectForm.progress} onChange={(event) => update({ progress: event.target.value })} /></label>
          <label><span>Светофор</span><select value={projectForm.risk} onChange={(event) => update({ risk: event.target.value })}><option value="green">В норме</option><option value="yellow">Есть риск</option><option value="red">Красная зона</option></select></label>
          <label><span>Руководитель направления</span><select className={!projectForm.directorUserId ? "invalid" : ""} value={projectForm.directorUserId} onChange={(event) => update({ directorUserId: event.target.value })}><option value="">Выбрать пользователя</option>{directors.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.position}</option>)}</select></label>
          <label><span>Руководитель проекта</span><select className={!projectForm.pmUserId ? "invalid" : ""} value={projectForm.pmUserId} onChange={(event) => update({ pmUserId: event.target.value })}><option value="">Выбрать пользователя</option>{projectLeads.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.position}</option>)}</select></label>
          <label><span>Менеджер проекта</span><select value={projectForm.projectManagerId} onChange={(event) => update({ projectManagerId: event.target.value })}><option value="">Отсутствует / позже</option>{projectManagers.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.position}</option>)}</select></label>
          <label><span>Менеджер продаж</span><select value={projectForm.salesManagerId} onChange={(event) => update({ salesManagerId: event.target.value })}><option value="">Нет / не из продаж</option>{salesManagers.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.position}</option>)}</select></label>
          <label><span>Партнёр</span><select value={projectForm.partnerUserId} onChange={(event) => update({ partnerUserId: event.target.value })}><option value="">Нет партнёра</option>{partners.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.position}</option>)}</select></label>
          <label><span>ID сделки Bitrix24</span><input value={projectForm.bitrixDealId} onChange={(event) => update({ bitrixDealId: event.target.value })} placeholder="если проект из сделки" /></label>
          <label className="wide"><span>Комментарий</span><input value={projectForm.sourceComment} onChange={(event) => update({ sourceComment: event.target.value })} placeholder="Скидка, особые условия, кто продал, почему внесён вручную" /></label>
        </div>
      ) : null}

      {step === 5 ? (
        <div className="quick-form">
          <div className="quick-form-title"><h3>Шаг 5. Финансы, файлы и создание этапов</h3><p>Плановые значения можно уточнить позже. Фактические расходы появятся после заполнения этапов и выплат.</p></div>
          <label><span>Сумма договора</span><input className={!projectForm.contractAmount ? "invalid" : ""} type="number" value={projectForm.contractAmount} onChange={(event) => update({ contractAmount: event.target.value })} placeholder="0" /></label>
          <label><span>Оплачено клиентом</span><input type="number" value={projectForm.paidByClient} onChange={(event) => update({ paidByClient: event.target.value })} placeholder="0" /></label>
          <label><span>% бюджета реализации для РП</span><input type="number" value={projectForm.productionAllocationPercent} onChange={(event) => update({ productionAllocationPercent: event.target.value })} placeholder="35" /></label>
          <label><span>Бюджет реализации вручную, ₽</span><input type="number" value={projectForm.productionBudget} onChange={(event) => update({ productionBudget: event.target.value })} placeholder="сумма в рублях, не %" /></label>
          <label><span>% единого центра продаж</span><input type="number" value={projectForm.salesCommissionPercent} onChange={(event) => update({ salesCommissionPercent: event.target.value })} placeholder="10" /></label>
          <label><span>Комиссия продаж вручную, ₽</span><input type="number" value={projectForm.salesCommissionAmount} onChange={(event) => update({ salesCommissionAmount: event.target.value })} placeholder="если отличается от %" /></label>
          <label className="wide"><span>Главная папка Яндекс.Диска</span><input className={!projectForm.yandexFolder.trim() ? "invalid" : ""} value={projectForm.yandexFolder} onChange={(event) => update({ yandexFolder: event.target.value })} placeholder="https://disk.yandex.ru/..." /></label>
          <div className="wide form-hint">
            Расчёт: {productionPercent}% бюджета реализации = {money(calculatedProductionBudget)}. Поле “Бюджет реализации вручную, ₽” принимает именно рубли. Комиссия продаж: {salesPercent}% = {money(calculatedSalesCommission)}.
          </div>
          <div className="wide create-project-summary"><span>Будет создан проект, шаблон этапов по продукту, базовая экономика и системное сообщение в чате проекта.</span><button type="button" className="primary" onClick={onCreateProject} disabled={!canCreateProject}>Сохранить и открыть проект</button></div>
        </div>
      ) : null}

      <div className="wizard-actions">
        <button type="button" className="secondary" onClick={() => update({ wizardStep: Math.max(1, step - 1) })} disabled={step === 1}>Назад</button>
        {step < 5 ? <button type="button" className="primary" onClick={() => update({ wizardStep: Math.min(5, step + 1) })}>Дальше</button> : null}
      </div>
    </div>
  );
}

function ProjectsModule({
  visibleProjects,
  setSelectedId,
  role,
  query,
  setQuery,
  direction,
  setDirection,
  chooseFirstAvailable,
  projectForm,
  setProjectForm,
  onCreateProject,
  taskForm,
  setTaskForm,
  onCreateTask,
  onTaskStatusChange,
  executors,
  users,
  projectFormErrors,
}) {
  const [selectedArea, setSelectedArea] = useState(null);
  const [selectedCentralCompany, setSelectedCentralCompany] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedRegionalDirection, setSelectedRegionalDirection] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    setDirection("Все");
  }, [setDirection]);

  const searchProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return visibleProjects;
    return visibleProjects.filter((project) => {
      const text = `${project.title} ${project.client} ${project.city} ${project.region} ${project.direction} ${project.projectType}`.toLowerCase();
      return text.includes(normalizedQuery);
    });
  }, [visibleProjects, query]);

  const groupRisk = (projectItems, fallback = "green") => {
    if (projectItems.some((project) => project.risk === "red")) return "red";
    if (projectItems.some((project) => project.risk === "yellow")) return "yellow";
    return fallback;
  };

  const regions = useMemo(() => {
    const map = new Map();
    searchProjects.forEach((project) => {
      const key = project.region || project.city || "Без региона";
      const economy = projectEconomy(project);
      const item = map.get(key) || { name: key, projects: 0, contractAmount: 0, paidByClient: 0, realizationCost: 0, risk: "green", directions: new Set() };
      item.projects += 1;
      item.contractAmount += economy.contractAmount;
      item.paidByClient += economy.paidByClient;
      item.realizationCost += economy.realizationCost;
      item.directions.add(project.direction);
      if (project.risk === "red") item.risk = "red";
      else if (project.risk === "yellow" && item.risk !== "red") item.risk = "yellow";
      map.set(key, item);
    });
    return Array.from(map.values());
  }, [searchProjects]);

  const totals = useMemo(() => financeSummary(searchProjects), [searchProjects]);
  const instituteProjects = useMemo(() => {
    return searchProjects.filter((project) => {
      const text = `${project.direction || ""} ${project.projectType || ""} ${(project.sections || []).map((item) => item.name).join(" ")}`.toLowerCase();
      return text.includes("проектный институт") || text.includes("87") || text.includes("проектная документация") || text.includes("пос") || text.includes("оди") || text.includes("эксперти");
    });
  }, [searchProjects]);

  const instituteSummary = useMemo(() => financeSummary(instituteProjects), [instituteProjects]);
  const selectedRegionProjects = useMemo(() => {
    return searchProjects.filter((project) => (project.region || project.city || "Без региона") === selectedRegion);
  }, [searchProjects, selectedRegion]);

  const selectedRegionSummary = useMemo(() => financeSummary(selectedRegionProjects), [selectedRegionProjects]);

  const selectedDirectionConfig = regionalDirections.find((item) => item.id === selectedRegionalDirection) || null;
  const canCreateProject = canCreateProjectRole(role);

  const regionalDirectionCards = useMemo(() => {
    return regionalDirections.map((item) => {
      const projects = selectedRegionProjects.filter((project) => item.match(project));
      const economy = financeSummary(projects);
      return {
        ...item,
        projects,
        economy,
        risk: groupRisk(projects, item.risk),
      };
    });
  }, [selectedRegionProjects]);

  const scopedProjects = visibleProjects.filter((project) => {
    const projectRegion = project.region || project.city || "Без региона";
    if (selectedArea === "institute") return instituteProjects.some((item) => item.id === project.id);
    if (!selectedDirectionConfig) return false;
    return projectRegion === selectedRegion && selectedDirectionConfig.match(project);
  });

  const centralSummaryCards = [
    { label: "Компаний", value: centralCompanies.length },
    { label: "Проектов под контролем", value: searchProjects.length },
    { label: "Договоры", value: money(totals.contractAmount) },
  ];

  const levelTitle = !selectedArea
    ? "Структура SmetaGroup"
    : selectedArea === "central" && selectedCentralCompany
    ? selectedCentralCompany.title
    : selectedArea === "central"
    ? "Центральный контур"
    : selectedArea === "institute"
    ? "Проектный институт"
    : selectedArea === "regions" && !selectedRegion
    ? "Регионы"
    : selectedArea === "regions" && selectedRegion && !selectedRegionalDirection
    ? `Регион · ${selectedRegion}`
    : `${selectedDirectionConfig?.title || "Направление"} · ${selectedRegion}`;

  const levelHint = !selectedArea
    ? "Сначала выбираем уровень: центральные компании, проектный институт или региональную сеть."
    : selectedArea === "central"
    ? "Центральные компании не привязаны к региону и работают на всю группу."
    : selectedArea === "institute"
    ? "Проектный институт работает поперёк регионов: обследование, ТЗК, разделы, сметы и экспертиза."
    : !selectedRegion
    ? "Выбери регион: внутри будут локальные направления и управляющие."
    : !selectedRegionalDirection
    ? "Выбери направление региона."
    : "Выбери проект, чтобы открыть внутреннюю систему проекта.";

  function resetToRoot() {
    setSelectedArea(null);
    setSelectedCentralCompany(null);
    setSelectedRegion(null);
    setSelectedRegionalDirection(null);
    setCreateOpen(false);
  }

  function resetArea(area) {
    setSelectedArea(area);
    setSelectedCentralCompany(null);
    setSelectedRegion(null);
    setSelectedRegionalDirection(null);
    setCreateOpen(false);
  }

  function openRegion(region) {
    setSelectedRegion(region);
    setSelectedRegionalDirection(null);
    setCreateOpen(false);
  }

  function openRegionalDirection(nextDirectionId) {
    const item = regionalDirections.find((entry) => entry.id === nextDirectionId);
    setSelectedRegionalDirection(nextDirectionId);
    setProjectForm((next) => ({
      ...next,
      region: selectedRegion,
      direction: item?.projectDirection || next.direction,
      projectType: item?.id === "surveys" ? "Обследование / ТЗК / дефектный акт" : next.projectType,
    }));
    setCreateOpen(false);
  }

  return (
    <>
      <SectionIntro section="projects" />
      <section className="workspace-card">
        <div className="workspace-head">
          <div>
            <h2>{levelTitle}</h2>
            <p>{levelHint}</p>
          </div>
          <div className="filters">
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                chooseFirstAvailable(role, direction, event.target.value);
              }}
              placeholder="Поиск по структуре и проектам"
            />
            {selectedArea ? <button type="button" className="secondary" onClick={resetToRoot}>К SmetaGroup</button> : null}
            {selectedArea === "central" && selectedCentralCompany ? <button type="button" className="secondary" onClick={() => setSelectedCentralCompany(null)}>К компаниям</button> : null}
            {selectedArea === "regions" && selectedRegion ? <button type="button" className="secondary" onClick={() => { setSelectedRegion(null); setSelectedRegionalDirection(null); setCreateOpen(false); }}>К регионам</button> : null}
            {selectedArea === "regions" && selectedRegion && selectedRegionalDirection ? <button type="button" className="secondary" onClick={() => { setSelectedRegionalDirection(null); setCreateOpen(false); }}>К направлениям</button> : null}
            {canCreateProject ? <button type="button" className="primary" onClick={() => setCreateOpen((value) => !value)}>{createOpen ? "Закрыть форму" : "Создать проект"}</button> : null}
          </div>
        </div>

        {createOpen ? (
          <ProjectCreationWizard
            projectForm={projectForm}
            setProjectForm={setProjectForm}
            users={users}
            onCreateProject={onCreateProject}
            errors={projectFormErrors}
            canCreateProject={canCreateProject}
          />
        ) : null}

        {!selectedArea ? (
          <div className="drill-card-grid">
            {holdingAreas.map((area) => {
              const areaMetrics = area.id === "central"
                ? centralSummaryCards.map((item) => [item.label, item.value])
                : area.id === "institute"
                ? [
                    ["Проектов", instituteProjects.length],
                    ["Договоры", money(instituteSummary.contractAmount)],
                    ["Красная зона", instituteSummary.redProjects],
                  ]
                : [
                    ["Регионов", regions.length],
                    ["Проектов", searchProjects.length],
                    ["Договоры", money(totals.contractAmount)],
                  ];
              return (
                <DrillCard
                  key={area.id}
                  title={area.title}
                  subtitle={area.subtitle}
                  risk={area.id === "institute" ? groupRisk(instituteProjects, area.risk) : area.risk}
                  manager={area.manager}
                  metrics={areaMetrics}
                  onClick={() => resetArea(area.id)}
                />
              );
            })}
          </div>
        ) : null}

        {selectedArea === "central" && !selectedCentralCompany ? (
          <div className="drill-card-grid">
            {centralCompanies.map((company) => (
              <DrillCard
                key={company.id}
                title={company.title}
                subtitle={company.purpose}
                risk={company.risk}
                manager={company.manager}
                metrics={[
                  ["Процессов", company.processes.length],
                  ["Охват", "Вся группа"],
                  ["Регион", "Не привязан"],
                ]}
                onClick={() => setSelectedCentralCompany(company)}
              />
            ))}
          </div>
        ) : null}

        {selectedArea === "central" && selectedCentralCompany ? (
          <div className="org-detail-grid">
            <div className="office-card inner-card">
              <span className={cn("risk-chip", selectedCentralCompany.risk)}>{riskText(selectedCentralCompany.risk)}</span>
              <h3>{selectedCentralCompany.title}</h3>
              <p className="section-hint">{selectedCentralCompany.purpose}</p>
              <div className="mini-kpi-grid">
                <div><span>Ответственный</span><b>{selectedCentralCompany.manager}</b></div>
                <div><span>Охват</span><b>Вся SmetaGroup</b></div>
                <div><span>Тип</span><b>Центральная компания</b></div>
              </div>
            </div>
            <div className="office-card inner-card">
              <h3>Процессы</h3>
              <div className="process-list">
                {selectedCentralCompany.processes.map((process) => (
                  <button key={process} type="button" onClick={() => showAction(`Открыт процесс: ${process}`)}>{process}</button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {selectedArea === "institute" ? (
          <div className="projects-list project-cards-grid">
            <div className="office-card inner-card project-span-card">
              <h3>Сводка проектного института</h3>
              <p className="section-hint">Это отдельный контур: проекты идут по регионам, но производственный блок работает сквозным образом.</p>
              <div className="mini-kpi-grid">
                <div><span>Проектов</span><b>{instituteProjects.length}</b></div>
                <div><span>Договоры</span><b>{money(instituteSummary.contractAmount)}</b></div>
                <div><span>Реализация</span><b>{money(instituteSummary.realizationCost)}</b></div>
                <div><span>Остаток бюджета РП</span><b>{money(instituteSummary.pmBudgetLeft)}</b></div>
              </div>
            </div>
            {instituteProjects.length > 0 ? (
              instituteProjects.map((project) => (
                <ProjectCard key={project.id} project={project} active={false} onClick={() => setSelectedId(project.id)} />
              ))
            ) : (
              <div className="empty">Проекты проектного института пока не найдены.</div>
            )}
          </div>
        ) : null}

        {selectedArea === "regions" && !selectedRegion ? (
          <div className="drill-card-grid">
            {regions.map((region) => (
              <DrillCard
                key={region.name}
                title={region.name}
                subtitle={`Проектов: ${region.projects} · Направлений: ${region.directions.size}`}
                risk={region.risk}
                metrics={[
                  ["Договоры", money(region.contractAmount)],
                  ["Оплачено", money(region.paidByClient)],
                  ["Реализация", money(region.realizationCost)],
                ]}
                onClick={() => openRegion(region.name)}
              />
            ))}
          </div>
        ) : null}

        {selectedArea === "regions" && selectedRegion && !selectedRegionalDirection ? (
          <>
            <div className="office-card inner-card">
              <h3>{selectedRegion}</h3>
              <p className="section-hint">В регионе работают локальные направления. Проектный институт может подключаться к региональным проектам, но не является направлением региона.</p>
              <div className="mini-kpi-grid">
                <div><span>Проектов</span><b>{selectedRegionProjects.length}</b></div>
                <div><span>Договоры</span><b>{money(selectedRegionSummary.contractAmount)}</b></div>
                <div><span>Оплачено</span><b>{money(selectedRegionSummary.paidByClient)}</b></div>
                <div><span>Красная зона</span><b>{selectedRegionSummary.redProjects}</b></div>
              </div>
            </div>
            <div className="drill-card-grid">
              {regionalDirectionCards.map((item) => (
                <DrillCard
                  key={item.id}
                  title={item.title}
                  subtitle={`${item.hint} · Проектов: ${item.projects.length}`}
                  risk={item.risk}
                  manager={item.manager}
                  metrics={[
                    ["Договоры", money(item.economy.contractAmount)],
                    ["Оплачено", money(item.economy.paidByClient)],
                    ["Реализация", money(item.economy.realizationCost)],
                  ]}
                  onClick={() => openRegionalDirection(item.id)}
                />
              ))}
            </div>
          </>
        ) : null}

        {selectedArea === "regions" && selectedRegion && selectedRegionalDirection ? (
          <>
            <div className="office-card inner-card">
              <h3>{selectedDirectionConfig?.title}</h3>
              <p className="section-hint">{selectedDirectionConfig?.hint}</p>
              <div className="mini-kpi-grid">
                <div><span>Регион</span><b>{selectedRegion}</b></div>
                <div><span>Управляющий</span><b>{selectedDirectionConfig?.manager}</b></div>
                <div><span>Проектов</span><b>{scopedProjects.length}</b></div>
              </div>
            </div>
            <div className="projects-list project-cards-grid">
              {scopedProjects.length > 0 ? (
                scopedProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} active={false} onClick={() => setSelectedId(project.id)} />
                ))
              ) : (
                <div className="empty">В этом направлении пока нет проектов. Можно создать первый проект.</div>
              )}
            </div>
          </>
        ) : null}

      </section>
    </>
  );
}

function ProjectDetailModule({ project, role, session, onBack, onDeleteProject, onUpdateProject, onTaskStatusChange, onProjectMessage, onAddClientParticipant, taskForm, setTaskForm, onCreateTask, executors, users, onUpdateSection, onAddSection, onDeleteSection, onDistributeSectionBudget }) {
  if (!project) {
    return (
      <>
        <SectionIntro section="projectDetail" />
        <section className="office-card">
          <div className="empty">Проект не найден или недоступен по региону/роли.</div>
          <button type="button" className="primary" onClick={onBack}>Вернуться к проектам</button>
        </section>
      </>
    );
  }

  return (
    <>
      <SectionIntro section="projectDetail" />
      <section className="office-card project-open-head">
        <div>
          <span className="muted-chip">{project.id}</span>
          <h3>{project.title}</h3>
          <p className="section-hint">{project.projectType || project.direction} · {project.region || project.city} · РП: {project.manager}</p>
        </div>
        <div className="project-open-actions">
          {["owner", "admin"].includes(role) ? <button type="button" className="secondary danger" onClick={() => onDeleteProject(project.id)}>Удалить проект</button> : null}
          <button type="button" className="secondary" onClick={onBack}>Назад к реестру</button>
        </div>
      </section>

      <ProjectDetails
        project={project}
        role={role}
        session={session}
        users={users}
        onUpdateProject={onUpdateProject}
        onTaskStatusChange={onTaskStatusChange}
        onProjectMessage={onProjectMessage}
        onAddClientParticipant={onAddClientParticipant}
        onUpdateSection={onUpdateSection}
        onAddSection={onAddSection}
        onDeleteSection={onDeleteSection}
        onDistributeSectionBudget={onDistributeSectionBudget}
        executors={executors}
      />

      <section className="office-card">
        <div className="section-row">
          <div>
            <h3>Добавить задачу в этот проект</h3>
            <p className="section-hint">Так мы фиксируем отдельные работы: раздел 87 постановления, дизайн-этап, обследование, смету, исполнительский кусок или внутреннюю задачу РП.</p>
          </div>
          <button type="button" className="primary" onClick={() => onCreateTask(project.id)} disabled={!taskForm.name.trim()}>Добавить задачу</button>
        </div>
        <div className="quick-form task-create-form">
          <input value={taskForm.name} onChange={(event) => setTaskForm((next) => ({ ...next, name: event.target.value }))} placeholder="Название задачи / раздела" />
          <select value={taskForm.sectionName} onChange={(event) => setTaskForm((next) => ({ ...next, sectionName: event.target.value }))}>
            <option value="">Выбрать этап проекта</option>
            {projectSections(project).map((section) => <option key={section.id || section.name} value={section.name}>{section.name}</option>)}
          </select>
          <select
            value={taskForm.executorId}
            onChange={(event) => {
              const executor = executors.find((item) => item.id === event.target.value);
              setTaskForm((next) => ({ ...next, executorId: event.target.value, owner: executor ? executor.name : "" }));
            }}
          >
            <option value="">Выбрать исполнителя из базы</option>
            {executors.map((executor) => (
              <option key={executor.id} value={executor.id}>
                {executor.name} · {executor.sections.join(", ")} · ранг {executor.rank}
              </option>
            ))}
          </select>
          <input value={taskForm.due} onChange={(event) => setTaskForm((next) => ({ ...next, due: event.target.value }))} placeholder="Срок" />
          <select value={taskForm.status} onChange={(event) => setTaskForm((next) => ({ ...next, status: event.target.value }))}>
            <option>Новая</option>
            <option>В работе</option>
            <option>На проверке</option>
            <option>Правки</option>
            <option>Принято</option>
          </select>
          <input className="wide" value={taskForm.description} onChange={(event) => setTaskForm((next) => ({ ...next, description: event.target.value }))} placeholder="Описание задачи / что должно быть результатом" />
          <input className="wide" value={taskForm.yandexLink} onChange={(event) => setTaskForm((next) => ({ ...next, yandexLink: event.target.value }))} placeholder="Ссылка на Яндекс.Диск по задаче" />
        </div>
      </section>
    </>
  );
}

function TasksModule({ allTasks, onTaskStatusChange, executors }) {
  const [statusFilter, setStatusFilter] = useState("Все");
  const [sectionFilter, setSectionFilter] = useState("Все");
  const [query, setQuery] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState(allTasks[0]?.id || "");

  const filteredTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return allTasks.filter((task) => {
      const statusMatch = statusFilter === "Все" || task.status === statusFilter;
      const sectionMatch = sectionFilter === "Все" || `${task.section} ${task.direction}`.includes(sectionFilter);
      const haystack = `${task.name} ${task.projectTitle} ${task.owner} ${task.projectRegion} ${task.direction} ${task.section}`.toLowerCase();
      const queryMatch = !normalizedQuery || haystack.includes(normalizedQuery);
      return statusMatch && sectionMatch && queryMatch;
    });
  }, [allTasks, statusFilter, sectionFilter, query]);

  const selectedTask = filteredTasks.find((task) => task.id === selectedTaskId) || filteredTasks[0] || null;
  const openTasks = allTasks.filter((task) => ["Новая", "В работе", "Правки"].includes(task.status));
  const reviewTasks = allTasks.filter((task) => task.status === "На проверке");
  const overdueTasks = allTasks.filter((task) => task.status === "Просрочено");
  const acceptedTasks = allTasks.filter((task) => task.status === "Принято");
  const taskMoney = allTasks.reduce((sum, task) => sum + (Number(task.executorCost) || 0), 0);
  const boardStatuses = ["Новая", "В работе", "На проверке", "Правки", "Просрочено"];

  function executorLabel(task) {
    const executor = executors.find((item) => item.id === task.executorId);
    if (executor) return `${executor.name} · ранг ${executor.rank}`;
    return task.owner || "Не назначен";
  }

  return (
    <>
      <SectionIntro section="tasks" />
      <section className="stats-grid">
        <StatCard item={{ label: "Открытые работы", value: String(openTasks.length), tone: "blue" }} />
        <StatCard item={{ label: "На проверке", value: String(reviewTasks.length), tone: "orange" }} />
        <StatCard item={{ label: "Просрочено", value: String(overdueTasks.length), tone: overdueTasks.length ? "red" : "green" }} />
        <StatCard item={{ label: "Бюджет исполнителей", value: money(taskMoney), tone: "green" }} />
      </section>

      <section className="office-card">
        <div className="section-row">
          <div>
            <h3>Операционная доска производства</h3>
            <p className="section-hint">Здесь вместе лежат задачи и разделы проектов: кто делает, что делает, срок, статус, деньги и связь с Яндекс.Диском.</p>
          </div>
          <button type="button" className="primary" onClick={() => showAction("Создание задачи выполняется из карточки конкретного проекта")}>Создать задачу</button>
        </div>

        <div className="task-command-bar">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по задаче, проекту, исполнителю" />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            {["Все", "Новая", "В работе", "На проверке", "Правки", "Принято", "Просрочено"].map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
          <select value={sectionFilter} onChange={(event) => setSectionFilter(event.target.value)}>
            {executorSections.map((section) => (
              <option key={section}>{section}</option>
            ))}
          </select>
        </div>

        <div className="task-kanban">
          {boardStatuses.map((status) => {
            const columnTasks = filteredTasks.filter((task) => task.status === status).slice(0, 5);
            return (
              <div key={status}>
                <div className="task-column-head">
                  <b>{status}</b>
                  <span>{filteredTasks.filter((task) => task.status === status).length}</span>
                </div>
                {columnTasks.length ? (
                  columnTasks.map((task) => (
                    <button key={task.id} type="button" className={cn("task-mini-card", selectedTask?.id === task.id && "active")} onClick={() => setSelectedTaskId(task.id)}>
                      <span className="muted-chip">{task.kind}</span>
                      <b>{task.name}</b>
                      <small>{task.projectId} · {task.projectRegion}</small>
                      <em>{executorLabel(task)}</em>
                    </button>
                  ))
                ) : (
                  <p className="task-column-empty">Пусто</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="task-detail-grid">
        <div className="office-card">
          <div className="section-row">
            <div>
              <h3>Реестр задач и разделов</h3>
              <p className="section-hint">Табличный вид нужен РП и владельцу: быстро менять статус и видеть, где зависло производство.</p>
            </div>
            <span className="muted-chip">Показано: {filteredTasks.length}</span>
          </div>
          <div className="task-board task-registry">
            {filteredTasks.map((task) => (
              <div key={task.id} className={selectedTask?.id === task.id ? "active" : ""} onClick={() => setSelectedTaskId(task.id)} role="button" tabIndex={0}>
                <div>
                  <span className="muted-chip">{task.projectId} · {task.kind}</span>
                  <h3>{task.name}</h3>
                  <p>{task.projectTitle}</p>
                </div>
                <select className="status-select" value={task.status} onClick={(event) => event.stopPropagation()} onChange={(event) => onTaskStatusChange(task.projectId, task.name, event.target.value)}>
                  <option>Новая</option>
                  <option>В работе</option>
                  <option>На проверке</option>
                  <option>Правки</option>
                  <option>Принято</option>
                  <option>Просрочено</option>
                </select>
                <span>{executorLabel(task)}</span>
                <b>{task.due}</b>
              </div>
            ))}
            {!filteredTasks.length ? <div className="empty">По этим фильтрам задач нет.</div> : null}
          </div>
        </div>

        <aside className="office-card task-inspector">
          {selectedTask ? (
            <>
              <span className="muted-chip">{selectedTask.kind}</span>
              <h3>{selectedTask.name}</h3>
              <p className="section-hint">{selectedTask.projectTitle}</p>
              <div className="finance-kpi-list">
                <Info label="Проект" value={selectedTask.projectId} />
                <Info label="Этап" value={selectedTask.section || "Без этапа"} />
                <Info label="Регион" value={selectedTask.projectRegion} />
                <Info label="РП" value={selectedTask.projectManager} />
                <Info label="Исполнитель" value={executorLabel(selectedTask)} />
                <Info label="Срок" value={selectedTask.due} />
                <Info label="Статус" value={selectedTask.status} />
                <Info label="Бюджет клиента" value={money(selectedTask.clientBudget)} />
                <Info label="Оплата исполнителю" value={money(selectedTask.executorCost)} />
              </div>
              <div className="task-card-block">
                <b>Описание</b>
                <p>{selectedTask.description || "Описание задачи пока не заполнено."}</p>
              </div>
              <div className="task-card-block">
                <b>Файлы и ссылки</b>
                {(selectedTask.documents || []).length || selectedTask.yandexLink ? (
                  <div className="file-link-list">
                    {[...(selectedTask.documents || []), selectedTask.yandexLink].filter(Boolean).map((item, index) => (
                      <a key={`${item}-${index}`} href={item} target="_blank" rel="noreferrer">{item}</a>
                    ))}
                  </div>
                ) : (
                  <p>Файлы не привязаны.</p>
                )}
              </div>
              <div className="task-card-block">
                <b>Чат / комментарии задачи</b>
                {(selectedTask.chat || []).length ? (
                  selectedTask.chat.map((message) => <p key={message.id}>{message.author}: {message.text}</p>)
                ) : (
                  <p>MVP: чат задачи будет хранить сообщения исполнителя, РП и системные события. Сейчас комментарии добавляются через карточку проекта.</p>
                )}
              </div>
              <div className="task-inspector-actions">
                <button type="button" className="secondary" onClick={() => selectedTask.yandexLink ? window.open(selectedTask.yandexLink, "_blank", "noopener,noreferrer") : showAction("К задаче пока не привязана папка Яндекс.Диска")}>Открыть Яндекс.Диск</button>
                <button type="button" className="primary" onClick={() => showAction("MVP: отдельный чат задачи в разработке, сообщения пока фиксируем в проектном чате")}>Чат по задаче</button>
              </div>
            </>
          ) : (
            <div className="empty">Выбери задачу.</div>
          )}
        </aside>
      </section>
    </>
  );
}

function PartnersModule() {
  return (
    <>
      <SectionIntro section="partners" />
      <PartnerTable />
      <section className="summary-grid">
        <div>
          <h3>Что видит партнёр</h3>
          <p>Только назначенные проекты, задачи, сроки, файлы и замечания. База клиентов и маржа скрыты.</p>
        </div>
        <div>
          <h3>Зачем этот раздел</h3>
          <p>Контролировать внешние команды, просрочки, качество и историю заказов.</p>
        </div>
        <div>
          <h3>Следующий шаг</h3>
          <p>Добавить договоры, допуски, рейтинг и лимиты задач по партнёру.</p>
        </div>
      </section>
    </>
  );
}

function AdminModule({ users, setUsers, session }) {
  if (!userCan(session, "manageUsers")) {
    return (
      <>
        <SectionIntro section="admin" />
        <section className="office-card">
          <div className="empty">Админка доступна только владельцу.</div>
        </section>
      </>
    );
  }

  function updateUser(userId, patch) {
    setUsers((items) =>
      items.map((user) => {
        if (user.id !== userId) return user;
        const next = typeof patch === "function" ? patch(user) : { ...user, ...patch };
        return {
          ...next,
          regions: next.region === "Все регионы" ? ["Все регионы"] : [next.region],
        };
      })
    );
  }

  return (
    <>
      <SectionIntro section="admin" />
      <section className="office-card">
        <div className="section-row">
          <div>
            <h3>Пользователи и доступы</h3>
            <p className="section-hint">Здесь назначается реальная роль в холдинге: регион, должность и уровень доступа. Заявки без назначения не входят в систему.</p>
          </div>
          <span className="muted-chip">Активных: {users.filter((user) => user.status === "active").length}</span>
        </div>

        <div className="admin-users-table">
          {users.map((user) => (
            <div key={user.id}>
              <div>
                <b>{user.name}</b>
                <span>{user.login} · {user.id}</span>
              </div>
              <select value={user.status || "pending"} onChange={(event) => updateUser(user.id, { status: event.target.value })}>
                <option value="pending">Ожидает назначения</option>
                <option value="active">Активен</option>
                <option value="blocked">Заблокирован</option>
              </select>
              <select value={user.role} onChange={(event) => updateUser(user.id, { role: event.target.value })}>
                {roles.map((roleItem) => (
                  <option key={roleItem.id} value={roleItem.id}>{roleItem.name}</option>
                ))}
              </select>
              <select value={user.region || "ЧР"} onChange={(event) => updateUser(user.id, { region: event.target.value })}>
                {regionOptions.map((region) => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
              <select value={user.position || "Не назначена"} onChange={(event) => updateUser(user.id, { position: event.target.value })}>
                {positionOptions.map((position) => (
                  <option key={position} value={position}>{position}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </section>

      <section className="summary-grid">
        <div>
          <h3>Правило регистрации</h3>
          <p>Человек может только подать заявку. Он не может сам стать РП, ГИПом, руководителем региона или финансистом.</p>
        </div>
        <div>
          <h3>Правило региона</h3>
          <p>Проекты показываются по региону пользователя. Владелец и роли с доступом «Все регионы» видят всю картину.</p>
        </div>
        <div>
          <h3>Следующий шаг</h3>
          <p>Добавим несколько регионов на одного человека, отделы, юридические лица и структуру холдинга из утверждённой оргсхемы.</p>
        </div>
      </section>
    </>
  );
}

function FinanceModule({ projectItems, role }) {
  const canSeeFinance = roleCan(role, "viewFinance");
  const summary = financeSummary(projectItems);

  if (!canSeeFinance) {
    return (
      <>
        <SectionIntro section="finance" />
        <section className="office-card">
          <div className="empty">Финансовый раздел доступен только владельцу, финансисту и бухгалтерии.</div>
        </section>
      </>
    );
  }

  return (
    <>
      <SectionIntro section="finance" />
      <section className="stats-grid">
        <StatCard item={{ label: "Сумма договоров", value: money(summary.contractAmount), tone: "blue" }} />
        <StatCard item={{ label: "Поступления факт", value: money(summary.paidByClient), tone: "green" }} />
        <StatCard item={{ label: "Дебиторка", value: money(summary.receivable), tone: "orange" }} />
        <StatCard item={{ label: "Выделено РП/реализация", value: money(summary.allocatedProductionBudget), tone: "blue" }} />
      </section>

      <section className="finance-grid">
        <div className="office-card">
          <h3>Финансовая логика месяца</h3>
          <div className="finance-flow">
            <div><span>1. Поступления от проектов (факт)</span><b>{money(summary.paidByClient)}</b></div>
            <div><span>2. Себестоимость исполнителей</span><b>{money(summary.realizationCost)}</b></div>
            <div><span>3. Комиссия единого центра продаж</span><b>{money(summary.salesCommissionAmount)}</b></div>
            <div><span>4. Валовая прибыль по оплатам</span><b>{money(summary.grossProfit)}</b></div>
            <div><span>5. Долг перед исполнителями / партнёрами</span><b>{money(summary.payable)}</b></div>
            <div className="strong"><span>6. База для 67/33</span><b>{money(summary.splitBase)}</b></div>
          </div>
        </div>

        <div className="office-card">
          <h3>Распределение чистой прибыли</h3>
          <div className="profit-split">
            <div><span>Доля компании 67%</span><b>{money(summary.companyShare)}</b></div>
            <div><span>Доля управляющего / РП 33%</span><b>{money(summary.managerShare)}</b></div>
            <div><span>Если база ≤ 0</span><b>к выплате 0 ₽</b></div>
          </div>
        </div>
      </section>

      <section className="finance-grid">
        <div className="office-card">
          <h3>Финансовая сводка</h3>
          <div className="finance-kpi-list">
            <Info label="Сумма реализации / затрат" value={money(summary.realizationCost)} />
            <Info label="Остаток бюджета РП" value={money(summary.pmBudgetLeft)} />
            <Info label="Плановая часть компании" value={money(summary.companyPlannedGross)} />
            <Info label="Валовая прибыль" value={money(summary.grossProfit)} />
            <Info label="План выплат исполнителям" value={money(summary.payable)} />
            <Info label="Красных проектов" value={summary.redProjects} />
          </div>
        </div>

        <div className="office-card">
          <h3>Правило доступа</h3>
          <p className="section-hint">Финансист видит суммы, оплаты, акты, задолженность и выплаты, но не получает права управлять пользователями и раздавать роли. Руководитель направления должен видеть только своё направление и свой расчёт.</p>
        </div>
      </section>

      <section className="office-card">
        <div className="section-row">
          <div>
            <h3>Проекты и деньги</h3>
            <p className="section-hint">Колонки идут по смыслу Excel-отчёта: договор, факт оплат, остаток, бюджет реализации, себестоимость исполнителей, остаток бюджета, валовая прибыль и деление 67/33. Зарплаты и операционные затраты в проект не вносим.</p>
          </div>
        </div>
        <div className="finance-table">
          <div className="finance-table-head">
            <b>ID</b>
            <span>Проект</span>
            <em>Регион</em>
            <strong>Договор</strong>
            <strong>Факт оплат</strong>
            <strong>Остаток</strong>
            <strong>Бюджет РП</strong>
            <strong>Реализация</strong>
            <strong>Остаток РП</strong>
            <strong>Валовая прибыль</strong>
            <strong>База 67/33</strong>
            <strong>Компания 67%</strong>
            <strong>Упр. 33%</strong>
          </div>
          {projectItems.map((project) => {
            const economy = projectEconomy(project);
            return (
              <div key={project.id}>
                <b>{project.id}</b>
                <span>{project.title}</span>
                <em>{project.region || project.city}</em>
                <strong>{money(economy.contractAmount)}</strong>
                <strong>{money(economy.paidByClient)}</strong>
                <strong>{money(economy.receivable)}</strong>
                <strong>{money(economy.allocatedProductionBudget)}</strong>
                <strong>{money(economy.realizationCost)}</strong>
                <strong className={economy.pmBudgetLeft >= 0 ? "good" : "bad"}>{money(economy.pmBudgetLeft)}</strong>
                <strong className={economy.grossProfit >= 0 ? "good" : "bad"}>{money(economy.grossProfit)}</strong>
                <strong className={economy.splitBase > 0 ? "good" : "bad"}>{money(economy.splitBase)}</strong>
                <strong>{money(economy.companyShare)}</strong>
                <strong>{money(economy.managerShare)}</strong>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

function AnalyticsModule({ projectItems, allTasks, role }) {
  const redProjects = projectItems.filter((project) => project.risk === "red").length;
  const reviewTasks = allTasks.filter((task) => task.status === "На проверке").length;
  const overdueTasks = allTasks.filter((task) => task.status === "Просрочено").length;
  const summary = financeSummary(projectItems);
  const canSeeFinance = roleCan(role, "viewFinance");

  return (
    <>
      <SectionIntro section="analytics" />
      <section className="stats-grid">
        <StatCard item={{ label: "Красная зона", value: String(redProjects), tone: "red" }} />
        <StatCard item={{ label: "На проверке", value: String(reviewTasks), tone: "orange" }} />
        <StatCard item={{ label: "Просрочено задач", value: String(overdueTasks), tone: "red" }} />
        <StatCard item={{ label: canSeeFinance ? "Валовая прибыль" : "Средний прогресс", value: canSeeFinance ? money(summary.grossProfit) : "36%", tone: canSeeFinance ? "green" : "blue" }} />
      </section>
      {canSeeFinance ? (
        <section className="stats-grid">
          <StatCard item={{ label: "Сумма договоров", value: money(summary.contractAmount), tone: "blue" }} />
          <StatCard item={{ label: "Оплачено", value: money(summary.paidByClient), tone: "green" }} />
          <StatCard item={{ label: "Дебиторка", value: money(summary.receivable), tone: "orange" }} />
          <StatCard item={{ label: "К выплате", value: money(summary.payable), tone: "red" }} />
        </section>
      ) : null}
      <section className="office-card">
        <h3>Контроль владельца</h3>
        <div className="analytics-list">
          {projectItems.map((project) => (
            <div key={project.id}>
              <b>{project.id}</b>
              <span>{project.title}</span>
              <em className={cn("risk-chip", project.risk)}>{riskText(project.risk)}</em>
              <strong>{project.progress}%</strong>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function ClientAppModule({ projectItems }) {
  return (
    <>
      <SectionIntro section="client" />
      <section className="client-app-grid">
        {projectItems.map((project) => (
          <div key={project.id} className="client-phone-card">
            {(() => {
              const clientMessages = (project.chat || []).filter((message) => message.channel === "client");
              const lastClientMessage = clientMessages[clientMessages.length - 1];
              return lastClientMessage ? <small className="client-chat-preview">Чат: {lastClientMessage.text}</small> : null;
            })()}
            <span>{project.id}</span>
            <h3>{project.title}</h3>
            <p>{project.clientStatus}</p>
            <div className="client-mini-meta">
              <span>Участников: {projectClientParticipants(project).length}</span>
              <span>Согласований: {projectApprovals(project).length}</span>
            </div>
            <div className="bar">
              <span className={cn("bar-fill", project.risk)} style={{ width: `${project.progress}%` }} />
            </div>
            <button type="button" onClick={() => showAction(`Сообщение менеджеру по проекту ${project.title} открыто`) }>Написать менеджеру</button>
          </div>
        ))}
      </section>
    </>
  );
}

function DashboardModule({ visibleProjects, selectedProject, setSelectedId, role, session, query, setQuery, direction, setDirection, chooseFirstAvailable, currentRole, onProjectMessage }) {
  const summary = financeSummary(visibleProjects);
  const canSeeFinance = roleCan(role, "viewFinance");
  const canSeeProductionBudget = roleCan(role, "viewProductionBudget") || canSeeFinance;
  const visibleTasks = flattenTasks(visibleProjects);
  const redProjects = visibleProjects.filter((project) => project.risk === "red");
  const yellowProjects = visibleProjects.filter((project) => project.risk === "yellow");
  const overdueTasks = visibleTasks.filter((task) => task.status === "Просрочено");
  const reviewTasks = visibleTasks.filter((task) => task.status === "На проверке");
  const avgProgress = visibleProjects.length
    ? Math.round(visibleProjects.reduce((sum, project) => sum + (Number(project.progress) || 0), 0) / visibleProjects.length)
    : 0;
  const paidPercent = summary.contractAmount ? Math.round((summary.paidByClient / summary.contractAmount) * 100) : 0;
  const productionUsePercent = summary.allocatedProductionBudget ? Math.round((summary.realizationCost / summary.allocatedProductionBudget) * 100) : 0;
  const healthyPercent = visibleProjects.length ? Math.round(((visibleProjects.length - redProjects.length) / visibleProjects.length) * 100) : 0;

  const ownerStats = canSeeFinance
    ? [
        { label: "Сумма договоров", value: money(summary.contractAmount), tone: "blue" },
        { label: "Оплачено клиентами", value: money(summary.paidByClient), tone: "green" },
        { label: "Валовая прибыль по оплатам", value: money(summary.grossProfit), tone: summary.grossProfit >= 0 ? "green" : "red" },
        { label: "Красная зона", value: String(redProjects.length), tone: redProjects.length ? "red" : "green" },
      ]
    : [
        { label: "Доступные проекты", value: String(visibleProjects.length), tone: "blue" },
        { label: "Средний прогресс", value: `${avgProgress}%`, tone: avgProgress >= 60 ? "green" : "yellow" },
        { label: "Задачи на проверке", value: String(reviewTasks.length), tone: reviewTasks.length ? "yellow" : "green" },
        { label: "Красная зона", value: String(redProjects.length), tone: redProjects.length ? "red" : "green" },
      ];

  const planCards = [
    { label: "План выполнения", value: `${avgProgress}%`, hint: "средний прогресс проектов", percent: avgProgress, tone: avgProgress >= 70 ? "green" : avgProgress >= 40 ? "yellow" : "red" },
    ...(canSeeFinance ? [{ label: "Оплата договоров", value: `${paidPercent}%`, hint: `${money(summary.paidByClient)} из ${money(summary.contractAmount)}`, percent: paidPercent, tone: paidPercent >= 70 ? "green" : paidPercent >= 35 ? "yellow" : "red" }] : []),
    ...(canSeeProductionBudget ? [{ label: "Освоение бюджета РП", value: `${productionUsePercent}%`, hint: `${money(summary.realizationCost)} из ${money(summary.allocatedProductionBudget)}`, percent: Math.min(productionUsePercent, 100), tone: productionUsePercent <= 80 ? "green" : productionUsePercent <= 100 ? "yellow" : "red" }] : []),
    { label: "Проекты без пожара", value: `${healthyPercent}%`, hint: `${visibleProjects.length - redProjects.length} из ${visibleProjects.length} не в красной зоне`, percent: healthyPercent, tone: healthyPercent >= 80 ? "green" : healthyPercent >= 60 ? "yellow" : "red" },
  ];

  const regionRows = Array.from(
    visibleProjects.reduce((map, project) => {
      const key = project.region || project.city || "Без региона";
      const item = map.get(key) || { name: key, projects: [], risk: "green" };
      item.projects.push(project);
      if (project.risk === "red") item.risk = "red";
      else if (project.risk === "yellow" && item.risk !== "red") item.risk = "yellow";
      map.set(key, item);
      return map;
    }, new Map()).values()
  ).map((item) => {
    const economy = financeSummary(item.projects);
    const progress = item.projects.length ? Math.round(item.projects.reduce((sum, project) => sum + (Number(project.progress) || 0), 0) / item.projects.length) : 0;
    return { ...item, economy, progress };
  });

  const directionRows = Array.from(
    visibleProjects.reduce((map, project) => {
      const key = project.direction || "Без направления";
      const item = map.get(key) || { name: key, projects: [], risk: "green" };
      item.projects.push(project);
      if (project.risk === "red") item.risk = "red";
      else if (project.risk === "yellow" && item.risk !== "red") item.risk = "yellow";
      map.set(key, item);
      return map;
    }, new Map()).values()
  ).map((item) => ({ ...item, economy: financeSummary(item.projects) }));

  const taskStatusRows = ["Новая", "В работе", "На проверке", "Правки", "Принято", "Просрочено"].map((status) => ({
    status,
    count: visibleTasks.filter((task) => task.status === status).length,
  }));

  const todayFocus = [
    { title: "Красные проекты", value: redProjects.length, hint: redProjects[0]?.title || "Пожаров нет", tone: redProjects.length ? "red" : "green" },
    { title: "Есть риск", value: yellowProjects.length, hint: yellowProjects[0]?.title || "Риски под контролем", tone: yellowProjects.length ? "yellow" : "green" },
    { title: "Просроченные задачи", value: overdueTasks.length, hint: overdueTasks[0]?.name || "Просрочек нет", tone: overdueTasks.length ? "red" : "green" },
    { title: "На проверке", value: reviewTasks.length, hint: reviewTasks[0]?.name || "Проверок нет", tone: reviewTasks.length ? "blue" : "green" },
  ];

  return (
    <>
      <SectionIntro section="dashboard" />
      <section className="stats-grid">
        {ownerStats.map((item) => (
          <StatCard key={item.label} item={item} />
        ))}
      </section>

      <section className="dashboard-hero workspace-card">
        <div className="workspace-head">
          <div>
            <h2>Сводка владельца</h2>
            <p>Роль: {currentRole.name}. Здесь смотрим компанию сверху: деньги, выполнение, риски, регионы и направления.</p>
          </div>
          <div className="dashboard-period">
            <button type="button" className="primary" onClick={() => showAction("Сформирован управленческий отчёт по текущему срезу")}>Сформировать отчёт</button>
            <button type="button" className="secondary" onClick={() => showAction("План-факт будет связан с Bitrix и бюджетами проектов")}>План-факт</button>
          </div>
        </div>

        <div className="plan-grid">
          {planCards.map((item) => (
            <div key={item.label} className="plan-card">
              <div>
                <span>{item.label}</span>
                <b>{item.value}</b>
              </div>
              <p>{item.hint}</p>
              <div className="bar">
                <span className={cn("bar-fill", item.tone)} style={{ width: `${Math.max(4, item.percent)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="office-card">
          <div className="section-row">
            <div>
              <h3>Сегодня требует внимания</h3>
              <p className="section-hint">Карта вмешательства: пожар, риск, просрочка или зависшая проверка.</p>
            </div>
          </div>
          <div className="focus-grid">
            {todayFocus.map((item) => (
              <button key={item.title} type="button" onClick={() => showAction(`${item.title}: ${item.hint}`)}>
                <span className={cn("risk-chip", item.tone)}>{item.title}</span>
                <b>{item.value}</b>
                <p>{item.hint}</p>
              </button>
            ))}
          </div>
        </div>

        {canSeeFinance ? (
          <div className="office-card">
            <h3>Финансовая картина</h3>
            <div className="finance-flow">
              <div><span>Сумма договоров</span><b>{money(summary.contractAmount)}</b></div>
              <div><span>Оплачено клиентами</span><b>{money(summary.paidByClient)}</b></div>
              <div><span>Задолженность / к получению</span><b>{money(summary.receivable)}</b></div>
              <div><span>Бюджет реализации РП</span><b>{money(summary.allocatedProductionBudget)}</b></div>
              <div><span>Плановая валовая прибыль</span><b>{money(summary.companyPlannedGross)}</b></div>
              <div className="strong"><span>Чистая прибыль по оплатам</span><b>{money(summary.netProfit)}</b></div>
            </div>
          </div>
        ) : (
          <div className="office-card">
            <h3>Доступ ограничен</h3>
            <p className="section-hint">Финансовая картина скрыта для этой роли. Доступны только операционные показатели, задачи и статусы назначенных проектов.</p>
          </div>
        )}
      </section>

      <section className="dashboard-grid wide">
        <div className="office-card">
          <div className="section-row">
            <div>
              <h3>Регионы</h3>
              <p className="section-hint">Где сколько проектов, денег, выполнения и рисков.</p>
            </div>
          </div>
          <div className="dashboard-table">
            <div className="dashboard-table-head">
              <span>Регион</span><span>Проекты</span><span>{canSeeFinance ? "Договоры" : "Задачи"}</span><span>{canSeeFinance ? "Оплачено" : "На проверке"}</span><span>Выполнение</span><span>Светофор</span>
            </div>
            {regionRows.map((item) => (
              <button key={item.name} type="button" onClick={() => showAction(`Регион: ${item.name}`)}>
                <b>{item.name}</b>
                <span>{item.projects.length}</span>
                <span>{canSeeFinance ? money(item.economy.contractAmount) : flattenTasks(item.projects).length}</span>
                <span>{canSeeFinance ? money(item.economy.paidByClient) : flattenTasks(item.projects).filter((task) => task.status === "На проверке").length}</span>
                <div className="table-progress"><em>{item.progress}%</em><div className="bar"><i className={cn("bar-fill", item.risk)} style={{ width: `${Math.max(4, item.progress)}%` }} /></div></div>
                <em className={cn("risk-chip", item.risk)}>{riskText(item.risk)}</em>
              </button>
            ))}
          </div>
        </div>

        <div className="office-card">
          <div className="section-row">
            <div>
              <h3>Направления</h3>
              <p className="section-hint">Сравнение производственных блоков по деньгам и рискам.</p>
            </div>
          </div>
          <div className="direction-bars">
            {directionRows.map((item) => {
              const percent = summary.contractAmount ? Math.round((item.economy.contractAmount / summary.contractAmount) * 100) : 0;
              return (
                <button key={item.name} type="button" onClick={() => showAction(`Направление: ${item.name}`)}>
                  <div>
                    <b>{item.name}</b>
                    <span>{item.projects.length} проектов{canSeeFinance ? ` · ${money(item.economy.contractAmount)}` : ""}</span>
                  </div>
                  <em className={cn("risk-chip", item.risk)}>{riskText(item.risk)}</em>
                  <div className="bar"><i className={cn("bar-fill", item.risk)} style={{ width: `${Math.max(6, percent)}%` }} /></div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="office-card">
          <h3>Статусы задач</h3>
          <div className="task-status-chart">
            {taskStatusRows.map((item) => {
              const maxCount = Math.max(...taskStatusRows.map((row) => row.count), 1);
              const percent = Math.round((item.count / maxCount) * 100);
              return (
                <div key={item.status}>
                  <span>{item.status}</span>
                  <div className="bar"><i className={cn("bar-fill", item.status === "Просрочено" ? "red" : item.status === "На проверке" ? "yellow" : "green")} style={{ width: `${Math.max(4, percent)}%` }} /></div>
                  <b>{item.count}</b>
                </div>
              );
            })}
          </div>
        </div>

        <div className="office-card">
          <h3>Автоконтроль и правила</h3>
          <div className="auto-list dashboard-rules">
            {[
              "Время ответа на заявку — 5 минут",
              "Просрочка задачи — уведомление РП",
              "Красная зона — уведомление владельцу",
              "Закрыт этап — статус уходит клиенту",
              "Финансы видят деньги, но не управляют ролями",
              "Админ управляет доступом, но не видит закрытую финансовую аналитику",
            ].map((item) => (
              <button key={item} type="button" onClick={() => showAction(item)}>✓ {item}</button>
            ))}
          </div>
        </div>
      </section>

      <section className="office-card">
        <div className="section-row">
          <div>
            <h3>Проекты в зоне риска</h3>
            <p className="section-hint">На панели только проблемные проекты. Полная детализация открывается через раздел «Проекты».</p>
          </div>
        </div>
        <div className="risk-project-strip">
          {[...redProjects, ...yellowProjects].slice(0, 6).map((project) => (
            <button key={project.id} type="button" onClick={() => { setSelectedId(project.id); showAction(`Выбран проект: ${project.title}. Открой раздел «Проекты» или карточку проекта.`); }}>
              <span className={cn("risk-chip", project.risk)}>{riskText(project.risk)}</span>
              <b>{project.title}</b>
              <small>{project.region || project.city} · РП: {project.manager} · {project.stage}</small>
              <div className="bar"><i className={cn("bar-fill", project.risk)} style={{ width: `${Math.max(4, project.progress)}%` }} /></div>
            </button>
          ))}
          {[...redProjects, ...yellowProjects].length === 0 ? <div className="empty">Сейчас нет проектов в красной или жёлтой зоне.</div> : null}
        </div>
      </section>

      <section className="office-card">
        <h3>Сквозной путь контроля</h3>
        <div className="pipeline">
          {[
            { title: "Заявка", desc: "SmetaGo / продажи" },
            { title: "Проект", desc: "карточка и бюджет" },
            { title: "Разделы", desc: "исполнители и сроки" },
            { title: "Проверка", desc: "РП / ГИП / управляющий" },
            { title: "Финансы", desc: "оплаты, выплаты, прибыль" },
            { title: "Клиент", desc: "статус и отчёты" },
          ].map((step, index) => (
            <button key={step.title} type="button" onClick={() => showAction(step.desc)}>
              <b>{index + 1}</b>
              <strong>{step.title}</strong>
              <span>{step.desc}</span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

function SmetaOfficePrototype() {
  const [session, setSession] = useState(() => readStoredValue("smeta.session", null));
  const [role, setRole] = useState(() => readStoredValue("smeta.session", null)?.role || "owner");
  const [query, setQuery] = useState("");
  const [direction, setDirection] = useState("Все");
  const [projectItems, setProjectItemsState] = useState(() => mergeDemoProductionProjects(readStoredValue("smeta.projects", [])));
  const [executors, setExecutorsState] = useState(() => readStoredValue("smeta.executors", executorProfiles));
  const [users, setUsersState] = useState(() => readStoredValue("smeta.users", demoUsers));
  const [salesLeads, setSalesLeadsState] = useState(() => mergeSalesLeads(readStoredValue("smeta.salesLeads", seedSalesLeads)));
  const [selectedId, setSelectedId] = useState(() => readStoredValue("smeta.selectedProjectId", ""));
  const [activeSection, setActiveSection] = useState("dashboard");
  const [projectForm, setProjectForm] = useState(defaultProjectForm);
  const [taskForm, setTaskForm] = useState({ name: "", sectionName: "", description: "", owner: "", executorId: "", due: "", status: "Новая", yandexLink: "" });
  const [actionNotice, setActionNotice] = useState("");
  const [moscowNow, setMoscowNow] = useState(() => new Date());

  const currentRole = roles.find((item) => item.id === role) ?? roles[0];
  const allTasks = useMemo(() => flattenTasks(projectItems), [projectItems]);
  const moscowDateTime = useMemo(
    () =>
      new Intl.DateTimeFormat("ru-RU", {
        timeZone: "Europe/Moscow",
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(moscowNow),
    [moscowNow]
  );
  const effectiveAccessUser = useMemo(() => {
    if (session?.role === role) return session;
    return users.find((user) => user.role === role) || session;
  }, [role, session, users]);

  useEffect(() => {
    const timer = window.setInterval(() => setMoscowNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    function handleAction(event) {
      setActionNotice(event.detail || "Действие выполнено");
      window.clearTimeout(handleAction.timer);
      handleAction.timer = window.setTimeout(() => setActionNotice(""), 2600);
    }
    window.addEventListener("smeta-action", handleAction);
    return () => {
      window.clearTimeout(handleAction.timer);
      window.removeEventListener("smeta-action", handleAction);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    async function loadServerState() {
      const [serverProjects, serverExecutors, serverUsers] = await Promise.all([
        apiGet("/projects", null),
        apiGet("/executors", null),
        apiGet("/users", null),
      ]);
      if (!alive) return;
      if (Array.isArray(serverProjects)) {
        const mergedProjects = mergeDemoProductionProjects(serverProjects);
        setProjectItemsState(mergedProjects);
        writeStoredValue("smeta.projects", mergedProjects);
        if (mergedProjects.length !== serverProjects.length) apiPut("/projects", mergedProjects);
      }
      if (Array.isArray(serverExecutors) && serverExecutors.length) {
        setExecutorsState(serverExecutors);
        writeStoredValue("smeta.executors", serverExecutors);
      }
      if (Array.isArray(serverUsers) && serverUsers.length) {
        setUsersState(serverUsers);
        writeStoredValue("smeta.users", serverUsers);
      }
    }
    loadServerState();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!session?.login) return;
    const freshUser = users.find((user) => user.login === session.login);
    if (freshUser && JSON.stringify(freshUser) !== JSON.stringify(session)) {
      setSession(freshUser);
      setRole(freshUser.role);
      writeStoredValue("smeta.session", freshUser);
    }
  }, [users, session]);

  useEffect(() => {
    if (!sectionAllowed(role, activeSection)) {
      setActiveSection("dashboard");
    }
  }, [role, activeSection]);

  function setProjectItems(updater) {
    setProjectItemsState((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      writeStoredValue("smeta.projects", next);
      apiPut("/projects", next);
      return next;
    });
  }

  function setExecutors(updater) {
    setExecutorsState((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      writeStoredValue("smeta.executors", next);
      apiPut("/executors", next);
      return next;
    });
  }

  function setUsers(updater) {
    setUsersState((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      writeStoredValue("smeta.users", next);
      apiPut("/users", next);
      return next;
    });
  }

  function setSalesLeads(updater) {
    setSalesLeadsState((current) => {
      const next = mergeSalesLeads(typeof updater === "function" ? updater(current) : updater);
      writeStoredValue("smeta.salesLeads", next);
      return next;
    });
  }

  const visibleProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return projectItems.filter((project) => {
      const hasAccess = canAccessProject(effectiveAccessUser, project, role);
      const hasRegionAccess = canAccessRegion(effectiveAccessUser, project);
      const searchableText = `${project.title} ${project.client} ${project.city} ${project.direction}`.toLowerCase();
      const matchesQuery = normalizedQuery === "" || searchableText.includes(normalizedQuery);
      const matchesDirection = direction === "Все" || project.direction.includes(direction);

      return hasAccess && hasRegionAccess && matchesQuery && matchesDirection;
    });
  }, [projectItems, role, query, direction, effectiveAccessUser]);

  const visibleTasks = useMemo(() => flattenTasks(visibleProjects), [visibleProjects]);

  const selectedProject = visibleProjects.find((project) => project.id === selectedId) ?? visibleProjects[0] ?? null;

  function chooseFirstAvailable(nextRole = role, nextDirection = direction, nextQuery = query) {
    const normalizedQuery = nextQuery.trim().toLowerCase();
    const nextAccessUser = session?.role === nextRole ? session : users.find((user) => user.role === nextRole) || session;
    const firstAvailableProject = projectItems.find((project) => {
      const hasAccess = canAccessProject(nextAccessUser, project, nextRole);
      const hasRegionAccess = canAccessRegion(nextAccessUser, project);
      const searchableText = `${project.title} ${project.client} ${project.city} ${project.direction}`.toLowerCase();
      const matchesQuery = normalizedQuery === "" || searchableText.includes(normalizedQuery);
      const matchesDirection = nextDirection === "Все" || project.direction.includes(nextDirection);
      return hasAccess && hasRegionAccess && matchesQuery && matchesDirection;
    });
    if (firstAvailableProject) {
      setSelectedId(firstAvailableProject.id);
      writeStoredValue("smeta.selectedProjectId", firstAvailableProject.id);
    }
  }

  function selectProject(projectId) {
    setSelectedId(projectId);
    writeStoredValue("smeta.selectedProjectId", projectId);
    setActiveSection("projectDetail");
  }

  function backToProjects() {
    setActiveSection("projects");
  }

  function createProject() {
    const title = projectForm.title.trim();
    if (!canCreateProjectRole(role)) {
      showAction("У этой роли нет права создавать проекты");
      return;
    }
    const errors = validateProjectForm(projectForm);
    if (errors.length) {
      setProjectForm((next) => ({ ...next, wizardStep: errors.some((error) => ["Регион", "Город / населённый пункт", "Адрес"].includes(error)) ? 1 : errors.some((error) => ["Направление"].includes(error)) ? 2 : errors.some((error) => ["Тип проекта / продукт"].includes(error)) ? 3 : errors.some((error) => ["Сумма договора", "Главная папка Яндекс.Диска"].includes(error)) ? 5 : 4 }));
      showAction(`Проект не создан. Не заполнено: ${errors.join(", ")}`);
      return;
    }
    const nextIndex = projectItems.length + 1;
    const contractAmount = toMoneyNumber(projectForm.contractAmount);
    const paidByClient = toMoneyNumber(projectForm.paidByClient);
    const allocationPercent = Number(projectForm.productionAllocationPercent) || 35;
    const productionBudget = toMoneyNumber(projectForm.productionBudget) || Math.round(contractAmount * (allocationPercent / 100));
    const salesCommissionPercent = Number(projectForm.salesCommissionPercent) || 0;
    const salesCommissionAmount = toMoneyNumber(projectForm.salesCommissionAmount) || Math.round(contractAmount * (salesCommissionPercent / 100));
    const directCosts = 0;
    const operatingCosts = 0;
    const payrollCosts = 0;
    const progress = Math.max(0, Math.min(100, Number(projectForm.progress) || 0));
    const sections = makeTemplateSections(projectForm.projectType).map((section) => {
      if (section.name !== projectForm.stage) return section;
      return {
        ...section,
        status: projectForm.status === "Завершён" ? "Принято" : "В работе",
        progress: Math.max(section.progress, progress),
      };
    });
    const status = projectForm.status || "Новая";
    const deadline = projectForm.deadline.trim() || "не указан";
    const source = projectSourceLabel(projectForm.creationMode);
    const directorName = userNameById(users, projectForm.directorUserId, "Руководитель не назначен");
    const pmName = userNameById(users, projectForm.pmUserId, "РП не назначен");
    const projectManagerName = userNameById(users, projectForm.projectManagerId, "");
    const salesManagerName = userNameById(users, projectForm.salesManagerId, "");
    const partnerName = userNameById(users, projectForm.partnerUserId, "—");
    const created = {
      id: `SG-${String(300 + nextIndex).padStart(3, "0")}`,
      title,
      client: projectForm.client.trim() || "Новый клиент",
      country: projectForm.country.trim() || "Россия",
      city: projectForm.city.trim() || "не указан",
      address: projectForm.address.trim(),
      region: projectForm.region,
      responsibleRegion: projectForm.region,
      objectRegion: projectForm.region,
      objectCity: projectForm.city.trim() || "не указан",
      projectType: projectForm.projectType,
      direction: projectForm.direction,
      manager: pmName,
      directorName,
      projectManager: projectManagerName,
      salesManager: salesManagerName,
      directorUserId: projectForm.directorUserId,
      pmUserId: projectForm.pmUserId,
      projectManagerId: projectForm.projectManagerId,
      salesManagerId: projectForm.salesManagerId,
      partnerUserId: projectForm.partnerUserId,
      executor: "—",
      partner: partnerName,
      budget: money(contractAmount),
      margin: money(Math.max(contractAmount - productionBudget - directCosts, 0)),
      status,
      stage: projectForm.stage || sections[0]?.name || "Старт",
      progress,
      risk: projectForm.risk || "green",
      deadline,
      source,
      sourceComment: projectForm.sourceComment.trim(),
      bitrix: {
        dealId: projectForm.bitrixDealId.trim(),
        dealUrl: "",
        stage: projectForm.creationMode === "bitrix_deal" ? "Договор / Аванс" : "Не связано",
        syncStatus: projectForm.creationMode === "bitrix_deal" ? "Ожидает API Bitrix24" : "Ручное создание",
        source,
      },
      yandexFolder: projectForm.yandexFolder.trim() || "не привязан",
      visibleFor: ["owner", "admin", "deputy", "director", "regional_manager", "pm", "project_manager", "finance", "accountant"],
      clientStatus: status === "В работе" ? `Проект в работе. Текущий этап: ${projectForm.stage}.` : "Проект внесён в систему. Команда уточняет детали.",
      contractAmount,
      paidByClient,
      productionAllocationPercent: allocationPercent,
      productionBudget,
      salesCommissionPercent,
      salesCommissionAmount,
      plannedExpenses: 0,
      factualExpenses: 0,
      partnerPayouts: 0,
      operatingCosts,
      payrollCosts,
      paymentStatus: paidByClient >= contractAmount && contractAmount > 0 ? "оплачен" : paidByClient > 0 ? "частично оплачен" : "не оплачен",
      directCosts,
      tasks: [],
      sections,
      files: [
        { id: `file-${Date.now()}-main`, type: "Папка проекта", title: "Главная папка проекта", url: projectForm.yandexFolder.trim(), scope: "project" },
      ],
      clientParticipants: [
        {
          id: `client-${Date.now()}`,
          name: projectForm.client.trim() || "Новый клиент",
          role: "Основной заказчик",
          access: "статус, файлы, чат, согласования",
          canApprove: true,
          status: "активен",
        },
      ],
      approvals: [],
      chat: [
        {
          id: `chat-${Date.now()}`,
          channel: "internal",
          author: session?.name || "Система",
          role: role,
          text: `Проект создан вручную. Источник: ${source}. Направление: ${projectForm.direction}. Тип: ${projectForm.projectType}.`,
          at: new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date()),
        },
      ],
    };
    setProjectItems((items) => [created, ...items]);
    selectProject(created.id);
    setProjectForm(defaultProjectForm);
    showAction(`Проект ${created.id} создан и открыт`);
  }

  function createTask(projectId) {
    const name = taskForm.name.trim();
    if (!name) return;
    const selectedSection = projectSections(projectItems.find((project) => project.id === projectId)).find((section) => section.name === taskForm.sectionName);
    const createdTask = {
      id: `task-${Date.now()}`,
      name,
      sectionName: taskForm.sectionName || "Без этапа",
      sectionId: selectedSection?.id || "",
      description: taskForm.description?.trim() || "",
      owner: taskForm.owner.trim() || "Не назначен",
      executorId: taskForm.executorId,
      status: taskForm.status,
      due: taskForm.due.trim() || "не указан",
      yandexLink: taskForm.yandexLink.trim(),
      clientBudget: 0,
      executorCost: 0,
      paid: 0,
      balance: 0,
      progress: 0,
      financeStatus: "не рассчитан",
      comments: [],
      documents: taskForm.yandexLink.trim() ? [taskForm.yandexLink.trim()] : [],
      chat: [],
      history: [{ at: new Date().toISOString(), text: "Задача создана" }],
    };
    setProjectItems((items) =>
      items.map((project) =>
        project.id === projectId
          ? {
              ...project,
              tasks: [...project.tasks, createdTask],
              status: project.status === "Новая" ? "В работе" : project.status,
              progress: Math.max(project.progress, 10),
            }
          : project
      )
    );
    setTaskForm({ name: "", sectionName: "", description: "", owner: "", executorId: "", due: "", status: "Новая", yandexLink: "" });
  }

  function updateProjectSection(projectId, sectionId, patch) {
    setProjectItems((items) =>
      items.map((project) =>
        project.id === projectId
          ? {
              ...project,
              sections: projectSections(project).map((section) => (section.id || section.name) === sectionId ? { ...section, ...patch } : section),
            }
          : project
      )
    );
  }

  function updateProject(projectId, patch) {
    if (!["owner", "admin"].includes(role)) {
      showAction("Редактировать проект может только владелец или администратор");
      return;
    }
    setProjectItems((items) =>
      items.map((project) => {
        if (project.id !== projectId) return project;
        const next = { ...project, ...patch };
        const economy = projectEconomy(next);
        return {
          ...next,
          budget: money(economy.contractAmount),
          margin: money(economy.contractProfit),
          manager: userNameById(users, next.pmUserId, next.manager || "РП не назначен"),
          projectManager: userNameById(users, next.projectManagerId, next.projectManager || ""),
          salesManager: userNameById(users, next.salesManagerId, next.salesManager || ""),
          objectRegion: next.region,
          responsibleRegion: next.region,
          objectCity: next.city,
          files: [
            ...(next.files || []).filter((file) => file.type !== "Папка проекта"),
            ...(next.yandexFolder && next.yandexFolder.startsWith("http")
              ? [{ id: `file-main-${next.id}`, type: "Папка проекта", title: "Главная папка проекта", url: next.yandexFolder, scope: "project" }]
              : []),
          ],
          chat: [
            ...(next.chat || []),
            {
              id: `chat-${Date.now()}`,
              channel: "internal",
              author: session?.name || "Система",
              role,
              text: "Данные проекта отредактированы администратором.",
              at: new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date()),
            },
          ],
        };
      })
    );
    showAction("Проект обновлён");
  }

  function addProjectSection(projectId) {
    const created = {
      id: `stage-${Date.now()}`,
      name: "Новый этап",
      executor: "не назначен",
      executorId: "",
      due: "не указан",
      progress: 0,
      status: "Новая",
      clientBudget: 0,
      executorCost: 0,
      paid: 0,
      balance: 0,
      financeStatus: "не рассчитан",
      yandexLink: "",
      documents: [],
      comments: [],
    };
    setProjectItems((items) => items.map((project) => project.id === projectId ? { ...project, sections: [...projectSections(project), created] } : project));
    showAction("Этап добавлен. Его можно переименовать и назначить исполнителя.");
  }

  function deleteProjectSection(projectId, sectionId) {
    setProjectItems((items) => items.map((project) => project.id === projectId ? { ...project, sections: projectSections(project).filter((section) => (section.id || section.name) !== sectionId) } : project));
    showAction("Этап удалён из карточки проекта");
  }

  function distributeProjectSectionBudget(projectId) {
    if (!["owner", "admin"].includes(role)) {
      showAction("Распределять бюджет исполнителя может только владелец или администратор");
      return;
    }

    setProjectItems((items) =>
      items.map((project) => {
        if (project.id !== projectId) return project;

        const sections = projectSections(project);
        const billableSections = sections.filter(isBillableProductionStage);
        if (!billableSections.length) return project;

        const currentExecutorTotal = sections.reduce((sum, section) => sum + (Number(section.executorCost) || 0), 0);
        const fallbackTotal = Number(project.productionBudget) || Math.round((Number(project.contractAmount) || 0) * 0.35);
        const distributionTotal = currentExecutorTotal || fallbackTotal;
        const totalWeight = billableSections.reduce((sum, section) => sum + stageDurationWeight(section), 0) || billableSections.length || 1;
        const lastBillableKey = billableSections[billableSections.length - 1]?.id || billableSections[billableSections.length - 1]?.name;
        let allocated = 0;

        const nextSections = sections.map((section) => {
          const sectionKey = section.id || section.name;
          const paid = Number(section.paid) || 0;

          if (!isBillableProductionStage(section)) {
            return {
              ...section,
              executorCost: 0,
              paid,
              balance: 0,
              financeStatus: "не оплачивается",
              progress: Math.max(Number(section.progress) || 0, 100),
              status: section.status === "Новая" || section.status === "Ожидает" ? "Принято" : section.status,
            };
          }

          const amount =
            sectionKey === lastBillableKey
              ? Math.max(distributionTotal - allocated, 0)
              : Math.round((distributionTotal * stageDurationWeight(section)) / totalWeight);
          allocated += amount;

          return {
            ...section,
            executorCost: amount,
            paid,
            balance: Math.max(amount - paid, 0),
            financeStatus: paid >= amount && amount > 0 ? "выплачено" : amount > 0 ? "к выплате" : "не рассчитан",
          };
        });

        return {
          ...project,
          sections: nextSections,
          chat: [
            ...(project.chat || []),
            {
              id: `chat-${Date.now()}`,
              channel: "internal",
              author: session?.name || "Система",
              role,
              text: "Бюджет исполнителя распределён по оплачиваемым этапам. Заявка, бриф, замеры и ТЗ отмечены как преддоговорные.",
              at: new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date()),
            },
          ],
        };
      })
    );
    showAction("Бюджет исполнителя распределён по оплачиваемым этапам");
  }

  function deleteProject(projectId) {
    if (!["owner", "admin"].includes(role)) {
      showAction("Удалять проекты может только владелец или администратор");
      return;
    }
    const project = projectItems.find((item) => item.id === projectId);
    const confirmed = window.confirm(`Удалить проект ${project?.title || projectId}? Действие уберёт проект из локального реестра SmetaOffice.`);
    if (!confirmed) return;
    const remaining = projectItems.filter((item) => item.id !== projectId);
    setProjectItems(remaining);
    setSelectedId(remaining[0]?.id || "");
    writeStoredValue("smeta.selectedProjectId", remaining[0]?.id || "");
    setActiveSection("projects");
    showAction("Проект удалён из реестра");
  }

  function changeTaskStatus(projectId, taskName, status) {
    setProjectItems((items) =>
      items.map((project) =>
        project.id === projectId
          ? {
              ...project,
              tasks: project.tasks.map((task) => (task.name === taskName ? { ...task, status } : task)),
              sections: projectSections(project).map((section) => (section.name === taskName ? { ...section, status } : section)),
            }
          : project
      )
    );
  }

  function addProjectMessage(projectId, message) {
    const created = {
      id: `chat-${Date.now()}`,
      channel: message.channel,
      author: message.author,
      role: message.role,
      text: message.text,
      at: new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date()),
    };
    setProjectItems((items) =>
      items.map((project) =>
        project.id === projectId
          ? {
              ...project,
              chat: [...(project.chat || []), created],
              clientStatus: message.channel === "client" ? message.text : project.clientStatus,
            }
          : project
      )
    );
    showAction(message.channel === "client" ? "Сообщение ушло в клиентский канал SmetaGo" : "Сообщение добавлено в чат проекта");
  }

  function addClientParticipant(projectId, participant) {
    setProjectItems((items) =>
      items.map((project) =>
        project.id === projectId
          ? {
              ...project,
              clientParticipants: [...projectClientParticipants(project), participant],
            }
          : project
      )
    );
    showAction(`Участник клиента ${participant.name} добавлен в проект и будет виден в SmetaGo`);
  }

  function login(user) {
    setSession(user);
    setRole(user.role);
    writeStoredValue("smeta.session", user);
  }

  function logout() {
    setSession(null);
    writeStoredValue("smeta.session", null);
    setRole("owner");
  }

  if (!session) {
    return <LoginScreen users={users} onLogin={login} onRegister={(user) => setUsers((items) => [user, ...items])} />;
  }

  return (
    <div className="office">
      {actionNotice ? <div className="action-toast">{actionNotice}</div> : null}
      <aside className="office-sidebar">
        <div className="office-logo">
          <div className="logo-image-wrap">
            <img src="/smeta-emblem.png" alt="SMETA" />
          </div>
          <span>
            <b>SmetaOffice</b>
            <small>операционный центр</small>
          </span>
        </div>

        <nav>
          {menuItems.filter((item) => sectionAllowed(role, item.id) && (item.id !== "admin" || userCan(session, "manageUsers"))).map((item, index) => (
            <button type="button" key={item.id} onClick={() => setActiveSection(item.id)} className={activeSection === item.id ? "current" : ""}>
              <span>{index + 1}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="office-rule">
          <b>Правило системы</b>
          <p>Клиент видит спокойствие. Команда видит работу. Владелец видит правду.</p>
          <button type="button" onClick={logout}>Выйти</button>
        </div>
      </aside>

      <main className="office-main">
        <header className="office-header">
          <div>
            <p>SmetaGo → SmetaOffice → SmetaPartner</p>
            <h1>
              {role === "executor"
                ? "Личный кабинет исполнителя"
                : activeSection === "executors"
                ? "Центр исполнителей"
                : activeSection === "integrations"
                ? "Интеграции и запуск MVP"
                : "Центр контроля проектов"}
            </h1>
          </div>
          <div className="header-actions">
            <div className="moscow-clock">
              <span>Москва</span>
              <b>{moscowDateTime}</b>
            </div>
            <label>
              Режим просмотра
              <select
                value={role}
                disabled={session.role !== "owner"}
                onChange={(event) => {
                  setRole(event.target.value);
                  chooseFirstAvailable(event.target.value, direction, query);
                }}
              >
                {roles.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={() => session.role === "owner" ? setActiveSection("admin") : showAction("Регион и должность назначает администратор")}>{session.region || "Регион не назначен"} · {session.position || roles.find((item) => item.id === session.role)?.name}</button>
            <button type="button" onClick={() => setActiveSection("tasks")}>12 уведомлений</button>
          </div>
        </header>

        <div className="office-content">
          {role === "executor" ? <ExecutorPersonalAccount allTasks={allTasks} /> : null}

          {role !== "executor" && activeSection === "executors" ? <ExecutorsModule role={role} executors={executors} setExecutors={setExecutors} allTasks={visibleTasks} /> : null}

          {role !== "executor" && activeSection === "integrations" ? <IntegrationsModule /> : null}

          {role !== "executor" && activeSection === "sales" ? (
            <SalesLeadsModule
              leads={salesLeads}
              setSalesLeads={setSalesLeads}
              projectItems={projectItems}
              users={users}
              role={role}
              session={effectiveAccessUser}
            />
          ) : null}

          {role !== "executor" && activeSection === "dashboard" ? (
            <DashboardModule
              visibleProjects={visibleProjects}
              selectedProject={selectedProject}
              setSelectedId={selectProject}
              role={role}
              session={session}
              query={query}
              setQuery={setQuery}
              direction={direction}
              setDirection={setDirection}
              chooseFirstAvailable={chooseFirstAvailable}
              currentRole={currentRole}
              onProjectMessage={addProjectMessage}
            />
          ) : null}

          {role !== "executor" && activeSection === "projects" ? (
            <ProjectsModule
              visibleProjects={visibleProjects}
              selectedProject={selectedProject}
              setSelectedId={selectProject}
              role={role}
              query={query}
              setQuery={setQuery}
              direction={direction}
              setDirection={setDirection}
              chooseFirstAvailable={chooseFirstAvailable}
              projectForm={projectForm}
              setProjectForm={setProjectForm}
              onCreateProject={createProject}
              taskForm={taskForm}
              setTaskForm={setTaskForm}
              onCreateTask={createTask}
              onTaskStatusChange={changeTaskStatus}
              executors={executors}
              users={users}
              projectFormErrors={validateProjectForm(projectForm)}
            />
          ) : null}

          {role !== "executor" && activeSection === "projectDetail" ? (
            <ProjectDetailModule
              project={selectedProject}
              role={role}
              session={session}
              onBack={backToProjects}
              onDeleteProject={deleteProject}
              onUpdateProject={updateProject}
              onTaskStatusChange={changeTaskStatus}
              onProjectMessage={addProjectMessage}
              onAddClientParticipant={addClientParticipant}
              taskForm={taskForm}
              setTaskForm={setTaskForm}
              onCreateTask={createTask}
              executors={executors}
              users={users}
              onUpdateSection={updateProjectSection}
              onAddSection={addProjectSection}
              onDeleteSection={deleteProjectSection}
              onDistributeSectionBudget={distributeProjectSectionBudget}
            />
          ) : null}

          {role !== "executor" && activeSection === "tasks" ? <TasksModule allTasks={visibleTasks} onTaskStatusChange={changeTaskStatus} executors={executors} /> : null}
          {role !== "executor" && activeSection === "partners" ? <PartnersModule /> : null}
          {role !== "executor" && activeSection === "admin" ? <AdminModule users={users} setUsers={setUsers} session={session} /> : null}
          {role !== "executor" && activeSection === "analytics" ? <AnalyticsModule projectItems={visibleProjects} allTasks={visibleTasks} role={role} /> : null}
          {role !== "executor" && activeSection === "finance" ? <FinanceModule projectItems={projectItems} role={role} /> : null}
          {role !== "executor" && activeSection === "client" ? <ClientAppModule projectItems={projectItems} /> : null}
        </div>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<SmetaOfficePrototype />);

