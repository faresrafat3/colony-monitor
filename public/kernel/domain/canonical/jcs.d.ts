export declare class CanonicalizationError extends Error {
    constructor(message: string);
}
/** Serialize a JSON value to its RFC 8785 canonical form. */
export declare function canonicalJson(value: unknown): string;
