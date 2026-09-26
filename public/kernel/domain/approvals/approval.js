/**
 * Content-addressed, transition-bound approval subjects (N1).
 * approvalSubjectHash = SHA-256 over RFC 8785 canonical bytes of the request.
 */
import { canonicalJson } from "../canonical/jcs.js";
import { sha256Hex } from "../support/sha256.js";
/** Canonicalize artifact subjects by (artifactType, artifactId). */
export function sortArtifactSubjects(subjects) {
    return [...subjects].sort((a, b) => a.artifactType === b.artifactType
        ? a.artifactId < b.artifactId
            ? -1
            : a.artifactId > b.artifactId
                ? 1
                : 0
        : a.artifactType < b.artifactType
            ? -1
            : 1);
}
export function approvalSubjectHash(request) {
    return sha256Hex(canonicalJson(request));
}
/** Human-authority identity: agents are never valid approvers (N1 req 10). */
export function isHumanAuthority(decidedBy, agentRoleIds) {
    return !agentRoleIds.includes(decidedBy);
}
/** Deterministic expiry check against the injected persistence clock. */
export function isExpiredAtCommit(request, commitTime) {
    return new Date(request.expiresAt).getTime() <= commitTime.getTime();
}
//# sourceMappingURL=approval.js.map