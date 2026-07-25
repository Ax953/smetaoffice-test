export const agentProfileMap = Object.freeze({
  A0: "default",
  A1: "sales",
  A2: "sales",
  A3: "briefing",
  A4: "contract",
  A5: "concept",
  A6: "contract",
  A7: "project-admin",
  A8: "production",
  A9: "production",
  A10: "client-report",
  A11: "design-copilot",
  A12: "architecture-copilot",
  A13: "design-copilot",
  A14: "quality",
  A15: "architecture-copilot",
  A16: "estimate-copilot",
  A17: "finance",
  A18: "quality",
  A19: "project-admin",
  A20: "project-admin",
  A21: "upsell",
  A22: "upsell",
  A23: "knowledge",
  A24: "integration-control",
});

const agentDisplayNames = Object.freeze({
  A0: "Главный координатор Hermes",
  A1: "Распределитель лидов",
  A2: "Консультант по продажам",
  A3: "Агент сбора ТЗ",
  A4: "Агент расчёта и КП",
  A5: "Агент предварительных концепций",
  A6: "Агент договоров и оплат",
  A7: "Администратор запуска проекта",
  A8: "Агент подбора команды",
  A9: "Агент управления проектом",
  A10: "Агент отчётов клиенту",
  A11: "Помощник дизайнера",
  A12: "Помощник архитектора",
  A13: "Помощник визуализатора",
  A14: "Проверяющий чертежей",
  A15: "Координатор инженерных разделов",
  A16: "Агент комплектации",
  A17: "Финансовый контролёр",
  A18: "Агент качества и регламентов",
  A19: "Агент передачи в строительство",
  A20: "Агент печати и выдачи",
  A21: "Агент допродаж",
  A22: "Агент партнёрских услуг",
  A23: "Хранитель базы знаний",
  A24: "Агент безопасности и аудита",
});

const phaseWorkplaces = Object.freeze({
  0: { id: "command", name: "Командный пункт", short: "КП" },
  1: { id: "sales", name: "Отдел продаж и ТЗ", short: "ПР" },
  2: { id: "concept", name: "Концепт-студия", short: "КЦ" },
  3: { id: "launch", name: "Проектный офис", short: "ПО" },
  4: { id: "project", name: "Диспетчерская проектов", short: "ДП" },
  5: { id: "finance", name: "Финансовый контроль", short: "ФН" },
  6: { id: "production", name: "Производственный зал", short: "ПЗ" },
  7: { id: "growth", name: "Развитие клиента", short: "РК" },
});

const activeStatuses = new Set(["queued", "running", "waiting_approval", "blocked"]);
const allowedPriorities = new Set(["low", "normal", "high", "critical"]);

function cleanText(value, maxLength) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function taskSort(left, right) {
  const statusRank = {
    running: 0,
    waiting_approval: 1,
    blocked: 2,
    queued: 3,
    completed: 4,
    failed: 5,
    cancelled: 6,
  };
  const leftRank = statusRank[left.status] ?? 99;
  const rightRank = statusRank[right.status] ?? 99;
  if (leftRank !== rightRank) return leftRank - rightRank;
  return String(right.createdAt || "").localeCompare(String(left.createdAt || ""));
}

function runtimeState(agent, assignedTasks) {
  const statuses = new Set(assignedTasks.map((task) => task.status));
  if (statuses.has("running")) return "working";
  if (statuses.has("waiting_approval")) return "waiting_approval";
  if (statuses.has("blocked") || statuses.has("failed")) return "blocked";
  if (statuses.has("queued")) return "queued";
  if (agent.readiness === "DESIGNED") return "planned";
  return "ready";
}

function safeChannels(channels) {
  return (Array.isArray(channels) ? channels : []).map((channel) => ({
    id: cleanText(channel.id, 40),
    name: cleanText(channel.name, 80),
    state: cleanText(channel.state, 40) || "not_configured",
    detail: cleanText(channel.detail, 240),
    lastEventAt: channel.lastEventAt || channel.last_event_at || null,
  }));
}

export function createAgentTask({ input, actor, registry, now = new Date(), id } = {}) {
  const agents = Array.isArray(registry?.agents) ? registry.agents : [];
  const agentId = cleanText(input?.agentId, 16);
  const agent = agents.find((item) => item.id === agentId);
  if (!agent) throw new Error("Агент не найден");

  const title = cleanText(input?.title, 160);
  if (title.length < 3) throw new Error("Название задачи должно содержать минимум 3 символа");

  const details = cleanText(input?.details, 4_000);
  const priority = cleanText(input?.priority, 20).toLowerCase() || "normal";
  if (!allowedPriorities.has(priority)) throw new Error("Недопустимый приоритет задачи");

  const createdAt = now.toISOString();
  const taskId = id || `AIT-${now.getTime()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const actorId = cleanText(actor?.id, 80) || "system";
  const actorName = cleanText(actor?.name, 120) || cleanText(actor?.role, 40) || "Система";
  const task = {
    id: taskId,
    agentId,
    profile: agentProfileMap[agentId],
    title,
    details,
    priority,
    status: "queued",
    executionMode: "draft_only",
    externalActionsAllowed: false,
    requiresHumanApproval: true,
    requestedBy: actorId,
    requestedByName: actorName,
    createdAt,
    updatedAt: createdAt,
    dispatchStatus: "pending",
  };
  const event = {
    id: `AIE-${taskId}`,
    taskId,
    agentId,
    kind: "task_created",
    message: `${actorName} поставил задачу агенту ${agentDisplayNames[agent.id] || agent.name}`,
    actorId,
    createdAt,
  };
  return { task, event };
}

export function buildAgentCommandCenter({
  registry,
  tasks = [],
  events = [],
  runs = [],
  channels = [],
  knowledge = {},
  now = new Date(),
} = {}) {
  const normalizedTasks = (Array.isArray(tasks) ? tasks : [])
    .map((task) => ({
      ...task,
      id: cleanText(task.id, 100),
      agentId: cleanText(task.agentId, 16),
      profile: cleanText(task.profile || agentProfileMap[task.agentId], 80),
      title: cleanText(task.title, 160),
      details: cleanText(task.details, 4_000),
      status: cleanText(task.status, 40) || "queued",
      priority: cleanText(task.priority, 20) || "normal",
      externalActionsAllowed: task.externalActionsAllowed === true,
    }))
    .sort(taskSort);

  const agents = (registry?.agents || []).map((agent) => {
    const assignedTasks = normalizedTasks.filter(
      (task) => task.agentId === agent.id && activeStatuses.has(task.status),
    );
    const workplace = phaseWorkplaces[agent.phase] || phaseWorkplaces[0];
    return {
      ...agent,
      name: agentDisplayNames[agent.id] || agent.name,
      profile: agentProfileMap[agent.id],
      workplace,
      runtimeState: runtimeState(agent, assignedTasks),
      currentTask: assignedTasks[0] || null,
      queue: assignedTasks.slice(1),
      activeTaskCount: assignedTasks.length,
    };
  });

  const approvals = normalizedTasks.filter((task) => task.status === "waiting_approval");
  const runtimeCount = (state) => agents.filter((agent) => agent.runtimeState === state).length;
  const inventoriedFiles = Number(knowledge.inventoriedFiles ?? registry?.training?.inventoriedFiles ?? 0);
  const indexedDocuments = Number(knowledge.indexedDocuments ?? registry?.training?.indexedDocuments ?? 0);

  return {
    updatedAt: now.toISOString(),
    metrics: {
      totalAgents: agents.length,
      working: runtimeCount("working"),
      queued: runtimeCount("queued"),
      waitingApproval: runtimeCount("waiting_approval"),
      blocked: runtimeCount("blocked"),
      ready: runtimeCount("ready"),
      planned: runtimeCount("planned"),
      activeTasks: normalizedTasks.filter((task) => activeStatuses.has(task.status)).length,
    },
    workplaces: Object.values(phaseWorkplaces).map((workplace) => ({
      ...workplace,
      agents: agents.filter((agent) => agent.workplace.id === workplace.id).map((agent) => agent.id),
    })),
    agents,
    tasks: normalizedTasks,
    approvals,
    runs: (Array.isArray(runs) ? runs : []).slice().sort((left, right) =>
      String(right.createdAt || "").localeCompare(String(left.createdAt || "")),
    ).slice(0, 50),
    events: (Array.isArray(events) ? events : []).slice().sort((left, right) =>
      String(right.createdAt || "").localeCompare(String(left.createdAt || "")),
    ).slice(0, 100),
    channels: safeChannels(channels),
    knowledge: {
      state: cleanText(knowledge.state, 40) || "unknown",
      inventoriedFiles,
      indexedDocuments,
      progressPercent: inventoriedFiles > 0 ? Math.round((indexedDocuments / inventoriedFiles) * 100) : 0,
      lastIndexedAt: knowledge.lastIndexedAt || null,
      warnings: Array.isArray(knowledge.warnings) ? knowledge.warnings.map((item) => cleanText(item, 240)) : [],
    },
  };
}
