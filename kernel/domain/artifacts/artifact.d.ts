export type ArtifactType = "recon_brief" | "plan" | "plan_challenge" | "implementation_candidate" | "verification_report" | "technical_review" | "documentation_bundle" | "final_package";
export interface ArtifactManifest {
    schemaVersion: 1;
    artifactId: string;
    missionId: string;
    artifactType: ArtifactType;
    /** SHA-256 over the canonical artifact content bytes (content-addressed). */
    contentSha256: string;
    /** Producer role identity — trusted provenance, never model-supplied. */
    createdByRoleId: string;
    createdByRoleVersion: number;
    finalizedAt: string;
    /** Byte length of the canonical content. */
    contentBytes: number;
}
export interface ArtifactContent {
    /** Structured content fields — canonical JSON is the content-addressed form. */
    fields: Record<string, unknown>;
}
export declare function canonicalArtifactContent(content: ArtifactContent): string;
export declare function artifactContentBytes(content: ArtifactContent): Uint8Array;
export declare function buildArtifactManifest(input: {
    artifactId: string;
    missionId: string;
    artifactType: ArtifactType;
    content: ArtifactContent;
    createdByRoleId: string;
    createdByRoleVersion: number;
    finalizedAt: string;
    contentSha256: string;
}): ArtifactManifest;
