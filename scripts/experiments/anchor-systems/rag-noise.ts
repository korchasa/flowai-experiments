/**
 * Experiment: anchor-systems — rag-noise variant (Bench 7).
 *
 * RAG Noise Resistance: password_utils.py contains one anchored function
 * (check_strength, anchor sec:password-strength) and N "noise" functions
 * that are semantically similar but carry no anchor.
 *
 * The agent must identify the ANCHORED function by its marker — not by
 * guessing from function names alone. Tests whether explicit anchor tokens
 * help the agent focus amid distractor context.
 *
 * Axes:  system × noise_count (3 / 6 / 9 extra noise functions).
 * Reps:  5.
 * Metric: pass if the agent correctly identifies check_strength (and only
 *         check_strength) as the implementation of the anchored rule,
 *         without naming any of the noise functions as the answer.
 */

import type { Cell, Experiment, ExperimentReport } from "../lib/types.ts";
import { join } from "@std/path";
import { loadGroundTruth, writeFixtures } from "./shared.ts";

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

function anchorRef(system: string): string {
  switch (system) {
    case "salp":
      return "[ANC:sec:password-strength]";
    case "salp-short":
      return "[ANC:password-strength]";
    case "wikilinks":
      return "^sec-password-strength";
    case "zettelkasten":
      return "UID 202605121011";
    case "native":
      return "## Password Strength Check (in password_utils.py)";
    default:
      return NT.anchor_id;
  }
}

export const experiment: Experiment = {
  id: "anchor-systems-rag-noise",
  name: "Anchor Systems — RAG Noise Resistance (Bench 7)",
  description:
    "Measures whether anchor tokens help an agent focus on the correct " +
    "function amid semantically similar noise. password_utils.py contains " +
    "one anchored function (check_strength) and N noise functions with no " +
    "anchor. Agent must identify check_strength by its anchor marker, " +
    "not by semantic similarity alone. Pass if the agent names check_strength " +
    "and does not name any noise function as the primary implementation.",

  axes: {
    system: [
      "native",
      "wikilinks",
      "zettelkasten",
      "salp",
      "salp-short",
    ] as const,
    noise_count: [3, 6, 9] as const,
  },

  defaults: { reps: 5, ide: "claude" },

  async setupCell(cell: Cell, ctx) {
    const system = String(cell.axes.system);
    const noiseCount = Number(cell.axes.noise_count);

    await writeFixtures(ctx.sandboxPath, system);

    // Append extra noise functions to password_utils.py.
    const utilsPath = join(ctx.sandboxPath, "password_utils.py");
    const extra = NOISE_FUNCTIONS.slice(0, noiseCount).join("");
    const current = await Deno.readTextFile(utilsPath);
    await Deno.writeTextFile(utilsPath, current + extra);
  },

  query(cell: Cell) {
    const system = String(cell.axes.system);
    const anchor = anchorRef(system);
    return (
      `Read password_utils.py. ` +
      `Identify which function implements the rule marked by ${anchor}. ` +
      `Explain in 2–3 sentences: (1) the name of that function, ` +
      `(2) what specific rule it enforces, ` +
      `(3) how it differs from the other password-check functions in the file.`
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

    return {
      rule:
        `The agent read password_utils.py (${system} system) with ${noiseCount} noise functions added. ` +
        `The ONLY anchored function is "${NT.target_function}" (anchor: ${
          anchorRef(system)
        }). ` +
        `Its rule: "${
          gt.anchors.find((a) => a.id === NT.anchor_id)?.description ?? ""
        }". ` +
        `The noise functions are: ${noiseNames}. ` +
        `Pass if: (a) the agent names "${NT.target_function}" as the anchored implementation, ` +
        `(b) the agent's description of the rule is accurate (≥12 chars, ≥1 digit, ≥1 upper, ≥1 special). ` +
        `Fail if the agent names any noise function as the primary answer, ` +
        `or confuses the anchored function with a neighbour.`,
      userQuery: q,
    };
  },

  headline(report: ExperimentReport) {
    const rows: string[] = [];
    for (
      const sys of ["native", "wikilinks", "zettelkasten", "salp", "salp-short"]
    ) {
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
