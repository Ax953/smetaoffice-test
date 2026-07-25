import assert from "node:assert/strict";
import test from "node:test";

import {
  agentProfileMap,
  buildAgentCommandCenter,
  createAgentTask,
} from "../shared/agent-command-center.mjs";
import { buildAgentRegistry } from "../shared/agent-registry.mjs";

test("every business agent is routed to an installed Hermes profile", () => {
  const registry = buildAgentRegistry(new Date("2026-07-24T18:00:00.000Z"));

  assert.equal(Object.keys(agentProfileMap).length, registry.agents.length);
  for (const agent of registry.agents) {
    assert.match(agentProfileMap[agent.id], /^[a-z][a-z0-9-]*$/);
  }
});

test("command center derives visible workplace state from the real task queue", () => {
  const registry = buildAgentRegistry(new Date("2026-07-24T18:00:00.000Z"));
  const center = buildAgentCommandCenter({
    registry,
    tasks: [
      {
        id: "AIT-1",
        agentId: "A2",
        title: "Подготовить консультацию по дизайн-проекту",
        status: "running",
        priority: "high",
        createdAt: "2026-07-24T18:01:00.000Z",
      },
      {
        id: "AIT-2",
        agentId: "A4",
        title: "Проверить черновик КП",
        status: "waiting_approval",
        priority: "normal",
        createdAt: "2026-07-24T18:02:00.000Z",
      },
    ],
    events: [],
    channels: [],
    knowledge: {},
    now: new Date("2026-07-24T18:03:00.000Z"),
  });

  assert.equal(center.metrics.totalAgents, 25);
  assert.equal(center.metrics.working, 1);
  assert.equal(center.metrics.waitingApproval, 1);
  assert.equal(center.agents.find((agent) => agent.id === "A2")?.runtimeState, "working");
  assert.equal(center.agents.find((agent) => agent.id === "A4")?.runtimeState, "waiting_approval");
  assert.equal(center.agents.find((agent) => agent.id === "A0")?.name, "Главный координатор Hermes");
  assert.equal(center.agents.find((agent) => agent.id === "A17")?.name, "Финансовый контролёр");
  assert.equal(center.approvals[0].id, "AIT-2");
});

test("new command is validation-bound and draft-only by default", () => {
  const registry = buildAgentRegistry(new Date("2026-07-24T18:00:00.000Z"));
  const created = createAgentTask({
    input: {
      agentId: "A3",
      title: "Собрать недостающие данные по брифу",
      details: "Определить вопросы без отправки клиенту.",
      priority: "high",
    },
    actor: { id: "USR-OWNER", name: "Владелец", role: "owner" },
    registry,
    now: new Date("2026-07-24T18:04:00.000Z"),
    id: "AIT-TEST",
  });

  assert.equal(created.task.status, "queued");
  assert.equal(created.task.profile, "briefing");
  assert.equal(created.task.executionMode, "draft_only");
  assert.equal(created.task.externalActionsAllowed, false);
  assert.equal(created.event.kind, "task_created");
  assert.throws(
    () =>
      createAgentTask({
        input: { agentId: "A99", title: "Несуществующий агент" },
        actor: { id: "USR-OWNER", role: "owner" },
        registry,
      }),
    /Агент не найден/,
  );
});
