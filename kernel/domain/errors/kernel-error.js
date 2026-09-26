/** Deterministic, structured kernel error. Never carries untrusted prose as policy. */
export class KernelError extends Error {
    code;
    details;
    constructor(code, message, details = {}) {
        super(`${code}: ${message}`);
        this.name = "KernelError";
        this.code = code;
        this.details = details;
    }
    toJSON() {
        return { code: this.code, message: this.message, details: this.details };
    }
}
export const ok = (value) => ({ ok: true, value });
export const err = (error) => ({ ok: false, error });
/** Invoke fn; if it throws a KernelError, convert to a structured error result. */
export function attempt(fn) {
    try {
        return fn();
    }
    catch (e) {
        if (e instanceof KernelError)
            return err(e);
        return err(new KernelError("INTERNAL_INVARIANT_VIOLATION", String(e)));
    }
}
/** Unwrap a Result or throw the structured error (command layer uses exceptions internally). */
export function unwrap(result) {
    if (result.ok)
        return result.value;
    throw result.error;
}
//# sourceMappingURL=kernel-error.js.map