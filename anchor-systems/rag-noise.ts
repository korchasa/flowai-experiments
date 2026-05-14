/**
 * Experiment: anchor-systems — rag-noise variant (Bench 7).
 *
 * RAG Noise Resistance: password.md links to several plausible Python
 * implementation anchors. password_utils.py contains one target implementation
 * plus marker-bearing decoys and semantically similar unanchored noise.
 *
 * The agent must start from documentation, follow the implementation reference,
 * and identify the target function. This tests graph navigation through noisy
 * retrieval context, not local lookup inside a known file.
 *
 * Axes:  system × noise_count (3 / 6 / 9 extra noise functions).
 * Reps:  5.
 * Metric: pass if the agent names check_strength, explains the password policy,
 *         and gives a reference path from password.md to the target code anchor.
 */

import type { Cell, Experiment, ExperimentReport } from "../shared/types.ts";
import { join } from "@std/path";
import {
  ANCHOR_SYSTEMS,
  loadGroundTruth,
  shortId,
  surfaceId,
  writeFixtures,
} from "./shared.ts";

const gt = loadGroundTruth();
const NT = gt.noise_target;

// Extra noise functions appended to password_utils.py in setupCell.
// All are semantically similar password checks with no anchor marker.
const NOISE_FUNCTIONS = [
  `\ndef check_entropy(password: str) -> float:\n    """Estimate Shannon entropy of the password."""\n    from math import log2\n    freq = {c: password.count(c) / len(password) for c in set(password)}\n    return -sum(p * log2(p) for p in freq.values())\n`,
  `\ndef check_leaked(password: str) -> bool:\n    """Return True if password appears in a common-passwords list (stub)."""\n    common = ["password", "123456", "qwerty"]\n    return password.lower() in common\n`,
  `\ndef check_sequential(password: str) -> bool:\n    """Return True if password contains no sequential character runs ≥3."""\n    for i in range(len(password) - 2):\n        if ord(password[i + 1]) == ord(password[i]) + 1 and \\\n           ord(password[i + 2]) == ord(password[i]) + 2:\n            return False\n    return True\n`,
  `\ndef check_repetition(password: str) -> bool:\n    """Return True if no character appears more than 3 times."""\n    return all(password.count(c) <= 3 for c in set(password))\n`,
  `\ndef check_keyboard_patterns(password: str) -> bool:\n    """Return True if password avoids common keyboard walks."""\n    patterns = ["qwerty", "asdf", "zxcv", "1234", "abcd"]\n    low = password.lower()\n    return not any(p in low for p in patterns)\n`,
  `\ndef check_unicode_safety(password: str) -> bool:\n    """Return True if password normalizes safely under NFKC."""\n    import unicodedata\n    return unicodedata.normalize("NFKC", password) == password\n`,
  `\ndef check_max_length(password: str, limit: int = 128) -> bool:\n    """Return True if password does not exceed the maximum allowed length."""\n    return len(password) <= limit\n`,
  `\ndef check_whitespace(password: str) -> bool:\n    """Return True if password contains no leading or trailing whitespace."""\n    return password == password.strip()\n`,
  `\ndef check_null_bytes(password: str) -> bool:\n    """Return True if password contains no null bytes."""\n    return "\\x00" not in password\n`,
];

const DECOY_FUNCTIONS = [
  {
    id: "sec:password-complexity-score",
    heading: "Password Complexity Score",
    slug: "password-complexity-score",
    uid: "202605129101",
    label: "complexity scoring implementation",
    code:
      `\ndef check_policy_score(password: str) -> int:\n    """ANCHOR_MARKER\n\n    Return a 0-100 score for password complexity. This is advisory telemetry,\n    not the registration gate.\n    """\n    return min(100, len(password) * 4)\n`,
  },
  {
    id: "sec:password-format-precheck",
    heading: "Password Format Precheck",
    slug: "password-format-precheck",
    uid: "202605129102",
    label: "format precheck implementation",
    code:
      `\ndef check_policy_format(password: str) -> bool:\n    """ANCHOR_MARKER\n\n    Return True when a password uses printable ASCII only. This is a transport\n    safety precheck, not the full strength policy.\n    """\n    return all(32 <= ord(c) <= 126 for c in password)\n`,
  },
] as const;

function targetRef(system: string): string {
  switch (system) {
    case "salp":
      return "[REF:sec:password-strength | strength enforcement implementation]";
    case "salp-short":
      return "[REF:password-strength | strength enforcement implementation]";
    case "wikilinks":
      return "[[password_utils#^sec-password-strength]]";
    case "zettelkasten":
      return "[[202605121011]]";
    case "heading-refs":
      return "[password_utils.py:Password Strength Check]";
    case "native":
      return "[password strength implementation](password_utils.py#check_strength)";
    default:
      return NT.anchor_id;
  }
}

function decoyRef(
  system: string,
  decoy: typeof DECOY_FUNCTIONS[number],
): string {
  switch (system) {
    case "salp":
      return `[REF:${decoy.id} | ${decoy.label}]`;
    case "salp-short":
      return `[REF:${shortId(gt, decoy.id)} | ${decoy.label}]`;
    case "wikilinks":
      return `[[password_utils#^${decoy.id.replaceAll(":", "-")}]]`;
    case "zettelkasten":
      return `[[${decoy.uid}]]`;
    case "heading-refs":
      return `[password_utils.py:${decoy.heading}]`;
    case "native":
      return `[${decoy.label}](password_utils.py#${decoy.slug})`;
    default:
      return decoy.id;
  }
}

function anchorMarker(
  system: string,
  decoy: typeof DECOY_FUNCTIONS[number],
): string {
  switch (system) {
    case "salp":
      return `[ANC:${decoy.id}]`;
    case "salp-short":
      return `[ANC:${shortId(gt, decoy.id)}]`;
    case "wikilinks":
      return `^${decoy.id.replaceAll(":", "-")}`;
    case "zettelkasten":
      return `**UID: ${decoy.uid}** ${decoy.id}`;
    case "heading-refs":
    case "native":
      return `## ${decoy.heading}`;
    default:
      return decoy.id;
  }
}

function implementationRefsBlock(system: string): string {
  const decoys = DECOY_FUNCTIONS.map((decoy) => `- ${decoyRef(system, decoy)}`)
    .join("\n");
  return `\n\nImplementation references:\n- ${targetRef(system)}\n${decoys}\n`;
}

function decoyCodeBlock(system: string): string {
  return DECOY_FUNCTIONS.map((decoy) =>
    decoy.code.replace("ANCHOR_MARKER", anchorMarker(system, decoy))
  ).join("");
}

export const experiment: Experiment = {
  id: "anchor-systems-rag-noise",
  name: "Anchor Systems — RAG Noise Resistance (Bench 7)",
  description:
    "Measures whether anchor formats help an agent follow documentation references " +
    "to the correct implementation amid marker-bearing decoys and semantically " +
    "similar noise. Agent starts from password.md, not the code file. Pass if the " +
    "agent names check_strength, explains the policy, and shows the reference path.",

  axes: {
    system: ANCHOR_SYSTEMS,
    noise_count: [3, 6, 9] as const,
  },

  defaults: { reps: 5, ide: "opencode" },

  async setupCell(cell: Cell, ctx) {
    const system = String(cell.axes.system);
    const noiseCount = Number(cell.axes.noise_count);

    await writeFixtures(ctx.sandboxPath, system);

    const passwordPath = join(ctx.sandboxPath, "password.md");
    const passwordDoc = await Deno.readTextFile(passwordPath);
    await Deno.writeTextFile(
      passwordPath,
      passwordDoc + implementationRefsBlock(system),
    );

    // Insert marker-bearing decoys before the target, then append unanchored noise.
    const utilsPath = join(ctx.sandboxPath, "password_utils.py");
    const current = await Deno.readTextFile(utilsPath);
    const withDecoys = current.replace(
      "\n\ndef check_strength",
      `${decoyCodeBlock(system)}\n\ndef check_strength`,
    );
    const extra = NOISE_FUNCTIONS.slice(0, noiseCount).join("");
    await Deno.writeTextFile(utilsPath, withDecoys + extra);
  },

  query(cell: Cell) {
    const noiseCount = Number(cell.axes.noise_count);
    return (
      `Start from password.md. Follow the documentation references to identify ` +
      `the Python function that enforces the registration password strength policy. ` +
      `There are ${noiseCount} extra password-check functions and multiple plausible ` +
      `implementation references; do not choose by function name alone. ` +
      `Respond with ONLY JSON: {"path": ["..."], "function_name": "...", "rule": "...", "why_not_decoys": "..."}.`
    );
  },

  judgePrompt(cell: Cell) {
    const system = String(cell.axes.system);
    const noiseCount = Number(cell.axes.noise_count);
    const q = experiment.query(cell);
    const noiseNames = NT.similar_functions
      .concat(
        NOISE_FUNCTIONS.slice(0, noiseCount).map((_, i) =>
          [
            "check_entropy",
            "check_leaked",
            "check_sequential",
            "check_repetition",
            "check_keyboard_patterns",
            "check_unicode_safety",
            "check_max_length",
            "check_whitespace",
            "check_null_bytes",
          ][i]
        ),
      )
      .join(", ");
    const targetSurface = surfaceId(gt, system, NT.anchor_id);
    const decoyNames = DECOY_FUNCTIONS.map((d) => d.id).join(", ");

    return {
      rule:
        `The agent started from password.md in a "${system}" project with ${noiseCount} noise functions added. ` +
        `password.md contains multiple implementation references. The correct target reference is ${
          targetRef(system)
        }, ` +
        `which resolves to "${NT.target_function}" with target surface ID "${targetSurface}". ` +
        `Marker-bearing decoy anchors are: ${decoyNames}. ` +
        `Its rule: "${
          gt.anchors.find((a) => a.id === NT.anchor_id)?.description ?? ""
        }". ` +
        `The noise functions are: ${noiseNames}. ` +
        `Pass if: (a) the agent names "${NT.target_function}" as the implementation, ` +
        `(b) the agent's description of the rule is accurate (≥12 chars, ≥1 digit, ≥1 upper, ≥1 special). ` +
        `(c) the agent gives a reference path starting at password.md and ending at the target code anchor/function. ` +
        `Fail if the agent names any decoy/noise function as the primary answer, ` +
        `does not show a password.md -> implementation path, or chooses by local function-name matching only.`,
      userQuery: q,
    };
  },

  headline(report: ExperimentReport) {
    const rows: string[] = [];
    const systems = report.axes.system?.map(String) ?? ANCHOR_SYSTEMS;
    for (const sys of systems) {
      const trials = report.trials.filter(
        (t) =>
          t.cell.axes.system === sys && Number(t.cell.axes.noise_count) === 9,
      );
      const rate = trials.length
        ? trials.filter((t) => t.pass).length / trials.length
        : 0;
      rows.push(`${sys}=${(rate * 100).toFixed(0)}%`);
    }
    return `RAG noise (count=9) adherence — ${
      rows.join(" / ")
    } (n=${report.reps}/cell)`;
  },
};
