import assert from "node:assert/strict";
import test from "node:test";
import { runAgentWorkSweep } from "../shared/agent-work-monitor.mjs";

test("project control sweep creates visible draft-only issues for project risks", () => {
  const result = runAgentWorkSweep({
    now: new Date("2026-07-26T10:00:00.000Z"),
    projects: [
      {
        id: "PRJ-1",
        title: "Дом Ахмеда",
        status: "В работе",
        contractAmount: 1_000_000,
        actualCost: 620_000,
        updatedAt: "2026-07-20T10:00:00.000Z",
        yandexFolder: "не привязан",
        sections: [
          {
            id: "SEC-1",
            name: "Визуализация",
            status: "В работе",
            due: "20.07.2026",
            executorName: "не назначен",
          },
        ],
      },
    ],
  });

  assert.equal(result.run.counts.projectsChecked, 1);
  assert.ok(result.events.some((event) => event.dedupeKey === "project:PRJ-1:missing-executor:SEC-1"));
  assert.ok(result.events.some((event) => event.dedupeKey === "project:PRJ-1:overdue:SEC-1"));
  assert.ok(result.events.some((event) => event.dedupeKey === "project:PRJ-1:finance-red"));
  assert.ok(result.events.every((event) => event.externalActionsAllowed === false));
  assert.ok(result.tasks.every((task) => task.executionMode === "draft_only"));
  assert.ok(result.tasks.some((task) => task.agentId === "A17" && task.status === "waiting_approval"));
});

test("project control sweep suppresses duplicate open events", () => {
  const result = runAgentWorkSweep({
    now: new Date("2026-07-26T10:00:00.000Z"),
    existingEvents: [{ dedupeKey: "project:PRJ-1:finance-red", status: "open" }],
    projects: [
      {
        id: "PRJ-1",
        title: "Дом Ахмеда",
        status: "В работе",
        contractAmount: 1_000_000,
        actualCost: 620_000,
        yandexFolder: "https://disk.yandex.ru/example",
        sections: [],
        clientReports: [{ createdAt: "2026-07-26T08:00:00.000Z" }],
      },
    ],
  });

  assert.equal(result.events.some((event) => event.dedupeKey === "project:PRJ-1:finance-red"), false);
  assert.equal(result.run.counts.issues, 0);
});
