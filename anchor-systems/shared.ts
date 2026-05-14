/**
 * Shared utilities for the anchor-systems experiment family.
 *
 * Loads the committed fixture sets (salp / native / wikilinks / zettelkasten /
 * corrupted) and writes them into the experiment sandbox so the spawned claude
 * agent can explore them with its built-in file-reading tools.
 *
 * Fixture files live at:
 *   anchor-systems/fixtures/<system>/<file>
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

/** Return the concrete anchor spelling a fixture system exposes to agents. */
export function surfaceId(
  gt: GroundTruth,
  system: string,
  canonicalId: string,
): string {
  switch (system) {
    case "native": {
      const heading = gt.native_headings[canonicalId];
      if (!heading) return canonicalId;
      return `${heading.file}#${heading.slug}`;
    }
    case "wikilinks":
      return `^${canonicalId.replaceAll(":", "-")}`;
    case "zettelkasten":
      return gt.zettelkasten_uids[canonicalId] ?? canonicalId;
    case "salp-short":
      return shortId(gt, canonicalId);
    case "salp":
    default:
      return canonicalId;
  }
}

/** Return canonical plus system-specific spellings accepted by the judge. */
export function acceptedIds(
  gt: GroundTruth,
  system: string,
  canonicalId: string,
): string[] {
  const ids = [canonicalId, surfaceId(gt, system, canonicalId)];
  if (system === "salp-short") ids.push(shortId(gt, canonicalId));
  return [...new Set(ids)];
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
 * Write a system-specific fixture set with the 3 planted anomalies.
 */
export async function writeCorruptedFixtures(
  sandboxPath: string,
  system = "salp",
): Promise<void> {
  await Deno.writeTextFile(join(sandboxPath, "AGENTS.md"), ROOT_AGENTS_MD);
  for (const f of ALL_FILES) {
    const content = await readFixtureFile(system, f);
    await writeProjectFile(sandboxPath, f, corruptFixture(system, f, content));
  }
}

function corruptFixture(
  system: string,
  filename: string,
  content: string,
): string {
  if (filename === "auth.md") {
    return injectDuplicateAnchor(system, content, false);
  }
  if (filename === "session_store.py") {
    return injectDuplicateAnchor(system, content, true);
  }
  if (filename === "oauth.md") {
    return injectOrphanReference(system, content);
  }
  if (filename === "password.md") {
    return injectShadowedAnchor(system, content);
  }
  return content;
}

function injectDuplicateAnchor(
  system: string,
  content: string,
  isCode: boolean,
): string {
  const marker = (() => {
    switch (system) {
      case "native":
        return isCode ? "# # User Schema" : "## User Schema";
      case "wikilinks":
        return isCode ? "# User schema ^db-user-schema" : "^db-user-schema";
      case "zettelkasten":
        return isCode
          ? "# **UID: 202605129001** db:user-schema"
          : "**UID: 202605129001**\nUser schema marker.";
      case "salp-short":
        return "[ANC:user-schema]";
      case "salp":
      default:
        return "[ANC:db:user-schema]";
    }
  })();

  const codeMarker = isCode && marker.startsWith("[") ? `# ${marker}` : marker;
  if (isCode) {
    return content.replace(
      "\n\ndef create_session",
      `\n\n${codeMarker}\ndef create_session`,
    );
  }
  return content.replace(
    "\nAll user accounts",
    `\n${marker}\nAll user accounts`,
  );
}

function injectOrphanReference(system: string, content: string): string {
  const marker = (() => {
    switch (system) {
      case "native":
        return "[callback handling](api.md#oauth-callback)";
      case "wikilinks":
        return "[[api#^api-oauth-callback]]";
      case "zettelkasten":
        return "[[202605129002]]";
      case "salp-short":
        return "[REF:oauth-callback | callback handling]";
      case "salp":
      default:
        return "[REF:api:oauth-callback | callback handling]";
    }
  })();
  return `${content.trimEnd()}\n\nCallback handling is documented in ${marker}.\n`;
}

function injectShadowedAnchor(system: string, content: string): string {
  const marker = (() => {
    switch (system) {
      case "native":
        return "## Legacy MD5 Hash";
      case "wikilinks":
        return "^legacy-md5-hash";
      case "zettelkasten":
        return "**UID: 202605129003** legacy:md5-hash";
      case "salp-short":
        return "[ANC:md5-hash]";
      case "salp":
      default:
        return "[ANC:legacy:md5-hash]";
    }
  })();
  return `${content.trimEnd()}\n\n<!--\n${marker}\nLegacy MD5 password hashing - deprecated, do not use.\n-->\n`;
}
