/**
 * colony-driver.mjs — drives the real colony-kernel through one mission, live
 * in the browser, with a deliberate illegal-command moment so the dashboard can
 * show default-deny working (rejections are evidence, too).
 *
 * Contracts (verified against dist d.ts + js):
 *  - commands return MissionState directly and THROW KernelError on denial;
 *  - denials are recorded durably via storage.listRejections() without mutating
 *    mission state (A04);
 *  - replay(missionId) rebuilds state; eventLogHash(missionId) is the integrity
 *    digest compared before/after.
 */
import { ColonyKernel, InMemoryColonyStorage, DeterministicClock, DeterministicIdGenerator, InMemoryTelemetry, FakeAgentRuntime } from "./kernel/index.js";

const SEED = "colony-monitor-seed-001";
const FIXED_INSTANT = new Date(Date.UTC(2026, 8, 26, 12, 0, 0)); // fixed clock → deterministic run

// The kernel instance of the most recent runMission() call (ESM live binding).
// Exported for inspection tooling (verify-facts) — never used for control flow.
export let lastKernel = null;

function makeKernel() {
  return new ColonyKernel({
    storage: new InMemoryColonyStorage(),
    clock: new DeterministicClock(FIXED_INSTANT),
    ids: new DeterministicIdGenerator(SEED),
    telemetry: new InMemoryTelemetry(),
    runtime: new FakeAgentRuntime(script()),
  });
}

function script() {
  // One success response per invocation, forever (bounded by the number of calls).
  const out = [];
  for (let i = 0; i < 16; i++) {
    out.push({
      kind: "success",
      artifact: { fields: { note: "deterministic scripted agent output", step: i } },
      artifactType: "generic",
    });
  }
  return out;
}

function snap(kernel, missionId, label, kind, detail) {
  const state = kernel.getMission(missionId);
  const events = kernel.getEvents(missionId);
  const last = events[events.length - 1] ?? null;
  return {
    label,
    kind,
    detail,
    stage: state?.stage ?? null,
    stateVersion: state?.stateVersion ?? null,
    event: last ? { type: last.eventType, seq: last.missionSequence, hash: String(last.payloadSha256).slice(0, 12) } : null,
  };
}

/** Run a kernel command expected to succeed; throw-through if it denies. */
function must(kernel, fn, missionId, label, detail) {
  const state = fn();
  return snap(kernel, missionId, label, "ok", detail ?? "");
}

/** Run a kernel command expected to be DENIED; capture the durable rejection. */
function expectDeny(kernel, fn, label) {
  try {
    fn();
    return { label, kind: "denied", detail: "unexpectedly ACCEPTED", stage: null, stateVersion: null, event: null };
  } catch (e) {
    const code = e?.code ?? "UNKNOWN";
    const rejections = kernel.storage.listRejections();
    const count = rejections.ok ? rejections.value.length : "?";
    return { label, kind: "denied", detail: `KernelError[${code}] — durably recorded (rejection #${count})`, stage: null, stateVersion: null, event: null };
  }
}

export function planSteps() {
  return [
    "Create mission",
    "Policy screen (allow)",
    "Recon agent + artifact",
    "⛔ Illegal: RECONNAISSANCE → IMPLEMENTATION_COMPLETED (no plan)",
    "Plan agent + proposal (content-hash pinned)",
    "Challenge agent (reviewer)",
    "✋ Human approval: plan",
    "Implementation + verification",
    "Technical review + docs + final gate",
    "✋ Human approval: package",
    "Close mission",
    "Replay: rebuild state from event log",
    "Compare event-log hashes",
  ];
}

export async function* runMission() {
  const kernel = makeKernel();
  lastKernel = kernel;

  // 1. create
  const created = kernel.createMission({ title: "Refill prescription across SMS → RCS → email" });
  const missionId = created.missionId;
  yield snap(kernel, missionId, "Mission created", "ok", `missionId=${missionId}`);

  // 2. policy
  must(kernel, () => kernel.startMission(missionId), missionId, "Mission started", "");
  yield must(kernel, () => kernel.completePolicyScreen(missionId, "allowed", { policyVersion: "v0.1.1" }), missionId, "Policy screen: allowed", "policyVersion=v0.1.1");

  // 3. recon
  const recon = kernel.invokeAgent({
    invocationId: kernel.ids.nextId("inv"),
    missionId,
    roleId: "first-mate",
    roleVersion: 1,
    capabilityId: "conduct_reconnaissance",
    input: { objective: "recon prescription refill flow", inputArtifactIds: [], parameters: {} },
    idempotencyKey: `mission:${missionId}:recon`,
  });
  const reconArtifact = kernel.finalizeArtifact({
    missionId,
    roleId: "first-mate",
    artifactType: "recon_brief",
    content: recon.artifact ?? { fields: { note: "recon" } },
    slot: undefined,
  });
  yield must(kernel, () => kernel.completeRecon(missionId, reconArtifact.manifest.artifactId), missionId, "Recon complete", `artifact=${reconArtifact.manifest.artifactId}`);

  // 4. deliberate denial — jumping to IMPLEMENTATION_COMPLETED with no plan
  yield expectDeny(kernel, () => kernel.completeImplementation(missionId), "⛔ Illegal jump: RECONNAISSANCE → IMPLEMENTATION (no plan)");

  // 5. plan
  const plan = kernel.invokeAgent({
    invocationId: kernel.ids.nextId("inv"), missionId,
    roleId: "first-mate", roleVersion: 1, capabilityId: "propose_plan",
    input: { objective: "plan omnichannel refill", inputArtifactIds: [reconArtifact.manifest.artifactId], parameters: {} },
    idempotencyKey: `mission:${missionId}:plan`,
  });
  const planArtifact = kernel.finalizeArtifact({
    missionId, roleId: "first-mate", artifactType: "plan",
    content: plan.artifact ?? { fields: { steps: ["receive SMS", "offer RCS pharmacy picker", "email dosage"] } },
    slot: "plan",
  });
  yield must(kernel, () => kernel.proposePlan(missionId, planArtifact.contentSha256), missionId, "Plan proposed (content-hash pinned)", `sha=${planArtifact.contentSha256.slice(0, 12)}…`);

  // 6. challenge
  const challenge = kernel.invokeAgent({
    invocationId: kernel.ids.nextId("inv"), missionId,
    roleId: "reviewer", roleVersion: 1, capabilityId: "challenge_plan",
    input: { objective: "challenge plan", inputArtifactIds: [planArtifact.manifest.artifactId], parameters: {} },
    idempotencyKey: `mission:${missionId}:challenge`,
  });
  const challengeArtifact = kernel.finalizeArtifact({
    missionId, roleId: "reviewer", artifactType: "plan_challenge",
    content: challenge.artifact ?? { fields: { objections: [] } },
  });
  yield must(kernel, () => kernel.challengePlan(missionId, challengeArtifact.manifest.artifactId), missionId, "Plan challenged by reviewer", `artifact=${challengeArtifact.manifest.artifactId}`);

  // 7. gate 1 — human plan approval
  const planRequest = kernel.requestPlanApproval({
    missionId,
    artifactSubjects: [{
      artifactId: planArtifact.manifest.artifactId,
      artifactType: "plan",
      artifactSchemaVersion: 1,
      contentSha256: planArtifact.contentSha256,
      finalizedAt: planArtifact.manifest.finalizedAt,
    }],
    requestedByRole: { roleId: "first-mate", roleVersion: 1 },
    ttlMs: 60_000,
  });
  yield must(
    kernel,
    () => kernel.recordApprovalDecision({ approvalRequestId: planRequest.approvalRequestId, decision: "APPROVED", decidedBy: "captain", reason: "live demo approval" }),
    missionId,
    "✋ Human approval: PLAN — APPROVED (content-addressed, consumed ≤1)",
    `request=${planRequest.approvalRequestId}`
  );

  // 8. implementation + verification
  const impl = kernel.invokeAgent({
    invocationId: kernel.ids.nextId("inv"), missionId,
    roleId: "craftsman", roleVersion: 1, capabilityId: "produce_implementation_artifact",
    input: { objective: "implement", inputArtifactIds: [planArtifact.manifest.artifactId], parameters: {} },
    idempotencyKey: `mission:${missionId}:impl`,
  });
  const candidate = kernel.finalizeArtifact({
    missionId, roleId: "craftsman", artifactType: "implementation_candidate",
    content: { fields: { patch: "omnichannel refill handoff", language: "typescript" } },
    slot: "candidate",
  });
  const verify = kernel.invokeAgent({
    invocationId: kernel.ids.nextId("inv"), missionId,
    roleId: "verifier", roleVersion: 1, capabilityId: "produce_verification_artifact",
    input: { objective: "verify candidate", inputArtifactIds: [candidate.manifest.artifactId], parameters: {} },
    idempotencyKey: `mission:${missionId}:verify`,
  });
  const verificationArtifact = kernel.finalizeArtifact({
    missionId, roleId: "verifier", artifactType: "verification_report",
    content: { fields: { tests: ["handoff-sms-rcs-email"], result: "pass" } },
    slot: "verification",
  });
  must(kernel, () => kernel.completeImplementation(missionId), missionId, "Implementation complete", "");
  yield must(kernel, () => kernel.completeVerification(missionId), missionId, "Verification complete", `candidate=${candidate.contentSha256.slice(0, 12)}…`);

  // 9. review + docs + final gate
  const review = kernel.invokeAgent({
    invocationId: kernel.ids.nextId("inv"), missionId,
    roleId: "reviewer", roleVersion: 1, capabilityId: "produce_review_artifact",
    input: { objective: "technical review", inputArtifactIds: [candidate.manifest.artifactId, verificationArtifact.manifest.artifactId], parameters: {} },
    idempotencyKey: `mission:${missionId}:review`,
  });
  kernel.finalizeArtifact({
    missionId, roleId: "reviewer", artifactType: "technical_review",
    content: review.artifact ?? { fields: { verdict: "pass" } },
  });
  must(kernel, () => kernel.completeTechnicalReview(missionId), missionId, "Technical review complete", "");
  kernel.finalizeArtifact({
    missionId, roleId: "first-mate", artifactType: "documentation_bundle",
    content: { fields: { changelog: "omnichannel refill" } },
  });
  must(kernel, () => kernel.completeDocumentation(missionId), missionId, "Documentation complete", "");
  yield must(kernel, () => kernel.completeFinalPolicyGate(missionId, "allowed"), missionId, "Final policy gate: allowed", "no publication state entered (A33)");

  // 10. gate 2 — package approval over ALL artifacts
  const artifacts = kernel.storage.listArtifacts(missionId);
  if (!artifacts.ok) throw artifacts.error;
  const packageRequest = kernel.requestPackageApproval({
    missionId,
    artifactSubjects: artifacts.value.map((a) => ({
      artifactId: a.artifactId, artifactType: a.artifactType,
      artifactSchemaVersion: 1, contentSha256: a.contentSha256, finalizedAt: a.finalizedAt,
    })),
    requestedByRole: { roleId: "first-mate", roleVersion: 1 },
    ttlMs: 60_000,
  });
  yield must(
    kernel,
    () => kernel.recordApprovalDecision({ approvalRequestId: packageRequest.approvalRequestId, decision: "APPROVED", decidedBy: "captain", reason: "live demo package approval" }),
    missionId,
    "✋ Human approval: PACKAGE — APPROVED",
    `artifacts=${artifacts.value.length}`
  );

  // 11. close
  yield must(kernel, () => kernel.closeMission(missionId), missionId, "Mission CLOSED", `stateVersion=${kernel.getMission(missionId).stateVersion}`);

  // 12–13. replay + integrity comparison
  const hashBefore = kernel.eventLogHash(missionId);
  const replayed = kernel.replay(missionId);
  const hashAfter = kernel.eventLogHash(missionId);
  const same = hashBefore === hashAfter;
  yield {
    label: same ? "✅ Replay hash identical — state reconstructed byte-true" : "❌ HASH MISMATCH",
    kind: same ? "ok" : "denied",
    detail: `hash=${hashBefore.slice(0, 24)}…  stage=${replayed.stage}  version=${replayed.stateVersion}`,
    stage: replayed.stage,
    stateVersion: replayed.stateVersion,
    event: null,
  };
}
