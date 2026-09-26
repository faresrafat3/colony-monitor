/**
 * Role and capability contracts (N8/A16/A17, deny-by-default).
 * RoleManifest and CapabilityManifest are persisted types (schemaVersion 1).
 * Capability grants live in the kernel-owned registry; repository/model text
 * can never grant or widen them.
 */
import { KernelError } from "../errors/kernel-error.js";
export class RoleRegistry {
    roles;
    constructor(roles) {
        const map = new Map();
        for (const role of roles) {
            if (map.has(role.roleId)) {
                throw new KernelError("INTEGRITY_FAILURE", `duplicate role ownership ${role.roleId}`, {});
            }
            map.set(role.roleId, role);
        }
        this.roles = map;
    }
    role(roleId) {
        const role = this.roles.get(roleId);
        if (role === undefined) {
            throw new KernelError("UNAUTHORIZED", `unknown role ${roleId}`, { roleId });
        }
        return role;
    }
    hasCapability(roleId, capabilityId) {
        const role = this.roles.get(roleId);
        if (role === undefined)
            return false; // deny by default, fail closed
        return role.capabilities.includes(capabilityId);
    }
    assertCapability(roleId, capabilityId) {
        if (!this.hasCapability(roleId, capabilityId)) {
            throw new KernelError("CAPABILITY_DENIED", `role ${roleId} lacks capability ${capabilityId}`, {
                roleId,
                capabilityId,
            });
        }
    }
    assertNoSelfMutation(roleId, mutation) {
        if (mutation.roleId === roleId) {
            throw new KernelError("UNAUTHORIZED", `role ${roleId} cannot mutate its own manifest or grants`, {
                roleId,
            });
        }
    }
}
/** M1A test roles (mission §10). No publication capability exists anywhere. */
export function testRoleRegistry() {
    return new RoleRegistry([
        {
            schemaVersion: 1,
            roleId: "first-mate",
            roleVersion: 1,
            capabilities: ["screen_policy", "conduct_reconnaissance", "propose_plan", "challenge_plan", "produce_documentation"],
            mayNotApproveOwnOutput: true,
        },
        {
            schemaVersion: 1,
            roleId: "craftsman",
            roleVersion: 1,
            capabilities: ["produce_implementation_artifact"],
            mayNotApproveOwnOutput: true,
        },
        {
            schemaVersion: 1,
            roleId: "verifier",
            roleVersion: 1,
            capabilities: ["produce_verification_artifact"],
            mayNotApproveOwnOutput: true,
        },
        {
            schemaVersion: 1,
            roleId: "reviewer",
            roleVersion: 1,
            capabilities: ["challenge_plan", "produce_review_artifact"],
            mayNotApproveOwnOutput: true,
        },
    ]);
}
export const CAPABILITY_MANIFESTS = [
    { schemaVersion: 1, capabilityId: "propose_plan", producesArtifactTypes: ["plan"], scope: "plan" },
    { schemaVersion: 1, capabilityId: "challenge_plan", producesArtifactTypes: ["plan_challenge"], scope: "review" },
    { schemaVersion: 1, capabilityId: "screen_policy", producesArtifactTypes: [], scope: "policy" },
    { schemaVersion: 1, capabilityId: "conduct_reconnaissance", producesArtifactTypes: ["recon_brief"], scope: "policy" },
    { schemaVersion: 1, capabilityId: "produce_implementation_artifact", producesArtifactTypes: ["implementation_candidate"], scope: "implementation" },
    { schemaVersion: 1, capabilityId: "produce_verification_artifact", producesArtifactTypes: ["verification_report"], scope: "verification" },
    { schemaVersion: 1, capabilityId: "produce_review_artifact", producesArtifactTypes: ["technical_review"], scope: "review" },
    { schemaVersion: 1, capabilityId: "produce_documentation", producesArtifactTypes: ["documentation_bundle"], scope: "documentation" },
];
//# sourceMappingURL=registry.js.map