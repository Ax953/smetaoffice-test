import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";

async function availablePort() {
  const server = net.createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  server.close();
  await once(server, "close");
  return port;
}

async function waitForHealth(baseUrl, child, logs) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`SmetaOffice exited before healthcheck:\n${logs.join("")}`);
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`SmetaOffice healthcheck timed out:\n${logs.join("")}`);
}

test("ai_agent can read approved operational data but cannot mutate SmetaOffice", { timeout: 20_000 }, async () => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "smetaoffice-ai-agent-"));
  const port = await availablePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const database = {
    projects: [
      {
        id: "PROJECT-1",
        title: "Read-only project",
        client: "Internal test client",
        region: "Р§РµС‡РµРЅСЃРєР°СЏ Р РµСЃРїСѓР±Р»РёРєР°",
        direction: "Р‘СЋСЂРѕ Р°СЂС…РёС‚РµРєС‚СѓСЂС‹ Рё РґРёР·Р°Р№РЅР°",
        contractAmount: 1_000_000,
        productionBudget: 350_000,
        tasks: [{ id: "TASK-1", name: "Test task", status: "РќРѕРІР°СЏ" }],
        sections: [],
      },
    ],
    executors: [{ id: "EXECUTOR-1", name: "Test executor", contacts: { phone: "+70000000000" } }],
    users: [
      {
        id: "USER-AI",
        login: "hermes-test",
        password: "test-only-password",
        role: "ai_agent",
        name: "Hermes test",
        status: "active",
        region: "Р’СЃРµ СЂРµРіРёРѕРЅС‹",
        regions: ["Р’СЃРµ СЂРµРіРёРѕРЅС‹"],
        direction: "Р’СЃРµ РЅР°РїСЂР°РІР»РµРЅРёСЏ",
      },
      {
        id: "USER-OWNER",
        login: "owner-test",
        password: "owner-test-password",
        role: "owner",
        name: "Owner test",
        status: "active",
        region: "Р’СЃРµ СЂРµРіРёРѕРЅС‹",
        regions: ["Р’СЃРµ СЂРµРіРёРѕРЅС‹"],
        direction: "Р’СЃРµ РЅР°РїСЂР°РІР»РµРЅРёСЏ",
      },
    ],
    partners: [],
    salesLeads: [{ id: "LEAD-1", clientName: "Test lead", region: "Р§РµС‡РµРЅСЃРєР°СЏ Р РµСЃРїСѓР±Р»РёРєР°" }],
    salesDeals: [],
    salesActivities: [],
    salesEscalations: [],
    projectHandoffs: [],
    salesKpiSnapshots: [],
    financialPeriods: [{ id: "FIN-1", region: "Р§РµС‡РµРЅСЃРєР°СЏ Р РµСЃРїСѓР±Р»РёРєР°", revenue: 1_000_000 }],
    operationalExpenses: [],
    cashAccounts: [],
    directories: {},
    integrationSettings: { webhookUrl: "https://secret.invalid/rest/token", qualifiedStageIds: "WON" },
    syncLog: [],
    accessRequests: [{ id: "REQUEST-1", login: "private-request", passwordHash: "hidden" }],
    authSessions: {},
  };
  await writeFile(path.join(dataDir, "database.json"), JSON.stringify(database, null, 2), "utf8");

  const logs = [];
  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: path.resolve(import.meta.dirname, ".."),
    env: {
      ...process.env,
      NODE_ENV: "test",
      PORT: String(port),
      HOST: "127.0.0.1",
      SMETA_AUTH_MODE: "server",
      SMETA_SESSION_TTL_HOURS: "1",
      SMETA_DATA_DIR: dataDir,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => logs.push(chunk.toString()));
  child.stderr.on("data", (chunk) => logs.push(chunk.toString()));

  try {
    await waitForHealth(baseUrl, child, logs);
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ login: "hermes-test", password: "test-only-password" }),
    });
    assert.equal(loginResponse.status, 200);
    const login = await loginResponse.json();
    assert.equal(login.user.role, "ai_agent");
    const headers = { authorization: `Bearer ${login.token}` };

    const projectsResponse = await fetch(`${baseUrl}/api/projects`, { headers });
    assert.equal(projectsResponse.status, 200);
    const projects = await projectsResponse.json();
    assert.equal(projects.length, 1);
    assert.equal(projects[0].contractAmount, 1_000_000);

    const agentsResponse = await fetch(`${baseUrl}/api/ai-agents`, { headers });
    assert.equal(agentsResponse.status, 200);
    const agents = await agentsResponse.json();
    assert.equal(agents.summary.total, 25);
    assert.equal(agents.summary.runningLocal, 2);
    assert.equal(agents.agents[0].id, "A0");
    assert.equal(agents.agents[24].id, "A24");

    const usersResponse = await fetch(`${baseUrl}/api/users`, { headers });
    assert.equal(usersResponse.status, 200);
    const users = await usersResponse.json();
    assert.equal(users.length, 2);
    assert.ok(users.every((user) => !("password" in user) && !("passwordHash" in user) && !("passwordSalt" in user)));

    const financeResponse = await fetch(`${baseUrl}/api/financial-periods`, { headers });
    assert.equal(financeResponse.status, 200);
    assert.equal((await financeResponse.json()).length, 1);

    const dbResponse = await fetch(`${baseUrl}/api/db`, { headers });
    assert.equal(dbResponse.status, 200);
    const db = await dbResponse.json();
    assert.deepEqual(db.accessRequests, []);
    assert.equal(db.integrationSettings.webhookUrl, "configured");
    assert.deepEqual(db.authSessions, {});

    const deniedWrites = [
      ["PUT", "/api/projects", []],
      ["PUT", "/api/executors", []],
      ["PUT", "/api/partners", []],
      ["PUT", "/api/users", []],
      ["PUT", "/api/sales-leads", []],
      ["PUT", "/api/financial-periods", []],
      ["PUT", "/api/operational-expenses", []],
      ["PUT", "/api/cash-accounts", []],
      ["PUT", "/api/directories", {}],
      ["PUT", "/api/integration-settings", {}],
      ["POST", "/api/work-bids", { projectId: "PROJECT-1", taskId: "TASK-1" }],
    ];

    for (const [method, route, body] of deniedWrites) {
      const response = await fetch(`${baseUrl}${route}`, {
        method,
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      assert.equal(response.status, 403, `${method} ${route} must be forbidden for ai_agent`);
    }

    const deleteResponse = await fetch(`${baseUrl}/api/projects/PROJECT-1`, { method: "DELETE", headers });
    assert.equal(deleteResponse.status, 403);

    const projectsAfterDeniedWrites = await fetch(`${baseUrl}/api/projects`, { headers }).then((response) => response.json());
    assert.equal(projectsAfterDeniedWrites.length, 1);
    const financeAfterDeniedWrites = await fetch(`${baseUrl}/api/financial-periods`, { headers }).then((response) => response.json());
    assert.equal(financeAfterDeniedWrites.length, 1);
  } finally {
    if (child.exitCode === null) {
      child.kill();
      await once(child, "exit");
    }
    await rm(dataDir, { recursive: true, force: true });
  }
});

