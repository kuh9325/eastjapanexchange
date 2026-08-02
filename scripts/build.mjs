import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

await exec(process.execPath, [path.join(root, "scripts", "generate-gallery-manifest.mjs")]);
await fs.rm(dist, { recursive: true, force: true });
await fs.mkdir(dist, { recursive: true });
for (const item of ["index.html", "src", "data", "assets"]) {
  await fs.cp(path.join(root, item), path.join(dist, item), { recursive: true });
}
await fs.writeFile(path.join(dist, ".nojekyll"), "", "utf8");
console.log(`built: ${dist}`);
