/**
 * Returns the ANSI code if colors are enabled, empty string otherwise.
 * Disables colors when NO_COLOR is set (via Deno.noColor) or when running
 * inside Claude Code (CLAUDECODE=1).
 */
export function ansi(code: string): string {
  if (Deno.noColor) return "";
  if (Deno.env.get("CLAUDECODE") === "1") return "";
  return code;
}
