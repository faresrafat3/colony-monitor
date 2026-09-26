import type { EventType } from "../events/vocabulary.js";
import type { MissionStage, CounterName } from "./stages.js";
import type { MissionState } from "./mission-state.js";
export interface Edge {
    id: string;
    from: MissionStage;
    event: EventType;
    to: MissionStage;
    requiresApproval: boolean;
    /** Bounded counter consumed by traversing this edge. */
    consumesCounter?: CounterName;
    /** Narrowing predicate over (state, payload) for multi-exit event types. */
    matches?: (state: MissionState, payload: Record<string, unknown>) => boolean;
    /** Rendering label (never used for decisions). */
    guardLabel?: string;
}
/** The declarative edge table. Order among `matches` rows is irrelevant. */
export declare const EDGES: readonly Edge[];
export declare const CREATION_EVENT: "MISSION_CREATED";
export interface TransitionDecision {
    edgeId: string;
    fromStage: MissionStage;
    toStage: MissionStage;
    informational: boolean;
    requiresApproval: boolean;
    consumesCounter: CounterName | null;
}
/**
 * Validate (stage, eventType, payload) legality. Default deny. Throws a
 * structured KernelError on any illegal combination; never mutates state.
 */
export declare function decideTransition(state: MissionState, eventType: EventType, payload: Record<string, unknown>): TransitionDecision;
/** Human-readable transition table generated from the same source of truth. */
export declare function renderTransitionTable(): string;
/** Mermaid state diagram generated from the same source of truth. */
export declare function renderMermaidStateDiagram(): string;
