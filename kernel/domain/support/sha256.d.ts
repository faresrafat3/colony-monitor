/**
 * Pure TypeScript SHA-256 (FIPS 180-4). No platform I/O, no node:crypto —
 * domain hashing stays deterministic and dependency-free. Bytes in, bytes out.
 */
export declare function sha256Bytes(message: Uint8Array): Uint8Array;
/** SHA-256 over a UTF-8 string, lowercase hex digest. */
export declare function sha256Hex(input: string): string;
export declare function toHex(bytes: Uint8Array): string;
