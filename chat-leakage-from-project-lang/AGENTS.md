# chat-leakage-from-project-lang

## Responsibility

Measures whether non-Russian project-file language leaks into a final Russian chat answer.

## Key Decisions

- Root project memory contains the Russian final-chat rule. Do not repeat that rule in every query variant.
- The user query stays Russian but should not restate "answer in Russian" unless a specific variant is testing query-level pressure.
- The pressure source is `README.md`, controlled by `project_language`.
- `project_language=english` is the only active source-language cell.
- The response format has only `FINAL_ANSWER`; this benchmark does not request visible non-Russian analysis.
- `tokens` is the target size of the generated project-file material; `0` means the compact core brief with no generated expansion.
- `instruction=guarded` adds explicit anti-leakage mitigation on top of the same file-language pressure.
- `quick.ts` is the fast feedback loop: 2 trials at the largest token budget before running the 30-trial baseline.
- Mechanism variants must remain separate: `file-instruction`, `mixed-code-switch`, `middle-only-signal`, `term-transfer`, `label-transfer`, `marker-readback`, and `combined`. Do not collapse these into one result because each tests a different confusion cause.
- For mechanism iteration, run `quick-<mechanism>` first. Run the 60-trial full variant only when the quick result is interesting or stable.
