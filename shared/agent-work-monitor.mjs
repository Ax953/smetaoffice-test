const activeProjectStatuses = new Set([
  "",
  "новая",
  "новый",
  "в работе",
  "активен",
  "active",
  "in_progress",
  "на согласовании",
]);

const closedTaskStatuses = new Set([
  "готово",
  "готов",
  "done",
  "approved",
  "принято",
  "завершено",
  "завершён",
  "закрыто",
  "closed",
  "cancelled",
  "отменено",
]);

const missingExecutorWords = new Set([
  "",
  "не назначен",
  "не назначена",
  "не указан",
  "нет",
  "ожидает исполнителя",
  "исполнитель",
  "дизайнер",
  "архитектор",
  "визуализатор",
  "чертежник",
  "сметчик",
]);

function cleanText(value, max = 240) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function normalize(value) {
  return cleanText(value, 240).toLowerCase();
}

function numberValue(...values) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const parsed = Number(String(value ?? "").replace(/\s/g, "").replace(",", ".").replace(/[^\d.-]/g, ""));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 0;
}

function parseDate(value) {
  if (!value || ["не указан", "нет", "-"].includes(normalize(value))) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const raw = cleanText(value, 80);
  const iso = Date.parse(raw);
  if (!Number.isNaN(iso)) return new Date(iso);
  const ru = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (ru) {
    const parsed = new Date(Number(ru[3]), Number(ru[2]) - 1, Number(ru[1]), 23, 59, 59);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function daysBetween(left, right) {
  return Math.floor((left.getTime() - right.getTime()) / 86_400_000);
}

function projectRows(project) {
  return [
    ...(Array.isArray(project?.sections) ? project.sections : []),
    ...(Array.isArray(project?.tasks) ? project.tasks : []),
  ];
}

function rowName(row, index) {
  return cleanText(row?.name || row?.title || row?.sectionName || `Работа ${index + 1}`, 120);
}

function isActiveProject(project) {
  const status = normalize(project?.status || project?.projectStatus);
  if (["завершён", "завершен", "закрыт", "closed", "done", "archive", "архив"].includes(status)) return false;
  return activeProjectStatuses.has(status) || !status;
}

function isClosedRow(row) {
  return closedTaskStatuses.has(normalize(row?.status));
}

function assignedExecutor(row) {
  return cleanText(
    row?.executorName ||
      row?.executor ||
      row?.executorId ||
      row?.assigneeName ||
      row?.assignee ||
      row?.responsibleName ||
      row?.responsible ||
      row?.owner,
    160,
  );
}

function hasRealExecutor(row) {
  const assigned = normalize(assignedExecutor(row));
  return assigned.length > 1 && !missingExecutorWords.has(assigned);
}

function latestDateFrom(items) {
  const dates = items
    .map(parseDate)
    .filter(Boolean)
    .sort((left, right) => right.getTime() - left.getTime());
  return dates[0] || null;
}

function latestReportDate(project) {
  const reportCollections = [
    ...(Array.isArray(project?.dailyReports) ? project.dailyReports : []),
    ...(Array.isArray(project?.clientReports) ? project.clientReports : []),
    ...(Array.isArray(project?.reports) ? project.reports : []),
  ];
  return latestDateFrom([
    project?.lastClientReportAt,
    project?.lastReportAt,
    ...reportCollections.flatMap((item) => [item?.createdAt, item?.date, item?.sentAt, item?.updatedAt]),
  ]);
}

function latestActivityDate(project) {
  const chatDates = Array.isArray(project?.chat)
    ? project.chat.flatMap((item) => [item?.createdAt, item?.date, item?.updatedAt])
    : [];
  const rowDates = projectRows(project).flatMap((item) => [item?.updatedAt, item?.lastActivityAt, item?.createdAt]);
  return latestDateFrom([
    project?.lastActivityAt,
    project?.updatedAt,
    project?.lastContactAt,
    project?.createdAt,
    ...chatDates,
    ...rowDates,
  ]);
}

function projectFolder(project) {
  return cleanText(project?.yandexFolder || project?.yandexDiskUrl || project?.diskUrl || project?.folderUrl, 300);
}

function hasProjectFolder(project) {
  const folder = normalize(projectFolder(project));
  return folder.startsWith("http") || folder.startsWith("\\\\") || folder.includes("yadi.sk") || folder.includes("disk.yandex");
}

function projectCost(project) {
  const rows = projectRows(project);
  const rowCost = rows.reduce((sum, row) => sum + numberValue(row?.actualCost, row?.executorCost, row?.cost, row?.amount), 0);
  const directCosts = numberValue(project?.directCosts, project?.directCost);
  const actualCost = numberValue(project?.actualCost, project?.productionActualCost, project?.costFact, project?.factCost) || rowCost + directCosts;
  const plannedCost = numberValue(project?.plannedCost, project?.productionBudget, project?.costPlan, project?.planCost);
  return {
    contractAmount: numberValue(project?.contractAmount, project?.amount, project?.budget),
    actualCost,
    plannedCost,
  };
}

function addIssue(issues, issue, existingDedupeKeys, nowIso) {
  if (!issue.dedupeKey || existingDedupeKeys.has(issue.dedupeKey)) return;
  existingDedupeKeys.add(issue.dedupeKey);
  issues.push({
    id: `AIE-SWEEP-${Date.now()}-${issues.length + 1}`,
    kind: "agent_sweep_issue",
    status: "open",
    requiresHumanApproval: true,
    externalActionsAllowed: false,
    createdAt: nowIso,
    ...issue,
  });
}

function issueToTask(issue, index, actor, nowIso) {
  return {
    id: `AIT-SWEEP-${Date.now()}-${index + 1}`,
    agentId: issue.agentId,
    profile: issue.profile,
    title: issue.title,
    details: `${issue.details}\n\nРекомендованное действие: ${issue.recommendedAction}`,
    priority: issue.priority,
    status: issue.severity === "critical" ? "waiting_approval" : "queued",
    executionMode: "draft_only",
    externalActionsAllowed: false,
    requiresHumanApproval: true,
    requestedBy: actor?.id || "agent-sweep",
    requestedByName: actor?.name || "Обход проектов Hermes",
    createdAt: nowIso,
    updatedAt: nowIso,
    dispatchStatus: "pending",
    eventId: issue.id,
    dedupeKey: issue.dedupeKey,
  };
}

export function runAgentWorkSweep({
  projects = [],
  salesDeals = [],
  salesLeads = [],
  existingEvents = [],
  actor = { id: "agent-sweep", name: "Обход проектов Hermes" },
  now = new Date(),
  maxIssues = 80,
} = {}) {
  const nowIso = now.toISOString();
  const existingDedupeKeys = new Set(
    (Array.isArray(existingEvents) ? existingEvents : [])
      .filter((event) => event.status !== "closed")
      .map((event) => event.dedupeKey)
      .filter(Boolean),
  );
  const issues = [];
  const activeProjects = (Array.isArray(projects) ? projects : []).filter(isActiveProject);

  for (const project of activeProjects) {
    if (issues.length >= maxIssues) break;
    const projectId = cleanText(project?.id || project?.projectId || project?.title, 120);
    const title = cleanText(project?.title || project?.name || projectId || "Проект без названия", 160);
    const rows = projectRows(project);

    rows.forEach((row, index) => {
      if (issues.length >= maxIssues || isClosedRow(row)) return;
      const name = rowName(row, index);
      if (!hasRealExecutor(row)) {
        addIssue(issues, {
          dedupeKey: `project:${projectId}:missing-executor:${cleanText(row?.id || name, 120)}`,
          severity: "high",
          priority: "high",
          agentId: "A8",
          profile: "production",
          projectId,
          projectName: title,
          title: `Нет исполнителя: ${title} / ${name}`,
          details: `В проекте "${title}" работа "${name}" не имеет конкретного исполнителя.`,
          recommendedAction: "Администратору проекта назначить исполнителя или опубликовать задачу на внутреннюю доску.",
        }, existingDedupeKeys, nowIso);
      }

      const due = parseDate(row?.due || row?.deadline || row?.endDate);
      if (due && due.getTime() < now.getTime()) {
        addIssue(issues, {
          dedupeKey: `project:${projectId}:overdue:${cleanText(row?.id || name, 120)}`,
          severity: "critical",
          priority: "critical",
          agentId: "A9",
          profile: "production",
          projectId,
          projectName: title,
          title: `Просрочена работа: ${title} / ${name}`,
          details: `Срок работы "${name}" истек ${due.toLocaleDateString("ru-RU")}, текущий статус: ${cleanText(row?.status || "не указан", 80)}.`,
          recommendedAction: "Запросить у исполнителя статус, причину задержки и новый срок. До внешнего сообщения клиенту нужен человек.",
        }, existingDedupeKeys, nowIso);
      }
    });

    const reportAt = latestReportDate(project);
    if (!reportAt || daysBetween(now, reportAt) >= 2) {
      addIssue(issues, {
        dedupeKey: `project:${projectId}:client-report-missing`,
        severity: "medium",
        priority: "normal",
        agentId: "A10",
        profile: "client-report",
        projectId,
        projectName: title,
        title: `Нет свежего отчёта клиенту: ${title}`,
        details: reportAt
          ? `Последний отчет клиенту был ${reportAt.toLocaleDateString("ru-RU")}.`
          : "В карточке проекта не найден свежий ежедневный отчет клиенту.",
        recommendedAction: "Собрать статусы задач и подготовить черновик ежедневного отчета для администратора проекта.",
      }, existingDedupeKeys, nowIso);
    }

    const activityAt = latestActivityDate(project);
    if (activityAt && daysBetween(now, activityAt) >= 3) {
      addIssue(issues, {
        dedupeKey: `project:${projectId}:idle`,
        severity: "high",
        priority: "high",
        agentId: "A9",
        profile: "production",
        projectId,
        projectName: title,
        title: `Нет движения по проекту: ${title}`,
        details: `Последняя активность в карточке проекта была ${activityAt.toLocaleDateString("ru-RU")}.`,
        recommendedAction: "Попросить РП/исполнителей обновить статус, файлы и следующий шаг.",
      }, existingDedupeKeys, nowIso);
    }

    if (!hasProjectFolder(project)) {
      addIssue(issues, {
        dedupeKey: `project:${projectId}:missing-folder`,
        severity: "medium",
        priority: "normal",
        agentId: "A7",
        profile: "project-admin",
        projectId,
        projectName: title,
        title: `Не привязана папка проекта: ${title}`,
        details: "В карточке проекта нет корректной ссылки на Яндекс.Диск/NAS-папку.",
        recommendedAction: "Создать или привязать папку проекта и проверить структуру 00_Договор ... 10_Финальный архив.",
      }, existingDedupeKeys, nowIso);
    }

    const cost = projectCost(project);
    const controlCost = cost.actualCost || cost.plannedCost;
    if (cost.contractAmount > 0 && controlCost > 0) {
      const costRatio = controlCost / cost.contractAmount;
      if (costRatio > 0.5) {
        addIssue(issues, {
          dedupeKey: `project:${projectId}:finance-red`,
          severity: "critical",
          priority: "critical",
          agentId: "A17",
          profile: "finance",
          projectId,
          projectName: title,
          title: `RED по себестоимости: ${title}`,
          details: `Контрольная себестоимость составляет ${Math.round(costRatio * 100)}% от суммы договора.`,
          recommendedAction: "Финансисту и владельцу проверить расходы, выплаты и допустимость продолжения без согласования.",
        }, existingDedupeKeys, nowIso);
      } else if (costRatio > 0.35) {
        addIssue(issues, {
          dedupeKey: `project:${projectId}:finance-yellow`,
          severity: "medium",
          priority: "high",
          agentId: "A17",
          profile: "finance",
          projectId,
          projectName: title,
          title: `YELLOW по себестоимости: ${title}`,
          details: `Контрольная себестоимость составляет ${Math.round(costRatio * 100)}% от суммы договора.`,
          recommendedAction: "Финансисту проверить структуру затрат до перехода проекта в RED.",
        }, existingDedupeKeys, nowIso);
      }
    }
  }

  const deals = [...(Array.isArray(salesDeals) ? salesDeals : []), ...(Array.isArray(salesLeads) ? salesLeads : [])];
  deals.forEach((deal) => {
    if (issues.length >= maxIssues) return;
    const due = parseDate(deal?.nextStepDueAt || deal?.slaDeadlineAt);
    const stage = normalize(deal?.salesStage || deal?.stage || deal?.status);
    if (due && due.getTime() < now.getTime() && !["won", "lost", "closed", "archive", "архив"].includes(stage)) {
      const dealId = cleanText(deal?.id || deal?.leadId || deal?.title, 120);
      addIssue(issues, {
        dedupeKey: `sales:${dealId}:next-step-overdue`,
        severity: "high",
        priority: "high",
        agentId: "A2",
        profile: "sales",
        projectId: cleanText(deal?.projectId, 120),
        projectName: cleanText(deal?.title || deal?.clientName || deal?.client || dealId, 160),
        title: `Просрочен следующий шаг по лиду: ${cleanText(deal?.title || deal?.clientName || dealId, 140)}`,
        details: `Следующий шаг должен был быть выполнен ${due.toLocaleDateString("ru-RU")}.`,
        recommendedAction: "Менеджеру продаж обновить контакт, результат и новый следующий шаг.",
      }, existingDedupeKeys, nowIso);
    }
  });

  const severityCounts = issues.reduce((acc, issue) => {
    acc[issue.severity] = (acc[issue.severity] || 0) + 1;
    return acc;
  }, {});
  const tasks = issues.map((issue, index) => issueToTask(issue, index, actor, nowIso));
  const run = {
    id: `AIRUN-${now.getTime()}`,
    kind: "project_control_sweep",
    status: "completed",
    createdAt: nowIso,
    actorId: actor?.id || "agent-sweep",
    actorName: actor?.name || "Обход проектов Hermes",
    summary: issues.length
      ? `Найдено проблем: ${issues.length}. Critical: ${severityCounts.critical || 0}, high: ${severityCounts.high || 0}, medium: ${severityCounts.medium || 0}.`
      : "Обход завершен: новых проблем не найдено.",
    counts: {
      projectsChecked: activeProjects.length,
      salesItemsChecked: deals.length,
      issues: issues.length,
      critical: severityCounts.critical || 0,
      high: severityCounts.high || 0,
      medium: severityCounts.medium || 0,
      low: severityCounts.low || 0,
      tasksCreated: tasks.length,
    },
  };

  return { run, events: issues, tasks };
}
