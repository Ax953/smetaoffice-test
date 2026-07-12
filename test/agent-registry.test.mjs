import assert from "node:assert/strict";
import test from "node:test";

import { agentCatalog, agentPhases, buildAgentRegistry } from "../shared/agent-registry.mjs";

test("agent registry contains the complete A0-A24 implementation map", () => {
  const registry = buildAgentRegistry(new Date("2026-07-13T00:00:00.000Z"));
  const ids = agentCatalog.map((agent) => agent.id);

  assert.equal(agentCatalog.length, 25);
  assert.equal(new Set(ids).size, 25);
  assert.deepEqual(ids, Array.from({ length: 25 }, (_, index) => `A${index}`));
  assert.equal(agentPhases.length, 8);
  assert.deepEqual(registry.summary, {
    total: 25,
    runningLocal: 2,
    mvpReady: 11,
    codeReady: 1,
    designed: 11,
    highPriority: 17,
  });
  assert.equal(registry.training.inventoriedFiles, 918);
  assert.equal(registry.training.indexedDocuments, 416);
  assert.equal(registry.training.phoneLinkLessons, 65);
});

