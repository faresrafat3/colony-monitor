export type ResourceClass = "model_tokens" | "wall_clock_ms" | "tool_calls" | "monetary_cost" | "revision_cycles";
export declare const TOPUP_ALLOWED_CLASSES: ReadonlySet<ResourceClass>;
/** revision_cycles (and any rework counter) MUST NOT be topped up (N4 req 13/Captain). */
export declare const TOPUP_FORBIDDEN_CLASSES: ReadonlySet<ResourceClass>;
export interface BudgetTopUp {
    topUpId: string;
    amount: number;
    approvalRecordId: string;
    approvalSubjectHash: string;
    appliedAt: string;
}
export interface BudgetLedger {
    schemaVersion: 1;
    missionId: string;
    resourceClass: ResourceClass;
    immutableLimit: number;
    approvedTopUps: readonly BudgetTopUp[];
    reserved: number;
    spent: number;
    releasedReservations: number;
    /** Optimistic-concurrency version of the ledger row. */
    ledgerVersion: number;
}
export interface LedgerView {
    effectiveLimit: number;
    remainingCapacity: number;
}
export declare function effectiveLimit(ledger: BudgetLedger): number;
export declare function remainingCapacity(ledger: BudgetLedger): number;
export declare function ledgerView(ledger: BudgetLedger): LedgerView;
export declare function assertLedgerInvariants(ledger: BudgetLedger): void;
export declare function freshLedger(missionId: string, resourceClass: ResourceClass, immutableLimit: number): BudgetLedger;
/** Reserve with CAS on ledgerVersion (N4 req 12 optimistic equivalent). */
export declare function reserve(ledger: BudgetLedger, amount: number): BudgetLedger;
/** Settlement transfers amount from reserved to spent, atomically (N4 req 8). */
export declare function settle(ledger: BudgetLedger, reservationId: string, amount: number): BudgetLedger;
/** Cancellation releases without touching spent (N4 req 9). */
export declare function release(ledger: BudgetLedger, amount: number): BudgetLedger;
/** Top-up application; class restriction is enforced by the caller (N4 req 3). */
export declare function applyTopUp(ledger: BudgetLedger, topUp: BudgetTopUp): BudgetLedger;
/** Any attempt to mutate immutableLimit is an integrity failure (N4 req 2). */
export declare function withLimitMutation(ledger: BudgetLedger): never;
