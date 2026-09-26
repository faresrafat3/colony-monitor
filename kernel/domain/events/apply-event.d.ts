import type { EventEnvelope } from "./envelope.js";
import type { MissionState } from "../mission/mission-state.js";
export declare function canonicalPayloadHash(payload: Record<string, unknown>): string;
/**
 * Validate envelope integrity (schema version, closed vocabulary, mission,
 * sequence, state version, payload hash). Returns the decision when the event
 * is structurally appliable; throws otherwise.
 */
export declare function validateEnvelope(state: MissionState, event: EventEnvelope): void;
/** Fully validate + reduce one event into the next state. Pure. */
export declare function applyEvent(state: MissionState, event: EventEnvelope): MissionState;
/** Fold a full event stream from empty — recovery/replay path (A24). */
export declare function reduceAll(initialState: MissionState, events: readonly EventEnvelope[]): MissionState;
