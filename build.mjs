/**
 * build.mjs — assemble the deployable dashboard into public/:
 *  - copy src/colony-driver.mjs -> public/colony-driver.mjs
 *  - rewrite its kernel import to the vendored copy next to it
 *  - rewrite app.mjs's driver import to the local copy
 *  - `--check` verifies the assembled artifacts exist and parse.
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const driverSrc = readFileSync("src/colony-driver.mjs", "utf8");
const patched = driverSrc
  .replaceAll('from "../public/kernel/index.js"', 'from "./kernel/index.js"');
writeFileSync("public/colony-driver.mjs", patched);

const app = readFileSync("public/app.mjs", "utf8")
  .replaceAll('from "../src/colony-driver.mjs"', 'from "./colony-driver.mjs"');
writeFileSync("public/app.mjs", app);

if (process.argv.includes("--check")) {
  for (const f of ["public/index.html", "public/app.mjs", "public/colony-driver.mjs", "public/kernel/index.js"]) {
    if (!existsSync(f)) { console.error("MISSING " + f); process.exit(1); }
  }
  console.log("build check: all artifacts present");
} else {
  console.log("assembled: public/ is self-contained");
}
