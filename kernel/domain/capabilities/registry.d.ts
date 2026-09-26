export type CapabilityId = "propose_plan" | "produce_implementation_artifact" | "produce_verification_artifact" | "produce_review_artifact" | "produce_documentation" | "screen_policy" | "conduct_reconnaissance" | "challenge_plan";
export interface RoleManifest {
    schemaVersion: 1;
    roleId: string;
    roleVersion: number;
    /** Exactly the explicitly granted capabilities; deny-by-default. */
    capabilities: readonly CapabilityId[];
    /** Roles this role may never act as (separation of duties). */
    mayNotApproveOwnOutput: true;
}
export interface CapabilityManifest {
    schemaVersion: 1;
    capabilityId: CapabilityId;
    /** Artifact types this capability may produce. */
    producesArtifactTypes: readonly string[];
    /** Capabilities are bound to artifact scope; verifier cannot touch impl bytes. */
    scope: "plan" | "implementation" | "verification" | "review" | "documentation" | "policy";
}
export interface RoleRegistryView {
    role(roleId: string): RoleManifest;
    /** Deny-by-default check; unknown role fails closed. */
    hasCapability(roleId: string, capabilityId: CapabilityId): boolean;
    /** Structural ban: a role can never mutate its own manifest or self-grant. */
    assertNoSelfMutation(roleId: string, mutation: {
        roleId: string;
    }): void;
}
export declare class RoleRegistry implements RoleRegistryView {
    private readonly roles;
    constructor(roles: readonly RoleManifest[]);
    role(roleId: string): RoleManifest;
    hasCapability(roleId: string, capabilityId: CapabilityId): boolean;
    assertCapability(roleId: string, capabilityId: CapabilityId): void;
    assertNoSelfMutation(roleId: string, mutation: {
        roleId: string;
    }): void;
}
/** M1A test roles (mission §10). No publication capability exists anywhere. */
export declare function testRoleRegistry(): RoleRegistry;
export declare const CAPABILITY_MANIFESTS: readonly CapabilityManifest[];
