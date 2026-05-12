/**
 * Shared utilities for the anchor-systems experiment family.
 *
 * Loads the committed fixture sets (salp / native / wikilinks / zettelkasten /
 * corrupted) and writes them into the experiment sandbox so the spawned claude
 * agent can explore them with its built-in file-reading tools.
 *
 * Fixture files live at:
 *   scripts/experiments/anchor-systems/fixtures/<system>/<file>
 *
 * Each fixture directory contains 15 Markdown docs + 4 Python files that
 * represent the same synthetic "Auth Service" project expressed in the
 * corresponding anchor/link syntax.
 */

import { dirname, fromFileUrl, join } from "@std/path";
import { ensureDir } from "@std/fs";

// ---------------------------------------------------------------------------
// Ground-truth types
// ---------------------------------------------------------------------------

export interface GtAnchor {
  id: string;
  file: string;
  description: string;
}

export interface GtReference {
  ref_id: string;
  source_file: string;
}

export interface GtMultiHopTarget {
  anchor_id: string;
  description: string;
  chain: string[];
  hops: number;
}

export interface GtStabilityTarget {
  anchor_id: string;
  original_file: string;
  moved_to: string;
}

export interface GtBoundaryTarget {
  anchor_id: string;
  file: string;
  function_name: string;
  start_line: number;
  end_line: number;
}

export interface GtNoiseTarget {
  anchor_id: string;
  file: string;
  target_function: string;
  similar_functions: string[];
}

export interface GtAnomaly {
  type: "duplicate_anchor" | "orphaned_ref" | "shadowed_anchor";
  id?: string;
  ref_id?: string;
  anchor_id?: string;
  files?: string[];
  source_file?: string;
  file?: string;
  description: string;
}

export interface GroundTruth {
  anchors: GtAnchor[];
  references: GtReference[];
  multi_hop_targets: Record<string, GtMultiHopTarget>;
  stability_target: GtStabilityTarget;
  boundary_targets: GtBoundaryTarget[];
  noise_target: GtNoiseTarget;
  anomalies: GtAnomaly[];
  zettelkasten_uids: Record<string, string>;
  salp_short_ids: Record<string, string>;
  native_headings: Record<string, { file: string; slug: string }>;
}

/** Return the short SALP id (no namespace) for a canonical anchor id. */
export function shortId(gt: GroundTruth, canonicalId: string): string {
  return gt.salp_short_ids[canonicalId] ?? canonicalId.split(":").pop()!;
}

let _gt: GroundTruth | null = null;

export function loadGroundTruth(): GroundTruth {
  if (_gt) return _gt;
  const here = dirname(fromFileUrl(import.meta.url));
  const path = join(here, "fixtures", "ground-truth.json");
  _gt = JSON.parse(Deno.readTextFileSync(path)) as GroundTruth;
  return _gt;
}

// ---------------------------------------------------------------------------
// Minimal memory file written at sandbox root.
// Neutral — tells the agent what the project is without embedding any rules.
// ---------------------------------------------------------------------------

const ROOT_AGENTS_MD = `\
# Auth Service Documentation

This repository documents and implements an authentication service.
Use your file-reading tools to explore the Markdown documentation and Python source files in this directory.
`;

// ---------------------------------------------------------------------------
// File lists
// ---------------------------------------------------------------------------

const MD_FILES = [
  "overview.md",
  "auth.md",
  "session.md",
  "token.md",
  "mfa.md",
  "password.md",
  "lockout.md",
  "audit.md",
  "rbac.md",
  "oauth.md",
  "refresh.md",
  "revocation.md",
  "ratelimit.md",
  "recovery.md",
  "glossary.md",
];

const CODE_FILES = [
  "auth_service.py",
  "password_utils.py",
  "session_store.py",
  "test_auth.py",
];

const ALL_FILES = [...MD_FILES, ...CODE_FILES];

// Files that may be relocated in path-stability tests (excluding stability target).
// Ordered deterministically; change_ratio selects the first N.
const RELOCATABLE_FILES = [
  "auth.md",
  "session.md",
  "password.md",
  "lockout.md",
  "audit.md",
  "rbac.md",
  "refresh.md",
  "revocation.md",
];

// ---------------------------------------------------------------------------
// Core write helpers
// ---------------------------------------------------------------------------

function readFixtureFile(
  system: string,
  filename: string,
): Promise<string> {
  const here = dirname(fromFileUrl(import.meta.url));
  const path = join(here, "fixtures", system, filename);
  return Deno.readTextFile(path);
}

async function writeProjectFile(
  sandboxPath: string,
  filename: string,
  content: string,
): Promise<void> {
  const dest = join(sandboxPath, filename);
  await ensureDir(dirname(dest));
  await Deno.writeTextFile(dest, content);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Write all 19 fixture files for `system` into the sandbox root.
 * Also writes a minimal AGENTS.md to orient the agent.
 */
export async function writeFixtures(
  sandboxPath: string,
  system: string,
): Promise<void> {
  await Deno.writeTextFile(join(sandboxPath, "AGENTS.md"), ROOT_AGENTS_MD);
  for (const f of ALL_FILES) {
    const content = await readFixtureFile(system, f);
    await writeProjectFile(sandboxPath, f, content);
  }
}

/**
 * Write fixture files with a fraction of files relocated to `reorganized/`.
 *
 * The stability target (token.md) is ALWAYS moved.
 * Additional files are taken from RELOCATABLE_FILES up to the quota.
 * References inside source files still point to original paths (by design —
 * this is what creates broken links for path-dependent systems).
 */
export async function writeFixturesWithMoves(
  sandboxPath: string,
  system: string,
  changeRatio: number,
): Promise<{ movedFiles: Record<string, string> }> {
  const gt = loadGroundTruth();
  const totalMoves = Math.ceil(ALL_FILES.length * changeRatio);

  // Always include stability target as the first move.
  const toMove = new Set<string>([gt.stability_target.original_file]);
  for (const f of RELOCATABLE_FILES) {
    if (toMove.size >= totalMoves) break;
    toMove.add(f);
  }

  const movedFiles: Record<string, string> = {};
  for (const f of toMove) {
    movedFiles[f] = `reorganized/${f}`;
  }

  await Deno.writeTextFile(join(sandboxPath, "AGENTS.md"), ROOT_AGENTS_MD);

  for (const f of ALL_FILES) {
    const content = await readFixtureFile(system, f);
    const dest = movedFiles[f] ?? f;
    await writeProjectFile(sandboxPath, dest, content);
  }

  // Write a migration log so the agent has a chance to discover the moves.
  const log = [
    "# MIGRATION_LOG.md",
    "",
    "The following files were relocated during the last refactor:",
    "",
    ...Object.entries(movedFiles).map(([from, to]) =>
      `- \`${from}\` → \`${to}\``
    ),
    "",
    "References in other files have NOT been updated yet.",
  ].join("\n");
  await Deno.writeTextFile(join(sandboxPath, "MIGRATION_LOG.md"), log);

  return { movedFiles };
}

/**
 * Write the `corrupted/` fixture set (SALP with 3 planted anomalies).
 */
export async function writeCorruptedFixtures(
  sandboxPath: string,
): Promise<void> {
  await Deno.writeTextFile(join(sandboxPath, "AGENTS.md"), ROOT_AGENTS_MD);
  for (const f of ALL_FILES) {
    const content = await readFixtureFile("corrupted", f);
    await writeProjectFile(sandboxPath, f, content);
  }
}
