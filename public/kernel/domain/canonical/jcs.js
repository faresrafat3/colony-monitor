export class CanonicalizationError extends Error {
    constructor(message) {
        super(`canonicalization: ${message}`);
        this.name = "CanonicalizationError";
    }
}
function assertCanonicallySerializable(value) {
    switch (typeof value) {
        case "number":
            if (!Number.isFinite(value))
                throw new CanonicalizationError("non-finite number");
            return;
        case "object": {
            if (value === null)
                return;
            if (Array.isArray(value)) {
                for (const item of value)
                    assertCanonicallySerializable(item);
                return;
            }
            const record = value;
            for (const key of Object.keys(record)) {
                if (key === "__proto__" || key === "constructor" || key === "prototype") {
                    throw new CanonicalizationError(`forbidden key "${key}"`);
                }
                assertCanonicallySerializable(record[key]);
            }
            return;
        }
        default:
            return; // string | boolean | null
    }
}
/** Serialize a JSON value to its RFC 8785 canonical form. */
export function canonicalJson(value) {
    assertCanonicallySerializable(value);
    return serialize(value);
}
function serialize(value) {
    if (value === null)
        return "null";
    const type = typeof value;
    if (type === "boolean")
        return value === true ? "true" : "false";
    if (type === "number")
        return JSON.stringify(value);
    if (type === "string")
        return JSON.stringify(value);
    if (Array.isArray(value))
        return `[${value.map(serialize).join(",")}]`;
    const record = value;
    const keys = Object.keys(record).sort((a, b) => (ltUtf16(a, b) ? -1 : ltUtf16(b, a) ? 1 : 0));
    return `{${keys.map((k) => `${JSON.stringify(k)}:${serialize(record[k])}`).join(",")}}`;
}
/** UTF-16 code-unit ordering (JCS sort), not locale collation. */
function ltUtf16(a, b) {
    const ca = Array.from(a).map((c) => c.codePointAt(0));
    const cb = Array.from(b).map((c) => c.codePointAt(0));
    const len = Math.min(ca.length, cb.length);
    for (let i = 0; i < len; i++) {
        if (ca[i] !== cb[i])
            return ca[i] < cb[i];
    }
    return ca.length < cb.length;
}
//# sourceMappingURL=jcs.js.map