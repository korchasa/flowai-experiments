#!/usr/bin/env bash
# Shared judge for all ship-* benchmarks. Invoked by each benchmark's thin
# judge.sh wrapper. Mechanical checks first (gate run, real push, functional
# spot-checks), then qualitative scoring against the task spec. Fixed strong
# judge cell for cross-run comparability.
#
# Usage (via wrapper): judge-impl.sh <task-file> <out-root>
set -u
SHARED="$(cd "$(dirname "$0")" && pwd)"
. "$SHARED/../cache-lib.sh"
JUDGE_MODEL="${JUDGE_MODEL:-opus}"
JUDGE_EFFORT="${JUDGE_EFFORT:-high}"
TASK_FILE="${1:?usage: judge-impl.sh <task-file> <out-root>}"
OUT="${2:?usage: judge-impl.sh <task-file> <out-root>}"
OUT="$(cd "$OUT" && pwd)"
TASK_FILE="$(cd "$(dirname "$TASK_FILE")" && pwd)/$(basename "$TASK_FILE")"
CACHE_ROOT="$(dirname "$TASK_FILE")/cache"

CELLS=$(find "$OUT" -mindepth 2 -maxdepth 2 -name repo -type d | sort)
[ -z "$CELLS" ] && { echo "no <cell>/repo dirs under $OUT"; exit 1; }

# Judge cache: key over the judge inputs — task spec, judge script, and the
# tips of every cell's bench branch (i.e., the actual judged content).
CK_EXTRA="$JUDGE_MODEL:$JUDGE_EFFORT:$(for r in $CELLS; do git -C "$r" rev-parse bench 2>/dev/null; done)"
JKEY=$(ck_key "$TASK_FILE" "$SHARED/judge-impl.sh")
JENTRY="$CACHE_ROOT/judge-$JKEY"
if [ -f "$JENTRY/judge-results.json" ]; then
  cp "$JENTRY/judge-results.json" "$JENTRY/judge-results.md" "$OUT/"
  echo "Judge CACHED ($(basename "$JENTRY")): $OUT/judge-results.{json,md}"
  exit 0
fi

PROMPT="You are judging $(echo "$CELLS" | wc -l | tr -d ' ') independent attempts at the SAME technical task, each produced by a different model×effort cell following the same pinned full-cycle workflow. Task spec (ground truth): $TASK_FILE. Workflow they followed: $SHARED/ship-SKILL.md. Cell work dirs (each contains repo/ = working clone and remote.git = the bare remote they pushed to): $(echo "$CELLS" | sed 's|/repo$||' | tr '\n' ' ').

Procedure per cell — mechanical checks FIRST, run them yourself:
1. Push reality: in remote.git, does a non-default branch exist whose tip differs from the pinned base? List its commits.
2. Gate: inside repo/, run 'deno task check' and record pass/fail with the failing step if any.
3. Functional spot-checks: exercise the new CLI surface against the task spec's Requested-behavior bullets — build a throwaway temp workflow dir with fabricated run folders/fixtures and run the actual commands, including the error/edge cases the spec marks as hard requirements. Record actual command outputs.
4. Commit hygiene: Conventional Commits format, focused diff (no unrelated churn), plan/task file exists per the repo's tasks convention.
5. Requirements coverage: score EVERY Requested-behavior and Constraints bullet in the task spec as met / partial / missed, with file:line evidence.
6. Workflow fidelity: evidence the cell actually followed the pinned phases (plan file with variants+rationale, TDD traces such as tests-first or red-green narrative in commits/plan, recorded review verdict, SRS/FR registration).

Then score each cell: requirementsMet (fraction), gatePass (bool), pushOk (bool), workflowFidelity (0-5 with one-line justification), defects (list: real bugs/safety violations you found in their implementation, each with evidence), overall rank.

Write TWO files into $OUT: judge-results.json (machine-readable per-cell scores + defect lists) and judge-results.md (summary table, per-cell evidence, and your ranking rationale). Do NOT modify anything else. Work autonomously; chat output in English, ultra-concise."

cd "$OUT"
claude -p "$PROMPT" \
  --model "$JUDGE_MODEL" --effort "$JUDGE_EFFORT" \
  --safe-mode \
  --permission-mode bypassPermissions \
  --add-dir "$OUT" --add-dir "$SHARED" --add-dir "$(dirname "$TASK_FILE")" \
  --add-dir /tmp
if [ -f "$OUT/judge-results.json" ]; then
  mkdir -p "$JENTRY"
  cp "$OUT/judge-results.json" "$OUT/judge-results.md" "$JENTRY/" 2>/dev/null
fi
echo "Judge artifacts: $OUT/judge-results.json, $OUT/judge-results.md"
