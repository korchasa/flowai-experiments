// Pre-flight system-health gate. Bails the runner out before each scenario
// stage if memory pressure is high enough that spawning another `claude`
// subprocess would push the host into swap-thrash and risk a WindowServer
// watchdog hang.
//
// Sources (all root-free on macOS):
//   - `vm_stat` for page accounting
//   - `sysctl hw.memsize` for total RAM
//   - `sysctl vm.swapusage` for swap occupancy
//   - load averages from `sysctl vm.loadavg`
//
// Defaults are tuned to abort BEFORE the system becomes unresponsive, not
// after. Override via env: BENCH_MIN_FREE_PCT, BENCH_MAX_SWAP_PCT,
// BENCH_MAX_LOAD_PER_CPU, BENCH_HEALTH_DISABLE=1.

export interface SystemHealth {
  totalRamBytes: number;
  availableBytes: number; // free + inactive + speculative + purgeable
  availablePct: number;
  compressorBytes: number;
  swapUsedBytes: number;
  swapTotalBytes: number;
  swapPct: number;
  load1: number;
  cpuCount: number;
  pageSize: number;
}

export interface HealthThresholds {
  minAvailablePct: number; // bail if available memory below this
  maxSwapPct: number; // bail if swap occupancy above this
  maxLoadPerCpu: number; // bail if 1-min load avg per CPU above this
}

export const DEFAULT_THRESHOLDS: HealthThresholds = {
  minAvailablePct: Number(Deno.env.get("BENCH_MIN_FREE_PCT") ?? "10"),
  maxSwapPct: Number(Deno.env.get("BENCH_MAX_SWAP_PCT") ?? "60"),
  maxLoadPerCpu: Number(Deno.env.get("BENCH_MAX_LOAD_PER_CPU") ?? "4"),
};

export class SystemUnhealthyError extends Error {
  constructor(message: string, public health: SystemHealth) {
    super(message);
    this.name = "SystemUnhealthyError";
  }
}

async function sh(cmd: string, args: string[]): Promise<string> {
  const out = await new Deno.Command(cmd, { args, stdout: "piped", stderr: "null" }).output();
  return new TextDecoder().decode(out.stdout);
}

function parseVmStat(text: string): { pageSize: number; pages: Record<string, number> } {
  // First line: "Mach Virtual Memory Statistics: (page size of 16384 bytes)"
  const sizeMatch = text.match(/page size of (\d+) bytes/);
  const pageSize = sizeMatch ? Number(sizeMatch[1]) : 4096;
  const pages: Record<string, number> = {};
  for (const line of text.split("\n").slice(1)) {
    const m = line.match(/^"?([^":]+)"?:\s+(\d+)\.?$/);
    if (m) pages[m[1].trim()] = Number(m[2]);
  }
  return { pageSize, pages };
}

function parseSwap(text: string): { total: number; used: number } {
  // "vm.swapusage: total = 2048.00M  used = 1310.75M  free = 737.25M  (encrypted)"
  const totalM = Number(text.match(/total\s*=\s*([\d.]+)M/)?.[1] ?? "0");
  const usedM = Number(text.match(/used\s*=\s*([\d.]+)M/)?.[1] ?? "0");
  return { total: totalM * 1024 * 1024, used: usedM * 1024 * 1024 };
}

export async function readHealth(): Promise<SystemHealth> {
  const [vmStatText, memSizeText, swapText, loadText, cpuText] = await Promise.all([
    sh("vm_stat", []),
    sh("sysctl", ["-n", "hw.memsize"]),
    sh("sysctl", ["-n", "vm.swapusage"]),
    sh("sysctl", ["-n", "vm.loadavg"]),
    sh("sysctl", ["-n", "hw.ncpu"]),
  ]);

  const { pageSize, pages } = parseVmStat(vmStatText);
  const totalRamBytes = Number(memSizeText.trim() || "0");

  const free = (pages["Pages free"] ?? 0) * pageSize;
  const inactive = (pages["Pages inactive"] ?? 0) * pageSize;
  const speculative = (pages["Pages speculative"] ?? 0) * pageSize;
  const purgeable = (pages["Pages purgeable"] ?? 0) * pageSize;
  const compressorBytes = (pages["Pages occupied by compressor"] ?? 0) * pageSize;

  const availableBytes = free + inactive + speculative + purgeable;
  const availablePct = totalRamBytes > 0 ? (availableBytes / totalRamBytes) * 100 : 0;

  const swap = parseSwap(swapText);
  const swapPct = swap.total > 0 ? (swap.used / swap.total) * 100 : 0;

  // vm.loadavg → "{ 5.52 26.68 17.64 }"
  const load1 = Number(loadText.match(/\{\s*([\d.]+)/)?.[1] ?? "0");
  const cpuCount = Number(cpuText.trim() || "1");

  return {
    totalRamBytes,
    availableBytes,
    availablePct,
    compressorBytes,
    swapUsedBytes: swap.used,
    swapTotalBytes: swap.total,
    swapPct,
    load1,
    cpuCount,
    pageSize,
  };
}

export function describeHealth(h: SystemHealth): string {
  const mb = (b: number) => (b / 1024 / 1024).toFixed(0);
  return [
    `available ${mb(h.availableBytes)} MB (${h.availablePct.toFixed(1)}%)`,
    `compressor ${mb(h.compressorBytes)} MB`,
    `swap ${mb(h.swapUsedBytes)}/${mb(h.swapTotalBytes)} MB (${h.swapPct.toFixed(0)}%)`,
    `load1 ${h.load1.toFixed(2)} on ${h.cpuCount} CPU (${(h.load1 / h.cpuCount).toFixed(2)}/CPU)`,
  ].join(", ");
}

/**
 * Bails out with `SystemUnhealthyError` if any threshold is breached.
 * Returns the current health snapshot otherwise.
 *
 * Set env `BENCH_HEALTH_DISABLE=1` to skip the gate (e.g. in CI sandboxes).
 */
export async function assertHealthy(
  thresholds: HealthThresholds = DEFAULT_THRESHOLDS,
  context = "",
): Promise<SystemHealth> {
  const h = await readHealth();
  if (Deno.env.get("BENCH_HEALTH_DISABLE") === "1") return h;

  const reasons: string[] = [];
  if (h.availablePct < thresholds.minAvailablePct) {
    reasons.push(
      `available memory ${h.availablePct.toFixed(1)}% < ${thresholds.minAvailablePct}%`,
    );
  }
  if (h.swapPct > thresholds.maxSwapPct) {
    reasons.push(`swap usage ${h.swapPct.toFixed(0)}% > ${thresholds.maxSwapPct}%`);
  }
  const loadPerCpu = h.load1 / Math.max(1, h.cpuCount);
  if (loadPerCpu > thresholds.maxLoadPerCpu) {
    reasons.push(
      `load avg ${loadPerCpu.toFixed(2)}/CPU > ${thresholds.maxLoadPerCpu}/CPU`,
    );
  }

  if (reasons.length > 0) {
    const msg = [
      `system unhealthy${context ? ` before ${context}` : ""}: ${reasons.join("; ")}`,
      `snapshot: ${describeHealth(h)}`,
      `override: BENCH_HEALTH_DISABLE=1 to skip; tune via BENCH_MIN_FREE_PCT, BENCH_MAX_SWAP_PCT, BENCH_MAX_LOAD_PER_CPU`,
    ].join("\n  ");
    throw new SystemUnhealthyError(msg, h);
  }
  return h;
}
