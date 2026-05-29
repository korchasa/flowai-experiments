# chat-leakage-from-reasoning-lang

## Responsibility

Measures whether visible English analysis pressure leaks into a final Russian chat answer.

## Key Decisions

- Project files and project memory stay Russian or language-neutral.
- The pressure source is the chat instruction that asks the model to emit `VISIBLE_ANALYSIS` in English before `FINAL_ANSWER` in Russian.
- Hidden reasoning is not observed. The experiment records controlled input-context size, visible-analysis length, final-answer length, and visible final-answer leakage.
- `tokens` is the target size of the analytical requirement material in `README.md`; `0` means the compact core brief with no generated expansion.
- `instruction=guarded` adds explicit anti-leakage mitigation on top of the same English reasoning pressure.
