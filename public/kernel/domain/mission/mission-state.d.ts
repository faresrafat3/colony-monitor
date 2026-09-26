/** MissionState — persisted type (schemaVersion 1, N5/N10). */
import type { MissionStage } from "./stages.js";
export interface MissionState {
    schemaVersion: 1;
    missionId: string;
    stage: MissionStage;
    /** Every accepted event increments exactly once (N2 req 8). */
    stateVersion: number;
    /** Highest applied missionSequence (events are 1-based, monotone). */
    missionSequence: number;
    title: string;
    /** Stage recorded before entering a pause state (E34/E36 re-entry). */
    resumeStage: MissionStage | null;
    /** Bounded rework counters (N6). Monotone within a mission; never reset. */
    counters: {
        revisionCount: number;
        planReworkCount: number;
        gateReissueCount: number;
        verificationInfraRetryCount: number;
        textOnlyPackageReworkCount: number;
        humanResumptionCount: number;
    };
    /** Digests of the currently bound plan/candidate/verification subjects. */
    boundPlanSha256: string | null;
    boundCandidateSha256: string | null;
    boundVerificationSha256: string | null;
    /** Consumed approval subject hashes (at-most-once enforcement). */
    consumedApprovalSubjectHashes: readonly string[];
    createdAt: string;
    updatedAt: string;
}
export declare function emptyCounters(): MissionState["counters"];
export declare function initialMissionState(input: {
    missionId: string;
    title: string;
    createdAt: string;
}): MissionState;
