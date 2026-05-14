import { assert, assertEquals } from "@std/assert";
import { dirname, fromFileUrl, join } from "@std/path";
import { experiment as boundaryExperiment } from "./boundary.ts";
import { experiment as mappingExperiment } from "./mapping.ts";
import { experiment as multiHopExperiment } from "./multi-hop.ts";
import {
  loadGroundTruth,
  surfaceId,
  writeCorruptedFixtures,
} from "./shared.ts";

const here = dirname(fromFileUrl(import.meta.url));

Deno.test("anchor-systems: ground truth references match SALP fixture refs", async () => {
  const gt = loadGroundTruth();
  const salpDir = join(here, "fixtures", "salp");
  const actual: string[] = [];

  for await (const entry of Deno.readDir(salpDir)) {
    if (!entry.isFile) continue;
    const content = await Deno.readTextFile(join(salpDir, entry.name));
    for (const match of content.matchAll(/\[REF:([^\]| ]+)/g)) {
      actual.push(`${entry.name}\t${match[1]}`);
    }
  }

  const expected = gt.references.map((r) => `${r.source_file}\t${r.ref_id}`);
  assertEquals(actual.sort(), expected.sort());
});

Deno.test("anchor-systems: mapping judge uses system surface identifiers", () => {
  const nativeRule = mappingExperiment.judgePrompt({
    axes: { system: "native" },
    trial: 0,
  }).rule;
  const zettelRule = mappingExperiment.judgePrompt({
    axes: { system: "zettelkasten" },
    trial: 0,
  }).rule;

  assert(nativeRule.includes("20 anchors, 31 references"));
  assert(nativeRule.includes("session.md#session-timeout-policy"));
  assert(zettelRule.includes("202605121001"));
});

Deno.test("anchor-systems: boundary judge requires inclusive IoU", () => {
  const rule = boundaryExperiment.judgePrompt({
    axes: { system: "salp" },
    trial: 0,
  }).rule;

  assert(rule.includes("intersection_len"));
  assert(rule.includes("union_len"));
  assert(rule.includes("IoU = intersection_len / union_len"));
});

Deno.test("anchor-systems: multi-hop judge lists expected anchor chain", () => {
  const gt = loadGroundTruth();
  const rule = multiHopExperiment.judgePrompt({
    axes: { system: "wikilinks", target: "deep" },
    trial: 0,
  }).rule;

  assert(rule.includes(surfaceId(gt, "wikilinks", "session:otp-ttl")));
  assert(rule.includes(surfaceId(gt, "wikilinks", "rate:otp-window")));
  assert(rule.includes("correct file traversal"));
});

Deno.test("anchor-systems: corrupted fixtures are system-specific", async () => {
  const nativeDir = await Deno.makeTempDir({ prefix: "anchor-native-" });
  const salpDir = await Deno.makeTempDir({ prefix: "anchor-salp-" });
  try {
    await writeCorruptedFixtures(nativeDir, "native");
    await writeCorruptedFixtures(salpDir, "salp");

    const nativeOauth = await Deno.readTextFile(join(nativeDir, "oauth.md"));
    const nativePassword = await Deno.readTextFile(
      join(nativeDir, "password.md"),
    );
    const salpOauth = await Deno.readTextFile(join(salpDir, "oauth.md"));
    const salpPassword = await Deno.readTextFile(join(salpDir, "password.md"));

    assert(nativeOauth.includes("api.md#oauth-callback"));
    assert(nativePassword.includes("## Legacy MD5 Hash"));
    assert(!nativeOauth.includes("[REF:"));
    assert(!nativePassword.includes("[ANC:"));

    assert(salpOauth.includes("[REF:api:oauth-callback"));
    assert(salpPassword.includes("[ANC:legacy:md5-hash]"));
  } finally {
    await Deno.remove(nativeDir, { recursive: true });
    await Deno.remove(salpDir, { recursive: true });
  }
});
