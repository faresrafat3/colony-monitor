/**
 * InMemoryColonyStorage (N7 contract, M1A adapter).
 * Transactional staging: readers see committed state only; atomicApply stages
 * event append + state CAS in one transaction. Unique constraints mirror what
 * a SQLite adapter must enforce: eventId, (missionId, missionSequence),
 * scope-qualified idempotencyKey, immutable artifacts, single-writer leases.
 */
import { KernelError } from "../domain/errors/kernel-error.js";
import { initialMissionState } from "../domain/mission/mission-state.js";
export class InMemoryColonyStorage {
    states = new Map();
    events = new Map(); // by eventId
    eventsByMission = new Map();
    sequences = new Map(); // (missionId|seq) -> eventId
    idempotency = new Map(); // key -> eventId
    artifacts = new Map();
    approvalRequests = new Map();
    approvalRecords = new Map(); // by recordId
    recordByRequest = new Map();
    consumedApprovals = new Map();
    ledgers = new Map(); // (missionId|class) -> ledger
    leases = new Map();
    rejections = [];
    beginTransaction() {
        // M1A storage is single-threaded; a transaction is a staged checkpoint of
        // all maps, restored wholesale on rollback. Commit is a no-op publish.
        const snapshot = this.snapshot();
        const self = this;
        return {
            ok: true,
            value: {
                commit() {
                    return { ok: true, value: undefined };
                },
                rollback() {
                    self.restore(snapshot);
                    return { ok: true, value: undefined };
                },
            },
        };
    }
    atomicApply(missionId, events, expectedStateVersion, reduce) {
        const snapshot = this.snapshot();
        try {
            let state = this.states.get(missionId);
            if (state === undefined) {
                if (expectedStateVersion !== 0 || (events[0]?.eventType ?? "") !== "MISSION_CREATED") {
                    throw new KernelError("INVALID_EVENT", `mission ${missionId} not found`, {});
                }
                // Creation path: reduce over the domain's one mission seed, titled from
                // the creation event itself. Never re-spell the state shape here — the
                // domain factory is its only home.
                const first = events[0];
                if (first === undefined)
                    throw new KernelError("INVALID_EVENT", "empty event batch", {});
                const seed = initialMissionState({
                    missionId,
                    title: typeof first.payload["title"] === "string" ? first.payload["title"] : "",
                    createdAt: first.occurredAt,
                });
                state = seed;
            }
            if (state.stateVersion !== expectedStateVersion) {
                throw new KernelError("CONCURRENCY_CONFLICT", `CAS mismatch: expected ${expectedStateVersion}, current ${state.stateVersion}`, {});
            }
            let appended = 0;
            for (const event of events) {
                // Unique constraints (same commit as the state update).
                if (this.events.has(event.eventId)) {
                    throw new KernelError("IDEMPOTENCY_CONFLICT", `eventId ${event.eventId} already exists`, {});
                }
                const seqKey = `${event.missionId}|${event.missionSequence}`;
                if (this.sequences.has(seqKey)) {
                    throw new KernelError("SEQUENCE_CONFLICT", `missionSequence ${event.missionSequence} already used`, {});
                }
                const idemKey = event.idempotencyKey;
                if (idemKey !== "" && this.idempotency.has(idemKey)) {
                    throw new KernelError("IDEMPOTENCY_CONFLICT", `idempotencyKey ${idemKey} already used`, {});
                }
                const next = reduce(state, event);
                if (next.stateVersion !== state.stateVersion + 1) {
                    throw new KernelError("INTERNAL_INVARIANT_VIOLATION", "reducer must increment stateVersion exactly once", {});
                }
                if (next.missionSequence !== state.missionSequence + 1) {
                    throw new KernelError("INTERNAL_INVARIANT_VIOLATION", "reducer must increment missionSequence exactly once", {});
                }
                this.events.set(event.eventId, event);
                this.sequences.set(seqKey, event.eventId); // keyed string values are fine (Map<string,string>)
                if (idemKey !== "")
                    this.idempotency.set(idemKey, event.eventId);
                const list = this.eventsByMission.get(event.missionId) ?? [];
                list.push(event);
                this.eventsByMission.set(event.missionId, list);
                state = next;
                appended += 1;
            }
            this.states.set(missionId, state);
            return { ok: true, value: { state, appended } };
        }
        catch (e) {
            this.restore(snapshot); // partial migration rolls back fully (N5 req 8 analog)
            if (e instanceof KernelError)
                return { ok: false, error: e };
            throw e;
        }
    }
    appendEvent(envelope) {
        if (this.events.has(envelope.eventId)) {
            return { ok: false, error: new KernelError("IDEMPOTENCY_CONFLICT", "eventId already exists", {}) };
        }
        const seqKey = `${envelope.missionId}|${envelope.missionSequence}`;
        if (this.sequences.has(seqKey)) {
            return { ok: false, error: new KernelError("SEQUENCE_CONFLICT", "missionSequence already used", {}) };
        }
        if (envelope.idempotencyKey !== "" && this.idempotency.has(envelope.idempotencyKey)) {
            return { ok: false, error: new KernelError("IDEMPOTENCY_CONFLICT", "idempotencyKey already used", {}) };
        }
        this.events.set(envelope.eventId, envelope);
        this.sequences.set(seqKey, envelope.eventId);
        if (envelope.idempotencyKey !== "")
            this.idempotency.set(envelope.idempotencyKey, envelope.eventId);
        const list = this.eventsByMission.get(envelope.missionId) ?? [];
        list.push(envelope);
        this.eventsByMission.set(envelope.missionId, list);
        return { ok: true, value: undefined };
    }
    getEventById(eventId) {
        return { ok: true, value: this.events.get(eventId) };
    }
    listEvents(missionId) {
        return { ok: true, value: this.eventsByMission.get(missionId) ?? [] };
    }
    getMissionState(missionId) {
        return { ok: true, value: this.states.get(missionId) };
    }
    compareAndSwapMissionState(missionId, expectedVersion, nextState) {
        const current = this.states.get(missionId);
        if (current === undefined) {
            return { ok: false, error: new KernelError("INVALID_EVENT", `mission ${missionId} not found`, {}) };
        }
        if (current.stateVersion !== expectedVersion) {
            return { ok: false, error: new KernelError("CONCURRENCY_CONFLICT", "CAS mismatch", {}) };
        }
        this.states.set(missionId, nextState);
        return { ok: true, value: undefined };
    }
    reserveMissionSequence(missionId) {
        const state = this.states.get(missionId);
        return { ok: true, value: (state?.missionSequence ?? 0) + 1 };
    }
    finalizeArtifact(manifest) {
        const existing = this.artifacts.get(manifest.artifactId);
        if (existing !== undefined) {
            if (existing.contentSha256 !== manifest.contentSha256) {
                return { ok: false, error: new KernelError("ARTIFACT_IMMUTABLE", "finalized artifact cannot be replaced", { artifactId: manifest.artifactId }) };
            }
            return { ok: true, value: undefined }; // idempotent re-finalization
        }
        this.artifacts.set(manifest.artifactId, { ...manifest });
        return { ok: true, value: undefined };
    }
    getArtifact(artifactId) {
        return { ok: true, value: this.artifacts.get(artifactId) };
    }
    listArtifacts(missionId) {
        return { ok: true, value: [...this.artifacts.values()].filter((a) => a.missionId === missionId) };
    }
    createApprovalRequest(request) {
        this.approvalRequests.set(request.approvalRequestId, { ...request });
        return { ok: true, value: undefined };
    }
    getApprovalRequest(approvalRequestId) {
        return { ok: true, value: this.approvalRequests.get(approvalRequestId) };
    }
    recordApprovalDecision(record) {
        const existing = this.recordByRequest.get(record.approvalRequestId);
        if (existing !== undefined) {
            if (existing.decision === record.decision) {
                return { ok: true, value: undefined }; // idempotent replay of identical decision
            }
            return { ok: false, error: new KernelError("APPROVAL_CONFLICT", "contradictory decision for same request", {}) };
        }
        this.approvalRecords.set(record.approvalRecordId, { ...record });
        this.recordByRequest.set(record.approvalRequestId, { ...record });
        return { ok: true, value: undefined };
    }
    getApprovalRecord(approvalRecordId) {
        return { ok: true, value: this.approvalRecords.get(approvalRecordId) };
    }
    getApprovalRecordByRequest(approvalRequestId) {
        return { ok: true, value: this.recordByRequest.get(approvalRequestId) };
    }
    consumeApproval(approvalRecordId, consumedByTransition, committedAt) {
        if (this.consumedApprovals.has(approvalRecordId)) {
            return { ok: false, error: new KernelError("APPROVAL_ALREADY_CONSUMED", "record consumed at most once", {}) };
        }
        this.consumedApprovals.set(approvalRecordId, { consumedByTransition, consumedAt: committedAt });
        return { ok: true, value: undefined };
    }
    isApprovalConsumed(approvalRecordId) {
        return this.consumedApprovals.has(approvalRecordId);
    }
    getLedger(missionId, resourceClass) {
        return { ok: true, value: this.ledgers.get(`${missionId}|${resourceClass}`) };
    }
    upsertLedger(missionId, resourceClass, expectedVersion, next) {
        const key = `${missionId}|${resourceClass}`;
        const current = this.ledgers.get(key);
        if (current === undefined) {
            if (expectedVersion !== 0) {
                return { ok: false, error: new KernelError("CONCURRENCY_CONFLICT", "ledger CAS mismatch on create", {}) };
            }
        }
        else if (current.ledgerVersion !== expectedVersion) {
            return { ok: false, error: new KernelError("CONCURRENCY_CONFLICT", "ledger CAS mismatch", {}) };
        }
        this.ledgers.set(key, { ...next });
        return { ok: true, value: undefined };
    }
    acquireLease(name, ttl) {
        const existing = this.leases.get(name);
        if (existing !== undefined) {
            return { ok: false, error: new KernelError("LEASE_CONFLICT", `lease ${name} already held`, {}) };
        }
        this.leases.set(name, { ...ttl });
        return { ok: true, value: undefined };
    }
    releaseLease(name) {
        this.leases.delete(name);
        return { ok: true, value: undefined };
    }
    recordRejection(rejection) {
        this.rejections.push({ ...rejection, detail: { ...rejection.detail } });
        return { ok: true, value: undefined };
    }
    listRejections() {
        return { ok: true, value: [...this.rejections] };
    }
    snapshot() {
        return JSON.stringify({
            states: [...this.states.entries()],
            events: [...this.events.entries()],
            eventsByMission: [...this.eventsByMission.entries()],
            sequences: [...this.sequences.entries()],
            idempotency: [...this.idempotency.entries()],
            artifacts: [...this.artifacts.entries()],
            approvalRequests: [...this.approvalRequests.entries()],
            approvalRecords: [...this.approvalRecords.entries()],
            recordByRequest: [...this.recordByRequest.entries()],
            consumed: [...this.consumedApprovals.entries()],
            ledgers: [...this.ledgers.entries()],
            leases: [...this.leases.entries()],
            rejections: this.rejections,
        });
    }
    restore(snapshot) {
        const parsed = JSON.parse(snapshot);
        this.states.clear();
        for (const [k, v] of parsed["states"])
            this.states.set(k, v);
        this.events.clear();
        for (const [k, v] of parsed["events"])
            this.events.set(k, v);
        this.eventsByMission.clear();
        for (const [k, v] of parsed["eventsByMission"])
            this.eventsByMission.set(k, v);
        this.sequences.clear();
        for (const [k, v] of parsed["sequences"])
            this.sequences.set(k, v);
        this.idempotency.clear();
        for (const [k, v] of parsed["idempotency"])
            this.idempotency.set(k, v);
        this.artifacts.clear();
        for (const [k, v] of parsed["artifacts"])
            this.artifacts.set(k, v);
        this.approvalRequests.clear();
        for (const [k, v] of parsed["approvalRequests"])
            this.approvalRequests.set(k, v);
        this.approvalRecords.clear();
        for (const [k, v] of parsed["approvalRecords"])
            this.approvalRecords.set(k, v);
        this.recordByRequest.clear();
        for (const [k, v] of parsed["recordByRequest"])
            this.recordByRequest.set(k, v);
        this.consumedApprovals.clear();
        for (const [k, v] of parsed["consumed"])
            this.consumedApprovals.set(k, v);
        this.ledgers.clear();
        for (const [k, v] of parsed["ledgers"])
            this.ledgers.set(k, v);
        this.leases.clear();
        for (const [k, v] of parsed["leases"])
            this.leases.set(k, v);
        this.rejections.length = 0;
        for (const r of parsed["rejections"])
            this.rejections.push(r);
    }
}
//# sourceMappingURL=in-memory-storage.js.map