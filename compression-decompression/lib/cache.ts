import { encodeHex } from "@std/encoding/hex";
import type { CompressionScenario, JudgeReport, RoundtripMetrics } from "./types.ts";

const CACHE_DIR = "cache";

export interface CacheEntry {
  key: string;
  compressed: string;
  restored: string;
  metrics: RoundtripMetrics;
  judge: JudgeReport;
  createdAt: string;
}

export async function cacheKey(scenario: CompressionScenario): Promise<string> {
  const sourceText = await Deno.readTextFile(scenario.sourcePath);
  const compressPrompt = await Deno.readTextFile(scenario.compress.promptPath);
  const decompressPrompt = await Deno.readTextFile(scenario.decompress.promptPath);
  const judge = scenario.judge ?? { adapter: "auto", model: "auto" };

  const tuple = [
    scenario.id,
    await sha256(sourceText),
    `${scenario.compress.model.adapter}:${scenario.compress.model.model}`,
    await sha256(compressPrompt),
    `${scenario.decompress.model.adapter}:${scenario.decompress.model.model}`,
    await sha256(decompressPrompt),
    `${judge.adapter}:${judge.model}`,
  ].join("|");
  return await sha256(tuple);
}

async function sha256(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const buf = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buf).set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return encodeHex(new Uint8Array(digest));
}

export async function readCache(key: string): Promise<CacheEntry | null> {
  try {
    const raw = await Deno.readTextFile(`${CACHE_DIR}/${key}.json`);
    return JSON.parse(raw) as CacheEntry;
  } catch {
    return null;
  }
}

export async function writeCache(entry: CacheEntry): Promise<void> {
  await Deno.mkdir(CACHE_DIR, { recursive: true });
  await Deno.writeTextFile(
    `${CACHE_DIR}/${entry.key}.json`,
    JSON.stringify(entry, null, 2),
  );
}
