/** RevisionRequest — persisted type (schemaVersion 1, N6). Closed issue codes. */
import { sha256Hex } from "../support/sha256.js";
/** Dedupe key: identical input+artifact+role cannot be auto-retried (N6). */
export function revisionDedupeKey(input) {
    const joined = [input.issueCode, input.sourceArtifactHash, input.requestedByRoleId].join("|");
    return sha256Hex(joined);
}
//# sourceMappingURL=revision.js.map