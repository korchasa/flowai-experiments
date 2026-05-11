# ADR-0007: Adopt Deno + TypeScript for the benchmark runner

- Status: Accepted
- Date: 2026-04-12
- Deciders: Lead engineer, infra reviewer

## Context

The compression-decompression benchmark needs a small but reliable runner. We had three candidate
stacks: Node.js with TypeScript, Deno with TypeScript, and Go. The runner must:

- Spawn external CLI processes (`claude`, `codex`, `gemini`) with a per-run isolated `HOME`
  directory.
- Parse YAML checklists and emit JSON artefacts.
- Run on macOS and Linux developer laptops without a global package install step.
- Be readable by an AI agent that already understands TypeScript.

## Decision

We adopt Deno 2.x with TypeScript. Source files use the `@bench/` import map prefix defined in
`deno.json`. Tests run via `deno test -A`. Formatting is enforced with `deno fmt --line-width=100`.

## Consequences

- Positive: zero-install onboarding, native TypeScript, built-in test runner and formatter,
  sandbox-by-default permissions.
- Negative: smaller ecosystem than Node; some libraries must be polyfilled or replaced (notably AWS
  SDK and node-tap).
- Mitigation: pin `jsr:@std/*` packages at exact versions in `deno.json`; avoid Node-only
  dependencies.

## Alternatives considered

- Node.js with TypeScript: mature, but requires `npm install`, ts-node setup, and explicit lockfile
  policy. Rejected for onboarding cost.
- Go: fastest startup and single static binary, but the team has stronger TypeScript fluency and the
  LLM judge prompts are easier to iterate in TypeScript. Rejected for velocity.

## Acceptance

- `deno task check` passes on a clean checkout.
- A new contributor can run `deno task bench` within five minutes of cloning.
