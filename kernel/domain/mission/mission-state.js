export function emptyCounters() {
    return {
        revisionCount: 0,
        planReworkCount: 0,
        gateReissueCount: 0,
        verificationInfraRetryCount: 0,
        textOnlyPackageReworkCount: 0,
        humanResumptionCount: 0,
    };
}
export function initialMissionState(input) {
    return {
        schemaVersion: 1,
        missionId: input.missionId,
        stage: "CREATED",
        stateVersion: 0,
        missionSequence: 0,
        title: input.title,
        resumeStage: null,
        counters: emptyCounters(),
        boundPlanSha256: null,
        boundCandidateSha256: null,
        boundVerificationSha256: null,
        consumedApprovalSubjectHashes: [],
        createdAt: input.createdAt,
        updatedAt: input.createdAt,
    };
}
//# sourceMappingURL=mission-state.js.map