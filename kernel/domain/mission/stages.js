/** Canonical 22-state machine enum (N10). Single source of truth. */
export const MissionStage = {
    CREATED: "CREATED",
    POLICY_SCREENING: "POLICY_SCREENING",
    POLICY_REJECTED: "POLICY_REJECTED",
    RECONNAISSANCE: "RECONNAISSANCE",
    PLANNING: "PLANNING",
    CHALLENGE: "CHALLENGE",
    AWAITING_PLAN_APPROVAL: "AWAITING_PLAN_APPROVAL",
    IMPLEMENTATION: "IMPLEMENTATION",
    VERIFICATION: "VERIFICATION",
    TECHNICAL_REVIEW: "TECHNICAL_REVIEW",
    REVISION: "REVISION",
    DOCUMENTATION: "DOCUMENTATION",
    FINAL_POLICY_GATE: "FINAL_POLICY_GATE",
    AWAITING_PUBLISH_APPROVAL: "AWAITING_PUBLISH_APPROVAL",
    READY_TO_PUBLISH: "READY_TO_PUBLISH",
    PUBLIC_ACTION_PENDING: "PUBLIC_ACTION_PENDING",
    RECONCILIATION_REQUIRED: "RECONCILIATION_REQUIRED",
    PUBLISHED: "PUBLISHED",
    CLOSED: "CLOSED",
    ABORTED: "ABORTED",
    FAILED: "FAILED",
    HUMAN_REVIEW_REQUIRED: "HUMAN_REVIEW_REQUIRED",
};
export const ALL_STAGES = Object.values(MissionStage);
export const TERMINAL_STAGES = new Set([
    MissionStage.POLICY_REJECTED,
    MissionStage.CLOSED,
    MissionStage.ABORTED,
    MissionStage.FAILED,
    MissionStage.PUBLISHED,
]);
export const PAUSE_STAGES = new Set([
    MissionStage.HUMAN_REVIEW_REQUIRED,
    MissionStage.RECONCILIATION_REQUIRED,
]);
/** Reserved public-action states: MUST NOT be entered in v0.1.1 (N10, A33). */
export const RESERVED_PUBLIC_STAGES = new Set([
    MissionStage.PUBLIC_ACTION_PENDING,
    MissionStage.PUBLISHED,
]);
export const COUNTER_LIMITS = {
    revisionCount: 2,
    planReworkCount: 2,
    gateReissueCount: 2,
    verificationInfraRetryCount: 2,
    textOnlyPackageReworkCount: 2,
    humanResumptionCount: 2,
};
/** Max attempts per tool invocation (3 attempts total, N6). */
export const MAX_ATTEMPTS_PER_INVOCATION = 3;
//# sourceMappingURL=stages.js.map