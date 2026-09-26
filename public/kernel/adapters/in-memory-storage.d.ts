/**
 * InMemoryColonyStorage (N7 contract, M1A adapter).
 * Transactional staging: readers see committed state only; atomicApply stages
 * event append + state CAS in one transaction. Unique constraints mirror what
 * a SQLite adapter must enforce: eventId, (missionId, missionSequence),
 * scope-qualified idempotencyKey, immutable artifacts, single-writer leases.
 */
import { KernelError } from "../domain/errors/kernel-error.js";
import type { ColonyStorage, StorageTransaction } from "../ports/storage.js";
import type { EventEnvelope } from "../domain/events/envelope.js";
import type { MissionState } from "../domain/mission/mission-state.js";
import type { ArtifactManifest } from "../domain/artifacts/artifact.js";
import type { ApprovalRequest, ApprovalRecord } from "../domain/approvals/approval.js";
import type { BudgetLedger, ResourceClass } from "../domain/budgets/ledger.js";
interface RejectionRecord {
    missionId: string | null;
    scope: string;
    code: string;
    detail: Record<string, unknown>;
    occurredAt: string;
}
export declare class InMemoryColonyStorage implements ColonyStorage {
    private readonly states;
    private readonly events;
    private readonly eventsByMission;
    private readonly sequences;
    private readonly idempotency;
    private readonly artifacts;
    private readonly approvalRequests;
    private readonly approvalRecords;
    private readonly recordByRequest;
    private readonly consumedApprovals;
    private readonly ledgers;
    private readonly leases;
    private readonly rejections;
    beginTransaction(): {
        ok: true;
        value: StorageTransaction;
    } | {
        ok: false;
        error: KernelError;
    };
    atomicApply(missionId: string, events: readonly EventEnvelope[], expectedStateVersion: number, reduce: (state: MissionState, event: EventEnvelope) => MissionState): {
        ok: true;
        value: {
            state: MissionState;
            appended: number;
        };
    } | {
        ok: false;
        error: KernelError;
    };
    appendEvent(envelope: EventEnvelope): {
        ok: true;
        value: void;
    } | {
        ok: false;
        error: KernelError;
    };
    getEventById(eventId: string): {
        ok: true;
        value: EventEnvelope | undefined;
    };
    listEvents(missionId: string): {
        ok: true;
        value: readonly EventEnvelope[];
    };
    getMissionState(missionId: string): {
        ok: true;
        value: MissionState | undefined;
    };
    compareAndSwapMissionState(missionId: string, expectedVersion: number, nextState: MissionState): {
        ok: true;
        value: void;
    } | {
        ok: false;
        error: KernelError;
    };
    reserveMissionSequence(missionId: string): {
        ok: true;
        value: number;
    };
    finalizeArtifact(manifest: ArtifactManifest): {
        ok: true;
        value: void;
    } | {
        ok: false;
        error: KernelError;
    };
    getArtifact(artifactId: string): {
        ok: true;
        value: ArtifactManifest | undefined;
    };
    listArtifacts(missionId: string): {
        ok: true;
        value: readonly ArtifactManifest[];
    };
    createApprovalRequest(request: ApprovalRequest): {
        ok: true;
        value: void;
    };
    getApprovalRequest(approvalRequestId: string): {
        ok: true;
        value: ApprovalRequest | undefined;
    };
    recordApprovalDecision(record: ApprovalRecord): {
        ok: true;
        value: void;
    } | {
        ok: false;
        error: KernelError;
    };
    getApprovalRecord(approvalRecordId: string): {
        ok: true;
        value: ApprovalRecord | undefined;
    };
    getApprovalRecordByRequest(approvalRequestId: string): {
        ok: true;
        value: ApprovalRecord | undefined;
    };
    consumeApproval(approvalRecordId: string, consumedByTransition: string, committedAt: string): {
        ok: true;
        value: void;
    } | {
        ok: false;
        error: KernelError;
    };
    isApprovalConsumed(approvalRecordId: string): boolean;
    getLedger(missionId: string, resourceClass: ResourceClass): {
        ok: true;
        value: BudgetLedger | undefined;
    };
    upsertLedger(missionId: string, resourceClass: ResourceClass, expectedVersion: number, next: BudgetLedger): {
        ok: true;
        value: void;
    } | {
        ok: false;
        error: KernelError;
    };
    acquireLease(name: string, ttl: {
        expiresAt: string;
    }): {
        ok: true;
        value: void;
    } | {
        ok: false;
        error: KernelError;
    };
    releaseLease(name: string): {
        ok: true;
        value: void;
    };
    recordRejection(rejection: RejectionRecord): {
        ok: true;
        value: void;
    };
    listRejections(): {
        ok: true;
        value: readonly RejectionRecord[];
    };
    private snapshot;
    private restore;
}
export {};
