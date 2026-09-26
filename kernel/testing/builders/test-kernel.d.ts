/** Shared deterministic test kit: kernel builder + role/mission fixtures. */
import { ColonyKernel } from "../../application/colony-kernel.js";
import { InMemoryColonyStorage } from "../../adapters/in-memory-storage.js";
import type { SteppingClock } from "../../adapters/kernel-adapters.js";
import { InMemoryTelemetry } from "../../adapters/kernel-adapters.js";
import { FakeAgentRuntime, type ScriptedResponse } from "../../adapters/fake-agent-runtime.js";
import type { ApprovalRequest } from "../../domain/approvals/approval.js";
export declare const FIXED_INSTANT: Date;
export declare const TEST_SEED = "colony-kernel-test-seed";
export interface TestKernel {
    kernel: ColonyKernel;
    storage: InMemoryColonyStorage;
    telemetry: InMemoryTelemetry;
    runtime: FakeAgentRuntime;
}
export declare function buildTestKernel(options?: {
    script?: ScriptedResponse[];
    seed?: string;
    clock?: SteppingClock;
}): TestKernel;
/** Drive a mission to AWAITING_PLAN_APPROVAL with a bound plan artifact. */
export declare function toPlanGate(k: TestKernel, missionTitle?: string): {
    missionId: string;
    planArtifactId: string;
    planSha: string;
};
/** Drive a mission past gate 1 into IMPLEMENTATION with a bound candidate. */
export declare function toImplementation(k: TestKernel): {
    missionId: string;
    planArtifactId: string;
    planSha: string;
    candidateArtifactId: string;
    candidateSha: string;
};
/**
 * Drive a mission to AWAITING_PUBLISH_APPROVAL and issue the package request.
 * Binds to a real subject set, so the gate's request is bound to what the
 * mission actually produced (no hand-built subjects).
 */
export declare function toPackageGate(k: TestKernel): {
    missionId: string;
    request: ApprovalRequest;
};
