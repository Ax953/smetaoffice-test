import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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

async function login(baseUrl, loginName, password) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ login: loginName, password }),
  });
  assert.equal(response.status, 200);
  const payload = await response.json();
  return { authorization: `Bearer ${payload.token}` };
}

test("owner commands an agent while Hermes service account remains read-only", { timeout: 20_000 }, async () => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "smetaoffice-command-center-"));
  const port = await availablePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const database = {
    projects: [
      {
        id: "PRJ-RISK",
        title: "Риск-проект для обхода",
        status: "В работе",
        contractAmount: 1_000_000,
        actualCost: 610_000,
        updatedAt: "2026-07-20T08:00:00.000Z",
        yandexFolder: "не привязан",
        sections: [
          {
            id: "SEC-OVERDUE",
            name: "Визуализация",
            status: "В работе",
            due: "2020-01-01",
            executorName: "не назначен",
          },
        ],
      },
    ],
    executors: [],
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
    users: [
      {
        id: "USER-OWNER",
        login: "owner-test",
        password: "owner-test-password",
        role: "owner",
        name: "Owner test",
        status: "active",
      },
      {
        id: "USER-AI",
        login: "hermes-test",
        password: "hermes-test-password",
        role: "ai_agent",
        name: "Hermes test",
        status: "active",
      },
    ],
    aiAgentTasks: [],
    aiAgentEvents: [],
    aiAgentChannels: [
      { id: "telegram", name: "Telegram", state: "configured", detail: "Ожидается сквозная проверка" },
    ],
    aiKnowledgeStatus: {
      inventoriedFiles: 918,
      indexedDocuments: 416,
      state: "indexing",
    },
    integrationSettings: {},
    directories: {},
    syncLog: [],
    accessRequests: [],
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
    const ownerHeaders = await login(baseUrl, "owner-test", "owner-test-password");
    const aiHeaders = await login(baseUrl, "hermes-test", "hermes-test-password");

    const initialResponse = await fetch(`${baseUrl}/api/ai-command-center`, { headers: ownerHeaders });
    assert.equal(initialResponse.status, 200);
    const initial = await initialResponse.json();
    assert.equal(initial.metrics.totalAgents, 25);
    assert.equal(initial.channels[0].id, "telegram");

    const createResponse = await fetch(`${baseUrl}/api/ai-agent-tasks`, {
      method: "POST",
      headers: { ...ownerHeaders, "content-type": "application/json" },
      body: JSON.stringify({
        agentId: "A3",
        title: "Собрать бриф по новому обращению",
        details: "Подготовить только внутренний черновик.",
        priority: "high",
      }),
    });
    assert.equal(createResponse.status, 201);
    const created = await createResponse.json();
    assert.equal(created.task.agentId, "A3");
    assert.equal(created.task.profile, "briefing");
    assert.equal(created.task.externalActionsAllowed, false);

    const deniedResponse = await fetch(`${baseUrl}/api/ai-agent-tasks`, {
      method: "POST",
      headers: { ...aiHeaders, "content-type": "application/json" },
      body: JSON.stringify({ agentId: "A2", title: "Попытка записи от service account" }),
    });
    assert.equal(deniedResponse.status, 403);

    const sweepResponse = await fetch(`${baseUrl}/api/ai-agent-runs/control-sweep`, {
      method: "POST",
      headers: ownerHeaders,
    });
    assert.equal(sweepResponse.status, 200);
    const sweep = await sweepResponse.json();
    assert.ok(sweep.run.counts.projectsChecked >= 1);
    assert.ok(sweep.eventsCreated >= 3);
    assert.ok(sweep.tasksCreated >= 3);

    const deniedSweepResponse = await fetch(`${baseUrl}/api/ai-agent-runs/control-sweep`, {
      method: "POST",
      headers: aiHeaders,
    });
    assert.equal(deniedSweepResponse.status, 403);

    const persisted = JSON.parse(await readFile(path.join(dataDir, "database.json"), "utf8"));
    assert.ok(persisted.aiAgentTasks.length > 1);
    assert.ok(persisted.aiAgentEvents.length > 1);
    assert.equal(persisted.aiAgentRuns.length, 1);
    assert.ok(!JSON.stringify(persisted.aiAgentTasks).includes("owner-test-password"));
  } finally {
    if (child.exitCode === null) {
      child.kill();
      await once(child, "exit");
    }
    await rm(dataDir, { recursive: true, force: true });
  }
});
