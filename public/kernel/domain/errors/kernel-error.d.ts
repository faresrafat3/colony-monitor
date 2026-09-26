/** Structured kernel error codes (closed vocabulary; fail-closed semantics). */
export type KernelErrorCode = "INVALID_SCHEMA" | "UNSUPPORTED_SCHEMA_VERSION" | "INVALID_EVENT" | "ALREADY_APPLIED" | "SEQUENCE_CONFLICT" | "CONCURRENCY_CONFLICT" | "ILLEGAL_TRANSITION" | "PUBLICATION_DISABLED" | "STALE_APPROVAL" | "EXPIRED_AT_COMMIT" | "APPROVAL_NOT_FOUND" | "APPROVAL_CONFLICT" | "APPROVAL_ALREADY_CONSUMED" | "INVALID_PURPOSE" | "UNAUTHORIZED" | "SELF_APPROVAL_DENIED" | "CAPABILITY_DENIED" | "IDEMPOTENCY_CONFLICT" | "INTEGRITY_FAILURE" | "BUDGET_EXCEEDED" | "INSUFFICIENT_CAPACITY" | "TOPUP_FORBIDDEN" | "ARTIFACT_IMMUTABLE" | "ARTIFACT_NOT_FOUND" | "LEASE_CONFLICT" | "REVISION_LIMIT_EXCEEDED" | "INVOCATION_LIMIT_EXCEEDED" | "RUNTIME_REFUSAL" | "RUNTIME_TIMEOUT" | "RUNTIME_INFRASTRUCTURE_FAILURE" | "RUNTIME_MALFORMED_OUTPUT" | "INTERNAL_INVARIANT_VIOLATION";
/** Deterministic, structured kernel error. Never carries untrusted prose as policy. */
export declare class KernelError extends Error {
    readonly code: KernelErrorCode;
    readonly details: Record<string, unknown>;
    constructor(code: KernelErrorCode, message: string, details?: Record<string, unknown>);
    toJSON(): {
        code: KernelErrorCode;
        message: string;
        details: Record<string, unknown>;
    };
}
/** Result type: every kernel operation returns a structured success or a structured error. */
export type Result<T, E = KernelError> = {
    ok: true;
    value: T;
} | {
    ok: false;
    error: E;
};
export declare const ok: <T>(value: T) => Result<T, never>;
export declare const err: <E extends KernelError>(error: E) => Result<never, E>;
/** Invoke fn; if it throws a KernelError, convert to a structured error result. */
export declare function attempt<T>(fn: () => Result<T>): Result<T>;
/** Unwrap a Result or throw the structured error (command layer uses exceptions internally). */
export declare function unwrap<T>(result: Result<T>): T;
