#!/usr/bin/env bash
# Autonomous app-generation experiment: one detached headless build per
# model×effort cell, each in its own work dir (`claude -p "/goal ..."` for
# opus/fable, `codex exec` with the same brief for gpt-*).
#
# Result cache: app builds are too large to copy, so the cache stores a POINTER
# to the completed build dir, keyed by a hash of the brief + this launcher.
# Unchanged pins + still-existing build dir → the cell is skipped (zero LLM
# spend) and the pointer is printed. Delete ./cache/<entry> or the build dir
# (or change the brief) to force a rebuild.
#
# Usage:
#   ./run.sh <out-root> [cells...]
#   ./run.sh ~/tmp/appgen-run1                # default 5-cell matrix
#   ./run.sh ~/tmp/appgen-run2 opus:high:4711 fable:medium:4714
#
# Cell format: <model>:<effort>:<port>. Requires: authenticated claude + codex CLIs.
# WARNING: spawns fully autonomous agents with --permission-mode bypassPermissions.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
. "$HERE/../shared/cache-lib.sh"
OUT="${1:?usage: run.sh <out-root> [model:effort:port ...]}"
shift || true
CACHE_ROOT="$HERE/cache"
mkdir -p "$OUT/logs" "$CACHE_ROOT"
: > "$OUT/logs/pids.txt"

CELLS=("$@")
[ ${#CELLS[@]} -eq 0 ] && CELLS=(opus:high:4711 opus:medium:4712 fable:high:4713 fable:medium:4714 opus:xhigh:4715 gpt-5.5:medium:4716 gpt-5.5:high:4717 gpt-5.5:xhigh:4718)

GOAL_TPL='/goal Build ONE complete version of the desktop app in the current directory. FIRST read %BRIEF% in full, then implement per that brief. Your assigned default port is %PORT%. The goal is met ONLY when the Definition of Done in the brief holds — including the HARD requirement that the app opens as a standalone desktop window (chromeless app window or Tauri), NOT a browser tab, and all mandatory patterns are implemented. Work autonomously to completion; never stop to ask questions. Chat output MUST be in English and ultra-concise, overriding any global instruction to use another language.'

# Pinned-input hash: brief + goal template. Launcher mechanics excluded.
CK_EXTRA="$GOAL_TPL"
KEY_BASE=$(ck_key "$HERE/BRIEF.md")
# KEY_ONLY=1: print the cache key and exit (cache migration / debugging).
[ "${KEY_ONLY:-}" = "1" ] && { echo "$KEY_BASE"; exit 0; }

launched=0 cached=0
for cell in "${CELLS[@]}"; do
  IFS=: read -r model effort port <<<"$cell"
  name="${model}-${effort}"
  dir="$OUT/$name"
  entry="$CACHE_ROOT/$name-$KEY_BASE"

  if [ -f "$entry/build-path.txt" ]; then
    prev=$(cat "$entry/build-path.txt")
    if [ -f "$prev/README.md" ]; then
      echo "$name CACHED — existing build at $prev ($(basename "$entry"))" | tee -a "$OUT/logs/pids.txt"
      cached=$((cached+1))
      continue
    fi
    echo "$name cache entry points to missing build ($prev) — rebuilding"
  fi

  mkdir -p "$dir"
  goal="${GOAL_TPL//%BRIEF%/$HERE/BRIEF.md}"
  goal="${goal//%PORT%/$port}"
  # Detached subshell: run claude, then record the build pointer in the cache.
  export model effort
  export BENCH_GOAL="$goal"
  (cd "$dir" && nohup bash -c '
      case "$model" in
        gpt*)
          # codex has no /goal command — strip the slash-command prefix.
          codex exec "${BENCH_GOAL#/goal }" \
            --model "$model" -c model_reasoning_effort="$effort" \
            --ignore-user-config \
            --dangerously-bypass-approvals-and-sandbox \
            --color never >"$1/logs/$2.log" 2>"$1/logs/$2.err"
          ;;
        *)
          claude -p "$BENCH_GOAL" \
            --model "$model" --effort "$effort" \
            --permission-mode bypassPermissions \
            --add-dir "$0" --add-dir "$HOME/.claude" \
            >"$1/logs/$2.log" 2>"$1/logs/$2.err"
          ;;
      esac
      rc=$?
      if [ -f README.md ]; then
        mkdir -p "$3"
        pwd > "$3/build-path.txt"
        printf "{\"exit\":%s,\"model\":\"%s\",\"effort\":\"%s\",\"cachedAt\":\"%s\"}\n" \
          "$rc" "$model" "$effort" "$(date -u +%FT%TZ)" > "$3/meta.json"
      fi
    ' "$HERE" "$OUT" "$name" "$entry" >/dev/null 2>&1 &
   echo "$name port=$port pid=$!" | tee -a "$OUT/logs/pids.txt")
  launched=$((launched+1))
done
echo "App-generation: $launched launched, $cached from cache under $OUT. Track: transcripts in ~/.claude/projects/."
