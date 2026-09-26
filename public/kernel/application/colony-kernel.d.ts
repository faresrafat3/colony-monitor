import type { EventEnvelope } from "../domain/events/envelope.js";
import type { MissionState } from "../domain/mission/mission-state.js";
import type { ColonyStorage } from "../ports/storage.js";
import type { Clock, IdGenerator, TelemetrySink } from "../ports/kernel-ports.js";
import type { AgentRuntime, AgentInvocation, AgentInvocationRecord } from "../ports/agent-runtime.js";
import type { RoleRegistry } from "../domain/capabilities/registry.js";
import type { ArtifactContent, ArtifactType, ArtifactManifest } from "../domain/artifacts/artifact.js";
import type { ApprovalRequest, ApprovalRecord, ApprovalPurpose, ArtifactSubjectRef } from "../domain/approvals/approval.js";
import type { ResourceClass, BudgetLedger } from "../domain/budgets/ledger.js";
import { ledgerView } from "../domain/budgets/ledger.js";
import type { RevisionRequest, RevisionIssueCode } from "../domain/revisions/revision.js";
export interface KernelServices {
    storage: ColonyStorage;
    clock: Clock;
    ids: IdGenerator;
    telemetry: TelemetrySink;
    runtime: AgentRuntime;
    roles?: RoleRegistry;
}
export declare class ColonyKernel {
    readonly storage: ColonyStorage;
    readonly clock: Clock;
    readonly ids: IdGenerator;
    readonly telemetry: TelemetrySink;
    readonly runtime: AgentRuntime;
    readonly roles: RoleRegistry;
    constructor(services: KernelServices);
    private now;
    private envelope;
    private current;
    private actorFor;
    /**
     * One home for the per-command transition entry (ARCHITECTURE.md, "Control flow
     * of one command": … → telemetry record → return). A command that commits
     * through {@link commit} gets this for free; a command that must commit through
     * `storage.atomicApply` itself calls it explicitly. Telemetry is a derived view
     * and never authorizes anything (v0.1 §15), so emitting it cannot change a gate.
     */
    private noteTransition;
    /** The approval-gate entry both human gates emit once their request committed. */
    private noteApprovalRequested;
    /** Commit an event batch atomically; telemetry + durable rejection on failure. */
    private commit;
    createMission(input: {
        title: string;
        correlationId?: string;
    }): {
        missionId: string;
        state: MissionState;
    };
    abortMission(missionId: string, reason: string): MissionState;
    failMission(missionId: string, reason: string): MissionState;
    private stage;
    startMission(missionId: string): MissionState;
    completePolicyScreen(missionId: string, verdict: "allowed" | "rejected" | "unenforceable", detail?: Record<string, unknown>): MissionState;
    startRecon(missionId: string, branch: string): MissionState;
    completeRecon(missionId: string, artifactId: string): MissionState;
    proposePlan(missionId: string, planSha: string): MissionState;
    challengePlan(missionId: string, artifactId: string): MissionState;
    revisePlan(missionId: string, newPlanSha: string, newEvidence: string): MissionState;
    /**
     * One home for the approval-request shape both human gates issue. Only the
     * purpose and the guarded exit differ; every other field is N1-invariant.
     * `approvalSubjectHash` covers all of it, so callers must not mutate the result.
     */
    private openApprovalRequest;
    /** One home for the record shape both approval-decision paths store. */
    private buildApprovalRecord;
    requestPlanApproval(input: {
        missionId: string;
        artifactSubjects: readonly ArtifactSubjectRef[];
        requestedByRole: {
            roleId: string;
            roleVersion: number;
        };
        ttlMs: number;
    }): ApprovalRequest;
    /** Captain decision (deterministic test authority in M1A). */
    recordApprovalDecision(input: {
        approvalRequestId: string;
        decision: "APPROVED" | "REJECTED";
        decidedBy: string;
        reason?: string;
        requestedChange?: boolean;
    }): ApprovalRecord;
    /** Record-level decision without a transition event (test/audit seam). */
    recordApprovalDecisionRaw(input: {
        approvalRequestId: string;
        decision: "APPROVED" | "REJECTED";
        decidedBy: string;
        reason?: string;
    }): ApprovalRecord;
    finalizeArtifact(input: {
        missionId: string;
        roleId: string;
        artifactType: ArtifactType;
        content: ArtifactContent;
        artifactId?: string;
        slot?: "plan" | "candidate" | "verification";
    }): {
        manifest: ArtifactManifest;
        contentSha256: string;
    };
    setBudgetLimit(missionId: string, resourceClass: ResourceClass, immutableLimit: number): void;
    ledger(missionId: string, resourceClass: ResourceClass): BudgetLedger;
    reserveBudget(missionId: string, resourceClass: ResourceClass, amount: number): BudgetLedger;
    settleBudget(missionId: string, resourceClass: ResourceClass, amount: number): BudgetLedger;
    releaseBudget(missionId: string, resourceClass: ResourceClass, amount: number): BudgetLedger;
    /** Top-up requires a consumed BUDGET_TOPUP ApprovalRecord (N4 req 3, 11). */
    applyBudgetTopUp(input: {
        missionId: string;
        resourceClass: ResourceClass;
        amount: number;
        approvalRecordId: string;
    }): BudgetLedger;
    /** Forbidden limit mutation attempt → INTEGRITY_FAILURE + durable event (N4 req 2). */
    attemptLimitMutation(missionId: string, resourceClass: ResourceClass, newLimit: number): never;
    requestRevision(input: {
        missionId: string;
        sourceArtifactId: string;
        sourceArtifactHash: string;
        requestedByRole: string;
        issueCode: RevisionIssueCode;
        severity: "content" | "infrastructure";
        evidence: readonly {
            artifactId: string;
            contentSha256: string;
        }[];
        requiredChange: string;
    }): RevisionRequest;
    completeRevision(missionId: string, newEvidence: string): MissionState;
    escalateToHumanReview(missionId: string, incident: Record<string, unknown>): MissionState;
    resumeFromHumanReview(missionId: string, decidedBy: string, newEvidence: string): MissionState;
    completeImplementation(missionId: string): MissionState;
    completeVerification(missionId: string): MissionState;
    completeTechnicalReview(missionId: string): MissionState;
    completeDocumentation(missionId: string): MissionState;
    completeFinalPolicyGate(missionId: string, verdict: "allowed" | "rejected" | "unenforceable"): MissionState;
    requestPackageApproval(input: {
        missionId: string;
        artifactSubjects: readonly ArtifactSubjectRef[];
        requestedByRole: {
            roleId: string;
            roleVersion: number;
        };
        ttlMs: number;
    }): ApprovalRequest;
    /** E30: local close from READY_TO_PUBLISH — no public action (A33). */
    closeMission(missionId: string): MissionState;
    invokeAgent(request: Omit<AgentInvocation, "attempt" | "maximumAttempts"> & {
        attempt?: number;
    }): AgentInvocationRecord;
    getMission(missionId: string): MissionState | undefined;
    getEvents(missionId: string): readonly EventEnvelope[];
    getLedgerView(missionId: string, resourceClass: ResourceClass): ReturnType<typeof ledgerView>;
    /** Recovery: replay reconstructs identical state (A24). */
    replay(missionId: string): MissionState;
    eventLogHash(missionId: string): string;
}
export type { ApprovalPurpose };
