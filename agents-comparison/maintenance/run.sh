#!/usr/bin/env bash
# Autonomous maintenance experiment: one detached headless session per
# model×effort cell (`claude -p` for opus/fable, `codex exec` for gpt-*), each
# running a PINNED maintenance workflow (snapshot in ./skill/, NOT the live
# plugin skill) on a FIXED commit of korchasa/flowai, writing findings to a
# report file. User config is isolated (claude --safe-mode / codex
# --ignore-user-config) so plugins/skills/hooks cannot influence the benchmark.
#
# Result cache: each cell's MAINTENANCE_REPORT.md is stored under
# ./cache/<cell>-<inputs-hash>/. Unchanged pins → re-run restores the report
# with ZERO LLM spend. Delete the entry or change a pin to force a fresh run.
#
# Usage:
#   ./run.sh <out-root> [cells...]            # default 5-cell matrix
#   ./run.sh ~/tmp/maint-run1 fable:medium    # single cell
#
# Cell format: <model>:<effort>. Requires: authenticated claude + codex CLIs.
# WARNING: spawns autonomous agents with --permission-mode bypassPermissions.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
. "$HERE/../shared/cache-lib.sh"
SRC_REPO="${SRC_REPO:-/Users/korchasa/www/flowai/flowai}"
COMMIT="${COMMIT:-d28b590f7345fae07cbdc527156f4dc3876400cc}"
OUT="${1:?usage: run.sh <out-root> [model:effort ...]}"
shift || true
CACHE_ROOT="$HERE/cache"
mkdir -p "$OUT/logs" "$CACHE_ROOT"
: > "$OUT/pids.txt"

CELLS=("$@")
[ ${#CELLS[@]} -eq 0 ] && CELLS=(opus:high opus:medium fable:high fable:medium opus:xhigh gpt-5.5:medium gpt-5.5:high gpt-5.5:xhigh)

export BENCH_PROMPT="Perform a project maintenance audit of the repository in the current directory by following the PINNED workflow instructions below — do NOT use any installed skill or plugin for this.

Workflow definition (read ALL of these files first, they are the complete and authoritative procedure):
- $HERE/skill/SKILL.md — the maintenance workflow. Resolve its references/ links inside $HERE/skill/references/ (scan-buckets.md, architectural-categories.md, severity-rubric.md, verification-gate.md, example-findings.md).
- $HERE/skill/agents/maintenance-scan-worker.md — the scan-worker definition. This session has no custom agent types: where SKILL.md optionally delegates buckets to maintenance-scan-worker subagents, either scan inline yourself or spawn general-purpose subagents passing the FULL TEXT of that worker file plus the bucket spec as the subagent prompt.

Execution mode — FULLY AUTOMATIC, NON-INTERACTIVE, SCAN-ONLY:
- Execute the Scan phase (all 16 categories) and the Verify gate with severity calibration exactly as SKILL.md defines them.
- Then STOP: do NOT enter the interactive Resolution phase, do NOT ask the user anything, do NOT modify, create, or delete any project file except the report.
- Write the complete findings report to MAINTENANCE_REPORT.md in the repository root: one section per verified finding with severity tag, category number/name, exact file path(s) and line evidence, and a one-line rationale. End with a summary section: finding counts per severity and per category, plus the scan areas that came back clean.
- The report file is the ONLY artifact; the goal is met when MAINTENANCE_REPORT.md exists and covers every verified finding.

Work autonomously to completion. Chat output MUST be in English and ultra-concise, overriding any global instruction to use another language."

# Pinned-input hash: full skill snapshot + target commit + the exact agent
# prompt. Launcher mechanics deliberately excluded (harness fixes must not
# invalidate cached results).
CK_EXTRA="$COMMIT:$BENCH_PROMPT"
KEY_BASE=$(ck_key "$HERE/skill/SKILL.md" "$HERE"/skill/references/*.md "$HERE"/skill/agents/*.md)
# KEY_ONLY=1: print the cache key and exit (cache migration / debugging).
[ "${KEY_ONLY:-}" = "1" ] && { echo "$KEY_BASE"; exit 0; }

launched=0 cached=0
for cell in "${CELLS[@]}"; do
  IFS=: read -r model effort <<<"$cell"
  name="${model}-${effort}"
  dir="$OUT/$name"
  entry="$CACHE_ROOT/$name-$KEY_BASE"

  if [ -f "$entry/MAINTENANCE_REPORT.md" ]; then
    git clone -q "$SRC_REPO" "$dir" && git -C "$dir" checkout -q "$COMMIT" || { echo "$name cache-restore clone failed"; continue; }
    cp "$entry/MAINTENANCE_REPORT.md" "$dir/"
    cp "$entry/session.log" "$OUT/logs/$name.log" 2>/dev/null
    echo "$name CACHED ($(basename "$entry"))" | tee -a "$OUT/pids.txt"
    cached=$((cached+1))
    continue
  fi

  rm -rf "$dir"
  git clone -q "$SRC_REPO" "$dir" && git -C "$dir" checkout -q "$COMMIT" || { echo "clone failed for $name"; continue; }
  # Detached subshell: run the cell agent, then harvest the report into the cache.
  export model effort
  (cd "$dir" && nohup bash -c '
      case "$model" in
        gpt*)
          codex exec "$BENCH_PROMPT" \
            --model "$model" -c model_reasoning_effort="$effort" \
            --ignore-user-config \
            --dangerously-bypass-approvals-and-sandbox \
            --color never >"$1/logs/$2.log" 2>"$1/logs/$2.err"
          ;;
        *)
          claude -p "$BENCH_PROMPT" \
            --model "$model" --effort "$effort" \
            --safe-mode \
            --permission-mode bypassPermissions \
            --add-dir "$0" \
            >"$1/logs/$2.log" 2>"$1/logs/$2.err"
          ;;
      esac
      rc=$?
      if [ -f MAINTENANCE_REPORT.md ]; then
        mkdir -p "$3"
        cp MAINTENANCE_REPORT.md "$3/"
        cp "$1/logs/$2.log" "$3/session.log" 2>/dev/null
        printf "{\"exit\":%s,\"model\":\"%s\",\"effort\":\"%s\",\"commit\":\"%s\",\"cachedAt\":\"%s\"}\n" \
          "$rc" "$model" "$effort" "$4" "$(date -u +%FT%TZ)" > "$3/meta.json"
      fi
    ' "$HERE" "$OUT" "$name" "$entry" "$COMMIT" >/dev/null 2>&1 &
   echo "$name pid=$!" | tee -a "$OUT/pids.txt")
  launched=$((launched+1))
done
echo "Maintenance: $launched launched, $cached from cache @ commit ${COMMIT:0:8} under $OUT."
echo "Judge after completion: ./judge.sh $OUT"
