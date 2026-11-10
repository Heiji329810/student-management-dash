#!/usr/bin/env bash
set -euo pipefail
project_root="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$project_root/output/playwright"
cd "$project_root/output/playwright"
# Foreground desktop launcher runs this script; it never resets fixture data.
# Attach to an existing session when one is already open instead of relaunching.
cli_root="${CODEX_HOME:-$HOME/.codex}/skills/playwright"
exec bash "$cli_root/scripts/playwright_cli.sh" -s="${PW_SESSION:-student-fullscreen}" --config="$project_root/scripts/playwright-visible.json" open http://localhost:5274 --headed
