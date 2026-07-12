import http from "node:http";
import { readFile, writeFile, mkdir, rename, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, timingSafeEqual, pbkdf2Sync } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.SMETA_DATA_DIR ? path.resolve(process.env.SMETA_DATA_DIR) : path.join(__dirname, "data");
const dbPath = path.join(dataDir, "database.json");
const distDir = path.join(__dirname, "dist");
const port = Number(process.env.PORT || process.env.SMETA_API_PORT || 8787);
const host = process.env.HOST || "0.0.0.0";
const defaultAuthMode = process.env.NODE_ENV === "production" || process.env.RENDER || process.env.RENDER_SERVICE_ID ? "server" : "demo";
const authMode = process.env.SMETA_AUTH_MODE || defaultAuthMode;
const sessionTtlMs = Number(process.env.SMETA_SESSION_TTL_HOURS || 24) * 60 * 60 * 1000;

const defaultDb = {
  projects: [],
  executors: [],
  users: [],
  partners: [],
  salesLeads: [],
  salesDeals: [],
  salesActivities: [],
  salesEscalations: [],
  projectHandoffs: [],
  salesKpiSnapshots: [],
  financialPeriods: [],
  operationalExpenses: [],
  cashAccounts: [],
  directories: {
    regions: [],
    directions: [],
    projectTypes: [],
    partnerCategories: [],
    stageTemplates: {},
    financeTemplates: {},
    updatedAt: "",
  },
  integrationSettings: {
    webhookUrl: "",
    syncMode: "manual",
    lastCheck: "не запускалась",
    lastStatus: "",
    lastUser: "",
    qualifiedStageIds: "",
    importLimit: 20,
    writeBackEnabled: false,
  },
  syncLog: [],
  accessRequests: [],
  authSessions: {},
};

async function ensureDb() {
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(dbPath)) {
    await writeFile(dbPath, JSON.stringify(defaultDb, null, 2), "utf8");
  }
}

async function readDb() {
  await ensureDb();
  const raw = await readFile(dbPath, "utf8");
  try {
    return { ...defaultDb, ...JSON.parse(raw) };
  } catch (error) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    try {
      await copyFile(dbPath, path.join(dataDir, `database.corrupt-${stamp}.json`));
    } catch {}
    console.error("SmetaOffice database read failed; refusing to use empty fallback", error);
    throw new Error("SmetaOffice database is corrupted. Writes are blocked until database.json is repaired.");
  }
}

async function writeDb(nextDb) {
  await ensureDb();
  const tmpPath = `${dbPath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmpPath, JSON.stringify(nextDb, null, 2), "utf8");
  await rename(tmpPath, dbPath);
}

async function ensureBootstrapOwner() {
  const login = process.env.SMETA_BOOTSTRAP_OWNER_LOGIN;
  const password = process.env.SMETA_BOOTSTRAP_OWNER_PASSWORD;
  if (!login || !password) return;

  const db = await readDb();
  const users = db.users || [];
  if (users.some((user) => user.role === "owner" || user.login === login)) return;

  const hashed = hashPassword(password);
  await writeDb({
    ...db,
    users: [
      {
        id: `USR-${Date.now()}`,
        login,
        passwordSalt: hashed.salt,
        passwordHash: hashed.hash,
        role: "owner",
        name: process.env.SMETA_BOOTSTRAP_OWNER_NAME || "Owner",
        status: "active",
        region: "Все регионы",
        regions: ["Все регионы"],
        direction: "Все направления",
        position: "Основатель / владелец",
        createdAt: new Date().toISOString(),
      },
      ...users,
    ],
  });
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end(JSON.stringify(payload));
}

function publicUser(user) {
  if (!user) return null;
  const { password, passwordHash, passwordSalt, ...safeUser } = user;
  return { ...safeUser, hasPassword: Boolean(password || passwordHash) };
}

function publicUsers(users = []) {
  return users.map(publicUser);
}

const ALL_REGIONS = "Все регионы";
const ALL_DIRECTIONS = "Все направления";
const fullUserAdminRoles = ["owner", "admin"];
const scopedUserAdminRoles = ["regional_admin", "direction_admin"];
const scopedAdminManageableRoleIds = ["director", "head_of_department", "regional_manager", "pm", "gip", "project_manager", "sales_manager", "senior_sales_manager", "head_of_sales", "ecp_manager", "executor", "partner"];

function normalizeRegionName(region) {
  const value = String(region || "").trim();
  if (!value) return "Без региона";
  const aliases = {
    "ЧР": "Чеченская Республика",
    "Грозный": "Чеченская Республика",
    "Ростов": "Ростовская область",
    "Ростов-на-Дону": "Ростовская область",
    "ЛНР": "ДНР",
  };
  return aliases[value] || value;
}

function normalizeDirectionName(direction) {
  const value = String(direction || "").trim();
  if (!value) return "Без направления";
  const aliases = {
    "Агентство недвижимости": "Единый центр продаж",
    "Недвижимость": "Единый центр продаж",
    "Продажи": "Единый центр продаж",
  };
  return aliases[value] || value;
}

const ALL_REGIONS_READABLE = "\u0412\u0441\u0435 \u0440\u0435\u0433\u0438\u043e\u043d\u044b";

function isAllRegionsValue(region) {
  const normalized = normalizeRegionName(region);
  return normalized === ALL_REGIONS || normalized === ALL_REGIONS_READABLE;
}

function normalizePartnerCoverage(value, partner = {}) {
  const raw = String(value || "").trim().toLowerCase();
  if (["regional", "federal", "interregional"].includes(raw)) return raw;
  if (raw.includes("федера") || raw.includes("federal")) return "federal";
  if (raw.includes("меж") || raw.includes("друг") || raw.includes("inter")) return "interregional";
  const explicitRegions = Array.isArray(partner.regions) ? partner.regions : [];
  if (isAllRegionsValue(partner.region) || explicitRegions.some(isAllRegionsValue)) return "federal";
  const regionCount = new Set(explicitRegions.map(normalizeRegionName).filter((region) => region && !isAllRegionsValue(region))).size;
  return regionCount > 1 ? "interregional" : "regional";
}

function parsePartnerRegionsInput(value) {
  return [...new Set(
    String(value || "")
      .split(/[,;\n]/)
      .map((item) => normalizeRegionName(item))
      .filter((item) => item && !isAllRegionsValue(item))
  )];
}

function partnerServiceRegions(partner = {}) {
  const coverage = normalizePartnerCoverage(partner.coverage, partner);
  if (coverage === "federal") return [ALL_REGIONS_READABLE];
  const explicit = Array.isArray(partner.regions) ? partner.regions : parsePartnerRegionsInput(partner.regionsText);
  const regions = explicit.length ? explicit : [partner.region].filter(Boolean);
  return [...new Set(regions.map(normalizeRegionName).filter((region) => region && !isAllRegionsValue(region)))];
}

function partnerRegionMatches(user, partner) {
  if (normalizePartnerCoverage(partner.coverage, partner) === "federal") return true;
  const userRegions = userRegionList(user);
  if (userRegions.some(isAllRegionsValue)) return true;
  const regions = partnerServiceRegions(partner);
  return regions.some((region) => userRegions.includes(region));
}

function normalizePartnerRecord(partner = {}) {
  const coverage = normalizePartnerCoverage(partner.coverage, partner);
  const regions = partnerServiceRegions({ ...partner, coverage });
  const baseRegion = coverage === "federal" ? ALL_REGIONS_READABLE : normalizeRegionName(partner.region || regions[0] || "");
  return {
    ...partner,
    id: safeText(partner.id, 80) || `partner-${Date.now()}`,
    name: safeText(partner.name, 160),
    category: safeText(partner.category, 120),
    coverage,
    region: baseRegion,
    regions,
    direction: normalizeDirectionName(partner.direction || ALL_DIRECTIONS),
    contact: safeText(partner.contact, 200),
    relation: safeText(partner.relation, 160),
    serviceDescription: safeText(partner.serviceDescription, 500),
    commissionRule: safeText(partner.commissionRule, 260),
    status: safeText(partner.status, 80) || "\u041f\u0440\u043e\u0432\u0435\u0440\u043a\u0430",
    level: safeText(partner.level, 80) || "\u041d\u043e\u0432\u044b\u0439",
    rating: Math.max(0, Math.min(100, Number(partner.rating) || 0)),
    active: Math.max(0, Number(partner.active) || 0),
    overdue: Math.max(0, Number(partner.overdue) || 0),
    accrued: safeMoney(partner.accrued),
    paid: safeMoney(partner.paid),
  };
}

function userRegionList(user) {
  const list = Array.isArray(user?.regions) && user.regions.length ? user.regions : [user?.region].filter(Boolean);
  return list.length ? list.map(normalizeRegionName) : [ALL_REGIONS];
}

function regionScopeMatches(manager, target) {
  const managerRegions = userRegionList(manager);
  if (managerRegions.includes(ALL_REGIONS)) return true;
  const targetRegions = userRegionList(target);
  if (targetRegions.includes(ALL_REGIONS)) return false;
  return targetRegions.some((region) => managerRegions.includes(region));
}

function canManageUserRecord(manager, target) {
  if (!manager || !target) return false;
  if (fullUserAdminRoles.includes(manager.role)) return true;
  if (!scopedUserAdminRoles.includes(manager.role)) return false;
  if (!scopedAdminManageableRoleIds.includes(target.role)) return false;
  if (!regionScopeMatches(manager, target)) return false;
  if (manager.role === "direction_admin") {
    const managerDirection = normalizeDirectionName(manager.direction || ALL_DIRECTIONS);
    return managerDirection === ALL_DIRECTIONS || normalizeDirectionName(target.direction) === managerDirection;
  }
  return true;
}

function visibleUsersFor(manager, users = []) {
  if (!manager) return [];
  if (fullUserAdminRoles.includes(manager.role) || manager.role === "deputy") return users;
  return users.filter((user) => user.id === manager.id || canManageUserRecord(manager, user));
}

function canViewFullIntegrationSettings(user) {
  return ["owner", "admin", "deputy"].includes(user?.role);
}

function visibleIntegrationSettingsFor(user, settings = defaultDb.integrationSettings) {
  if (canViewFullIntegrationSettings(user)) return settings;
  return {
    ...settings,
    webhookUrl: settings.webhookUrl ? "configured" : "",
  };
}

function canAccessRegion(user, item) {
  if (!user) return false;
  if (["owner", "admin", "deputy", "finance", "accountant"].includes(user.role)) return true;
  const userRegions = userRegionList(user);
  return userRegions.includes(ALL_REGIONS) || userRegions.includes(normalizeRegionName(item?.region || item?.city));
}

function projectSections(project) {
  return Array.isArray(project?.sections) ? project.sections : [];
}

function taskAssignedToUser(user, task) {
  if (!user || !task) return false;
  const executorId = user.executorId || user.id;
  return Boolean(
    (executorId && (task.executorId === executorId || task.assigneeId === executorId)) ||
      task.owner === user.name ||
      task.executor === user.name
  );
}

function canAccessProject(user, project) {
  if (!user || !project) return false;
  if (["owner", "admin", "deputy", "finance", "accountant"].includes(user.role)) return true;

  if (user.role === "executor" || user.role === "partner") {
    if (user.role === "partner" && project.partnerUserId === user.id) return true;
    return [...(project.tasks || []), ...projectSections(project)].some((task) => taskAssignedToUser(user, task));
  }

  if (user.role === "gip") return true;

  if (!canAccessRegion(user, project)) return false;
  if (user.role === "regional_admin" || user.role === "regional_manager") return true;
  if (user.role === "direction_admin") return user.direction === ALL_DIRECTIONS || normalizeDirectionName(project.direction) === normalizeDirectionName(user.direction);
  if (user.role === "director") return project.directorUserId === user.id || normalizeDirectionName(project.direction) === normalizeDirectionName(user.direction);
  if (user.role === "head_of_department") return normalizeDirectionName(project.direction) === normalizeDirectionName(user.direction);
  if (user.role === "pm") return project.pmUserId === user.id || project.managerId === user.id || project.manager === user.name;
  if (user.role === "project_manager") return project.projectManagerId === user.id || project.pmUserId === user.id || project.managerId === user.id || project.manager === user.name;
  if (user.role === "sales_manager") return project.salesManagerId === user.id;
  if (user.role === "head_of_sales") return project.headOfSalesId === user.id || Boolean(project.salesManagerId) || project.source === "SmetaGo";
  return false;
}

function restrictProjectForUser(user, project) {
  if (!project || !user) return null;
  if (!["executor", "partner"].includes(user.role)) return project;

  const tasks = (project.tasks || []).filter((task) => taskAssignedToUser(user, task));
  const sections = projectSections(project).filter((section) => taskAssignedToUser(user, section));
  const partnerProject = user.role === "partner" && project.partnerUserId === user.id;
  if (!tasks.length && !sections.length && !partnerProject) return null;

  return {
    ...project,
    tasks,
    sections,
    client: partnerProject ? project.client : "Скрыто",
    clientStatus: partnerProject ? project.clientStatus : "Доступен только назначенный объём работ.",
  };
}

const projectFinanceFields = [
  "budget",
  "margin",
  "contractAmount",
  "paidByClient",
  "productionBudget",
  "directCosts",
  "plannedExpenses",
  "actualExpenses",
  "executorCost",
  "partnerPayouts",
  "paidToExecutors",
  "paidToPartners",
  "operatingCosts",
  "payrollCosts",
  "salesCommissionPercent",
  "salesCommissionAmount",
  "companyPlannedGross",
  "grossProfit",
  "contractProfit",
  "netProfit",
  "marginPercent",
];

const projectProductionFinanceFields = projectFinanceFields.filter((field) => !["contractAmount", "paidByClient", "budget"].includes(field));
const sectionClientFinanceFields = ["clientBudget", "clientPrice", "priceForClient"];
const sectionExecutorFinanceFields = ["executorCost", "paid", "balance", "bonus", "penalty", "holdback", "financialStatus"];

function omitFields(item, fields) {
  const next = { ...item };
  fields.forEach((field) => delete next[field]);
  return next;
}

function projectFinanceAccessLevel(user) {
  if (!user) return "none";
  if (["owner", "admin", "deputy", "finance", "accountant", "regional_admin", "direction_admin", "director", "head_of_department", "regional_manager", "pm", "project_manager"].includes(user.role)) return "full";
  if (["sales_manager", "head_of_sales"].includes(user.role)) return "sales";
  if (["executor", "partner"].includes(user.role)) return "ownPayout";
  return "none";
}

function sanitizeSectionFinanceForUser(user, section) {
  const level = projectFinanceAccessLevel(user);
  if (level === "full") return section;
  if (level === "sales") return omitFields(section, sectionExecutorFinanceFields);
  if (level === "ownPayout") return omitFields(section, sectionClientFinanceFields);
  return omitFields(section, [...sectionClientFinanceFields, ...sectionExecutorFinanceFields]);
}

function sanitizeProjectFinanceForUser(user, project) {
  const level = projectFinanceAccessLevel(user);
  const withSections = {
    ...project,
    tasks: (project.tasks || []).map((task) => sanitizeSectionFinanceForUser(user, task)),
    sections: projectSections(project).map((section) => sanitizeSectionFinanceForUser(user, section)),
  };

  if (level === "full") return withSections;
  if (level === "sales") return omitFields(withSections, projectProductionFinanceFields);
  return omitFields(withSections, projectFinanceFields);
}

function visibleProjectsFor(user, projects = []) {
  if (!user) return [];
  return projects
    .filter((project) => canAccessProject(user, project))
    .map((project) => restrictProjectForUser(user, project))
    .filter(Boolean)
    .map((project) => sanitizeProjectFinanceForUser(user, project));
}

function canAccessPartner(user, partner) {
  if (!user || !partner) return false;
  const normalizedPartner = normalizePartnerRecord(partner);
  if (["owner", "admin", "deputy", "finance", "accountant"].includes(user.role)) return true;
  if (user.role === "partner") return normalizedPartner.userId === user.id || normalizedPartner.partnerUserId === user.id || normalizedPartner.name === user.name;
  if (!partnerRegionMatches(user, normalizedPartner)) return false;
  if (user.role === "regional_admin" || user.role === "regional_manager") return true;
  if (user.role === "direction_admin" || user.role === "director" || user.role === "head_of_department" || user.role === "pm" || user.role === "project_manager") {
    return user.direction === ALL_DIRECTIONS || normalizeDirectionName(normalizedPartner.direction) === normalizeDirectionName(user.direction);
  }
  if (user.role === "head_of_sales" || user.role === "sales_manager") {
    return normalizeDirectionName(normalizedPartner.direction) === "Единый центр продаж" || normalizedPartner.relation === "Партнёр приводит нам клиентов";
  }
  return false;
}

function visiblePartnersFor(user, partners = []) {
  return partners.map(normalizePartnerRecord).filter((partner) => canAccessPartner(user, partner));
}

const salesLeadDirectionMap = {
  design: "Бюро архитектуры и дизайна",
  architecture: "Бюро архитектуры и дизайна",
  project_institute: "Проектный институт",
  repair: "Строительство и ремонт",
  realty: "Единый центр продаж",
  surveys: "Изыскания / обследования / обмеры",
  completion: "Комплектация",
  service: "Бытовые услуги / сервис",
};

function leadDirectionMatches(user, lead) {
  const userDirection = normalizeDirectionName(user?.direction || ALL_DIRECTIONS);
  if (userDirection === ALL_DIRECTIONS) return true;
  const leadDirection = normalizeDirectionName(salesLeadDirectionMap[lead?.direction] || lead?.direction);
  return leadDirection === userDirection || userDirection === "Единый центр продаж";
}

function userSalesIdentityIds(user = {}) {
  return new Set([
    user.id,
    user.bitrixUserId ? `B24-${user.bitrixUserId}` : "",
    user.bitrixId ? `B24-${user.bitrixId}` : "",
    user.externalUserId || "",
    user.crmUserId || "",
  ].filter(Boolean).map(String));
}

function salesAssignedIds(item = {}) {
  return [
    item.salesManagerId,
    item.hunterId,
    item.farmerId,
    item.seniorManagerId,
    item.salesHeadId,
    item.headOfSalesId,
    item.ecpManagerId,
    item.regionOwnerId,
    item.partnerId,
    item.projectManagerId,
    item.productionOwnerId,
  ].filter(Boolean).map(String);
}

function salesRecordAssignedTo(user, item = {}, fields = []) {
  const identities = userSalesIdentityIds(user);
  const assigned = fields.length ? fields.map((field) => item[field]).filter(Boolean).map(String) : salesAssignedIds(item);
  return assigned.some((id) => identities.has(id));
}

function canAccessSalesLead(user, lead) {
  if (!user || !lead) return false;
  if (["owner", "admin", "deputy", "finance", "accountant"].includes(user.role)) return true;
  if (user.role === "regional_admin") return canAccessRegion(user, lead);
  if (user.role === "direction_admin") return canAccessRegion(user, lead) && leadDirectionMatches(user, lead);
  if (user.role === "head_of_sales" || user.role === "ecp_manager") return canAccessRegion(user, lead);
  if (user.role === "senior_sales_manager") return canAccessRegion(user, lead) || salesRecordAssignedTo(user, lead, ["seniorManagerId", "salesHeadId", "headOfSalesId"]);
  if (user.role === "sales_manager") return salesRecordAssignedTo(user, lead, ["salesManagerId", "hunterId", "farmerId"]);
  if (user.role === "partner") return salesRecordAssignedTo(user, lead, ["partnerId", "farmerId"]);
  if (user.role === "pm" || user.role === "project_manager") return salesRecordAssignedTo(user, lead, ["farmerId", "projectManagerId", "productionOwnerId"]) || Boolean(lead.projectId);
  if (user.role === "director") return canAccessRegion(user, lead) && leadDirectionMatches(user, lead);
  if (user.role === "regional_manager") return canAccessRegion(user, lead);
  return false;
}

function visibleSalesLeadsFor(user, salesLeads = []) {
  return salesLeads.filter((lead) => canAccessSalesLead(user, lead));
}

function canViewManagementFinance(user) {
  return ["owner", "deputy", "finance", "accountant", "director", "regional_manager"].includes(user?.role);
}

function canEditManagementFinance(user) {
  return ["owner", "deputy", "finance", "accountant"].includes(user?.role);
}

function canAccessFinanceItem(user, item = {}) {
  if (!canViewManagementFinance(user)) return false;
  if (["owner", "deputy", "finance", "accountant"].includes(user.role)) return true;
  if (!canAccessRegion(user, item)) return false;
  if (user.role === "regional_manager") return true;
  if (user.role === "director") {
    const itemDirection = normalizeDirectionName(item.direction || ALL_DIRECTIONS);
    const userDirection = normalizeDirectionName(user.direction || ALL_DIRECTIONS);
    return itemDirection === ALL_DIRECTIONS || userDirection === ALL_DIRECTIONS || itemDirection === userDirection;
  }
  return false;
}

function visibleFinanceItemsFor(user, items = []) {
  return items.filter((item) => canAccessFinanceItem(user, item));
}

function safeText(value, max = 160) {
  return String(value || "").trim().slice(0, max);
}

function safeMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(-1_000_000_000_000, Math.min(Math.round(number), 1_000_000_000_000));
}

const salesClosedStages = new Set(["proposal_sent", "contract_and_advance", "contract_advance", "deposit", "project_handoff", "transferred_to_project", "won", "archive"]);
const salesHandoffStages = new Set(["contract_and_advance", "contract_advance", "deposit", "project_handoff", "transferred_to_project"]);
const handoffCheckLabels = {
  client: "Клиент",
  contact: "Контакт",
  region: "Регион",
  direction: "Направление",
  object: "Объект / что продано",
  sold_scope: "Состав услуги",
  amount: "Сумма КП / договора",
  advance: "Оплата / аванс",
  sales_owner: "Ответственный продаж",
  production_owner: "Ответственный производства",
  files_or_comment: "Файлы / комментарий",
  production_next_step: "Следующий шаг",
};

function isoOrNow(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString();
}

function salesStageFromLead(lead = {}) {
  if (lead.salesStage) return safeText(lead.salesStage, 80);
  if (lead.stage === "contract_advance") return "contract_and_advance";
  if (lead.stage === "deposit") return "contract_and_advance";
  if (lead.projectId) return "transferred_to_project";
  return safeText(lead.stage, 80) || "qualified";
}

function salesSlaStatus(deal = {}, now = new Date()) {
  if (deal.firstResponseAt || salesClosedStages.has(deal.salesStage || deal.stage) || deal.projectId) return "closed";
  const createdAt = deal.createdAt || new Date().toISOString();
  const deadline = deal.slaDeadlineAt || new Date(Date.parse(createdAt) + 5 * 60 * 1000).toISOString();
  const diff = Date.parse(deadline) - now.getTime();
  if (!Number.isFinite(diff)) return "unknown";
  if (diff <= 0) return "breached";
  if (diff <= 2 * 60 * 1000) return "warning";
  return "ok";
}

function daysBetween(start, end = new Date()) {
  const started = Date.parse(start || "");
  if (!Number.isFinite(started)) return 0;
  return Math.max(0, Math.floor((end.getTime() - started) / (24 * 60 * 60 * 1000)));
}

function salesDealRisk(deal = {}, now = new Date()) {
  if (salesSlaStatus(deal, now) === "breached") return { riskLevel: "red", riskReason: "sla_breached" };
  if (!deal.nextStep && !salesClosedStages.has(deal.salesStage)) return { riskLevel: "yellow", riskReason: "no_next_step" };
  if (deal.nextStepDueAt && Date.parse(deal.nextStepDueAt) < now.getTime()) return { riskLevel: "red", riskReason: "next_step_overdue" };
  if (daysBetween(deal.lastContactAt || deal.updatedAt || deal.createdAt, now) >= 3 && !salesClosedStages.has(deal.salesStage)) return { riskLevel: "yellow", riskReason: "no_movement_3_days" };
  return { riskLevel: "green", riskReason: "" };
}

function salesDealFromLead(lead = {}) {
  const createdAt = isoOrNow(lead.createdAt);
  const salesStage = salesStageFromLead(lead);
  const contractAmount = safeMoney(lead.contractAmount || lead.amount || lead.budget || 0);
  const paidAmount = safeMoney(lead.paidAmount || lead.paid || 0);
  const base = {
    id: lead.salesDealId || lead.id || `SD-${Date.now()}`,
    sourceSystem: lead.bitrixDealId ? "Bitrix24" : safeText(lead.sourceSystem || lead.source || "manual", 80),
    sourceId: safeText(lead.bitrixDealId || lead.sourceId || lead.id, 120),
    leadId: lead.id || "",
    bitrixDealId: lead.bitrixDealId || "",
    createdAt,
    updatedAt: isoOrNow(lead.updatedAt || lead.lastBitrixSyncAt || lead.lastActivityAt || createdAt),
    clientName: safeText(lead.clientName || lead.title || "Client", 200),
    phone: safeText(lead.clientPhone || lead.phone, 80),
    email: safeText(lead.clientEmail || lead.email, 140),
    region: normalizeRegionName(lead.region || ALL_REGIONS),
    direction: safeText(lead.direction || "design", 100),
    objectName: safeText(lead.objectName || lead.objectType || lead.city, 200),
    clientNeed: safeText(lead.clientNeed || lead.requestText || lead.comment, 1000),
    source: safeText(lead.source || "Bitrix24", 120),
    channel: safeText(lead.channel || "", 120),
    bitrixStage: safeText(lead.rawStage || lead.bitrixStage || lead.stage, 120),
    salesStage,
    status: safeText(lead.status || "active", 80),
    hunterId: safeText(lead.hunterId || lead.salesManagerId, 120),
    farmerId: safeText(lead.farmerId || "", 120),
    partnerId: safeText(lead.partnerId || "", 120),
    salesManagerId: safeText(lead.salesManagerId || lead.hunterId || lead.farmerId, 120),
    seniorManagerId: safeText(lead.seniorManagerId || "", 120),
    salesHeadId: safeText(lead.salesHeadId || lead.headOfSalesId || "", 120),
    ecpManagerId: safeText(lead.ecpManagerId || "", 120),
    regionOwnerId: safeText(lead.regionOwnerId || "", 120),
    productionOwnerId: safeText(lead.productionOwnerId || "", 120),
    projectManagerId: safeText(lead.projectManagerId || "", 120),
    amountPotential: safeMoney(lead.amountPotential || lead.amount || lead.budget || 0),
    quoteAmount: safeMoney(lead.quoteAmount || 0),
    contractAmount,
    paidAmount,
    expectedPayment: Math.max(0, contractAmount - paidAmount),
    probability: Math.max(0, Math.min(Number(lead.probability || (contractAmount ? 80 : 50)), 100)),
    firstResponseAt: lead.firstResponseAt || "",
    lastContactAt: lead.lastContactAt || lead.lastActivityAt || lead.updatedAt || createdAt,
    nextStep: safeText(lead.nextStep || "", 240),
    nextStepDueAt: safeText(lead.nextStepDueAt || "", 40),
    lostReason: safeText(lead.lostReason || lead.refusalReason || "", 300),
    projectHandoffStatus: safeText(lead.projectHandoffStatus || (lead.projectId ? "transferred" : ""), 80),
    projectId: safeText(lead.projectId || "", 120),
    smetaOfficeProjectLink: safeText(lead.smetaOfficeProjectLink || "", 300),
    yandexDiskUrl: safeText(lead.yandexDiskUrl || lead.diskUrl || "", 300),
    objectAddress: safeText(lead.objectAddress || lead.address || "", 300),
    comment: safeText(lead.comment || "", 1000),
    rawLeadId: lead.id || "",
  };
  const risk = salesDealRisk(base);
  return {
    ...base,
    weightedForecast: Math.round(base.amountPotential * (base.probability / 100)),
    slaStatus: salesSlaStatus(base),
    responseMinutes: base.firstResponseAt ? Math.max(0, Math.round((Date.parse(base.firstResponseAt) - Date.parse(base.createdAt)) / 60000)) : null,
    daysWithoutMovement: daysBetween(base.lastContactAt || base.updatedAt || base.createdAt),
    overdue: risk.riskLevel === "red",
    riskLevel: risk.riskLevel,
    riskReason: risk.riskReason,
    crmQualityScore: salesCrmQuality(base),
    missingFields: salesMissingFields(base),
  };
}

function salesMissingFields(deal = {}) {
  const required = [
    ["clientName", deal.clientName],
    ["region", deal.region],
    ["direction", deal.direction],
    ["objectName", deal.objectName],
    ["contractAmount", deal.contractAmount || deal.quoteAmount || deal.amountPotential],
    ["paidAmount", deal.paidAmount],
    ["salesManagerId", deal.salesManagerId],
    ["nextStep", deal.nextStep],
  ];
  return required.filter(([, value]) => value === undefined || value === null || String(value).trim() === "").map(([field]) => field);
}

function salesCrmQuality(deal = {}) {
  const total = 8;
  const missing = salesMissingFields(deal).length;
  return Math.max(0, Math.round(((total - missing) / total) * 100));
}

function normalizeSalesDeal(item = {}) {
  const normalized = salesDealFromLead({
    ...item,
    id: item.id || `SD-${Date.now()}`,
    stage: item.salesStage || item.stage,
    amount: item.amountPotential,
    budget: item.amountPotential,
    hunterId: item.hunterId || item.salesManagerId,
    headOfSalesId: item.salesHeadId,
  });
  return {
    ...normalized,
    sourceSystem: safeText(item.sourceSystem || normalized.sourceSystem, 80),
    sourceId: safeText(item.sourceId || normalized.sourceId, 120),
    salesStage: salesStageFromLead(item),
    escalationLevel: safeText(item.escalationLevel || "", 80),
    escalationTargetUserId: safeText(item.escalationTargetUserId || "", 120),
    escalationNote: safeText(item.escalationNote || "", 700),
  };
}

function allSalesDeals(db = {}) {
  const explicit = (db.salesDeals || []).map(normalizeSalesDeal);
  const fromLeads = (db.salesLeads || []).map(salesDealFromLead);
  const map = new Map();
  [...fromLeads, ...explicit].forEach((deal) => {
    const key = deal.sourceSystem && deal.sourceId ? `${deal.sourceSystem}:${deal.sourceId}` : deal.id;
    map.set(key, { ...(map.get(key) || {}), ...deal });
  });
  return Array.from(map.values()).map(normalizeSalesDeal);
}

function canAccessSalesDeal(user, deal) {
  if (!user || !deal) return false;
  if (["owner", "admin", "deputy", "finance", "accountant"].includes(user.role)) return true;
  if (["regional_admin", "regional_manager"].includes(user.role)) return canAccessRegion(user, deal);
  if (["direction_admin", "director", "head_of_department"].includes(user.role)) return canAccessRegion(user, deal) && leadDirectionMatches(user, deal);
  if (user.role === "head_of_sales" || user.role === "ecp_manager") return canAccessRegion(user, deal);
  if (user.role === "senior_sales_manager") return canAccessRegion(user, deal) || salesRecordAssignedTo(user, deal, ["seniorManagerId", "salesHeadId", "headOfSalesId"]);
  if (user.role === "sales_manager") return salesRecordAssignedTo(user, deal, ["salesManagerId", "hunterId", "farmerId"]);
  if (["pm", "project_manager", "gip"].includes(user.role)) return Boolean(deal.projectId || deal.projectHandoffStatus);
  if (user.role === "partner") return salesRecordAssignedTo(user, deal, ["partnerId", "farmerId"]);
  return false;
}

function visibleSalesDealsFor(user, db = {}) {
  return allSalesDeals(db).filter((deal) => canAccessSalesDeal(user, deal));
}

function canAccessSalesKpiSnapshot(user, item = {}) {
  if (!user || !item) return false;
  if (["owner", "admin", "deputy", "finance", "accountant"].includes(user.role)) return true;
  if (["regional_admin", "regional_manager", "head_of_sales", "ecp_manager"].includes(user.role)) return canAccessRegion(user, item);
  if (["direction_admin", "director", "head_of_department"].includes(user.role)) return canAccessRegion(user, item) && leadDirectionMatches(user, item);
  if (user.role === "senior_sales_manager") return canAccessRegion(user, item) || salesRecordAssignedTo(user, item, ["seniorManagerId", "salesHeadId", "headOfSalesId", "managerId", "userId"]);
  if (user.role === "sales_manager") return salesRecordAssignedTo(user, item, ["salesManagerId", "hunterId", "farmerId", "managerId", "userId"]);
  return false;
}

function visibleSalesKpiSnapshotsFor(user, items = []) {
  return items.filter((item) => canAccessSalesKpiSnapshot(user, item));
}

function canAccessSalesChild(user, item = {}, db = {}) {
  const dealId = item.dealId || item.salesDealId || item.sourceId || item.leadId;
  const deal = allSalesDeals(db).find((entry) => entry.id === dealId || entry.sourceId === dealId || entry.leadId === dealId);
  return deal ? canAccessSalesDeal(user, deal) : ["owner", "admin", "deputy"].includes(user?.role);
}

function visibleSalesChildrenFor(user, items = [], db = {}) {
  return items.filter((item) => canAccessSalesChild(user, item, db));
}

function handoffChecklist(deal = {}) {
  const checks = [
    ["client", Boolean(deal.clientName)],
    ["contact", Boolean(deal.phone || deal.email)],
    ["region", Boolean(deal.region)],
    ["direction", Boolean(deal.direction)],
    ["object", Boolean(deal.objectName)],
    ["sold_scope", Boolean(deal.clientNeed || deal.objectName)],
    ["amount", Boolean(deal.contractAmount || deal.quoteAmount)],
    ["advance", Number(deal.paidAmount) > 0],
    ["sales_owner", Boolean(deal.salesManagerId)],
    ["production_owner", Boolean(deal.productionOwnerId || deal.projectManagerId)],
    ["files_or_comment", Boolean(deal.smetaOfficeProjectLink || deal.comment || deal.clientNeed)],
    ["production_next_step", Boolean(deal.nextStep)],
  ];
  return checks.map(([id, ok]) => ({ id, label: handoffCheckLabels[id] || id, ok }));
}

function isProjectHandoffEligibleDeal(deal = {}) {
  return Boolean(
    deal.projectId ||
    salesHandoffStages.has(deal.salesStage) ||
    ["draft", "ready", "accepted", "transferred"].includes(deal.projectHandoffStatus)
  );
}

function normalizeProjectHandoff(item = {}, db = {}) {
  const deal = allSalesDeals(db).find((entry) => entry.id === item.salesDealId || entry.sourceId === item.salesDealId || entry.leadId === item.salesDealId) || {};
  const checklist = Array.isArray(item.checklist) ? item.checklist : handoffChecklist(deal);
  const status = item.status || (item.projectId || deal.projectId ? "transferred" : checklist.every((row) => row.ok) ? "ready" : "draft");
  return {
    id: safeText(item.id, 100) || `PH-${Date.now()}`,
    salesDealId: safeText(item.salesDealId || deal.id || "", 120),
    projectId: safeText(item.projectId || deal.projectId || "", 120),
    status: safeText(status, 80),
    checklist,
    missingData: checklist.filter((row) => !row.ok).map((row) => row.id),
    createdBy: safeText(item.createdBy || "", 120),
    acceptedBy: safeText(item.acceptedBy || "", 120),
    createdAt: isoOrNow(item.createdAt),
    acceptedAt: item.acceptedAt || "",
    transferredAt: item.transferredAt || "",
    comment: safeText(item.comment || "", 700),
  };
}

function allProjectHandoffs(db = {}, deals = allSalesDeals(db)) {
  const explicit = (db.projectHandoffs || []).map((item) => normalizeProjectHandoff(item, db));
  const map = new Map();
  explicit.forEach((handoff) => {
    const key = handoff.salesDealId || handoff.projectId || handoff.id;
    map.set(key, handoff);
  });

  const dbWithDeals = { ...db, salesDeals: deals };
  deals.filter(isProjectHandoffEligibleDeal).forEach((deal) => {
    const key = deal.id;
    if (map.has(key)) return;
    map.set(key, normalizeProjectHandoff({
      id: `PH-AUTO-${deal.id}`,
      salesDealId: deal.id,
      projectId: deal.projectId || "",
      status: deal.projectId || deal.projectHandoffStatus === "transferred" ? "transferred" : deal.projectHandoffStatus === "accepted" ? "accepted" : "",
      createdAt: deal.updatedAt || deal.createdAt,
      comment: "Системный чек-лист передачи из продаж в проект",
    }, dbWithDeals));
  });

  return Array.from(map.values()).map((item) => normalizeProjectHandoff(item, dbWithDeals));
}

function normalizeSalesActivity(item = {}) {
  return {
    id: safeText(item.id, 100) || `SA-${Date.now()}`,
    dealId: safeText(item.dealId || item.salesDealId || "", 120),
    type: safeText(item.type || "note", 80),
    createdAt: isoOrNow(item.createdAt),
    createdBy: safeText(item.createdBy || "", 120),
    result: safeText(item.result || "", 700),
    nextStep: safeText(item.nextStep || "", 240),
    nextStepDueAt: safeText(item.nextStepDueAt || item.nextStepDue || "", 40),
    sourceSystem: safeText(item.sourceSystem || "SmetaOffice", 80),
    sourceId: safeText(item.sourceId || "", 120),
  };
}

function normalizeSalesEscalation(item = {}) {
  return {
    id: safeText(item.id, 100) || `SE-${Date.now()}`,
    dealId: safeText(item.dealId || item.salesDealId || "", 120),
    fromUserId: safeText(item.fromUserId || "", 120),
    toUserId: safeText(item.toUserId || "", 120),
    level: safeText(item.level || "manager", 80),
    reason: safeText(item.reason || "", 300),
    status: safeText(item.status || "open", 80),
    createdAt: isoOrNow(item.createdAt),
    resolvedAt: item.resolvedAt || "",
    comment: safeText(item.comment || "", 700),
  };
}

function salesEscalationLevel(deal = {}) {
  if (deal.riskLevel === "red") return "head_of_sales";
  if (deal.riskLevel === "yellow") return "senior_sales_manager";
  return "manager";
}

function allSalesEscalations(db = {}, deals = allSalesDeals(db)) {
  const explicit = (db.salesEscalations || []).map(normalizeSalesEscalation);
  const map = new Map();
  explicit.forEach((item) => {
    const key = `${item.dealId || item.salesDealId}:${item.reason}:${item.status}`;
    map.set(key, item);
  });

  deals
    .filter((deal) => deal.riskLevel && deal.riskLevel !== "green" && !["archive", "won"].includes(deal.salesStage))
    .forEach((deal) => {
      const reason = safeText(deal.riskReason || deal.riskLevel, 300);
      const key = `${deal.id}:${reason}:open`;
      if (map.has(key)) return;
      map.set(key, normalizeSalesEscalation({
        id: `SE-AUTO-${deal.id}-${reason}`,
        dealId: deal.id,
        fromUserId: deal.salesManagerId || "",
        toUserId: deal.salesHeadId || deal.seniorManagerId || deal.ecpManagerId || deal.regionOwnerId || "",
        level: salesEscalationLevel(deal),
        reason,
        status: "open",
        createdAt: deal.nextStepDueAt || deal.updatedAt || deal.createdAt,
        comment: "Системная эскалация по риску сделки",
      }));
    });

  return Array.from(map.values()).map(normalizeSalesEscalation);
}

function salesControlReport(deals = [], activities = [], escalations = [], handoffs = []) {
  const activeDeals = deals.filter((deal) => !["archive", "won"].includes(deal.salesStage));
  const contractDeals = deals.filter((deal) => ["contract_and_advance", "contract_advance", "deposit"].includes(deal.salesStage));
  const quoteDeals = deals.filter((deal) => deal.salesStage === "proposal_sent");
  const transferredDealIds = new Set(handoffs.filter((item) => item.projectId || item.status === "transferred").map((item) => item.salesDealId));
  const transferredDeals = deals.filter((deal) => deal.projectId || deal.projectHandoffStatus === "transferred" || transferredDealIds.has(deal.id));
  const contractAmount = deals.reduce((sum, deal) => sum + (Number(deal.contractAmount) || 0), 0);
  const paidAmount = deals.reduce((sum, deal) => sum + (Number(deal.paidAmount) || 0), 0);
  return {
    dealsCount: deals.length,
    activeDealsCount: activeDeals.length,
    quoteCount: quoteDeals.length,
    contractCount: contractDeals.length,
    transferredCount: transferredDeals.length,
    contractAmount,
    paidAmount,
    expectedPayment: Math.max(0, contractAmount - paidAmount),
    slaViolations: deals.filter((deal) => deal.slaStatus === "breached").length,
    overdueCount: deals.filter((deal) => deal.overdue).length,
    openEscalations: escalations.filter((item) => item.status !== "closed").length,
    readyHandoffs: handoffs.filter((item) => item.status === "ready").length,
    acceptedHandoffs: handoffs.filter((item) => item.status === "accepted").length,
    crmQualityAverage: deals.length ? Math.round(deals.reduce((sum, deal) => sum + (Number(deal.crmQualityScore) || 0), 0) / deals.length) : 0,
  };
}

function normalizeFinancialPeriod(item = {}) {
  return {
    id: safeText(item.id, 80) || `fp-${Date.now()}`,
    periodType: ["month", "quarter", "year"].includes(item.periodType) ? item.periodType : "month",
    periodKey: safeText(item.periodKey, 20),
    region: normalizeRegionName(item.region || ALL_REGIONS),
    direction: normalizeDirectionName(item.direction || ALL_DIRECTIONS),
    revenueManual: safeMoney(item.revenueManual),
    projectCostsManual: safeMoney(item.projectCostsManual),
    grossManual: safeMoney(item.grossManual),
    accumulatedLossOpening: safeMoney(item.accumulatedLossOpening),
    planRevenue: safeMoney(item.planRevenue),
    planNetProfit: safeMoney(item.planNetProfit),
    note: safeText(item.note, 700),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeOperationalExpense(item = {}) {
  return {
    id: safeText(item.id, 80) || `oe-${Date.now()}`,
    periodKey: safeText(item.periodKey, 20),
    date: safeText(item.date, 30),
    region: normalizeRegionName(item.region || ALL_REGIONS),
    direction: normalizeDirectionName(item.direction || ALL_DIRECTIONS),
    category: safeText(item.category, 80) || "Прочие расходы",
    amount: Math.max(0, safeMoney(item.amount)),
    paymentStatus: safeText(item.paymentStatus, 40) || "план",
    source: safeText(item.source, 80) || "ручной ввод",
    note: safeText(item.note, 700),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeCashAccount(item = {}) {
  return {
    id: safeText(item.id, 80) || `cash-${Date.now()}`,
    name: safeText(item.name, 120) || "Счёт / касса",
    type: safeText(item.type, 60) || "Счёт",
    scope: safeText(item.scope, 80) || "Холдинг",
    region: normalizeRegionName(item.region || ALL_REGIONS),
    direction: normalizeDirectionName(item.direction || ALL_DIRECTIONS),
    balance: safeMoney(item.balance),
    updatedAt: item.updatedAt || new Date().toISOString(),
    note: safeText(item.note, 700),
  };
}

function appendSyncLog(db, event) {
  return [{ id: `sync-${Date.now()}`, ...event, at: new Date().toISOString() }, ...(db.syncLog || [])].slice(0, 250);
}

function bitrixMethodUrl(webhookUrl, method) {
  const base = String(webhookUrl || "").trim().replace(/\/+$/, "");
  if (!base) throw new Error("Bitrix webhook is not configured");
  return `${base}/${method}.json`;
}

async function callBitrixRest(settings = {}, method, params = {}) {
  const response = await fetch(bitrixMethodUrl(settings.webhookUrl, method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.error) {
    throw new Error(body.error_description || body.error || `Bitrix request failed: ${response.status}`);
  }
  return body.result ?? body;
}

function parseCsvList(value = "") {
  return String(value || "")
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function bitrixIntegrationStatus(db = {}) {
  const settings = { ...defaultDb.integrationSettings, ...(db.integrationSettings || {}) };
  const qualifiedStageIds = parseCsvList(settings.qualifiedStageIds);
  const configured = Boolean(settings.webhookUrl);
  return {
    ok: true,
    configured,
    syncMode: settings.syncMode || "manual",
    lastCheck: settings.lastCheck || "не запускалась",
    lastStatus: settings.lastStatus || "",
    lastUser: settings.lastUser || "",
    safeMode: "read_only",
    writeBackEnabled: false,
    qualifiedStageIdsCount: qualifiedStageIds.length,
    importLimit: Number(settings.importLimit || 20),
    importReady: configured && qualifiedStageIds.length > 0,
    salesLeadsCount: (db.salesLeads || []).length,
    lastLog: (db.syncLog || [])[0] || null,
    requiredAction: !configured
      ? "Нужно указать входящий вебхук Bitrix24."
      : qualifiedStageIds.length === 0
      ? "Нужно указать STAGE_ID тёплых сделок. Импорт всего Bitrix24 запрещён."
      : "Можно запускать read-only импорт тёплых сделок.",
  };
}

const bitrixDealFields = {
  serviceType: "UF_CRM_1749425490004",
  projectManager: "UF_CRM_1749425673",
  projectStartDate: "UF_CRM_1749425736",
  projectEndDate: "UF_CRM_1749425753",
  objectName: "UF_CRM_1749471792",
  advanceAmount: "UF_CRM_1749472042582",
  region: "UF_CRM_1760087366074",
  city: "UF_CRM_1761054834674",
  objectType: "UF_CRM_1761055201264",
  area: "UF_CRM_1761055254141",
  clientBudget: "UF_CRM_1761055274310",
  surveyType: "UF_CRM_1761055759421",
  projectStage: "UF_CRM_1761055830269",
  executionDays: "UF_CRM_1761055856097",
  documentPackage: "UF_CRM_1761055888873",
  contractPackage: "UF_CRM_1761225812060",
};

function bitrixValue(deal = {}, ...keys) {
  for (const key of keys) {
    const value = deal[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return "";
}

function mapBitrixDealStage(stageId = "") {
  const normalized = String(stageId || "").trim().toUpperCase();
  const knownWarmStages = {
    UC_EZ8IDH: "contract_and_advance",
    UC_J653IR: "contract_and_advance",
    FINAL_INVOICE: "proposal_sent",
    "C13:PREPAYMENT_INVOIC": "contract_and_advance",
    "C13:UC_TCR24Q": "contract_and_advance",
    "C18:PREPAYMENT_INVOICE": "proposal_sent",
    "C18:FINAL_INVOICE": "contract_and_advance",
    "C21:FINAL_INVOICE": "contract_and_advance",
    "C22:FINAL_INVOICE": "contract_and_advance",
    "C22:UC_I52BY0": "contract_and_advance",
    "C24:FINAL_INVOICE": "proposal_sent",
    "C24:UC_9SQU4E": "contract_and_advance",
    "C24:UC_KMQIW1": "contract_and_advance",
  };
  if (knownWarmStages[normalized]) return knownWarmStages[normalized];
  const value = normalized.toLowerCase();
  if (value.includes("won") || value.includes("advance") || value.includes("аванс") || value.includes("contract")) return "contract_and_advance";
  if (value.includes("proposal") || value.includes("quote") || value.includes("кп")) return "proposal_sent";
  if (value.includes("measure") || value.includes("замер")) return "site_visit";
  if (value.includes("qualified") || value.includes("квали")) return "qualified";
  return "qualified";
}

function inferDirectionFromDeal(deal = {}) {
  const text = `${deal.TITLE || ""} ${deal.UF_CRM_DIRECTION || ""} ${deal.UF_CRM_SERVICE || ""} ${bitrixValue(deal, bitrixDealFields.serviceType, bitrixDealFields.surveyType, bitrixDealFields.projectStage)}`.toLowerCase();
  if (text.includes("проект") || text.includes("87") || text.includes("пд")) return "project_institute";
  if (text.includes("ремонт") || text.includes("строит")) return "repair";
  if (text.includes("недвиж") || text.includes("квартир")) return "realty";
  if (text.includes("изыск") || text.includes("обслед") || text.includes("обмер")) return "surveys";
  if (text.includes("комплект")) return "completion";
  return "design";
}

function normalizeBitrixDealToSalesLead(deal = {}) {
  const id = String(deal.ID || deal.id || Date.now());
  const createdAt = deal.DATE_CREATE || deal.CREATED_DATE || new Date().toISOString();
  const region = normalizeRegionName(bitrixValue(deal, "UF_CRM_REGION", "UF_CRM_OBJECT_REGION", bitrixDealFields.region, "REGION", "CITY") || "Все регионы");
  const city = bitrixValue(deal, "UF_CRM_CITY", bitrixDealFields.city, "CITY") || region;
  const amount = Number(bitrixValue(deal, "OPPORTUNITY", "AMOUNT", bitrixDealFields.clientBudget, bitrixDealFields.advanceAmount) || 0) || 0;
  return {
    id: `B24-${id}`,
    bitrixDealId: id,
    clientName: deal.TITLE || `Сделка Bitrix24 #${id}`,
    source: "Bitrix24",
    direction: inferDirectionFromDeal(deal),
    region,
    city,
    stage: mapBitrixDealStage(deal.STAGE_ID),
    qualificationStatus: "warm",
    amount,
    hunterId: deal.ASSIGNED_BY_ID ? `B24-${deal.ASSIGNED_BY_ID}` : "",
    hunterName: deal.ASSIGNED_BY_NAME || "",
    farmerId: "",
    projectId: deal.UF_CRM_SMETAOFFICE_PROJECT_ID || "",
    createdAt,
    slaDeadlineAt: new Date(Date.parse(createdAt) + 5 * 60 * 1000).toISOString(),
    rawStage: deal.STAGE_ID || "",
    rawCategoryId: deal.CATEGORY_ID || "",
    objectType: bitrixValue(deal, bitrixDealFields.objectType),
    area: bitrixValue(deal, bitrixDealFields.area),
    requestText: bitrixValue(deal, "COMMENTS", bitrixDealFields.objectName, bitrixDealFields.documentPackage) || "Импортировано из Bitrix24",
    syncStatus: "imported_from_bitrix",
  };
}

function buildBitrixDealImportParams(settings = {}, body = {}) {
  const customFilter = body && typeof body.filter === "object" && body.filter && Object.keys(body.filter).length > 0 ? body.filter : null;
  const qualifiedStageIds = parseCsvList(body.qualifiedStageIds || settings.qualifiedStageIds);
  if (!customFilter && qualifiedStageIds.length === 0) {
    throw new Error("Qualified Bitrix stages are not configured; refusing to import all deals.");
  }
  const filter = customFilter || { "@STAGE_ID": qualifiedStageIds };
  const limit = Math.max(1, Math.min(Number(body.limit || settings.importLimit || 20), 50));
  return {
    order: { DATE_MODIFY: "DESC" },
    filter,
    select: body.select || [
      "ID",
      "TITLE",
      "STAGE_ID",
      "CATEGORY_ID",
      "OPPORTUNITY",
      "DATE_CREATE",
      "DATE_MODIFY",
      "ASSIGNED_BY_ID",
      "ASSIGNED_BY_NAME",
      "SOURCE_ID",
      "COMMENTS",
      "UF_*",
    ],
    start: body.start || 0,
    limit,
  };
}

function mergeSalesLeadsByExternalId(existingLeads = [], incomingLeads = []) {
  const map = new Map(existingLeads.map((lead) => [lead.bitrixDealId ? `b24:${lead.bitrixDealId}` : lead.id, lead]));
  incomingLeads.forEach((lead) => {
    const key = lead.bitrixDealId ? `b24:${lead.bitrixDealId}` : lead.id;
    map.set(key, { ...(map.get(key) || {}), ...lead, lastBitrixSyncAt: new Date().toISOString() });
  });
  return Array.from(map.values());
}

function isOpenExecutorSlot(item = {}) {
  const executorName = String(item.executorName || item.executor || item.assignee || item.owner || "").trim().toLowerCase();
  const unassigned = !item.executorId && !item.assigneeId && (!executorName || executorName === "-" || executorName === "—" || executorName.includes("не назнач"));
  const hasBudget = Number(item.executorCost) > 0;
  const recruitmentMode = item.recruitmentStatus || "auto";
  const manuallyClosed = recruitmentMode === "closed" || item.openForBids === false;
  const explicitlyOpen = recruitmentMode === "open" || item.openForBids === true;
  const implicitOpen = recruitmentMode === "auto" && item.openForBids == null;
  const closedStatuses = new Set(["Принято", "Закрыто", "Просрочено"]);
  return unassigned && hasBudget && !closedStatuses.has(item.status) && !manuallyClosed && (explicitlyOpen || implicitOpen);
}

function isPreContractStage(item = {}) {
  const name = String(item.name || item.sectionName || "").toLowerCase();
  return ["заяв", "бриф", "замер", "исходн", "техническое задание", "тз"].some((token) => name.includes(token));
}

function executorSectionList(user = {}, executors = []) {
  const linkedExecutor = executors.find((executor) => executor.id === user.executorId || executor.userId === user.id || executor.name === user.name);
  const raw = [
    ...(Array.isArray(user.executorSections) ? user.executorSections : []),
    ...(Array.isArray(user.sections) ? user.sections : []),
    ...(Array.isArray(linkedExecutor?.sections) ? linkedExecutor.sections : []),
  ];
  return raw
    .flatMap((value) => String(value || "").split(/[;,/]/))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function matchesExecutorProfile(item = {}, user = {}, executors = []) {
  const sections = executorSectionList(user, executors);
  if (!sections.length) return false;
  const text = `${item.name || ""} ${item.sectionName || ""} ${item.kind || ""} ${item.requiredSpecialization || ""}`.toLowerCase();
  return sections.some((section) => text.includes(section) || section.includes(text));
}

function availableWorkForUser(user, projects = [], executors = []) {
  if (!user || !["executor", "partner", "owner", "admin", "deputy", "pm", "project_manager", "director", "regional_manager"].includes(user.role)) return [];

  return projects.flatMap((project) => {
    const rows = [...(project.sections || []), ...(project.tasks || [])];
    return rows
      .filter((item) => isOpenExecutorSlot(item))
      .filter((item) => !isPreContractStage(item))
      .filter((item) => ["owner", "admin", "deputy", "pm", "project_manager", "director", "regional_manager"].includes(user.role) || matchesExecutorProfile(item, user, executors))
      .map((item, index) => ({
        id: item.id || `${project.id}-${item.name || index}`,
        projectId: project.id,
        projectTitle: project.title,
        projectRegion: project.region || project.city,
        projectDirection: project.direction,
        name: item.name || item.sectionName || "Работа без названия",
        section: item.sectionName || item.name || "",
        due: item.due || project.deadline || "",
        status: item.status || "Новая",
        executorCost: Number(item.executorCost) || 0,
        paymentStatus: item.financeStatus || item.paymentStatus || "не рассчитан",
        yandexLink: item.yandexLink || "",
        kind: item.sectionName ? "task" : "section",
        bids: item.bids || [],
      }));
  });
}

function parseExecutorSections(value) {
  const source = Array.isArray(value) ? value : String(value || "").split(/[;,\n]/);
  return [...new Set(source.map((item) => String(item || "").trim()).filter(Boolean))];
}

function userToExecutorProfile(user = {}) {
  const sections = parseExecutorSections(user.executorSections || user.executorSectionsText);
  const rank = Number(user.executorRank) || (user.role === "executor" ? 2 : 1);
  const accrued = Number(user.executorAccrued) || 0;
  const paid = Number(user.executorPaid) || 0;
  return {
    id: user.executorId || user.id,
    userId: user.id,
    source: "user",
    name: user.name || user.login || "User",
    type: user.role === "partner" ? "partner" : "SmetaOffice user",
    role: user.role,
    region: normalizeRegionName(user.region || ""),
    regions: userRegionList(user),
    direction: normalizeDirectionName(user.direction || ALL_DIRECTIONS),
    city: user.city || user.region || "",
    sections: sections.length ? sections : ["General"],
    rank,
    status: user.executorStatus || (user.role === "executor" ? "Executor" : "Role + executor"),
    rating: Math.max(0, Math.min(100, Number(user.executorRating) || 50)),
    qualification: user.executorQualification || `Rank ${rank}`,
    workload: Number(user.executorWorkload) || 0,
    onTime: Number(user.executorOnTime) || 0,
    firstAccept: Number(user.executorFirstAccept) || 0,
    paymentModel: user.executorPaymentModel || "piecework",
    hourlyRate: Number(user.executorHourlyRate) || 0,
    salaryBase: Number(user.executorSalaryBase) || 0,
    percentRate: Number(user.executorPercentRate) || 0,
    accrued,
    paid,
    payable: Math.max(accrued - paid, 0),
    contacts: {
      phone: user.phone || user.contacts?.phone || "",
      email: user.email || user.contacts?.email || "",
      telegram: user.telegram || user.contacts?.telegram || "",
    },
    note: user.executorNote || "",
  };
}

function buildExecutorDirectory(executors = [], users = []) {
  const userExecutors = (users || [])
    .filter((user) => !["blocked", "disabled"].includes(user?.status))
    .filter((user) => user.executorEnabled || user.role === "executor" || user.executorId)
    .map(userToExecutorProfile);
  const map = new Map();
  [...userExecutors, ...(executors || [])].forEach((executor) => {
    if (!executor?.id) return;
    map.set(executor.id, {
      ...executor,
      region: normalizeRegionName(executor.region || executor.city || ""),
      direction: normalizeDirectionName(executor.direction || ALL_DIRECTIONS),
      sections: parseExecutorSections(executor.sections).length ? parseExecutorSections(executor.sections) : ["General"],
    });
  });
  return [...map.values()];
}

function canViewExecutorContacts(user, executor) {
  if (!user) return false;
  if (executor && (executor.userId === user.id || executor.id === user.executorId)) return true;
  return ["owner", "admin", "deputy", "regional_admin", "direction_admin", "director", "head_of_department", "regional_manager"].includes(user.role);
}

function sanitizeExecutorForUser(user, executor) {
  if (canViewExecutorContacts(user, executor)) return executor;
  const { contacts, phone, email, telegram, note, ...safeExecutor } = executor;
  return {
    ...safeExecutor,
    contacts: {
      phone: "hidden",
      email: "hidden",
      telegram: "hidden",
    },
    note: "",
  };
}

function normalizeIncomingExecutors(executors = []) {
  return (executors || [])
    .filter((executor) => !(executor?.source === "user" && executor?.userId && !executor?.profileOverride))
    .map((executor) => {
      const next = { ...executor };
      if (next.contacts?.phone === "hidden" || next.contacts?.email === "hidden" || next.contacts?.telegram === "hidden") {
        delete next.contacts;
      }
      return next;
    });
}

function canAccessExecutor(user, executor) {
  if (!user || !executor) return false;
  if (["owner", "admin", "deputy", "finance", "accountant"].includes(user.role)) return true;
  if (user.role === "executor" || user.role === "partner") return executor.id === user.executorId || executor.userId === user.id || executor.name === user.name;
  const hasRegion = !executor.region && !executor.city ? true : canAccessRegion(user, executor);
  if (!hasRegion) return false;
  if (user.role === "regional_admin" || user.role === "regional_manager" || user.role === "pm" || user.role === "gip" || user.role === "project_manager") return true;
  if (user.role === "direction_admin" || user.role === "director" || user.role === "head_of_department") {
    const direction = normalizeDirectionName(executor.direction || ALL_DIRECTIONS);
    return direction === ALL_DIRECTIONS || user.direction === ALL_DIRECTIONS || direction === normalizeDirectionName(user.direction);
  }
  return false;
}

function visibleExecutorsFor(user, executors = []) {
  return executors.filter((executor) => canAccessExecutor(user, executor)).map((executor) => sanitizeExecutorForUser(user, executor));
}

function itemKey(item) {
  return item?.id || item?.login || item?.name;
}

function mergeManagedCollection(existingItems = [], incomingItems = [], manager, canAccessItem) {
  if (["owner", "deputy"].includes(manager?.role)) return incomingItems;
  const merged = [...existingItems];

  incomingItems.forEach((incomingItem) => {
    if (!canAccessItem(manager, incomingItem)) return;
    const key = itemKey(incomingItem);
    const existingIndex = merged.findIndex((item) => itemKey(item) === key);
    if (existingIndex >= 0) merged[existingIndex] = { ...merged[existingIndex], ...incomingItem };
    else merged.unshift(incomingItem);
  });

  return merged;
}

function salesRecordKey(item = {}) {
  return item.sourceSystem && item.sourceId ? `${item.sourceSystem}:${item.sourceId}` : item.id || item.leadId || item.sourceId || itemKey(item);
}

function salesRecordMatches(a = {}, b = {}) {
  const aKey = salesRecordKey(a);
  const bKey = salesRecordKey(b);
  return Boolean(
    aKey && bKey && aKey === bKey ||
    a.id && b.id && a.id === b.id ||
    a.sourceId && b.sourceId && a.sourceId === b.sourceId ||
    a.leadId && b.leadId && a.leadId === b.leadId
  );
}

function mergeManagedSalesRecords(existingItems = [], incomingItems = [], manager, canAccessItem, allExistingItems = existingItems) {
  if (["owner", "admin", "deputy"].includes(manager?.role)) return incomingItems;
  const merged = [...existingItems];

  incomingItems.forEach((incomingItem) => {
    const existingRecord = allExistingItems.find((item) => salesRecordMatches(item, incomingItem));
    if (existingRecord && !canAccessItem(manager, existingRecord)) return;
    if (!canAccessItem(manager, incomingItem)) return;

    const existingIndex = merged.findIndex((item) => salesRecordMatches(item, incomingItem));
    if (existingIndex >= 0) merged[existingIndex] = { ...merged[existingIndex], ...incomingItem };
    else merged.unshift(incomingItem);
  });

  return merged;
}

function mergeManagedUsers(existingUsers = [], incomingUsers = [], manager) {
  if (fullUserAdminRoles.includes(manager?.role)) return incomingUsers;
  const merged = [...existingUsers];

  incomingUsers.forEach((incomingUser) => {
    const existingIndex = merged.findIndex((user) => user.id === incomingUser.id || user.login === incomingUser.login);
    const existingUser = existingIndex >= 0 ? merged[existingIndex] : null;
    const targetUser = { ...existingUser, ...incomingUser };
    if (!canManageUserRecord(manager, targetUser)) return;
    if (existingIndex >= 0) merged[existingIndex] = targetUser;
    else merged.unshift(targetUser);
  });

  return merged;
}

function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const hash = pbkdf2Sync(String(password), salt, 120000, 32, "sha256").toString("hex");
  return { salt, hash };
}

function verifyPassword(user, password) {
  if (!user || !password) return false;
  if (user.passwordHash && user.passwordSalt) {
    const expected = Buffer.from(user.passwordHash, "hex");
    const actual = Buffer.from(hashPassword(password, user.passwordSalt).hash, "hex");
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }
  return user.password === password;
}

function sessionTokenFrom(req) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : "";
}

function cleanupSessions(db) {
  const now = Date.now();
  const sessions = db.authSessions || {};
  return Object.fromEntries(Object.entries(sessions).filter(([, session]) => Date.parse(session.expiresAt || 0) > now));
}

function authUser(req, db) {
  const token = sessionTokenFrom(req);
  const sessions = cleanupSessions(db);
  const session = token ? sessions[token] : null;
  const user = session ? (db.users || []).find((item) => item.id === session.userId) : null;
  return user?.status === "active" ? { token, user, sessions } : { token: "", user: null, sessions };
}

function requireAuth(req, res, db) {
  if (authMode !== "server") return { user: { role: "system" }, sessions: db.authSessions || {} };
  const auth = authUser(req, db);
  if (!auth.user) {
    sendJson(res, 401, { ok: false, error: "Unauthorized" });
    return null;
  }
  return auth;
}

function canWriteCollection(user, route) {
  if (!user || user.status === "disabled") return false;
  if (["/api/financial-periods", "/api/operational-expenses", "/api/cash-accounts"].includes(route)) return canEditManagementFinance(user);
  if (["owner", "admin", "deputy"].includes(user.role)) return true;
  if (route === "/api/projects") return ["regional_admin", "direction_admin", "director", "head_of_department", "regional_manager", "pm", "project_manager"].includes(user.role);
  if (route === "/api/executors") return ["regional_admin", "direction_admin", "director", "head_of_department", "regional_manager", "pm"].includes(user.role);
  if (route === "/api/partners") return ["regional_admin", "direction_admin", "director", "head_of_department", "regional_manager"].includes(user.role);
  if (["/api/sales-leads", "/api/sales-deals", "/api/sales-activities", "/api/sales-escalations", "/api/project-handoffs"].includes(route)) {
    return ["owner", "admin", "deputy", "regional_admin", "direction_admin", "head_of_sales", "senior_sales_manager", "ecp_manager", "sales_manager"].includes(user.role);
  }
  if (route === "/api/integration-settings") return ["owner", "admin", "deputy"].includes(user.role);
  if (route === "/api/users") return [...fullUserAdminRoles, ...scopedUserAdminRoles].includes(user.role);
  if (route === "/api/directories") return ["owner", "admin"].includes(user.role);
  return false;
}

function requireWriteAccess(req, res, db, route) {
  const auth = requireAuth(req, res, db);
  if (!auth) return null;
  if (authMode === "server" && !canWriteCollection(auth.user, route)) {
    sendJson(res, 403, { ok: false, error: "Forbidden" });
    return null;
  }
  return auth;
}

function normalizeIncomingUsers(incomingUsers = [], existingUsers = []) {
  return incomingUsers.map((user) => {
    const existing = existingUsers.find((item) => item.id === user.id || item.login === user.login);
    const nextUser = { ...existing, ...user };
    if (user.password) {
      const hashed = hashPassword(user.password);
      delete nextUser.password;
      nextUser.passwordSalt = hashed.salt;
      nextUser.passwordHash = hashed.hash;
      nextUser.passwordChangedAt = new Date().toISOString();
    } else if (existing?.passwordHash && existing?.passwordSalt) {
      nextUser.passwordHash = existing.passwordHash;
      nextUser.passwordSalt = existing.passwordSalt;
    } else if (existing?.password) {
      nextUser.password = existing.password;
    }
    return nextUser;
  });
}

function sendText(res, status, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": contentType });
  res.end(body);
}

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
};

function safeStaticPath(route) {
  const normalizedRoute = route === "/" ? "/index.html" : route;
  const requested = path.normalize(path.join(distDir, normalizedRoute));
  return requested.startsWith(distDir) ? requested : null;
}

async function serveStatic(route, res) {
  if (!existsSync(distDir)) {
    sendText(res, 404, "Frontend build not found. Run npm run build first.");
    return;
  }

  const requested = safeStaticPath(route);
  const filePath = requested && existsSync(requested) ? requested : path.join(distDir, "index.html");

  try {
    const ext = path.extname(filePath).toLowerCase();
    const content = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      "Cache-Control": "no-store, max-age=0",
    });
    res.end(content);
  } catch {
    sendText(res, 404, "Not found");
  }
}

function routeName(url) {
  return new URL(url, `http://${host}:${port}`).pathname;
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      sendJson(res, 200, { ok: true });
      return;
    }

    const route = routeName(req.url);
    const db = await readDb();

    if (req.method === "GET" && route === "/api/health") {
      const executorDirectory = buildExecutorDirectory(db.executors || [], db.users || []);
      sendJson(res, 200, {
        ok: true,
        service: "SmetaOffice API",
        storage: "json",
        authMode,
        updatedAt: new Date().toISOString(),
        counts: {
          projects: (db.projects || []).length,
          executors: executorDirectory.length,
          users: (db.users || []).length,
          partners: (db.partners || []).length,
          salesLeads: (db.salesLeads || []).length,
          salesDeals: allSalesDeals(db).length,
          salesActivities: (db.salesActivities || []).length,
          salesEscalations: allSalesEscalations(db).length,
          projectHandoffs: allProjectHandoffs(db).length,
          financialPeriods: (db.financialPeriods || []).length,
          operationalExpenses: (db.operationalExpenses || []).length,
          cashAccounts: (db.cashAccounts || []).length,
        },
        integrations: {
          bitrix24: {
            configured: Boolean(db.integrationSettings?.webhookUrl),
            lastStatus: db.integrationSettings?.lastStatus || "",
            lastCheck: db.integrationSettings?.lastCheck || "",
            importReady: Boolean(db.integrationSettings?.webhookUrl) && parseCsvList(db.integrationSettings?.qualifiedStageIds).length > 0,
          },
        },
      });
      return;
    }

    if (req.method === "POST" && route === "/api/auth/login") {
      const body = await readJsonBody(req);
      const user = (db.users || []).find((item) => item.login === String(body.login || "").trim());
      if (!verifyPassword(user, body.password)) {
        sendJson(res, 401, { ok: false, error: "Invalid login or password" });
        return;
      }
      if (user.status !== "active") {
        sendJson(res, 403, { ok: false, error: "User is not active" });
        return;
      }

      const token = randomBytes(32).toString("hex");
      const userWithLoginAt = { ...user, lastLoginAt: new Date().toISOString() };
      const usersWithLoginAt = (db.users || []).map((item) => (item.id === user.id ? userWithLoginAt : item));
      const nextDb = {
        ...db,
        users: usersWithLoginAt,
        authSessions: {
          ...cleanupSessions(db),
          [token]: {
            userId: user.id,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + sessionTtlMs).toISOString(),
          },
        },
      };
      await writeDb(nextDb);
      sendJson(res, 200, { ok: true, token, user: publicUser(userWithLoginAt), expiresAt: nextDb.authSessions[token].expiresAt });
      return;
    }

    if (req.method === "GET" && route === "/api/auth/me") {
      const auth = authUser(req, db);
      if (!auth.user) {
        sendJson(res, 401, { ok: false, error: "Unauthorized" });
        return;
      }
      if (Object.keys(auth.sessions).length !== Object.keys(db.authSessions || {}).length) {
        await writeDb({ ...db, authSessions: auth.sessions });
      }
      sendJson(res, 200, { ok: true, user: publicUser(auth.user) });
      return;
    }

    if (req.method === "POST" && route === "/api/auth/logout") {
      const auth = authUser(req, db);
      if (auth.token) {
        const { [auth.token]: _removed, ...remainingSessions } = auth.sessions;
        await writeDb({ ...db, authSessions: remainingSessions });
      }
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "POST" && route === "/api/access-requests") {
      const body = await readJsonBody(req);
      const login = String(body.login || "").trim();
      if (!body.name || !login || !body.password) {
        sendJson(res, 400, { ok: false, error: "Name, login and password are required" });
        return;
      }
      if ((db.users || []).some((user) => user.login === login)) {
        sendJson(res, 409, { ok: false, error: "Login already exists" });
        return;
      }
      const hashed = hashPassword(body.password);
      const request = {
        id: `AR-${Date.now()}`,
        name: String(body.name).trim(),
        login,
        region: body.region || "",
        requestedRole: body.requestedRole || "executor",
        status: "pending",
        createdAt: new Date().toISOString(),
        passwordSalt: hashed.salt,
        passwordHash: hashed.hash,
      };
      const nextDb = { ...db, accessRequests: [request, ...(db.accessRequests || [])] };
      await writeDb(nextDb);
      sendJson(res, 200, { ok: true, request: publicUser(request) });
      return;
    }

    if (req.method === "GET" && route === "/api/access-requests") {
      const auth = requireAuth(req, res, db);
      if (!auth) return;
      if (authMode === "server" && !["owner", "admin"].includes(auth.user.role)) {
        sendJson(res, 403, { ok: false, error: "Forbidden" });
        return;
      }
      sendJson(res, 200, publicUsers(db.accessRequests || []));
      return;
    }

    if (req.method === "GET" && route === "/api/db") {
      const auth = requireAuth(req, res, db);
      if (!auth) return;
      const visibleUsers = authMode === "server" ? visibleUsersFor(auth.user, db.users || []) : db.users;
      const executorDirectory = buildExecutorDirectory(db.executors || [], db.users || []);
      const payload = authMode === "server"
        ? {
            ...db,
            projects: visibleProjectsFor(auth.user, db.projects || []),
            executors: visibleExecutorsFor(auth.user, executorDirectory),
            users: publicUsers(visibleUsers),
            partners: visiblePartnersFor(auth.user, db.partners || []),
            salesLeads: visibleSalesLeadsFor(auth.user, db.salesLeads || []),
            salesDeals: visibleSalesDealsFor(auth.user, db),
            salesActivities: visibleSalesChildrenFor(auth.user, db.salesActivities || [], db),
            salesEscalations: visibleSalesChildrenFor(auth.user, allSalesEscalations(db), db),
            projectHandoffs: visibleSalesChildrenFor(auth.user, allProjectHandoffs(db), db),
            salesKpiSnapshots: visibleSalesKpiSnapshotsFor(auth.user, db.salesKpiSnapshots || []),
            integrationSettings: visibleIntegrationSettingsFor(auth.user, db.integrationSettings),
            authSessions: {},
            accessRequests: publicUsers(visibleUsersFor(auth.user, db.accessRequests || [])),
          }
        : db;
      sendJson(res, 200, payload);
      return;
    }

    if (req.method === "GET" && route === "/api/projects") {
      const auth = requireAuth(req, res, db);
      if (!auth) return;
      sendJson(res, 200, authMode === "server" ? visibleProjectsFor(auth.user, db.projects || []) : db.projects);
      return;
    }

    if (req.method === "GET" && route === "/api/available-work") {
      const auth = requireAuth(req, res, db);
      if (!auth) return;
      const executorDirectory = buildExecutorDirectory(db.executors || [], db.users || []);
      sendJson(res, 200, availableWorkForUser(auth.user, db.projects || [], executorDirectory));
      return;
    }

    if (req.method === "POST" && route === "/api/work-bids") {
      const auth = requireAuth(req, res, db);
      if (!auth) return;
      if (authMode === "server" && !["executor", "partner", "owner", "admin", "deputy", "pm", "project_manager", "director", "regional_manager"].includes(auth.user.role)) {
        sendJson(res, 403, { ok: false, error: "Forbidden" });
        return;
      }

      const body = await readJsonBody(req);
      const projectId = String(body.projectId || "").trim();
      const taskId = String(body.taskId || body.sectionId || "").trim();
      const taskName = String(body.taskName || body.name || "").trim();
      const application = body.application || {};
      const project = (db.projects || []).find((item) => item.id === projectId);
      if (!project) {
        sendJson(res, 404, { ok: false, error: "Project not found" });
        return;
      }

      const canBidOutsideAssignedProject = ["executor", "partner"].includes(auth.user.role);
      if (authMode === "server" && !canBidOutsideAssignedProject && !canAccessProject(auth.user, project)) {
        sendJson(res, 403, { ok: false, error: "Forbidden" });
        return;
      }

      const createdBid = {
        id: `bid-${Date.now()}`,
        bidderUserId: auth.user.id,
        bidderName: auth.user.name,
        bidderRole: auth.user.role,
        executorId: auth.user.executorId || "",
        requestedAmount: Number(application.requestedAmount) || 0,
        offeredDue: String(application.offeredDue || "").slice(0, 80),
        comment: String(application.comment || "").slice(0, 700),
        status: "Отклик отправлен",
        at: new Date().toISOString(),
      };

      let changed = false;
      function attachBid(items = []) {
        return items.map((item, index) => {
          const currentId = item.id || `${project.id}-${item.name || index}`;
          const matches = currentId === taskId || item.id === taskId || item.name === taskName || item.sectionName === taskName;
          if (!matches) return item;
          const executorDirectory = buildExecutorDirectory(db.executors || [], db.users || []);
          if (authMode === "server" && canBidOutsideAssignedProject && (!isOpenExecutorSlot(item) || isPreContractStage(item) || !matchesExecutorProfile(item, auth.user, executorDirectory))) return item;
          changed = true;
          const bids = (item.bids || []).filter((bid) => bid.bidderUserId !== auth.user.id && bid.executorId !== auth.user.executorId);
          return { ...item, bids: [createdBid, ...bids] };
        });
      }

      const nextProjects = (db.projects || []).map((item) =>
        item.id === projectId
          ? {
              ...item,
              sections: attachBid(item.sections || []),
              tasks: attachBid(item.tasks || []),
              chat: [
                ...(item.chat || []),
                {
                  id: `chat-${Date.now()}`,
                  channel: "internal",
                  author: auth.user.name || "SmetaOffice",
                  role: auth.user.role,
                  text: `Получен отклик на работу "${taskName || taskId}" от ${auth.user.name || auth.user.login}.`,
                  at: new Date().toISOString(),
                },
              ],
            }
          : item
      );

      if (!changed) {
        sendJson(res, 400, { ok: false, error: "Work item is not available for bid" });
        return;
      }

      const nextDb = { ...db, projects: nextProjects };
      await writeDb(nextDb);
      sendJson(res, 200, {
        ok: true,
        bid: createdBid,
        availableWork: availableWorkForUser(auth.user, nextDb.projects, buildExecutorDirectory(nextDb.executors || [], nextDb.users || [])),
        projects: authMode === "server" ? visibleProjectsFor(auth.user, nextDb.projects) : nextDb.projects,
      });
      return;
    }

    if (req.method === "PUT" && route === "/api/projects") {
      const auth = requireWriteAccess(req, res, db, route);
      if (!auth) return;
      const projects = await readJsonBody(req);
      const nextProjects = authMode === "server" ? mergeManagedCollection(db.projects || [], projects, auth.user, canAccessProject) : projects;
      const nextDb = { ...db, projects: nextProjects };
      await writeDb(nextDb);
      sendJson(res, 200, authMode === "server" ? visibleProjectsFor(auth.user, nextDb.projects) : nextDb.projects);
      return;
    }

    if (req.method === "DELETE" && route.startsWith("/api/projects/")) {
      const auth = requireAuth(req, res, db);
      if (!auth) return;
      if (authMode === "server" && !["owner", "admin"].includes(auth.user.role)) {
        sendJson(res, 403, { ok: false, error: "Forbidden" });
        return;
      }
      const projectId = decodeURIComponent(route.slice("/api/projects/".length));
      const project = (db.projects || []).find((item) => item.id === projectId);
      if (!project) {
        sendJson(res, 404, { ok: false, error: "Project not found" });
        return;
      }
      if (authMode === "server" && !canAccessProject(auth.user, project)) {
        sendJson(res, 403, { ok: false, error: "Forbidden" });
        return;
      }
      const nextDb = { ...db, projects: (db.projects || []).filter((item) => item.id !== projectId) };
      await writeDb(nextDb);
      sendJson(res, 200, { ok: true, projects: authMode === "server" ? visibleProjectsFor(auth.user, nextDb.projects) : nextDb.projects });
      return;
    }

    if (req.method === "GET" && route === "/api/executors") {
      const auth = requireAuth(req, res, db);
      if (!auth) return;
      const executorDirectory = buildExecutorDirectory(db.executors || [], db.users || []);
      sendJson(res, 200, authMode === "server" ? visibleExecutorsFor(auth.user, executorDirectory) : executorDirectory);
      return;
    }

    if (req.method === "PUT" && route === "/api/executors") {
      const auth = requireWriteAccess(req, res, db, route);
      if (!auth) return;
      const executors = normalizeIncomingExecutors(await readJsonBody(req));
      const nextExecutors = authMode === "server" ? mergeManagedCollection(db.executors || [], executors, auth.user, canAccessExecutor) : executors;
      const nextDb = { ...db, executors: nextExecutors };
      await writeDb(nextDb);
      const executorDirectory = buildExecutorDirectory(nextDb.executors || [], nextDb.users || []);
      sendJson(res, 200, authMode === "server" ? visibleExecutorsFor(auth.user, executorDirectory) : executorDirectory);
      return;
    }

    if (req.method === "GET" && route === "/api/users") {
      const auth = requireAuth(req, res, db);
      if (!auth) return;
      const users = authMode === "server" ? visibleUsersFor(auth.user, db.users || []) : db.users;
      sendJson(res, 200, authMode === "server" ? publicUsers(users) : users);
      return;
    }

    if (req.method === "PUT" && route === "/api/users") {
      const auth = requireWriteAccess(req, res, db, route);
      if (!auth) return;
      const incomingUsers = await readJsonBody(req);
      const normalizedUsers = authMode === "server" ? normalizeIncomingUsers(incomingUsers, db.users || []) : incomingUsers;
      const users = authMode === "server" ? mergeManagedUsers(db.users || [], normalizedUsers, auth.user) : normalizedUsers;
      const nextDb = { ...db, users };
      await writeDb(nextDb);
      const visibleUsers = authMode === "server" ? visibleUsersFor(auth.user, nextDb.users) : nextDb.users;
      sendJson(res, 200, authMode === "server" ? publicUsers(visibleUsers) : visibleUsers);
      return;
    }

    if (req.method === "GET" && route === "/api/partners") {
      const auth = requireAuth(req, res, db);
      if (!auth) return;
      const partners = (db.partners || []).map(normalizePartnerRecord);
      sendJson(res, 200, authMode === "server" ? visiblePartnersFor(auth.user, partners) : partners);
      return;
    }

    if (req.method === "PUT" && route === "/api/partners") {
      const auth = requireWriteAccess(req, res, db, route);
      if (!auth) return;
      const partners = (await readJsonBody(req)).map(normalizePartnerRecord);
      const nextPartners = authMode === "server" ? mergeManagedCollection(db.partners || [], partners, auth.user, canAccessPartner) : partners;
      const nextDb = { ...db, partners: nextPartners };
      await writeDb(nextDb);
      sendJson(res, 200, authMode === "server" ? visiblePartnersFor(auth.user, nextDb.partners) : nextDb.partners);
      return;
    }

    if (req.method === "GET" && route === "/api/sales-leads") {
      const auth = requireAuth(req, res, db);
      if (!auth) return;
      sendJson(res, 200, authMode === "server" ? visibleSalesLeadsFor(auth.user, db.salesLeads || []) : db.salesLeads || []);
      return;
    }

    if (req.method === "PUT" && route === "/api/sales-leads") {
      const auth = requireWriteAccess(req, res, db, route);
      if (!auth) return;
      const salesLeads = await readJsonBody(req);
      const nextSalesLeads = authMode === "server" ? mergeManagedSalesRecords(db.salesLeads || [], salesLeads, auth.user, canAccessSalesLead, db.salesLeads || []) : salesLeads;
      const nextDb = { ...db, salesLeads: nextSalesLeads };
      await writeDb(nextDb);
      sendJson(res, 200, authMode === "server" ? visibleSalesLeadsFor(auth.user, nextDb.salesLeads) : nextDb.salesLeads);
      return;
    }

    if (req.method === "GET" && route === "/api/sales-control") {
      const auth = requireAuth(req, res, db);
      if (!auth) return;
      const deals = authMode === "server" ? visibleSalesDealsFor(auth.user, db) : allSalesDeals(db);
      const activities = authMode === "server" ? visibleSalesChildrenFor(auth.user, (db.salesActivities || []).map(normalizeSalesActivity), db) : (db.salesActivities || []).map(normalizeSalesActivity);
      const allEscalations = allSalesEscalations(db, deals);
      const escalations = authMode === "server" ? visibleSalesChildrenFor(auth.user, allEscalations, db) : allEscalations;
      const handoffs = allProjectHandoffs(db, deals);
      const visibleHandoffs = authMode === "server" ? visibleSalesChildrenFor(auth.user, handoffs, db) : handoffs;
      sendJson(res, 200, {
        ok: true,
        deals,
        activities,
        escalations,
        projectHandoffs: visibleHandoffs,
        report: salesControlReport(deals, activities, escalations, visibleHandoffs),
      });
      return;
    }

    if (req.method === "GET" && route === "/api/sales-deals") {
      const auth = requireAuth(req, res, db);
      if (!auth) return;
      sendJson(res, 200, authMode === "server" ? visibleSalesDealsFor(auth.user, db) : allSalesDeals(db));
      return;
    }

    if (req.method === "PUT" && route === "/api/sales-deals") {
      const auth = requireWriteAccess(req, res, db, route);
      if (!auth) return;
      const body = await readJsonBody(req);
      const incoming = Array.isArray(body) ? body.map(normalizeSalesDeal) : [];
      const nextSalesDeals = authMode === "server" ? mergeManagedSalesRecords(db.salesDeals || [], incoming, auth.user, canAccessSalesDeal, allSalesDeals(db)) : incoming;
      const nextDb = { ...db, salesDeals: nextSalesDeals };
      await writeDb(nextDb);
      sendJson(res, 200, authMode === "server" ? visibleSalesDealsFor(auth.user, nextDb) : allSalesDeals(nextDb));
      return;
    }

    if (req.method === "GET" && route === "/api/sales-activities") {
      const auth = requireAuth(req, res, db);
      if (!auth) return;
      const activities = (db.salesActivities || []).map(normalizeSalesActivity);
      sendJson(res, 200, authMode === "server" ? visibleSalesChildrenFor(auth.user, activities, db) : activities);
      return;
    }

    if (req.method === "PUT" && route === "/api/sales-activities") {
      const auth = requireWriteAccess(req, res, db, route);
      if (!auth) return;
      const body = await readJsonBody(req);
      const incoming = Array.isArray(body) ? body.map(normalizeSalesActivity) : [];
      const nextItems = authMode === "server" ? mergeManagedCollection(db.salesActivities || [], incoming, auth.user, (user, item) => canAccessSalesChild(user, item, db)) : incoming;
      const nextDb = { ...db, salesActivities: nextItems };
      await writeDb(nextDb);
      sendJson(res, 200, authMode === "server" ? visibleSalesChildrenFor(auth.user, nextDb.salesActivities, nextDb) : nextDb.salesActivities);
      return;
    }

    if (req.method === "GET" && route === "/api/sales-escalations") {
      const auth = requireAuth(req, res, db);
      if (!auth) return;
      const escalations = allSalesEscalations(db);
      sendJson(res, 200, authMode === "server" ? visibleSalesChildrenFor(auth.user, escalations, db) : escalations);
      return;
    }

    if (req.method === "PUT" && route === "/api/sales-escalations") {
      const auth = requireWriteAccess(req, res, db, route);
      if (!auth) return;
      const body = await readJsonBody(req);
      const incoming = Array.isArray(body) ? body.map(normalizeSalesEscalation) : [];
      const nextItems = authMode === "server" ? mergeManagedCollection(db.salesEscalations || [], incoming, auth.user, (user, item) => canAccessSalesChild(user, item, db)) : incoming;
      const nextDb = { ...db, salesEscalations: nextItems };
      await writeDb(nextDb);
      sendJson(res, 200, authMode === "server" ? visibleSalesChildrenFor(auth.user, nextDb.salesEscalations, nextDb) : nextDb.salesEscalations);
      return;
    }

    if (req.method === "GET" && route === "/api/project-handoffs") {
      const auth = requireAuth(req, res, db);
      if (!auth) return;
      const handoffs = allProjectHandoffs(db);
      sendJson(res, 200, authMode === "server" ? visibleSalesChildrenFor(auth.user, handoffs, db) : handoffs);
      return;
    }

    if (req.method === "PUT" && route === "/api/project-handoffs") {
      const auth = requireWriteAccess(req, res, db, route);
      if (!auth) return;
      const body = await readJsonBody(req);
      const incoming = Array.isArray(body) ? body.map((item) => normalizeProjectHandoff(item, db)) : [];
      const nextItems = authMode === "server" ? mergeManagedCollection(db.projectHandoffs || [], incoming, auth.user, (user, item) => canAccessSalesChild(user, item, db)) : incoming;
      const nextDb = { ...db, projectHandoffs: nextItems };
      await writeDb(nextDb);
      sendJson(res, 200, authMode === "server" ? visibleSalesChildrenFor(auth.user, nextDb.projectHandoffs.map((item) => normalizeProjectHandoff(item, nextDb)), nextDb) : nextDb.projectHandoffs);
      return;
    }

    if (req.method === "GET" && route === "/api/financial-periods") {
      const auth = requireAuth(req, res, db);
      if (!auth) return;
      if (authMode === "server" && !canViewManagementFinance(auth.user)) {
        sendJson(res, 403, { ok: false, error: "Forbidden" });
        return;
      }
      sendJson(res, 200, authMode === "server" ? visibleFinanceItemsFor(auth.user, db.financialPeriods || []) : db.financialPeriods || []);
      return;
    }

    if (req.method === "PUT" && route === "/api/financial-periods") {
      const auth = requireWriteAccess(req, res, db, route);
      if (!auth) return;
      const body = await readJsonBody(req);
      const incoming = Array.isArray(body) ? body : [];
      const normalized = incoming.map(normalizeFinancialPeriod);
      const nextDb = { ...db, financialPeriods: authMode === "server" ? mergeManagedCollection(db.financialPeriods || [], normalized, auth.user, canAccessFinanceItem) : normalized };
      await writeDb(nextDb);
      sendJson(res, 200, authMode === "server" ? visibleFinanceItemsFor(auth.user, nextDb.financialPeriods) : nextDb.financialPeriods);
      return;
    }

    if (req.method === "GET" && route === "/api/operational-expenses") {
      const auth = requireAuth(req, res, db);
      if (!auth) return;
      if (authMode === "server" && !canViewManagementFinance(auth.user)) {
        sendJson(res, 403, { ok: false, error: "Forbidden" });
        return;
      }
      sendJson(res, 200, authMode === "server" ? visibleFinanceItemsFor(auth.user, db.operationalExpenses || []) : db.operationalExpenses || []);
      return;
    }

    if (req.method === "PUT" && route === "/api/operational-expenses") {
      const auth = requireWriteAccess(req, res, db, route);
      if (!auth) return;
      const body = await readJsonBody(req);
      const incoming = Array.isArray(body) ? body : [];
      const normalized = incoming.map(normalizeOperationalExpense);
      const nextDb = { ...db, operationalExpenses: authMode === "server" ? mergeManagedCollection(db.operationalExpenses || [], normalized, auth.user, canAccessFinanceItem) : normalized };
      await writeDb(nextDb);
      sendJson(res, 200, authMode === "server" ? visibleFinanceItemsFor(auth.user, nextDb.operationalExpenses) : nextDb.operationalExpenses);
      return;
    }

    if (req.method === "GET" && route === "/api/cash-accounts") {
      const auth = requireAuth(req, res, db);
      if (!auth) return;
      if (authMode === "server" && !canViewManagementFinance(auth.user)) {
        sendJson(res, 403, { ok: false, error: "Forbidden" });
        return;
      }
      sendJson(res, 200, authMode === "server" ? visibleFinanceItemsFor(auth.user, db.cashAccounts || []) : db.cashAccounts || []);
      return;
    }

    if (req.method === "PUT" && route === "/api/cash-accounts") {
      const auth = requireWriteAccess(req, res, db, route);
      if (!auth) return;
      const body = await readJsonBody(req);
      const incoming = Array.isArray(body) ? body : [];
      const normalized = incoming.map(normalizeCashAccount);
      const nextDb = { ...db, cashAccounts: authMode === "server" ? mergeManagedCollection(db.cashAccounts || [], normalized, auth.user, canAccessFinanceItem) : normalized };
      await writeDb(nextDb);
      sendJson(res, 200, authMode === "server" ? visibleFinanceItemsFor(auth.user, nextDb.cashAccounts) : nextDb.cashAccounts);
      return;
    }

    if (req.method === "GET" && route === "/api/directories") {
      if (!requireAuth(req, res, db)) return;
      sendJson(res, 200, db.directories || defaultDb.directories);
      return;
    }

    if (req.method === "PUT" && route === "/api/directories") {
      if (!requireWriteAccess(req, res, db, route)) return;
      const directories = await readJsonBody(req);
      const nextDb = { ...db, directories: { ...directories, updatedAt: new Date().toISOString() } };
      await writeDb(nextDb);
      sendJson(res, 200, nextDb.directories);
      return;
    }

    if (req.method === "GET" && route === "/api/integration-settings") {
      const auth = requireAuth(req, res, db);
      if (!auth) return;
      if (authMode === "server" && !canViewFullIntegrationSettings(auth.user)) {
        sendJson(res, 403, { ok: false, error: "Forbidden" });
        return;
      }
      sendJson(res, 200, db.integrationSettings);
      return;
    }

    if (req.method === "PUT" && route === "/api/integration-settings") {
      if (!requireWriteAccess(req, res, db, route)) return;
      const body = await readJsonBody(req);
      const integrationSettings = {
        ...defaultDb.integrationSettings,
        ...(db.integrationSettings || {}),
        ...body,
        webhookUrl: String(body.webhookUrl || "").trim(),
        qualifiedStageIds: parseCsvList(body.qualifiedStageIds).join(","),
        importLimit: Math.max(1, Math.min(Number(body.importLimit || db.integrationSettings?.importLimit || 20), 50)),
        writeBackEnabled: false,
      };
      const nextDb = {
        ...db,
        integrationSettings,
        syncLog: appendSyncLog(db, { source: "SmetaOffice", type: "integration_settings", status: "updated", message: "Настройки интеграции обновлены." }),
      };
      await writeDb(nextDb);
      sendJson(res, 200, nextDb.integrationSettings);
      return;
    }

    if (req.method === "GET" && route === "/api/sync-log") {
      const auth = requireAuth(req, res, db);
      if (!auth) return;
      if (authMode === "server" && !canViewFullIntegrationSettings(auth.user)) {
        sendJson(res, 403, { ok: false, error: "Forbidden" });
        return;
      }
      sendJson(res, 200, db.syncLog || []);
      return;
    }

    if (req.method === "POST" && route === "/api/sync-log") {
      const auth = requireAuth(req, res, db);
      if (!auth) return;
      if (authMode === "server" && !canViewFullIntegrationSettings(auth.user)) {
        sendJson(res, 403, { ok: false, error: "Forbidden" });
        return;
      }
      const event = await readJsonBody(req);
      const nextDb = { ...db, syncLog: appendSyncLog(db, event) };
      await writeDb(nextDb);
      sendJson(res, 200, nextDb.syncLog);
      return;
    }

    if (req.method === "GET" && route === "/api/bitrix/status") {
      const auth = requireAuth(req, res, db);
      if (!auth) return;
      if (authMode === "server" && !canViewFullIntegrationSettings(auth.user)) {
        sendJson(res, 403, { ok: false, error: "Forbidden" });
        return;
      }
      sendJson(res, 200, bitrixIntegrationStatus(db));
      return;
    }

    if (req.method === "POST" && route === "/api/bitrix/test") {
      const auth = requireWriteAccess(req, res, db, "/api/integration-settings");
      if (!auth) return;
      if (!db.integrationSettings?.webhookUrl) {
        const nextDb = {
          ...db,
          syncLog: appendSyncLog(db, { source: "Bitrix24", type: "connection_test", status: "error", message: "Webhook не указан." }),
        };
        await writeDb(nextDb);
        sendJson(res, 400, { ok: false, error: "Bitrix webhook is not configured", syncLog: nextDb.syncLog });
        return;
      }
      try {
        const profile = await callBitrixRest(db.integrationSettings, "profile", {});
        const nextSettings = { ...db.integrationSettings, lastCheck: new Date().toISOString(), lastStatus: "ok", lastUser: profile?.NAME || profile?.LOGIN || profile?.ID || "Bitrix24" };
        const nextDb = {
          ...db,
          integrationSettings: nextSettings,
          syncLog: appendSyncLog(db, { source: "Bitrix24", type: "connection_test", status: "ok", message: "Webhook проверен, доступ к Bitrix24 есть." }),
        };
        await writeDb(nextDb);
        sendJson(res, 200, { ok: true, profile, integrationSettings: nextSettings, syncLog: nextDb.syncLog });
      } catch (error) {
        const nextDb = {
          ...db,
          integrationSettings: { ...db.integrationSettings, lastCheck: new Date().toISOString(), lastStatus: "error" },
          syncLog: appendSyncLog(db, { source: "Bitrix24", type: "connection_test", status: "error", message: error.message }),
        };
        await writeDb(nextDb);
        sendJson(res, 502, { ok: false, error: error.message, syncLog: nextDb.syncLog });
      }
      return;
    }

    if (req.method === "POST" && route === "/api/bitrix/import-sales-leads") {
      const auth = requireWriteAccess(req, res, db, "/api/sales-leads");
      if (!auth) return;
      const body = await readJsonBody(req);
      if (!db.integrationSettings?.webhookUrl) {
        const nextDb = {
          ...db,
          syncLog: appendSyncLog(db, { source: "Bitrix24", type: "deal_import", status: "error", message: "Webhook не указан." }),
        };
        await writeDb(nextDb);
        sendJson(res, 400, { ok: false, error: "Bitrix webhook is not configured", syncLog: nextDb.syncLog });
        return;
      }
      try {
        const params = buildBitrixDealImportParams(db.integrationSettings, body);
        const result = await callBitrixRest(db.integrationSettings, "crm.deal.list", params);
        const deals = (Array.isArray(result) ? result : Array.isArray(result?.items) ? result.items : []).slice(0, params.limit);
        const importedLeads = deals.map(normalizeBitrixDealToSalesLead);
        const nextSalesLeads = mergeSalesLeadsByExternalId(db.salesLeads || [], importedLeads);
        const nextDb = {
          ...db,
          salesLeads: nextSalesLeads,
          syncLog: appendSyncLog(db, { source: "Bitrix24", type: "deal_import", status: "ok", message: `Импортировано/обновлено сделок: ${importedLeads.length}.` }),
        };
        await writeDb(nextDb);
        sendJson(res, 200, { ok: true, imported: importedLeads.length, leads: authMode === "server" ? visibleSalesLeadsFor(auth.user, nextDb.salesLeads) : nextDb.salesLeads, syncLog: nextDb.syncLog });
      } catch (error) {
        const nextDb = {
          ...db,
          syncLog: appendSyncLog(db, { source: "Bitrix24", type: "deal_import", status: "error", message: error.message }),
        };
        await writeDb(nextDb);
        sendJson(res, 502, { ok: false, error: error.message, syncLog: nextDb.syncLog });
      }
      return;
    }

    if (route.startsWith("/api/")) {
      sendJson(res, 404, { ok: false, error: "Not found" });
      return;
    }

    await serveStatic(route, res);
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
});

server.listen(port, host, async () => {
  await ensureDb();
  await ensureBootstrapOwner();
  console.log(`SmetaOffice: http://${host === "0.0.0.0" ? "127.0.0.1" : host}:${port}`);
  console.log(`SmetaOffice API: http://${host === "0.0.0.0" ? "127.0.0.1" : host}:${port}/api/health`);
  console.log(`Database: ${dbPath}`);
});
