// The dashboard's only product claim is behavioral: a real mission reaches
// CLOSED, the illegal transition is denied and durably recorded, and replay
// rebuilds the same event-log hash. build.mjs --check proves freshness only —
// a kernel API change could keep the bytes "current" and break the demo at
// runtime. These tests run the same driver the browser imports.
import test from "node:test";
import assert from "node:assert/strict";
import { planSteps, runMission, lastKernel } from "../public/colony-driver.mjs";

async function collect() {
  const steps = [];
  for await (const step of runMission()) steps.push(step);
  return steps;
}

test("one mission reaches CLOSED with exactly one durable denial", async () => {
  const steps = await collect();
  assert.equal(steps.length, planSteps().length,
    "the progress script and the yielded stream must agree");

  const denials = steps.filter((s) => s.kind === "denied");
  assert.equal(denials.length, 1, "the illegal transition must be the only denial");
  assert.match(denials[0].detail, /KernelError\[[A-Z_]+\]/, denials[0].detail);

  const final = steps.at(-1);
  assert.equal(final.stage, "CLOSED");
  assert.ok(final.stateVersion > 0);
  assert.match(final.label, /Replay hash identical/, final.label);

  const rejections = lastKernel.storage.listRejections();
  assert.ok(rejections.ok);
  assert.equal(rejections.value.length, 1, "the denial must survive in the ledger");
});

test("two runs produce the same mission, byte for byte", async () => {
  const first = await collect();
  const second = await collect();
  assert.deepEqual(second, first);
});
