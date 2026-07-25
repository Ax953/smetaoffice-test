#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root" >&2
  exit 1
fi

app_dir="/opt/smetaoffice"
app_env="${app_dir}/.env"
timer_env="/etc/smetaoffice-agent-sweep.env"

if [[ ! -f "${app_env}" ]]; then
  echo "SmetaOffice environment file is missing: ${app_env}" >&2
  exit 1
fi

token="$(
  node --input-type=module - "${app_env}" <<'NODE'
import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const envPath = process.argv[2];
const source = await readFile(envPath, "utf8");
const match = source.match(/^SMETA_AGENT_SWEEP_TOKEN=(.+)$/m);
const token = match?.[1]?.trim() || randomBytes(32).toString("hex");

if (!match) {
  const suffix = source.endsWith("\n") ? "" : "\n";
  await writeFile(envPath, `${source}${suffix}SMETA_AGENT_SWEEP_TOKEN=${token}\n`, { mode: 0o600 });
}

process.stdout.write(token);
NODE
)"

umask 077
printf 'SMETA_OFFICE_API_URL=http://127.0.0.1:8787/api\nSMETA_AGENT_SWEEP_TOKEN=%s\n' "${token}" > "${timer_env}"
chmod 600 "${app_env}" "${timer_env}"

install -m 0644 "${app_dir}/infrastructure/systemd/smetaoffice-agent-sweep.service" /etc/systemd/system/
install -m 0644 "${app_dir}/infrastructure/systemd/smetaoffice-agent-sweep.timer" /etc/systemd/system/

systemctl daemon-reload
systemctl enable --now smetaoffice-agent-sweep.timer
