import http from "node:http";
import { readFile, writeFile, mkdir, rename, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, timingSafeEqual, pbkdf2Sync } from "node:crypto";
import { buildAgentRegistry } from "./shared/agent-registry.mjs";

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
    lastCheck: "РЅРµ Р·Р°РїСѓСЃРєР°Р»Р°СЃСЊ",
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
        region: "Р’СЃРµ СЂРµРіРёРѕРЅС‹",
        regions: ["Р’СЃРµ СЂРµРіРёРѕРЅС‹"],
        direction: "Р’СЃРµ РЅР°РїСЂР°РІР»РµРЅРёСЏ",
        position: "РћСЃРЅРѕРІР°С‚РµР»СЊ / РІР»Р°РґРµР»РµС†",
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

const ALL_REGIONS = "Р’СЃРµ СЂРµРіРёРѕРЅС‹";
const ALL_DIRECTIONS = "Р’СЃРµ РЅР°РїСЂР°РІР»РµРЅРёСЏ";
const READ_ONLY_AI_ROLE = "ai_agent";
const fullUserAdminRoles = ["owner", "admin"];
const scopedUserAdminRoles = ["regional_admin", "direction_admin"];
const scopedAdminManageableRoleIds = ["director", "head_of_department", "regional_manager", "pm", "gip", "project_manager", "sales_manager", "senior_sales_manager", "head_of_sales", "ecp_manager", "executor", "partner"];

function isReadOnlyAi(user) {
  return user?.role === READ_ONLY_AI_ROLE;
}

function normalizeRegionName(region) {
  const value = String(region || "").trim();
  if (!value) return "Р‘РµР· СЂРµРіРёРѕРЅР°";
  const aliases = {
    "Р§Р ": "Р§РµС‡РµРЅСЃРєР°СЏ Р РµСЃРїСѓР±Р»РёРєР°",
    "Р“СЂРѕР·РЅС‹Р№": "Р§РµС‡РµРЅСЃРєР°СЏ Р РµСЃРїСѓР±Р»РёРєР°",
    "Р РѕСЃС‚РѕРІ": "Р РѕСЃС‚РѕРІСЃРєР°СЏ РѕР±Р»Р°СЃС‚СЊ",
    "Р РѕСЃС‚РѕРІ-РЅР°-Р”РѕРЅСѓ": "Р РѕСЃС‚РѕРІСЃРєР°СЏ РѕР±Р»Р°СЃС‚СЊ",
    "Р›РќР ": "Р”РќР ",
  };
  return aliases[value] || value;
}

function normalizeDirectionName(direction) {
  const value = String(direction || "").trim();
  if (!value) return "Р‘РµР· РЅР°РїСЂР°РІР»РµРЅРёСЏ";
  const aliases = {
    "РђРіРµРЅС‚СЃС‚РІРѕ РЅРµРґРІРёР¶РёРјРѕСЃС‚Рё": "Р•РґРёРЅС‹Р№ С†РµРЅС‚СЂ РїСЂРѕРґР°Р¶",
    "РќРµРґРІРёР¶РёРјРѕСЃС‚СЊ": "Р•РґРёРЅС‹Р№ С†РµРЅС‚СЂ РїСЂРѕРґР°Р¶",
    "РџСЂРѕРґР°Р¶Рё": "Р•РґРёРЅС‹Р№ С†РµРЅС‚СЂ РїСЂРѕРґР°Р¶",
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
  if (raw.includes("С„РµРґРµСЂР°") || raw.includes("federal")) return "federal";
  if (raw.includes("РјРµР¶") || raw.includes("РґСЂСѓРі") || raw.includes("inter")) return "interregional";
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
  if (fullUserAdminRoles.includes(manager.role) || manager.role === "deputy" || isReadOnlyAi(manager)) return users;
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
  if (isReadOnlyAi(user)) return true;
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
  if (isReadOnlyAi(user)) return true;
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
    client: partnerProject ? project.client : "РЎРєСЂС‹С‚Рѕ",
    clientStatus: partnerProject ? project.clientStatus : "Р”РѕСЃС‚СѓРїРµРЅ С‚РѕР»СЊРєРѕ РЅР°Р·РЅР°С‡РµРЅРЅС‹Р№ РѕР±СЉС‘Рј СЂР°Р±РѕС‚.",
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
  if (isReadOnlyAi(user) || ["owner", "admin", "deputy", "finance", "accountant", "regional_admin", "direction_admin", "director", "head_of_department", "regional_manager", "pm", "project_manager"].includes(user.role)) return "full";
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
  if (isReadOnlyAi(user)) return true;
  if (["owner", "admin", "deputy", "finance", "accountant"].includes(user.role)) return true;
  if (user.role === "partner") return normalizedPartner.userId === user.id || normalizedPartner.partnerUserId === user.id || normalizedPartner.name === user.name;
  if (!partnerRegionMatches(user, normalizedPartner)) return false;
  if (user.role === "regional_admin" || user.role === "regional_manager") return true;
  if (user.role === "direction_admin" || user.role === "director" || user.role === "head_of_department" || user.role === "pm" || user.role === "project_manager") {
    return user.direction === ALL_DIRECTIONS || normalizeDirectionName(normalizedPartner.direction) === normalizeDirectionName(user.direction);
  }
  if (user.role === "head_of_sales" || user.role === "sales_manager") {
    return normalizeDirectionName(normalizedPartner.direction) === "Р•РґРёРЅС‹Р№ С†РµРЅС‚СЂ РїСЂРѕРґР°Р¶" || normalizedPartner.relation === "РџР°СЂС‚РЅС‘СЂ РїСЂРёРІРѕРґРёС‚ РЅР°Рј РєР»РёРµРЅС‚РѕРІ";
  }
  return false;
}

function visiblePartnersFor(user, partners = []) {
  return partners.map(normalizePartnerRecord).filter((partner) => canAccessPartner(user, partner));
}

const salesLeadDirectionMap = {
  design: "Р‘СЋСЂРѕ Р°СЂС…РёС‚РµРєС‚СѓСЂС‹ Рё РґРёР·Р°Р№РЅР°",
  architecture: "Р‘СЋСЂРѕ Р°СЂС…РёС‚РµРєС‚СѓСЂС‹ Рё РґРёР·Р°Р№РЅР°",
  project_institute: "РџСЂРѕРµРєС‚РЅС‹Р№ РёРЅСЃС‚РёС‚СѓС‚",
  repair: "РЎС‚СЂРѕРёС‚РµР»СЊСЃС‚РІРѕ Рё СЂРµРјРѕРЅС‚",
  realty: "Р•РґРёРЅС‹Р№ С†РµРЅС‚СЂ РїСЂРѕРґР°Р¶",
  surveys: "РР·С‹СЃРєР°РЅРёСЏ / РѕР±СЃР»РµРґРѕРІР°РЅРёСЏ / РѕР±РјРµСЂС‹",
  completion: "РљРѕ…16312 tokens truncated…auth.user, executorDirectory) : executorDirectory);
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
        syncLog: appendSyncLog(db, { source: "SmetaOffice", type: "integration_settings", status: "updated", message: "РќР°СЃС‚СЂРѕР№РєРё РёРЅС‚РµРіСЂР°С†РёРё РѕР±РЅРѕРІР»РµРЅС‹." }),
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
          syncLog: appendSyncLog(db, { source: "Bitrix24", type: "connection_test", status: "error", message: "Webhook РЅРµ СѓРєР°Р·Р°РЅ." }),
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
          syncLog: appendSyncLog(db, { source: "Bitrix24", type: "connection_test", status: "ok", message: "Webhook РїСЂРѕРІРµСЂРµРЅ, РґРѕСЃС‚СѓРї Рє Bitrix24 РµСЃС‚СЊ." }),
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
          syncLog: appendSyncLog(db, { source: "Bitrix24", type: "deal_import", status: "error", message: "Webhook РЅРµ СѓРєР°Р·Р°РЅ." }),
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
          syncLog: appendSyncLog(db, { source: "Bitrix24", type: "deal_import", status: "ok", message: `РРјРїРѕСЂС‚РёСЂРѕРІР°РЅРѕ/РѕР±РЅРѕРІР»РµРЅРѕ СЃРґРµР»РѕРє: ${importedLeads.length}.` }),
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

