---
date: "2026-05-12"
status: done
implements:
  - FR-EXP.ANCHOR-SYSTEMS
tags: [experiment, anchors, links, documentation, salp, rag, hallucination]
related_tasks:
  - 2026/05/migrate-benchmarks-from-ai-dir.md
---
# Anchor Systems Experiment

## Goal

Quantify how reliably AI agents navigate four documentation-linking systems (Native Markdown, Wikilinks, Zettelkasten UID, SALP) on three distinct task types. The product is committed adherence curves per system, giving evidence-backed guidance on which linking convention maximises agent determinism.

## Overview

### Context

AI agents (LLMs) consume documentation as part of their context window. When documentation contains cross-references, the agent must resolve them to follow chains of information. Four linking systems are in common use:

- **Native** — standard Markdown `[text](path/file.md#heading)`. Path-dependent; breaks on rename/move.
- **Wikilinks** — `[[ID]]` / `^block-id`. App-specific; `^` may be parsed as math operator.
- **Zettelkasten** — numeric timestamp UIDs (e.g., `202310271030`). Globally unique but semantically opaque.
- **SALP** — explicit tokens `[ANC:ns:id]` / `[REF:ns:id]`. Path-independent, namespace-scoped, high semantic density.

Five task types probe different failure modes:

1. **Mapping** — extract all anchor↔reference pairs into a JSON graph. Tests extraction precision.
2. **Boundary detection** — identify exact line range of an anchored code block. Tests context association quality.
3. **Multi-hop reasoning** — traverse 1–3 reference hops to answer a semantic question. Tests chain traversal.
4. **Graph linting** — detect 3 planted anomalies in a corrupted fixture set. Tests error detection.
5. **RAG noise resistance** — identify anchored function amid N semantically similar noise functions. Tests focus.

Fixture files (static, committed) represent a synthetic technical project (~15 files, ~20 cross-references) in all four linking styles. Ground-truth JSON graph is committed alongside.

### Current State

- Framework: `scripts/experiments/lib/` provides `Experiment` interface, runner, judge, noise, report.
- Two experiments exist: `claude-md-length/` (2 variants) and `context-anatomy/` (1 variant).
- No anchor/linking experiment exists.
- No fixture generation infrastructure exists.

### Constraints

- `deno task check` must stay green throughout.
- No new framework changes — use existing `Experiment` interface unchanged.
- Fixture files must be synthetic (no copyrighted content), committed statically.
- Ground-truth graph is committed as `fixtures/ground-truth.json` — not generated at runtime.
- Judge is LLM-based (existing `judge.ts`) — judge prompt must encode the verification logic.
- Wikilinks system uses full Obsidian syntax: `^block-id` anchor at end of paragraph + `[[file#^block-id]]` reference. This is the defining feature of the system (block-level reference); without it, Wikilinks reduces to a cosmetic variant of Zettelkasten.
- Each fixture file ≤200 words (~250 tokens). 15 files total ≤3 750 tokens — well within claude context floor of ~26k.

## Definition of Done

- [x] Add FR-EXP.ANCHOR-SYSTEMS section to SRS with `**Acceptance:**` field filled. FR-ID: FR-EXP.ANCHOR-SYSTEMS. Test: manual — korchasa. Evidence: `grep -n "FR-EXP.ANCHOR-SYSTEMS" documents/requirements.md`.
- [x] Fixture set exists for all 5 systems: `scripts/experiments/anchor-systems/fixtures/{native,wikilinks,zettelkasten,salp,salp-short}/`. FR-ID: FR-EXP.ANCHOR-SYSTEMS. Test: manual — korchasa. Evidence: `ls scripts/experiments/anchor-systems/fixtures/`.
- [x] Ground-truth graph committed: `scripts/experiments/anchor-systems/fixtures/ground-truth.json`. FR-ID: FR-EXP.ANCHOR-SYSTEMS. Test: manual — korchasa. Evidence: `ls scripts/experiments/anchor-systems/fixtures/ground-truth.json`.
- [x] `mapping.ts` sweeps `system` axis (all 19 fixtures), judges F₁ of JSON anchor-reference graph vs ground-truth. FR-ID: FR-EXP.ANCHOR-SYSTEMS. Test: `deno task experiment anchor-systems --variant mapping --dry-run`. Evidence: `results/2026-05-12-0038-claude-haiku-4-5-mapping.md`.
- [x] `multi-hop.ts` sweeps `system × target` (shallow/medium/deep), judges hop-accuracy across reference chains. FR-ID: FR-EXP.ANCHOR-SYSTEMS. Test: `deno task experiment anchor-systems --variant multi-hop --dry-run`. Evidence: `results/2026-05-12-0105-claude-haiku-4-5-multi-hop.md`.
- [x] `boundary.ts` sweeps `system`, judges IoU ≥ 0.8 between reported and ground-truth line ranges. FR-ID: FR-EXP.ANCHOR-SYSTEMS. Test: `deno task experiment anchor-systems --variant boundary --dry-run`. Evidence: `results/2026-05-12-0059-claude-haiku-4-5-boundary.md`.
- [x] `linting.ts` sweeps `system`, judges F₁ ≥ 0.7 detection of 3 planted anomalies (duplicate / orphaned / shadowed). FR-ID: FR-EXP.ANCHOR-SYSTEMS. Test: `deno task experiment anchor-systems --variant linting --dry-run`. Evidence: `results/2026-05-12-0144-claude-haiku-4-5-linting.md`.
- [x] `rag-noise.ts` sweeps `system × noise_count [3, 6, 9]`, judges focus on anchor-bearing function vs noise neighbours. FR-ID: FR-EXP.ANCHOR-SYSTEMS. Test: `deno task experiment anchor-systems --variant rag-noise --dry-run`. Evidence: `results/2026-05-12-0158-claude-haiku-4-5-rag-noise.md`.
- [x] `deno task check` green after all files added. FR-ID: FR-EXP.ANCHOR-SYSTEMS. Test: `deno task check`. Evidence: `deno task check 2>&1 | tail -5`.
- [x] Smoke run (all 5 variants, `--dry-run`) without errors. FR-ID: FR-EXP.ANCHOR-SYSTEMS. Test: manual — korchasa. Evidence: exit 0 for each.
- [x] First live run on `claude-haiku-4-5`, all 5 variants, results committed. FR-ID: FR-EXP.ANCHOR-SYSTEMS. Test: manual — korchasa. Evidence: `ls results/2026-05-12-*-claude-haiku-4-5-*.md`.

## Solution

**Выбранный вариант: 1 — Три отдельных варианта через существующий `Experiment` интерфейс.**

### Шаг 1: Спроектировать концептуальное пространство фикстур

Синтетический проект «DevOps Platform Docs» — **19 файлов** (15 Markdown + 4 code):

Markdown:
```
overview.md, auth.md, session.md, validation.md, config.md,
deploy.md, rollback.md, monitoring.md, alerts.md, retry.md,
ratelimit.md, cache.md, errors.md, changelog.md, glossary.md
```

Code (для `boundary.ts` и `rag-noise.ts`):
```
auth_service.py    — функция generate_reset_token + SALP/Wikilinks/etc. якоря
password_utils.py  — несколько похожих функций проверки пароля (для noise-теста)
session_store.py   — session TTL логика
test_auth.py       — тест, ссылающийся на implementation-якорь
```

20 anchor-точек (по ~1-2 на файл), 25 cross-reference-ов.
Каждый anchor имеет канонический `namespace:id` (используется как ключ в ground-truth и как ID в SALP).

Code-фикстуры используют SALP в комментариях (`# [ANC:impl:token-generator-v1]`), Wikilinks в виде `^block-id` в docstring, zettelkasten-UID в header-комментарии файла, native — просто путь к файлу в комментарии. Для `native/` и `wikilinks/` системный синтаксис применяется внутри комментариев, поскольку другого cross-reference механизма в Python нет.

Примеры:
- `auth:session-timeout` в `auth.md` — правило времени жизни сессии
- `validation:retry-limit` в `validation.md` — максимум повторных попыток
- `deploy:rollback-trigger` в `deploy.md` — условие автооткатки

### Шаг 2: Создать фикстуры для 4 систем

Каталог: `scripts/experiments/anchor-systems/fixtures/`

```
fixtures/
  native/       — 15 md + 4 code, ссылки [text](path/file.md#heading) + путь в комментарии
  wikilinks/    — 15 md + 4 code, якорь ^block-id в конце абзаца/docstring; [[file#^block-id]]
  zettelkasten/ — 15 md + 4 code, UID-метка 202310XXXXXX в заголовке файла/комментарии
  salp/         — 15 md + 4 code, [ANC:ns:id] / [REF:ns:id | display] в тексте и комментариях
  ground-truth.json
  corrupted/    — копия salp/ с 3 внедрёнными аномалиями (для linting.ts)
```

Одинаковое концептуальное содержание во всех 4 системах.
Фикстуры — статические файлы, коммитятся, не генерируются в рантайме.

`ground-truth.json` структура:
```json
{
  "anchors": [
    {"id": "auth:session-timeout", "file": "auth.md", "description": "Session timeout policy (30 min idle)"},
    ...
  ],
  "references": [
    {"ref_id": "auth:session-timeout", "source_file": "config.md"},
    ...
  ],
  "multi_hop_targets": {
    "shallow": {"anchor_id": "auth:session-timeout",    "description": "session expiration rule",       "hops": 1},
    "medium":  {"anchor_id": "deploy:rollback-trigger", "description": "automatic rollback condition",  "hops": 2},
    "deep":    {"anchor_id": "validation:retry-limit",  "description": "maximum retries for failed requests", "hops": 3}
  },
  "stability_target": "deploy:rollback-trigger",
  "boundary_targets": [
    {"anchor_id": "impl:token-generator-v1", "file": "auth_service.py",
     "start_line": 10, "end_line": 18, "description": "generate_reset_token function body"}
  ],
  "noise_target": {
    "anchor_id": "sec:password-strength",
    "file": "password_utils.py",
    "similar_functions": ["check_password_length", "validate_password_format"]
  },
  "anomalies": [
    {"type": "duplicate_anchor", "id": "db:user-schema", "files": ["session_store.py", "config.md"]},
    {"type": "orphaned_ref",     "ref_id": "api:payment",   "source_file": "deploy.md"},
    {"type": "shadowed_anchor",  "anchor_id": "logic:calc", "file": "errors.md", "context": "commented-out block"}
  ]
}
```

- `multi_hop_targets`: цели для `multi-hop.ts` — 3 запроса разной глубины
- `boundary_targets`: эталонные диапазоны строк для `boundary.ts`
- `noise_target`: target-якорь и «шумовые» соседи для `rag-noise.ts`
- `anomalies`: внедрённые ошибки для `linting.ts` (duplicate / orphaned / shadowed)
- `stability_target` — anchor, чей файл всегда попадает в число «перемещённых»

### Шаг 3: Создать `scripts/experiments/anchor-systems/shared.ts`

```typescript
// Загружает ground-truth.json
export function loadGroundTruth(): GroundTruth { ... }

// Записывает первые N файлов данной системы в sandbox
export async function writeFixtures(
  adapter: AgentAdapter, sandboxPath: string,
  system: string, docCount: number
): Promise<void> { ... }

// Записывает все 19 файлов, часть по новым путям (для path-stability)
export async function writeFixturesWithMoves(
  adapter: AgentAdapter, sandboxPath: string,
  system: string, changeRatio: number
): Promise<{ movedFiles: Record<string, string> }> { ... }

// Записывает corrupted/ фикстуры для linting-задачи
export async function writeCorruptedFixtures(
  adapter: AgentAdapter, sandboxPath: string, system: string
): Promise<void> { ... }

// Формирует строку judge-prompt для mapping-задачи
export function mappingJudgeRule(groundTruth: GroundTruth): string { ... }
```

Все пути фикстур разрешаются относительно `import.meta.url` — работает независимо от CWD.

### Шаг 4: Создать `mapping.ts`

```
Axes:   system: ["native", "wikilinks", "zettelkasten", "salp"]
Reps:   5
```

Все 15 файлов всегда записываются в sandbox (`doc_count` ось убрана — fragility без пользы).

- `setupCell`: `writeFixtures(adapter, sandbox, system)` — все 15 файлов
- `query`: `"Extract all anchor definitions and cross-references from the project files. Respond ONLY with JSON: {\"anchors\": [{\"id\": \"...\", \"file\": \"...\"}], \"references\": [{\"ref_id\": \"...\", \"source_file\": \"...\"}]}"`
- `judgePrompt`: передаёт полный `ground_truth.anchors` + `ground_truth.references`; проверяет полноту (recall) и точность (precision)
- `headline`: adherence по системам; headline-строка: `mapping adherence: SALP=X% / native=Y%`

### Шаг 5: Создать `multi-hop.ts` (Bench 4 — Multi-Hop Reasoning)

```
Axes:   system: ["native", "wikilinks", "zettelkasten", "salp"]
        target: ["shallow", "medium", "deep"]
Reps:   5
```

Ось `target` выбирает одну из 3 цепочек разной глубины из `ground_truth.multi_hop_targets`:
- `shallow` (1 хоп): target-anchor прямо связан с отправной точкой
- `medium` (2 хопа): нужно пройти через промежуточный узел
- `deep` (3 хопа): три последовательных перехода по ref→anchor

- `setupCell`: `writeFixtures(adapter, sandbox, system)` — все 19 файлов
- `query`: `"Starting from the overview, explain why [target.description]. Trace the chain of references to find the answer."`
- `judgePrompt`: требует, чтобы ответ содержал anchor_id всех промежуточных узлов цепочки + финальный; строгая проверка hop accuracy
- `headline`: adherence по системам при `target=deep`

### Шаг 6: Создать `boundary.ts` (Bench 2 — Context Boundary Detection)

```
Axes:   system: ["native", "wikilinks", "zettelkasten", "salp"]
Reps:   5
```

Тест проверяет, правильно ли агент определяет границы блока (функция, метод), к которому относится anchor. Фикстуры — code-файлы с вложенными классами/функциями.

- `setupCell`: `writeFixtures(adapter, sandbox, system)` — все 19 файлов; каждый `boundary_target` имеет заранее известный `(start_line, end_line)` в ground-truth
- `query`: `"Identify the exact line range (start_line, end_line inclusive) of the block defined by anchor [boundary_target.anchor_id] in file [boundary_target.file]."`
- `judgePrompt`: вычисляет IoU между reported-диапазоном и ground-truth-диапазоном; pass если IoU ≥ 0.8
- `headline`: adherence по системам (IoU-порог 0.8 как бинарная метрика)

### Шаг 8: Создать `linting.ts` (Bench 6 — Graph Diagnostics)

```
Axes:   system: ["native", "wikilinks", "zettelkasten", "salp"]
Reps:   5
```

Агент выступает как «умный линтер» — должен обнаружить 3 внедрённые аномалии в `corrupted/`-фикстурах. Все системы используют одинаковый набор `corrupted/` с адаптированным синтаксисом.

Три типа аномалий (из `ground_truth.anomalies`):
- `duplicate_anchor`: два файла объявляют один и тот же ID
- `orphaned_ref`: ссылка указывает на удалённый anchor
- `shadowed_anchor`: anchor внутри закомментированного блока

- `setupCell`: `writeCorruptedFixtures(adapter, sandbox, system)` — пишет `corrupted/`-вариант
- `query`: `"Audit the semantic anchor graph in this project. Report all errors as JSON: [{\"type\": \"...\", \"id\": \"...\", \"files\": [...]}]"`
- `judgePrompt`: сравнивает найденные аномалии с `ground_truth.anomalies`; считает F₁ (precision × recall); pass если F₁ ≥ 0.7
- `headline`: adherence по системам (F₁-порог 0.7 как бинарная метрика)

### Шаг 9: Создать `rag-noise.ts` (Bench 7 — RAG Noise Resistance)

```
Axes:   system: ["native", "wikilinks", "zettelkasten", "salp"]
        noise_count: [3, 6, 9]
Reps:   5
```

В sandbox помещается target-файл с нужным anchor + `noise_count` похожих функций без него. Проверяет, фокусируется ли агент на помеченном блоке.

- `setupCell`: `writeFixtures(adapter, sandbox, system)` + запись `noise_count` дополнительных похожих функций из `ground_truth.noise_target.similar_functions` в `password_utils.py`; anchor присутствует только в одной из них
- `query`: `"Write a unit test for the logic defined at [noise_target.anchor_id]. Test only that specific implementation."`
- `judgePrompt`: проверяет, что тест обращается к функции с anchor, а не к шумовым соседям; pass если нет false-positive вызовов похожих функций
- `headline`: adherence по системам при `noise_count=9` (максимальный шум)

### Шаг 10: Создать `README.md`

Описание эксперимента: цель, 4 системы, 6 вариантов, оси, как запустить, как интерпретировать результаты, схема фикстур, сравнительная таблица метрик по системам.

### Шаг 11: Создать фикстуры вручную

По ~150-200 слов на Markdown-файл и ~20-30 строк на code-файл (итого ~2500 слов Markdown + ~120 строк кода на систему × 4).
Контент идентичен во всех 4 системах — меняется только синтаксис ссылок.
`corrupted/` — копия `salp/`-фикстур с 3 внедрёнными аномалиями (изменение 3 строк, документировано в `ground-truth.json`).

Пример пары native vs SALP для `auth.md`:
```markdown
# native: auth.md
...The retry policy is defined in the [validation rules](validation.md#retry-limit).
Session expiry follows the timeout defined in [session management](session.md#timeout-rule).

# salp: auth.md
...The retry policy is defined per [REF:validation:retry-limit | retry limit policy].
Session expiry follows [REF:session:timeout-rule]. [ANC:auth:session-timeout]
The session timeout value is 30 minutes of idle time.
# Note: [REF:ns:id | display text] is valid SALP syntax — display text after pipe is optional.
```

### Шаг 12: Верификация

```bash
deno task check                                                          # formatter + lint + tests
deno task experiment anchor-systems --variant mapping --dry-run          # план без запуска
deno task experiment anchor-systems --variant multi-hop --dry-run
deno task experiment anchor-systems --variant boundary --dry-run
deno task experiment anchor-systems --variant linting --dry-run
deno task experiment anchor-systems --variant rag-noise --dry-run
```

### Файлы, создаваемые задачей

**Новые:**
- `scripts/experiments/anchor-systems/fixtures/native/{*.md, *.py}` (19 файлов)
- `scripts/experiments/anchor-systems/fixtures/wikilinks/{*.md, *.py}` (19 файлов)
- `scripts/experiments/anchor-systems/fixtures/zettelkasten/{*.md, *.py}` (19 файлов)
- `scripts/experiments/anchor-systems/fixtures/salp/{*.md, *.py}` (19 файлов)
- `scripts/experiments/anchor-systems/fixtures/corrupted/{*.md, *.py}` (19 файлов, SALP + 3 аномалии)
- `scripts/experiments/anchor-systems/fixtures/ground-truth.json`
- `scripts/experiments/anchor-systems/shared.ts`
- `scripts/experiments/anchor-systems/mapping.ts`
- `scripts/experiments/anchor-systems/multi-hop.ts`
- `scripts/experiments/anchor-systems/boundary.ts`
- `scripts/experiments/anchor-systems/linting.ts`
- `scripts/experiments/anchor-systems/rag-noise.ts`
- `scripts/experiments/anchor-systems/README.md`

**Изменённые:**
- `documents/requirements.md` — новая секция FR-EXP.ANCHOR-SYSTEMS + back-pointer
- `documents/index.md` — новая строка FR-EXP.ANCHOR-SYSTEMS

## Follow-ups

- `cascade.ts` (Bench 5 — Cascade Modification): агент должен редактировать файлы sandbox; текущий runner захватывает только stdout. Требует добавления в `TrialResult.sandboxDiff` или аналогичного механизма для чтения состояния sandbox постфактум. Заводить отдельную задачу после завершения этой.
- `generate-fixtures.ts` — скрипт для регенерации фикстур при изменении концептуального содержания (не нужен для первого запуска, полезен при расширении anchor-space)
- Composite SALP-score — взвешенная сумма adherence по 6 вариантам для единой метрики сравнения систем
- Oss `noise_level` в `mapping.ts` — прозаический «шум» между файлами (аналог `claude-md-length`) для измерения устойчивости extraction при росте контекста
