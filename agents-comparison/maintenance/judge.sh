#!/usr/bin/env bash
# Judge for the autonomous-maintenance experiment.
# Pools findings from all cell reports, verifies each against the pinned repo
# state, and scores every report for completeness (vs the verified pooled union)
# and error count (invalid/hallucinated findings). One claude session, fixed
# strong judge cell so scores are comparable across runs.
#
# Usage: ./judge.sh <out-root>   (the dir previously passed to run.sh)
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
. "$HERE/../shared/cache-lib.sh"
JUDGE_MODEL="${JUDGE_MODEL:-opus}"
JUDGE_EFFORT="${JUDGE_EFFORT:-high}"
OUT="${1:?usage: judge.sh <out-root>}"
OUT="$(cd "$OUT" && pwd)"

REPORTS=$(find "$OUT" -mindepth 2 -maxdepth 2 -name MAINTENANCE_REPORT.md | sort)
[ -z "$REPORTS" ] && { echo "no MAINTENANCE_REPORT.md files under $OUT"; exit 1; }
REF_DIR=$(dirname "$(echo "$REPORTS" | head -1)")

# Judge cache: key over the judge script + judge cell + ALL judged reports.
CK_EXTRA="$JUDGE_MODEL:$JUDGE_EFFORT"
JKEY=$(ck_key "$HERE/judge.sh" $REPORTS)
JENTRY="$HERE/cache/judge-$JKEY"
if [ -f "$JENTRY/judge-results.json" ]; then
  cp "$JENTRY/judge-results.json" "$JENTRY/judge-results.md" "$OUT/"
  echo "Judge CACHED ($(basename "$JENTRY")): $OUT/judge-results.{json,md}"
  exit 0
fi

PROMPT="You are judging $(echo "$REPORTS" | wc -l | tr -d ' ') maintenance-audit reports produced independently by different model×effort cells over the SAME repository snapshot. Reference repo checkout (read-only ground truth): $REF_DIR. Reports: $(echo "$REPORTS" | tr '\n' ' ').

Procedure:
1. Read every report; extract its findings into a normalized list (category, file(s), claim).
2. Build the pooled union of unique findings across all reports (deduplicate same-issue-different-wording).
3. Verify EVERY pooled finding against the reference checkout: a finding is VALID only if the claimed evidence actually holds in the files (open and check them); otherwise INVALID (hallucinated path, misread content, wrong claim, or non-issue by the report's own category definition).
4. Score each report: validFindings, invalidFindings (errors), missedValidFindings (valid pooled findings absent from this report), completeness = valid/(valid+missed), precision = valid/(valid+invalid).
5. Write TWO files into $OUT: judge-results.json (machine-readable: per-report scores + the verified pooled finding list with per-report presence matrix) and judge-results.md (human summary table + per-report error lists with the evidence you checked).

Rules: do NOT modify anything outside those two files; judge severity inflation as an error only when the evidence contradicts the assigned severity outright; near-duplicate findings inside one report count once. Work autonomously; chat output in English, ultra-concise."

cd "$OUT"
claude -p "$PROMPT" \
  --model "$JUDGE_MODEL" --effort "$JUDGE_EFFORT" \
  --safe-mode \
  --permission-mode bypassPermissions \
  --add-dir "$OUT"
if [ -f "$OUT/judge-results.json" ]; then
  mkdir -p "$JENTRY"
  cp "$OUT/judge-results.json" "$OUT/judge-results.md" "$JENTRY/" 2>/dev/null
fi
echo "Judge artifacts: $OUT/judge-results.json, $OUT/judge-results.md"
