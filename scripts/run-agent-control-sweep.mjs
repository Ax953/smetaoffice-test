const apiBase = (process.env.SMETA_OFFICE_API_URL || "http://127.0.0.1:8787/api").replace(/\/+$/, "");
const token = process.env.SMETA_AGENT_SWEEP_TOKEN || "";

if (!token) {
  console.error("SMETA_AGENT_SWEEP_TOKEN is not configured");
  process.exit(1);
}

const response = await fetch(`${apiBase}/ai-agent-runs/control-sweep`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Smeta-Agent-Token": token,
  },
  body: "{}",
  signal: AbortSignal.timeout(60_000),
});

const payload = await response.json().catch(() => ({}));
if (!response.ok || !payload.ok) {
  console.error(`Agent sweep failed with HTTP ${response.status}`);
  process.exit(1);
}

console.log(payload.run?.summary || "Agent sweep completed");
