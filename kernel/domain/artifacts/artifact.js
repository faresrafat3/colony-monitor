/** ArtifactManifest — persisted type (schemaVersion 1, N5/N7). */
import { canonicalJson } from "../canonical/jcs.js";
export function canonicalArtifactContent(content) {
    return canonicalJson(content.fields);
}
export function artifactContentBytes(content) {
    return new TextEncoder().encode(canonicalArtifactContent(content));
}
export function buildArtifactManifest(input) {
    const bytes = artifactContentBytes(input.content);
    return {
        schemaVersion: 1,
        artifactId: input.artifactId,
        missionId: input.missionId,
        artifactType: input.artifactType,
        contentSha256: input.contentSha256,
        createdByRoleId: input.createdByRoleId,
        createdByRoleVersion: input.createdByRoleVersion,
        finalizedAt: input.finalizedAt,
        contentBytes: bytes.length,
    };
}
//# sourceMappingURL=artifact.js.map