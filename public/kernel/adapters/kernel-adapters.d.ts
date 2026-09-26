import type { Clock, Hasher, IdGenerator, TelemetrySink, TelemetryEntry } from "../ports/kernel-ports.js";
/** Fixed-instant clock: the whole mission runs at one injected instant. */
export declare class DeterministicClock implements Clock {
    private readonly instant;
    constructor(instant: Date);
    now(): Date;
}
/** Stepping clock: each read advances by a fixed step (deterministic ordering). */
export declare class SteppingClock implements Clock {
    private readonly start;
    private readonly stepMs;
    private current;
    constructor(start: Date, stepMs?: number);
    now(): Date;
}
/**
 * Deterministic id/nonce generator: xorshift128+ over a fixed seed, formatted
 * as UUID v4 and 128-bit hex. Same seed ⇒ same identifiers ⇒ reproducible logs.
 */
export declare class DeterministicIdGenerator implements IdGenerator {
    private s0;
    private s1;
    private s2;
    private s3;
    private counters;
    constructor(seedHex: string);
    private nextU32;
    private next128Hex;
    nextId(scope: string): string;
    nextUuid(): string;
    nextNonce(): string;
}
/** Domain hasher adapter (pure sha256; no node:crypto anywhere). */
export declare class Sha256Hasher implements Hasher {
    sha256Hex(input: string): string;
    sha256Bytes(input: Uint8Array): Uint8Array;
}
/** In-memory telemetry: deterministic, inspectable, no side channels. */
export declare class InMemoryTelemetry implements TelemetrySink {
    readonly entries: TelemetryEntry[];
    record(entry: TelemetryEntry): void;
}
