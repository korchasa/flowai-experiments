import { join } from "@std/path";

const TMP_DIR = join(Deno.cwd(), "tmp");

/**
 * Writes content to a file in the specified directory. Returns the absolute path.
 * Used to persist prompt/evidence data in run directories for debugging.
 */
export async function writeRunFile(
  dir: string,
  name: string,
  content: string,
): Promise<string> {
  const filePath = join(dir, name);
  await Deno.writeTextFile(filePath, content);
  return filePath;
}

/**
 * Creates a temporary directory in ./tmp with a unique name.
 * Cleans up old directories if needed.
 */
export async function createTempDir(prefix = "bench"): Promise<string> {
  await Deno.mkdir(TMP_DIR, { recursive: true });
  const uniqueId = crypto.randomUUID().slice(0, 8);
  const tempDir = join(TMP_DIR, `${prefix}-${uniqueId}`);
  await Deno.mkdir(tempDir, { recursive: true });
  return tempDir;
}
