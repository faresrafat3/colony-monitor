/** Canonical 22-state machine enum (N10). Single source of truth. */
export declare const MissionStage: {
    readonly CREATED: "CREATED";
    readonly POLICY_SCREENING: "POLICY_SCREENING";
    readonly POLICY_REJECTED: "POLICY_REJECTED";
    readonly RECONNAISSANCE: "RECONNAISSANCE";
    readonly PLANNING: "PLANNING";
    readonly CHALLENGE: "CHALLENGE";
    readonly AWAITING_PLAN_APPROVAL: "AWAITING_PLAN_APPROVAL";
    readonly IMPLEMENTATION: "IMPLEMENTATION";
    readonly VERIFICATION: "VERIFICATION";
    readonly TECHNICAL_REVIEW: "TECHNICAL_REVIEW";
    readonly REVISION: "REVISION";
    readonly DOCUMENTATION: "DOCUMENTATION";
    readonly FINAL_POLICY_GATE: "FINAL_POLICY_GATE";
    readonly AWAITING_PUBLISH_APPROVAL: "AWAITING_PUBLISH_APPROVAL";
    readonly READY_TO_PUBLISH: "READY_TO_PUBLISH";
    readonly PUBLIC_ACTION_PENDING: "PUBLIC_ACTION_PENDING";
    readonly RECONCILIATION_REQUIRED: "RECONCILIATION_REQUIRED";
    readonly PUBLISHED: "PUBLISHED";
    readonly CLOSED: "CLOSED";
    readonly ABORTED: "ABORTED";
    readonly FAILED: "FAILED";
    readonly HUMAN_REVIEW_REQUIRED: "HUMAN_REVIEW_REQUIRED";
};
export type MissionStage = (typeof MissionStage)[keyof typeof MissionStage];
export declare const ALL_STAGES: readonly MissionStage[];
export declare const TERMINAL_STAGES: ReadonlySet<MissionStage>;
export declare const PAUSE_STAGES: ReadonlySet<MissionStage>;
/** Reserved public-action states: MUST NOT be entered in v0.1.1 (N10, A33). */
export declare const RESERVED_PUBLIC_STAGES: ReadonlySet<MissionStage>;
/** Bounded rework counters (N6, Captain-approved limits; never reset). */
export type CounterName = "revisionCount" | "planReworkCount" | "gateReissueCount" | "verificationInfraRetryCount" | "textOnlyPackageReworkCount" | "humanResumptionCount";
export declare const COUNTER_LIMITS: Record<CounterName, number>;
/** Max attempts per tool invocation (3 attempts total, N6). */
export declare const MAX_ATTEMPTS_PER_INVOCATION = 3;
