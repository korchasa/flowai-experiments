---
date: "2026-05-12"
status: to do
implements:
  - FR-EXP.TOKENIZERS
  - FR-EXP.COMPRESSION
  - FR-EXP.IMAGES-HARD
  - FR-EXP-RUN
tags: [migration, experiments, benchmarks, openrouter]
related_tasks:
  - 2026/04/migrate-to-ai-ide-cli.md
---
# Migrate benchmarks from ai/benchmarks

## Goal

Port empirical measurement tools from `/Users/korchasa/www/ai/benchmarks` into `flowai-experiments`, add systematic run entry points, and commit results under the shared `results/` tree so all empirical evidence lives in one place.

## Overview

### Context

`/Users/korchasa/www/ai/benchmarks` contains four codebases with committed tooling:
- **`tokenizers/`** — Deno+TS. Measures tokenizer efficiency (tokens/char) of OpenRouter models across 40+ UDHR language corpora. Standalone, working. Results in `public/results/`.
- **`compression-decompression/`** — Deno+TS. Two-stage compress→decompress pipeline for technical documents; measures fact retention and compression ratio. Partially implemented (~920 LOC in `lib/`, 4 scenarios, adapters: claude/codex/gemini). Own `deno.json`, own runner pattern.
- **`images-hard/`** — Deno+TS. Text-to-image generation benchmark; 12 hard test cases evaluated via OpenRouter API. Standalone, working. Results in `public/results/`.
- **`qa/`** — Node.js/TypeScript. Fake social network REST API used as a sandbox for agent QA scenarios. Different runtime (npm, not Deno).

Not migrating: `images-alphabet/` (just a prompt), `code/task1.md` (task description), `html/` (images only).

**Key architectural gap:** the current `flowai-experiments` runner is designed for single-call agent CLI experiments. The source benchmarks differ:
- `tokenizers/` and `images-hard/` call OpenRouter REST API directly — no agent spawning.
- `compression-decompression/` is a two-stage multi-LLM pipeline, not single-call.
- `qa/` is a Node.js test harness, different runtime.

Related: `2026/04/migrate-to-ai-ide-cli.md` refactored adapters to use `@korchasa/ai-ide-cli`. Any OpenRouter adapter must coexist with that library without collision.

### Current State

- `flowai-experiments` has `Experiment` interface (axes, setupCell, query, judgePrompt, headline) in `scripts/experiments/lib/types.ts`.
- Runner (`scripts/experiments/lib/runner.ts`) drives single-call agent trials: spawn CLI → judge → adherence curve.
- No OpenRouter API adapter exists in this repo.
- Source benchmarks each have their own runner, result format, `deno.json`, and storage location.
- `compression-decompression/lib/` has a separate runner (219 LOC), separate judge, separate types — partially implements a different pattern from `flowai-experiments`.

### Constraints

- `deno task check` must stay green throughout.
- Existing experiment results in `results/` must not be touched.
- `@korchasa/ai-ide-cli` adapter must remain functional (no regressions in `claude-md-length` / `context-anatomy`).
- `qa/` is Node.js — cannot be imported directly into a Deno monorepo without build steps.
- Results must be committed; no gitignored result files can be the "product".
- Fail-fast: no silent fallbacks.

## Definition of Done

- [ ] Add FR-EXP.TOKENIZERS section to SRS with `**Acceptance:**` field filled. FR-ID: FR-EXP.TOKENIZERS. Test: manual — korchasa. Evidence: `grep -n "FR-EXP.TOKENIZERS" documents/requirements.md`.
- [ ] Add FR-EXP.COMPRESSION section to SRS with `**Acceptance:**` field filled. FR-ID: FR-EXP.COMPRESSION. Test: manual — korchasa. Evidence: `grep -n "FR-EXP.COMPRESSION" documents/requirements.md`.
- [ ] Add FR-EXP.IMAGES-HARD section to SRS with `**Acceptance:**` field filled. FR-ID: FR-EXP.IMAGES-HARD. Test: manual — korchasa. Evidence: `grep -n "FR-EXP.IMAGES-HARD" documents/requirements.md`.
- [ ] `scripts/experiments/tokenizers/` содержит скопированные файлы (bench.ts, models.json, udhr/); `run.ts` шим написан. FR-ID: FR-EXP.TOKENIZERS. Test: `scripts/experiments/tokenizers/tokenizers_test.ts::smoke`. Evidence: `ls scripts/experiments/tokenizers/bench.ts scripts/experiments/tokenizers/run.ts`.
- [ ] `scripts/experiments/compression-decompression/` содержит скопированные lib/, scenarios/, prompts/; `run.ts` шим написан. FR-ID: FR-EXP.COMPRESSION. Test: `scripts/experiments/compression-decompression/lib/runner_test.ts::two_stages`. Evidence: `ls scripts/experiments/compression-decompression/lib/runner.ts scripts/experiments/compression-decompression/run.ts`.
- [ ] Fixture-файлы `scenarios/*/fixture/original.md` созданы для всех 4 сценариев compression-decompression. FR-ID: FR-EXP.COMPRESSION. Test: manual — korchasa. Evidence: `ls scripts/experiments/compression-decompression/scenarios/*/fixture/original.md`.
- [ ] `scripts/experiments/images-hard/` содержит скопированные файлы (bench.ts, public/config.yaml); `run.ts` шим написан. FR-ID: FR-EXP.IMAGES-HARD. Test: `scripts/experiments/images-hard/images_test.ts::smoke`. Evidence: `ls scripts/experiments/images-hard/bench.ts scripts/experiments/images-hard/run.ts`.
- [ ] `deno.json` содержит задачи `experiment:tokenizers`, `experiment:compression`, `experiment:images-hard`. FR-ID: FR-EXP-RUN. Test: `deno task check`. Evidence: `grep "experiment:" deno.json`.
- [ ] `deno task check` green после миграции (основной framework не сломан). FR-ID: FR-EXP-RUN. Test: `deno task check`. Evidence: `deno task check 2>&1 | tail -5`.
- [ ] `deno task check:all` green (шимы type-check корректно с их import map). FR-ID: FR-EXP-RUN. Test: `deno task check:all`. Evidence: `deno task check:all 2>&1 | tail -5`.
- [ ] Существующие `claude-md-length` и `context-anatomy` не сломаны (dry-run проходит). FR-ID: FR-EXP-RUN. Test: `deno task experiment claude-md-length --variant single-file --dry-run`. Evidence: exit 0.
- [ ] Первый запуск каждого эксперимента записывает файл в `results/`. FR-ID: FR-EXP.TOKENIZERS, FR-EXP.COMPRESSION, FR-EXP.IMAGES-HARD. Test: manual — korchasa. Evidence: `ls results/*tokenizers* results/*compression* results/*images-hard*`.

## Solution

**Выбранный вариант: 2 — Monorepo с общей папкой результатов + тонкие шимы.**

Каждый бенчмарк копируется в `scripts/experiments/<name>/` с сохранением своего runner-а. Добавляется тонкий `run.ts`-шим (~50 LOC), который вызывает нижележащий bench и нормализует результат в `results/<DATE>-<name>-<model>.json + .md`. Framework (`runner.ts`, `judge.ts` и т.д.) не трогается. `qa/` не мигрируется (Node.js/npm — несовместимый рантайм).

### Шаг 1: Скопировать tokenizers

```bash
rsync -av --exclude='.git' --exclude='public/results' --exclude='.DS_Store' \
  /Users/korchasa/www/ai/benchmarks/tokenizers/ \
  scripts/experiments/tokenizers/
```

Скопированные файлы: `bench.ts`, `models.json`, `merge-results.ts`, `udhr/` (40+ текстовых файлов UDHR-корпуса), `public/index.html` (viewer).

### Шаг 2: Написать `scripts/experiments/tokenizers/run.ts`

Шим принимает `--model <id>` (или список через запятую), `--language <lang>` (фильтр), `--dry-run`. Вызывает `bench.ts` с временной директорией вывода. По завершении:
- Находит сгенерированный JSON-файл во временной директории.
- Копирует его как `results/<YYYY-MM-DD>-<HHMM>-tokenizers-<model-slug>.json`.
- Генерирует Markdown-резюме (модели × языки × tokens/char) как `results/<YYYY-MM-DD>-<HHMM>-tokenizers-<model-slug>.md` и коммитит его (JSON — в `.gitignore` как сырые данные).

Env-переменная: `OPENROUTER_API_KEY` — обязательна для реального запуска.

### Шаг 3: Скопировать compression-decompression

```bash
rsync -av --exclude='.git' --exclude='runs/' --exclude='cache/' \
  --exclude='.DS_Store' --exclude='.env' \
  /Users/korchasa/www/ai/benchmarks/compression-decompression/ \
  scripts/experiments/compression-decompression/
```

Скопированные файлы: `lib/` (runner, judge, metrics, cache, adapters, types), `scenarios/` (4 scenario mod.ts), `prompts/` (compress/decompress prompts), `deno.json`.

**Проблема fixture-файлов:** все 4 сценария не содержат `fixture/original.md`. Нужно создать их вручную (каждый — собственный или публично лицензированный документ):
- `scenarios/adr-record-decision/fixture/original.md` — синтетический ADR (~300 слов) по шаблону [MADR](https://adr.github.io/madr/) (CC0-лицензия).
- `scenarios/postmortem-incident-2026-03-12/fixture/original.md` — синтетический постмортем (~600 слов) описывающий вымышленный инцидент развёртывания.
- `scenarios/prd-feature-launch/fixture/original.md` — взять `documents/requirements.md` данного проекта (собственный документ, ~3000 слов) как входной текст.
- `scenarios/runbook-deno-deploy/fixture/original.md` — синтетический runbook (~400 слов) по процедуре `deno deploy` на основе публичной документации Deno.

Каждый fixture должен быть либо собственным документом, либо публично лицензированным.

### Шаг 4: Написать `scripts/experiments/compression-decompression/run.ts`

Шим принимает `--scenario <id>` (или `all`), `--compress-model <model>`, `--decompress-model <model>`, `--style <naive|concise|compressed-style>`, `--dry-run`. Вызывает `lib/runner.ts`. По завершении:
- Читает `runs/latest/<scenario-id>/run-N/{metrics.json,judge.json,report.md}`.
- Сериализует в `results/<DATE>-compression-<scenario>-<compress-model>.json`.
- Копирует `report.md` как `results/<DATE>-compression-<scenario>-<compress-model>.md`.

Env-переменные: `OPENAI_API_KEY` (для codex-адаптера), `GOOGLE_API_KEY` (для gemini-адаптера) — опциональны, `CLAUDE_CONFIG_DIR` для claude-адаптера (аналогично существующим экспериментам).

### Шаг 5: Скопировать images-hard

```bash
rsync -av --exclude='.git' --exclude='node_modules/' --exclude='public/results/' \
  --exclude='.DS_Store' --exclude='.env' --exclude='.cursor/' \
  /Users/korchasa/www/ai/benchmarks/images-hard/ \
  scripts/experiments/images-hard/
```

Скопированные файлы: `bench.ts`, `public/config.yaml`, `public/index.html` (viewer), `deno.json`.

### Шаг 6: Написать `scripts/experiments/images-hard/run.ts`

Шим принимает `--model <id>`, `--prompt <TC-IDs>` (фильтр через запятую), `--limit <n>`, `--dry-run`. Вызывает `bench.ts` с временной директорией. По завершении:
- Находит report JSON.
- Копирует как `results/<DATE>-images-hard-<model-slug>.json` и `.md`.

Env-переменная: `OPENROUTER_API_KEY` — обязательна.

### Шаг 7: Обновить `deno.json` (корневой)

Добавить в раздел `tasks` с явным `--config` для изоляции import map каждого под-проекта:
```json
"experiment:tokenizers": "deno run --config scripts/experiments/tokenizers/deno.json -A scripts/experiments/tokenizers/run.ts",
"experiment:compression": "deno run --config scripts/experiments/compression-decompression/deno.json -A scripts/experiments/compression-decompression/run.ts",
"experiment:images-hard": "deno run --config scripts/experiments/images-hard/deno.json -A scripts/experiments/images-hard/run.ts",
"check:all": "deno task check && deno check --config scripts/experiments/tokenizers/deno.json scripts/experiments/tokenizers/run.ts && deno check --config scripts/experiments/compression-decompression/deno.json scripts/experiments/compression-decompression/run.ts && deno check --config scripts/experiments/images-hard/deno.json scripts/experiments/images-hard/run.ts"
```

Флаг `--config` гарантирует, что каждый шим использует import map своего под-проекта, а не корневой `deno.lock`. `deno task check` в корне остаётся без изменений (только основной framework). `deno task check:all` проверяет полную кодовую базу.

### Шаг 8: Добавить smoke-тесты

Контракт smoke-теста для `--dry-run`:
1. `run.ts --dry-run` завершается с кодом 0.
2. В `results/` не создаётся ни одного файла (проверяется через `Deno.stat` или glob до/после).
3. Stdout содержит непустой текст с описанием плана запуска (хотя бы строку с именем эксперимента и моделью).

- `scripts/experiments/tokenizers/tokenizers_test.ts::smoke` — реализует контракт выше.
- `scripts/experiments/images-hard/images_test.ts::smoke` — реализует контракт выше.
- Для compression-decompression — использовать существующий `lib/runner_test.ts` (уже есть, 97 LOC).

### Шаг 9: Обновить `.gitignore`

Добавить в корневой `.gitignore`:
```
# compression-decompression runtime artifacts
scripts/experiments/compression-decompression/runs/
scripts/experiments/compression-decompression/cache/
# tokenizers and images-hard runtime artifacts
scripts/experiments/tokenizers/public/results/
scripts/experiments/images-hard/public/results/
```

### Шаг 10: Задокументировать env-переменные

Добавить в SRS §5 Interfaces новый пункт:
```
- **Env (OpenRouter-based experiments):** `OPENROUTER_API_KEY` — required for `experiment:tokenizers` and `experiment:images-hard`. Not used by agent-spawning experiments.
```

Добавить `.env.example` в корень проекта:
```
# Required for experiment:tokenizers and experiment:images-hard
OPENROUTER_API_KEY=your_api_key_here
```

### Шаг 11: Обновить SRS

Добавить секции `FR-EXP.TOKENIZERS` (§3.9), `FR-EXP.COMPRESSION` (§3.10), `FR-EXP.IMAGES-HARD` (§3.11) в `documents/requirements.md` с описанием, сценарием и acceptance-критериями. Добавить env-переменную в §5 Interfaces (см. Шаг 10).

### Шаг 12: Верификация

```bash
deno task check                                           # основной framework — зелёный
deno task check:all                                       # шимы — зелёный
deno task experiment claude-md-length --variant single-file --dry-run  # no regression
deno task experiment:tokenizers --dry-run                # шим загружается без ошибок
deno task experiment:compression --dry-run               # шим загружается без ошибок
deno task experiment:images-hard --dry-run               # шим загружается без ошибок
```

### Файлы, создаваемые этой задачей

**Новые:**
- `scripts/experiments/tokenizers/` — скопированное дерево
- `scripts/experiments/tokenizers/run.ts` — шим
- `scripts/experiments/tokenizers/tokenizers_test.ts` — smoke-тест
- `scripts/experiments/compression-decompression/` — скопированное дерево
- `scripts/experiments/compression-decompression/run.ts` — шим
- `scripts/experiments/compression-decompression/scenarios/*/fixture/original.md` — 4 fixture-файла
- `scripts/experiments/images-hard/` — скопированное дерево
- `scripts/experiments/images-hard/run.ts` — шим
- `scripts/experiments/images-hard/images_test.ts` — smoke-тест
- `.env.example` — шаблон env-переменных

**Изменённые:**
- `deno.json` — 4 новые task-записи (`experiment:tokenizers`, `experiment:compression`, `experiment:images-hard`, `check:all`)
- `.gitignore` — 4 новые строки для исключения runtime-артефактов под-проектов
- `documents/requirements.md` — 3 новые FR-секции + env в §5

## Follow-ups

- Выравнивание `compression-decompression/adapters/claude.ts` под `@korchasa/ai-ide-cli` (сейчас два разных способа вызова claude в одном репо). Заводить отдельную задачу после успешной миграции.
