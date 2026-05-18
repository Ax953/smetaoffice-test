import http from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
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
const authMode = process.env.SMETA_AUTH_MODE || "demo";
const sessionTtlMs = Number(process.env.SMETA_SESSION_TTL_HOURS || 24) * 60 * 60 * 1000;

const defaultDb = {
  projects: [],
  executors: [],
  users: [],
  partners: [],
  salesLeads: [],
  directories: {
    regions: [],
    directions: [],
    projectTypes: [],
    partnerCategories: [],
    stageTemplates: {},
    financeTemplates: {},
    updatedAt: "",
  },
  integrationSettings: { webhookUrl: "", syncMode: "manual", lastCheck: "не запускалась" },
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
  try {
    const raw = await readFile(dbPath, "utf8");
    return { ...defaultDb, ...JSON.parse(raw) };
  } catch {
    return defaultDb;
  }
}

async function writeDb(nextDb) {
  await ensureDb();
  await writeFile(dbPath, JSON.stringify(nextDb, null, 2), "utf8");
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
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,OPTIONS",
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
const scopedAdminManageableRoleIds = ["director", "regional_manager", "pm", "project_manager", "sales_manager", "head_of_sales", "executor", "partner"];

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

  if (!canAccessRegion(user, project)) return false;
  if (user.role === "regional_admin" || user.role === "regional_manager") return true;
  if (user.role === "direction_admin") return user.direction === ALL_DIRECTIONS || normalizeDirectionName(project.direction) === normalizeDirectionName(user.direction);
  if (user.role === "director") return project.directorUserId === user.id || normalizeDirectionName(project.direction) === normalizeDirectionName(user.direction);
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
  if (["owner", "deputy", "finance", "accountant", "director", "regional_manager", "pm", "project_manager"].includes(user.role)) return "full";
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
  if (["owner", "admin", "deputy", "finance", "accountant"].includes(user.role)) return true;
  if (user.role === "partner") return partner.userId === user.id || partner.partnerUserId === user.id || partner.name === user.name;
  if (!canAccessRegion(user, partner)) return false;
  if (user.role === "regional_admin" || user.role === "regional_manager") return true;
  if (user.role === "direction_admin" || user.role === "director" || user.role === "pm" || user.role === "project_manager") {
    return user.direction === ALL_DIRECTIONS || normalizeDirectionName(partner.direction) === normalizeDirectionName(user.direction);
  }
  if (user.role === "head_of_sales" || user.role === "sales_manager") {
    return normalizeDirectionName(partner.direction) === "Единый центр продаж" || partner.relation === "Партнёр приводит нам клиентов";
  }
  return false;
}

function visiblePartnersFor(user, partners = []) {
  return partners.filter((partner) => canAccessPartner(user, partner));
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

function canAccessSalesLead(user, lead) {
  if (!user || !lead) return false;
  if (["owner", "admin", "deputy", "finance", "accountant"].includes(user.role)) return true;
  if (user.role === "regional_admin") return canAccessRegion(user, lead);
  if (user.role === "direction_admin") return canAccessRegion(user, lead) && leadDirectionMatches(user, lead);
  if (user.role === "head_of_sales") return canAccessRegion(user, lead);
  if (user.role === "sales_manager") return lead.hunterId === user.id || lead.farmerId === user.id;
  if (user.role === "partner") return lead.partnerId === user.id || lead.farmerId === user.id;
  if (user.role === "pm" || user.role === "project_manager") return lead.farmerId === user.id || Boolean(lead.projectId);
  if (user.role === "director") return canAccessRegion(user, lead) && leadDirectionMatches(user, lead);
  if (user.role === "regional_manager") return canAccessRegion(user, lead);
  return false;
}

function visibleSalesLeadsFor(user, salesLeads = []) {
  return salesLeads.filter((lead) => canAccessSalesLead(user, lead));
}

function canAccessExecutor(user, executor) {
  if (!user || !executor) return false;
  if (["owner", "admin", "deputy", "finance", "accountant"].includes(user.role)) return true;
  if (user.role === "executor" || user.role === "partner") return executor.id === user.executorId || executor.userId === user.id || executor.name === user.name;
  const hasRegion = !executor.region && !executor.city ? true : canAccessRegion(user, executor);
  if (!hasRegion) return false;
  if (user.role === "regional_admin" || user.role === "regional_manager" || user.role === "pm" || user.role === "project_manager") return true;
  if (user.role === "direction_admin" || user.role === "director") {
    const direction = normalizeDirectionName(executor.direction || ALL_DIRECTIONS);
    return direction === ALL_DIRECTIONS || user.direction === ALL_DIRECTIONS || direction === normalizeDirectionName(user.direction);
  }
  return false;
}

function visibleExecutorsFor(user, executors = []) {
  return executors.filter((executor) => canAccessExecutor(user, executor));
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
  if (["owner", "admin", "deputy"].includes(user.role)) return true;
  if (route === "/api/projects") return ["director", "regional_manager", "pm", "project_manager"].includes(user.role);
  if (route === "/api/executors") return ["regional_admin", "direction_admin", "director", "regional_manager", "pm"].includes(user.role);
  if (route === "/api/partners") return ["regional_admin", "direction_admin", "director", "regional_manager"].includes(user.role);
  if (route === "/api/sales-leads") return ["head_of_sales", "sales_manager"].includes(user.role);
  if (route === "/api/integration-settings") return user.role === "admin";
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
      sendJson(res, 200, {
        ok: true,
        service: "SmetaOffice API",
        storage: "json",
        authMode,
        updatedAt: new Date().toISOString(),
        counts: {
          projects: (db.projects || []).length,
          executors: (db.executors || []).length,
          users: (db.users || []).length,
          partners: (db.partners || []).length,
          salesLeads: (db.salesLeads || []).length,
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
      const nextDb = {
        ...db,
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
      sendJson(res, 200, { ok: true, token, user: publicUser(user), expiresAt: nextDb.authSessions[token].expiresAt });
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
      const payload = authMode === "server"
        ? {
            ...db,
            projects: visibleProjectsFor(auth.user, db.projects || []),
            executors: visibleExecutorsFor(auth.user, db.executors || []),
            users: publicUsers(visibleUsers),
            partners: visiblePartnersFor(auth.user, db.partners || []),
            salesLeads: visibleSalesLeadsFor(auth.user, db.salesLeads || []),
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
      if (authMode === "server" && !["owner", "admin", "deputy"].includes(auth.user.role)) {
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
      sendJson(res, 200, authMode === "server" ? visibleExecutorsFor(auth.user, db.executors || []) : db.executors);
      return;
    }

    if (req.method === "PUT" && route === "/api/executors") {
      const auth = requireWriteAccess(req, res, db, route);
      if (!auth) return;
      const executors = await readJsonBody(req);
      const nextExecutors = authMode === "server" ? mergeManagedCollection(db.executors || [], executors, auth.user, canAccessExecutor) : executors;
      const nextDb = { ...db, executors: nextExecutors };
      await writeDb(nextDb);
      sendJson(res, 200, authMode === "server" ? visibleExecutorsFor(auth.user, nextDb.executors) : nextDb.executors);
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
      sendJson(res, 200, authMode === "server" ? visiblePartnersFor(auth.user, db.partners || []) : db.partners || []);
      return;
    }

    if (req.method === "PUT" && route === "/api/partners") {
      const auth = requireWriteAccess(req, res, db, route);
      if (!auth) return;
      const partners = await readJsonBody(req);
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
      const nextSalesLeads = authMode === "server" ? mergeManagedCollection(db.salesLeads || [], salesLeads, auth.user, canAccessSalesLead) : salesLeads;
      const nextDb = { ...db, salesLeads: nextSalesLeads };
      await writeDb(nextDb);
      sendJson(res, 200, authMode === "server" ? visibleSalesLeadsFor(auth.user, nextDb.salesLeads) : nextDb.salesLeads);
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
      const integrationSettings = await readJsonBody(req);
      const nextDb = { ...db, integrationSettings };
      await writeDb(nextDb);
      sendJson(res, 200, nextDb.integrationSettings);
      return;
    }

    if (req.method === "POST" && route === "/api/sync-log") {
      if (!requireAuth(req, res, db)) return;
      const event = await readJsonBody(req);
      const nextDb = { ...db, syncLog: [{ ...event, at: new Date().toISOString() }, ...(db.syncLog || [])].slice(0, 200) };
      await writeDb(nextDb);
      sendJson(res, 200, nextDb.syncLog);
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
