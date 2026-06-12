#!/usr/bin/env bash
# Shared launcher for all ship-* benchmarks. Invoked by each benchmark's thin
# run.sh wrapper with its own TASK.md. One detached headless session per
# model×effort cell — `claude -p` for opus/fable, `codex exec` for gpt-* —
# pinned ship workflow snapshot as inbound instructions; user config isolated
# (claude --safe-mode / codex --ignore-user-config); per-cell bare remote so
# the Push phase never touches the real repo.
#
# Result cache: cell outcomes are stored as git patches under
# <benchmark>/cache/<cell>-<inputs-hash>/. When ALL pinned inputs are unchanged,
# a re-run reconstructs the cell (clone + apply patches + push) with ZERO LLM
# spend. Delete the cache entry (or change any pin) to force a fresh run.
#
# Usage (via wrapper): run-impl.sh <task-file> <out-root> [model:effort ...]
set -u
SHARED="$(cd "$(dirname "$0")" && pwd)"
. "$SHARED/../cache-lib.sh"
SRC_REPO="${SRC_REPO:-/Users/korchasa/www/flowai/flowai-workflow}"
COMMIT="${COMMIT:-c7305ca069bc13b4ae80ba8273e7265a98ed84f4}"
TASK_FILE="${1:?usage: run-impl.sh <task-file> <out-root> [model:effort ...]}"
OUT="${2:?usage: run-impl.sh <task-file> <out-root> [model:effort ...]}"
shift 2
TASK_FILE="$(cd "$(dirname "$TASK_FILE")" && pwd)/$(basename "$TASK_FILE")"
BENCH_DIR="$(dirname "$TASK_FILE")"
CACHE_ROOT="$BENCH_DIR/cache"

mkdir -p "$OUT/logs" "$CACHE_ROOT"
: > "$OUT/pids.txt"
echo "$TASK_FILE" > "$OUT/task.txt"

CELLS=("$@")
[ ${#CELLS[@]} -eq 0 ] && CELLS=(opus:high opus:medium fable:high fable:medium opus:xhigh gpt-5.5:medium gpt-5.5:high gpt-5.5:xhigh)

export BENCH_PROMPT="Execute the technical task specified in $TASK_FILE on the repository in the current directory, following the PINNED full-cycle workflow instructions in $SHARED/ship-SKILL.md — read BOTH files completely before doing anything, and treat the workflow file as the complete and authoritative procedure (plan → implement → review → commit → push, with its gates). Do NOT use any installed skill or plugin; the pinned text replaces them.

Benchmark adaptations (override the workflow file ONLY on these points):
- Non-interactive: there is no human. At the workflow's variant-selection gate, choose the best variant yourself, record the rationale in the plan file, and continue. At any other point where the workflow says to ask the user or STOP for input, make the most defensible decision, log it, and continue. A verdict gate failure still means: fix and re-review, not ask.
- Push goes to 'origin' which is a local bare repository configured for this benchmark — push normally, but SKIP any CI-await/CI-status steps afterwards (the benchmark remote has no CI); a successful push is terminal.
- Do not create GitHub issues/PRs and do not call gh.

The goal is met when: the plan file exists per the project's tasks convention, the implementation satisfies every Requested-behavior and Constraints item in the task file, the project gate (deno task check) passes, the review verdict is recorded, the work is committed with a Conventional Commits message, and the branch is pushed to origin. Work autonomously to completion. Chat output MUST be in English and ultra-concise, overriding any global instruction to use another language."

# Pinned-input hash: task spec + workflow snapshot + target commit + the exact
# agent prompt. Launcher MECHANICS are deliberately excluded — harness fixes
# must not invalidate cached cell results.
CK_EXTRA="$COMMIT:$BENCH_PROMPT"
KEY_BASE=$(ck_key "$TASK_FILE" "$SHARED/ship-SKILL.md")
# KEY_ONLY=1: print the cache key and exit (cache migration / debugging).
[ "${KEY_ONLY:-}" = "1" ] && { echo "$KEY_BASE"; exit 0; }

setup_clones() { # $1 = cell dir; idempotent — leftovers from an aborted launch are discarded
  rm -rf "$1/remote.git" "$1/repo"
  git clone -q --bare "$SRC_REPO" "$1/remote.git" &&
  git clone -q "$1/remote.git" "$1/repo" &&
  git -C "$1/repo" checkout -q -b bench "$COMMIT"
}

launched=0 cached=0
for cell in "${CELLS[@]}"; do
  IFS=: read -r model effort <<<"$cell"
  name="${model}-${effort}"
  cdir="$OUT/$name"
  entry="$CACHE_ROOT/$name-$KEY_BASE"
  mkdir -p "$cdir"

  if [ -f "$entry/meta.json" ]; then
    # Cache hit: reconstruct the cell without any LLM spend.
    setup_clones "$cdir" || { echo "$name cache-restore clone failed"; continue; }
    if ls "$entry"/*.patch >/dev/null 2>&1; then
      git -C "$cdir/repo" am -q "$entry"/*.patch &&
      git -C "$cdir/repo" push -q origin bench || echo "$name patch apply/push failed (stale cache? delete $entry)"
    fi
    cp "$entry/session.log" "$OUT/logs/$name.log" 2>/dev/null
    echo "$name CACHED ($(basename "$entry"))" | tee -a "$OUT/pids.txt"
    cached=$((cached+1))
    continue
  fi

  setup_clones "$cdir" || { echo "clone failed for $name"; continue; }
  # Detached subshell: run claude, then harvest the outcome into the cache.
  export model effort COMMIT
  (cd "$cdir/repo" && nohup bash -c '
      case "$model" in
        gpt*)
          codex exec "$BENCH_PROMPT" \
            --model "$model" -c model_reasoning_effort="$effort" \
            --ignore-user-config \
            --dangerously-bypass-approvals-and-sandbox \
            --color never >"$2/logs/$3.log" 2>"$2/logs/$3.err"
          ;;
        *)
          claude -p "$BENCH_PROMPT" \
            --model "$model" --effort "$effort" \
            --safe-mode \
            --permission-mode bypassPermissions \
            --add-dir "$0" --add-dir "$1" >"$2/logs/$3.log" 2>"$2/logs/$3.err"
          ;;
      esac
      rc=$?
      # Cache ONLY successful cells — a failed cell (rate limit, crash) must
      # re-run on the next invocation, not replay its failure from cache.
      if [ "$rc" -eq 0 ]; then
        mkdir -p "$4"
        git format-patch -q "$5..bench" -o "$4" 2>/dev/null
        cp "$2/logs/$3.log" "$4/session.log" 2>/dev/null
        printf "{\"exit\":%s,\"model\":\"%s\",\"effort\":\"%s\",\"commit\":\"%s\",\"cachedAt\":\"%s\"}\n" \
          "$rc" "$model" "$effort" "$5" "$(date -u +%FT%TZ)" > "$4/meta.json"
      else
        echo "cell $3 FAILED rc=$rc — not cached; see $2/logs/$3.log" >> "$2/logs/failures.txt"
      fi
    ' "$BENCH_DIR" "$SHARED" "$OUT" "$name" "$entry" "$COMMIT" >/dev/null 2>&1 &
   echo "$name pid=$!" | tee -a "$OUT/pids.txt")
  launched=$((launched+1))
done
echo "Ship $(basename "$BENCH_DIR"): $launched launched, $cached from cache @ commit ${COMMIT:0:8} under $OUT."
