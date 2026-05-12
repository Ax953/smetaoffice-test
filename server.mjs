import http from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "data");
const dbPath = path.join(dataDir, "database.json");
const distDir = path.join(__dirname, "dist");
const port = Number(process.env.PORT || process.env.SMETA_API_PORT || 8787);
const host = process.env.HOST || "0.0.0.0";

const defaultDb = {
  projects: [],
  executors: [],
  users: [],
  integrationSettings: { webhookUrl: "", syncMode: "manual", lastCheck: "не запускалась" },
  syncLog: [],
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
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(payload));
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
      sendJson(res, 200, { ok: true, service: "SmetaOffice API" });
      return;
    }

    if (req.method === "GET" && route === "/api/db") {
      sendJson(res, 200, db);
      return;
    }

    if (req.method === "GET" && route === "/api/projects") {
      sendJson(res, 200, db.projects);
      return;
    }

    if (req.method === "PUT" && route === "/api/projects") {
      const projects = await readJsonBody(req);
      const nextDb = { ...db, projects };
      await writeDb(nextDb);
      sendJson(res, 200, nextDb.projects);
      return;
    }

    if (req.method === "GET" && route === "/api/executors") {
      sendJson(res, 200, db.executors);
      return;
    }

    if (req.method === "PUT" && route === "/api/executors") {
      const executors = await readJsonBody(req);
      const nextDb = { ...db, executors };
      await writeDb(nextDb);
      sendJson(res, 200, nextDb.executors);
      return;
    }

    if (req.method === "GET" && route === "/api/users") {
      sendJson(res, 200, db.users);
      return;
    }

    if (req.method === "PUT" && route === "/api/users") {
      const users = await readJsonBody(req);
      const nextDb = { ...db, users };
      await writeDb(nextDb);
      sendJson(res, 200, nextDb.users);
      return;
    }

    if (req.method === "GET" && route === "/api/integration-settings") {
      sendJson(res, 200, db.integrationSettings);
      return;
    }

    if (req.method === "PUT" && route === "/api/integration-settings") {
      const integrationSettings = await readJsonBody(req);
      const nextDb = { ...db, integrationSettings };
      await writeDb(nextDb);
      sendJson(res, 200, nextDb.integrationSettings);
      return;
    }

    if (req.method === "POST" && route === "/api/sync-log") {
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
  console.log(`SmetaOffice: http://${host === "0.0.0.0" ? "127.0.0.1" : host}:${port}`);
  console.log(`SmetaOffice API: http://${host === "0.0.0.0" ? "127.0.0.1" : host}:${port}/api/health`);
  console.log(`Database: ${dbPath}`);
});
