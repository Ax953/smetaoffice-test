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
  { id: "USR-007", login: "project", password: "project", role: "project_manager", name: "Менеджер проекта", status: "active", region: "ЧР", regions: ["ЧР"], direction: "Дизайн / интерьер", position: "Менеджер проекта" },
  { id: "USR-008", login: "sales", password: "sales", role: "sales_manager", name: "Менеджер продаж", status: "active", region: "ЧР", regions: ["ЧР"], direction: "Единый центр продаж", position: "Менеджер продаж" },
  { id: "USR-009", login: "headsales", password: "headsales", role: "head_of_sales", name: "Руководитель отдела продаж", status: "active", region: "Все регионы", regions: ["Все регионы"], direction: "Единый центр продаж", position: "Руководитель отдела продаж" },
  { id: "USR-010", login: "accountant", password: "accountant", role: "accountant", name: "Бухгалтер", status: "active", region: "Все регионы", regions: ["Все регионы"], direction: "Финансы", position: "Бухгалтер" },
  { id: "USR-011", login: "finance", password: "finance", role: "finance", name: "Финансист", status: "active", region: "Все регионы", regions: ["Все регионы"], direction: "Финансы", position: "Финансовый контроль" },
  { id: "USR-012", login: "executor", password: "executor", role: "executor", name: "Исполнитель", status: "active", region: "ЧР", regions: ["ЧР"], direction: "Дизайн / интерьер", position: "Исполнитель / визуализатор", executorId: "EX-063" },
  { id: "USR-013", login: "partner", password: "partner", role: "partner", name: "Партнёр", status: "active", region: "Ростов", regions: ["Ростов"], direction: "Ремонт / строительство", position: "Партнёр", executorId: "EX-017" },
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
  const isDesign = project.direction === "Дизайн / интерьер";
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
const directionOptions = ["Все", "Дизайн", "Проектный", "Ремонт", "Недвижимость", "Изыскания", "Продажи", "Обучение"];

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
    title: "Архитектурное бюро и дизайн-студия",
    manager: "Управляющий архитектурой и дизайном",
    hint: "Архитектурные проекты, дизайн-проекты, рабочая документация, визуализация и комплектация.",
    projectDirection: "Дизайн / интерьер",
    risk: "green",
    match: (project) => {
      const text = `${project.direction || ""} ${project.projectType || ""}`.toLowerCase();
      return text.includes("дизайн") || text.includes("архитектур");
    },
  },
  {
    id: "surveys",
    title: "Изыскания",
    manager: "Управляющий изысканиями",
    hint: "Локальные выезды, обследования, обмеры, геология, исходные данные и техническое заключение.",
    projectDirection: "Изыскания",
    risk: "yellow",
    match: (project) => {
      const text = `${project.direction || ""} ${project.projectType || ""} ${(project.sections || []).map((item) => item.name).join(" ")}`.toLowerCase();
      return text.includes("изыск") || text.includes("обслед") || text.includes("тзк") || text.includes("дефект");
    },
  },
  {
    id: "sales",
    title: "Единый центр продаж",
    manager: "Руководитель продаж региона",
    hint: "Продаёт всю линейку услуг, принимает заявки SmetaGo и подключает партнёров, если своих ресурсов не хватает.",
    projectDirection: "Недвижимость",
    risk: "green",
    match: (project) => {
      const text = `${project.direction || ""} ${project.projectType || ""} ${project.source || ""}`.toLowerCase();
      return text.includes("недвиж") || text.includes("продаж") || text.includes("smetago");
    },
  },
  {
    id: "implementation",
    title: "Центр реализации проектов",
    manager: "Управляющий реализацией",
    hint: "Строительство, ремонт, контроль подрядчиков, фотоотчёты, акты и локальная реализация.",
    projectDirection: "Ремонт / строительство",
    risk: "yellow",
    match: (project) => {
      const text = `${project.direction || ""} ${project.projectType || ""}`.toLowerCase();
      return text.includes("ремонт") || text.includes("строитель") || text.includes("реализац");
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

const projectStageTemplates = {
  "Дизайн-проект": ["Заявка / бриф", "Замеры", "Техническое задание", "Планировочное решение", "Концепция / стиль", "Визуализация", "Рабочая документация", "Ведомости / комплектация", "Проверка руководителем проекта", "Выдача клиенту", "Закрытие проекта"],
  "Архитектурный проект": ["Заявка", "Исходные данные", "Техническое задание", "Эскиз / концепция", "Архитектурные решения", "Фасады", "АР", "КР", "Инженерные разделы", "Комплектация альбома", "Выдача клиенту", "Закрытие проекта"],
  "Проектная документация по 87 постановлению": ["Заявка", "Исходные данные", "Обследование", "Изыскания", "Техническое заключение", "Дефектный акт", "ПЗ", "АР", "КР", "ОВ", "ВК", "ЭОМ", "СС", "ПОС", "ОДИ / МОДИ", "Сметная документация", "Внутренняя проверка", "Выдача заказчику", "Сопровождение экспертизы", "Закрытие"],
  "Обследование / ТЗК / дефектный акт": ["Заявка", "Выезд / обследование", "Фотофиксация", "Обмеры", "Техническое заключение", "Дефектный акт", "Первичная смета", "Передача", "Архив документов"],
  "Ремонт / строительство": ["Заявка", "Смета / договор", "График", "Аванс", "Черновые работы", "Сети", "Отделочные работы", "Фотоотчёт", "Приёмка", "Исправления", "Закрытие этапа", "Акт", "Закрытие"],
  "Недвижимость": ["Заявка", "Квалификация", "Подбор объектов", "Показы", "Переговоры", "Проверка документов", "Сделка", "Закрытие"],
  "Комплектация": ["Заявка", "Исходные данные", "Подбор", "Счета поставщиков", "Согласование заказчика", "Заказ", "Доставка", "Закрытие поставки"],
};

function makeTemplateSections(projectType) {
  const template = projectStageTemplates[projectType] || projectStageTemplates["Дизайн-проект"];
  return template.map((name, index) => ({
    name, executor: "не назначен", executorId: "", due: "не указан", progress: index === 0 ? 5 : 0,
    status: index === 0 ? "Новая" : "Ожидает", clientBudget: 0, executorCost: 0, paid: 0, balance: 0,
    financeStatus: "не рассчитан", yandexLink: "", documents: [], comments: [],
  }));
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
      id: `${project.id}-T${index + 1}`,
      kind: "Задача",
      projectId: project.id,
      projectTitle: project.title,
      projectRegion: project.region || project.city || "Без региона",
      projectManager: project.manager,
      direction: project.direction,
      section: task.section || project.direction,
      clientBudget: Number(task.clientBudget) || 0,
      executorCost: Number(task.executorCost) || 0,
      ...task,
    }));

    const sectionTasks = projectSections(project).map((section, index) => ({
      id: `${project.id}-S${index + 1}`,
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
    return project.salesManagerId === user.id || project.source === "SmetaGo" || project.direction === "Недвижимость";
  }
  if (role === "head_of_sales") {
    return project.headOfSalesId === user.id || project.source === "SmetaGo" || project.direction === "Недвижимость";
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

function projectSections(project) {
  return Array.isArray(project.sections) ? project.sections : [];
}

function projectEconomy(project) {
  const sections = projectSections(project);
  const clientBudget = sections.reduce((sum, item) => sum + (Number(item.clientBudget) || 0), 0);
  const executorCost = sections.reduce((sum, item) => sum + (Number(item.executorCost) || 0), 0);
  const contractAmount = Number(project.contractAmount) || clientBudget || 0;
  const paidByClient = Number(project.paidByClient) || 0;
  const directCosts = Number(project.directCosts) || 0;
  const plannedExpenses = Number(project.plannedExpenses) || 0;
  const factualExpenses = Number(project.factualExpenses) || 0;
  const partnerPayouts = Number(project.partnerPayouts) || 0;
  const productionAllocationPercent = Number(project.productionAllocationPercent) || (Number(project.productionBudget) ? Math.round((Number(project.productionBudget) / Math.max(contractAmount, 1)) * 100) : 35);
  const allocatedProductionBudget = Number(project.productionBudget) || Math.round(contractAmount * (productionAllocationPercent / 100));
  const realizationCost = executorCost + directCosts + factualExpenses + partnerPayouts;
  const pmBudgetLeft = allocatedProductionBudget - realizationCost;
  const companyPlannedGross = contractAmount - allocatedProductionBudget;
  const grossProfit = paidByClient - realizationCost;
  const contractProfit = contractAmount - realizationCost;
  const receivable = Math.max(contractAmount - paidByClient, 0);
  const operatingCosts = Number(project.operatingCosts) || Math.round(paidByClient * 0.08);
  const payrollCosts = Number(project.payrollCosts) || Math.round(paidByClient * 0.12);
  const netProfit = grossProfit - operatingCosts - payrollCosts;
  const splitBase = Math.max(netProfit, 0);
  const companyShare = Math.round(splitBase * 0.67);
  const managerShare = Math.round(splitBase * 0.33);
  const margin = contractAmount ? Math.round((grossProfit / contractAmount) * 100) : 0;

  return {
    sections,
    clientBudget,
    executorCost,
    contractAmount,
    paidByClient,
    directCosts,
    plannedExpenses,
    factualExpenses,
    partnerPayouts,
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
        {items.map((item) => (
          <button key={item} type="button" onClick={() => showAction(`Открыт раздел: ${item}`)}>
            <span>{item}</span>
            <b>›</b>
          </button>
        ))}
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
        <button type="button" className="secondary" onClick={() => showAction(`Создан черновик согласования для проекта ${project.id}`)}>Создать согласование</button>
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

function ProjectDetails({ project, role, onTaskStatusChange, onProjectMessage, onAddClientParticipant, session }) {
  const canSeeMoney = roleCan(role, "viewFinance");
  const canSeeProductionBudget = roleCan(role, "viewProductionBudget") || canSeeMoney;
  const canSeeClient = roleCan(role, "viewClient") || roleCan(role, "manageProjects") || canSeeMoney;
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
          <Info label="Яндекс.Диск" value={project.yandexFolder || "не привязан"} />
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
              <b>{money(economy.realizationCost)}</b>
              <small>сумма всех разделов и прямых затрат</small>
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
          <Info label="К выплате исполнителям" value={money(economy.realizationCost)} />
          <Info label="Прибыль по факту оплат" value={money(economy.grossProfit)} />
          <Info label="Маржинальность" value={`${economy.margin}%`} />
        </div>

        <div className="sections-table">
          {economy.sections.length ? (
            economy.sections.map((section) => (
              <div key={`${project.id}-${section.name}`}>
                <div>
                  <b>{section.name}</b>
                  <span>{section.executor}{section.executorId ? ` · ${section.executorId}` : ""}</span>
                </div>
                <span>{section.due}</span>
                <em className={cn("status", statusClass(section.status))}>{section.status}</em>
                <strong>{money(section.clientBudget)}</strong>
                <strong>{money(section.executorCost)}</strong>
                <strong className="profit">{money((Number(section.clientBudget) || 0) - (Number(section.executorCost) || 0))}</strong>
              </div>
            ))
          ) : (
            <div className="empty">Разделы пока не добавлены. Для крупных проектов сюда лягут АР, КР, ОВ, ВК, ЭОМ, СС, ПОС, ОДИ, сметы, экспертиза.</div>
          )}
        </div>
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
                <button type="button" onClick={() => showAction(`Задача: ${task.name}. Статус: ${task.status}. Срок: ${task.due}`)}>Открыть</button>
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
            <button type="button" onClick={() => showAction(`Статус проекта ${project.id} передан в клиентское приложение`)}>Передать статус в приложение →</button>
          </section>
        </aside>
      </div>

      <ProjectChat project={project} role={role} session={session} onProjectMessage={onProjectMessage} />

      <div className="bottom-panels">
        <Panel title="Файлы" items={["ТЗ клиента.pdf", "Планировка.dwg", "Смета этапа.xlsx"]} />
        <Panel title="Отчёты" items={["Фотоотчёт 09.05", "Акт проверки", "Комментарий РП"]} />
        <Panel title="История действий" items={["Создан проект", "Назначен РП", "Изменён срок этапа"]} />
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
            {selectedArea === "regions" && selectedRegion && selectedRegionalDirection ? <button type="button" className="primary" onClick={() => setCreateOpen((value) => !value)}>Создать проект</button> : null}
          </div>
        </div>

        {createOpen ? (
          <div className="quick-form">
            <input value={projectForm.title} onChange={(event) => setProjectForm((next) => ({ ...next, title: event.target.value }))} placeholder="Название проекта" />
            <input value={projectForm.client} onChange={(event) => setProjectForm((next) => ({ ...next, client: event.target.value }))} placeholder="Клиент" />
            <input value={projectForm.city} onChange={(event) => setProjectForm((next) => ({ ...next, city: event.target.value }))} placeholder="Город" />
            <select value={projectForm.region} onChange={(event) => setProjectForm((next) => ({ ...next, region: event.target.value }))}>
              {regionOptions.filter((region) => region !== "Все регионы").map((region) => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
            <select value={projectForm.projectType} onChange={(event) => setProjectForm((next) => ({ ...next, projectType: event.target.value }))}>
              <option>Дизайн-проект</option>
              <option>Архитектурный проект</option>
              <option>Проектная документация по 87 постановлению</option>
              <option>Обследование / ТЗК / дефектный акт</option>
              <option>Изыскания</option>
              <option>Ремонт / строительство</option>
            </select>
            <select value={projectForm.direction} onChange={(event) => setProjectForm((next) => ({ ...next, direction: event.target.value }))}>
              <option>Дизайн / интерьер</option>
              <option>Проектный институт</option>
              <option>Ремонт / строительство</option>
              <option>Недвижимость</option>
              <option>Изыскания</option>
              <option>Обучение</option>
            </select>
            <input className="wide" value={projectForm.yandexFolder} onChange={(event) => setProjectForm((next) => ({ ...next, yandexFolder: event.target.value }))} placeholder="Ссылка на папку Яндекс.Диска" />
            <button type="button" className="primary" onClick={onCreateProject} disabled={!projectForm.title.trim()}>Сохранить проект</button>
          </div>
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

function ProjectDetailModule({ project, role, session, onBack, onTaskStatusChange, onProjectMessage, onAddClientParticipant, taskForm, setTaskForm, onCreateTask, executors }) {
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
        <button type="button" className="secondary" onClick={onBack}>Назад к реестру</button>
      </section>

      <ProjectDetails project={project} role={role} session={session} onTaskStatusChange={onTaskStatusChange} onProjectMessage={onProjectMessage} onAddClientParticipant={onAddClientParticipant} />

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
                <Info label="Регион" value={selectedTask.projectRegion} />
                <Info label="РП" value={selectedTask.projectManager} />
                <Info label="Исполнитель" value={executorLabel(selectedTask)} />
                <Info label="Срок" value={selectedTask.due} />
                <Info label="Статус" value={selectedTask.status} />
                <Info label="Бюджет клиента" value={money(selectedTask.clientBudget)} />
                <Info label="Оплата исполнителю" value={money(selectedTask.executorCost)} />
              </div>
              <div className="task-inspector-actions">
                <button type="button" className="secondary" onClick={() => showAction(selectedTask.yandexLink ? `Яндекс.Диск: ${selectedTask.yandexLink}` : "К задаче пока не привязана папка Яндекс.Диска")}>Яндекс.Диск</button>
                <button type="button" className="primary" onClick={() => showAction(`Открыт чат по задаче: ${selectedTask.name}`)}>Чат по задаче</button>
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
            <div><span>2. Переменные затраты / реализация</span><b>{money(summary.realizationCost)}</b></div>
            <div><span>3. Прибыль до постоянных</span><b>{money(summary.grossProfit)}</b></div>
            <div><span>4. Постоянные расходы</span><b>{money(summary.operatingCosts)}</b></div>
            <div><span>5. ФОТ направления</span><b>{money(summary.payrollCosts)}</b></div>
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
            <p className="section-hint">Колонки идут по смыслу Excel-отчёта: договор, факт оплат, остаток, реализация/себестоимость, прибыль до постоянных, фикс/ФОТ, чистая база и деление 67/33.</p>
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
            <strong>До постоянных</strong>
            <strong>Фикс+ФОТ</strong>
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
                <strong>{money(economy.operatingCosts + economy.payrollCosts)}</strong>
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
  const [projectForm, setProjectForm] = useState({ title: "", client: "", city: "", region: "ЧР", projectType: "Дизайн-проект", direction: "Дизайн / интерьер", yandexFolder: "" });
  const [taskForm, setTaskForm] = useState({ name: "", owner: "", executorId: "", due: "", status: "Новая", yandexLink: "" });
  const [actionNotice, setActionNotice] = useState("");

  const currentRole = roles.find((item) => item.id === role) ?? roles[0];
  const allTasks = useMemo(() => flattenTasks(projectItems), [projectItems]);
  const effectiveAccessUser = useMemo(() => {
    if (session?.role === role) return session;
    return users.find((user) => user.role === role) || session;
  }, [role, session, users]);

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
    if (!title) return;
    const nextIndex = projectItems.length + 1;
    const created = {
      id: `SG-${String(300 + nextIndex).padStart(3, "0")}`,
      title,
      client: projectForm.client.trim() || "Новый клиент",
      city: projectForm.city.trim() || "не указан",
      region: projectForm.region,
      responsibleRegion: projectForm.region,
      objectRegion: projectForm.region,
      objectCity: projectForm.city.trim() || "не указан",
      projectType: projectForm.projectType,
      direction: projectForm.direction,
      manager: "РП не назначен",
      executor: "—",
      partner: "—",
      budget: "0 ₽",
      margin: "0 ₽",
      status: "Новая",
      stage: "Квалификация",
      progress: 5,
      risk: "green",
      deadline: "не указан",
      source: "SmetaOffice",
      bitrix: {
        dealId: "",
        dealUrl: "",
        stage: "Не связано",
        syncStatus: "Черновая связь",
        source: "SmetaOffice",
      },
      yandexFolder: projectForm.yandexFolder.trim() || "не привязан",
      visibleFor: ["owner", "admin", "deputy", "director", "regional_manager", "pm", "project_manager", "finance", "accountant"],
      clientStatus: "Заявка принята. Команда уточняет детали проекта.",
      contractAmount: 0,
      paidByClient: 0,
      productionBudget: 0,
      plannedExpenses: 0,
      factualExpenses: 0,
      partnerPayouts: 0,
      operatingCosts: 0,
      payrollCosts: 0,
      paymentStatus: "не оплачен",
      directCosts: 0,
      tasks: [],
      sections: makeTemplateSections(projectForm.projectType),
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
    };
    setProjectItems((items) => [created, ...items]);
    selectProject(created.id);
    setProjectForm({ title: "", client: "", city: "", region: "ЧР", projectType: "Дизайн-проект", direction: "Дизайн / интерьер", yandexFolder: "" });
  }

  function createTask(projectId) {
    const name = taskForm.name.trim();
    if (!name) return;
    const createdTask = {
      name,
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
    setTaskForm({ name: "", owner: "", executorId: "", due: "", status: "Новая", yandexLink: "" });
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
            />
          ) : null}

          {role !== "executor" && activeSection === "projectDetail" ? (
            <ProjectDetailModule
              project={selectedProject}
              role={role}
              session={session}
              onBack={backToProjects}
              onTaskStatusChange={changeTaskStatus}
              onProjectMessage={addProjectMessage}
              onAddClientParticipant={addClientParticipant}
              taskForm={taskForm}
              setTaskForm={setTaskForm}
              onCreateTask={createTask}
              executors={executors}
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

