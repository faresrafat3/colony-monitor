/**
 * FakeAgentRuntime (mission §11): deterministic, scripted, zero-I/O agent
 * runtime. Never calls a model, never touches the network, never executes
 * shell commands, never reads arbitrary files.
 */
import { KernelError } from "../domain/errors/kernel-error.js";
import type { AgentRuntime, AgentInvocation, AgentInvocationRecord, InvocationOutcomeClass } from "../ports/agent-runtime.js";
import type { ArtifactContent } from "../domain/artifacts/artifact.js";
export type ScriptedResponse = {
    kind: "success";
    artifact: ArtifactContent;
    artifactType: string;
} | {
    kind: "malformed_output";
    detail: Record<string, string | number | boolean>;
} | {
    kind: "timeout";
} | {
    kind: "refusal";
    detail: Record<string, string | number | boolean>;
} | {
    kind: "infrastructure_failure";
    detail: Record<string, string | number | boolean>;
};
export declare class FakeAgentRuntime implements AgentRuntime {
    private readonly script;
    private cursor;
    readonly history: {
        invocation: AgentInvocation;
        outcomeClass: InvocationOutcomeClass | "capability_denied";
        responseFingerprint: string | null;
    }[];
    constructor(script: readonly ScriptedResponse[]);
    invoke(request: AgentInvocation): {
        ok: true;
        value: AgentInvocationRecord;
    } | {
        ok: false;
        error: KernelError;
    };
    /** Duplicate idempotent invocation: same key returns the same fingerprint. */
    fingerprintForDuplicate(request: AgentInvocation): string;
    private fingerprint;
    private deny;
    private fail;
}
