import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { build } from "esbuild";

const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

async function listFiles(directory, prefix = "") {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(path.join(directory, entry.name), relative));
    else files.push(relative);
  }
  return files;
}

await exec(process.execPath, [path.join(root, "scripts", "generate-map-data.mjs")]);
await exec(process.execPath, [path.join(root, "scripts", "generate-intro-map.mjs")]);
await exec(process.execPath, [path.join(root, "scripts", "generate-gallery-thumbnails.mjs")]);
await exec(process.execPath, [path.join(root, "scripts", "generate-gallery-manifest.mjs")]);
await fs.rm(dist, { recursive: true, force: true });
await fs.mkdir(path.join(dist, "src"), { recursive: true });

let html = await fs.readFile(path.join(root, "index.html"), "utf8");
html = html.replace('data-build="development"', 'data-build="production"');
await fs.copyFile(path.join(root, "src", "styles.css"), path.join(dist, "src", "styles.css"));
for (const item of ["assets", "fixtures"]) {
  await fs.cp(path.join(root, item), path.join(dist, item), { recursive: true });
}
await fs.mkdir(path.join(dist, "data"), { recursive: true });
await fs.copyFile(path.join(root, "data", "regions.js"), path.join(dist, "data", "regions.js"));

await build({
  entryPoints: [path.join(root, "src", "app.js")],
  outfile: path.join(dist, "src", "app.js"),
  bundle: true,
  format: "esm",
  target: ["chrome69", "safari12", "edge79"],
  minify: false,
  legalComments: "none",
  charset: "utf8",
  sourcemap: false
});

const cacheHash = createHash("sha256")
  .update(html)
  .update(await fs.readFile(path.join(dist, "src", "app.js")))
  .update(await fs.readFile(path.join(dist, "src", "styles.css")))
  .update(await fs.readFile(path.join(dist, "data", "regions.js")));
const panelFiles = await listFiles(path.join(dist, "assets", "panels"), "assets/panels");
const fontFiles = await listFiles(path.join(dist, "assets", "fonts"), "assets/fonts");
for (const filename of [...panelFiles, ...fontFiles].sort()) {
  cacheHash.update(filename).update(await fs.readFile(path.join(dist, filename)));
}
const cacheVersion = cacheHash.digest("hex").slice(0, 12);
html = html
  .replace('href="./src/styles.css"', `href="./src/styles.css?v=${cacheVersion}"`)
  .replace('src="./src/app.js"', `src="./src/app.js?v=${cacheVersion}"`);
await fs.writeFile(path.join(dist, "index.html"), html, "utf8");

const cacheCandidates = [
  "index.html",
  `src/styles.css?v=${cacheVersion}`,
  `src/app.js?v=${cacheVersion}`,
  "data/regions.js",
  "assets/gallery-manifest.json"
];
for (const directory of ["assets/intro", "assets/fonts", "assets/panels", "fixtures/full"]) {
  const absolute = path.join(dist, directory);
  try {
    const files = await listFiles(absolute, directory);
    cacheCandidates.push(...files);
  } catch {
    // 선택 애셋 폴더가 없어도 핵심 정적 빌드는 계속한다.
  }
}
let worker = await fs.readFile(path.join(root, "src", "service-worker.js"), "utf8");
worker = worker
  .replace("__CACHE_VERSION__", cacheVersion)
  .replace("__PRECACHE__", JSON.stringify(cacheCandidates.map((file) => `./${file}`), null, 2));
await fs.writeFile(path.join(dist, "service-worker.js"), worker, "utf8");
await fs.writeFile(path.join(dist, ".nojekyll"), "", "utf8");

const builtFiles = await listFiles(dist);
for (const filename of builtFiles.filter((file) => /\.(?:html|css|js)$/i.test(file))) {
  const source = await fs.readFile(path.join(dist, filename), "utf8");
  const externalResource = /(?:src|href)\s*=\s*["']https?:\/\//i.test(source)
    || /url\(\s*["']?https?:\/\//i.test(source)
    || /(?:fetch|importScripts)\(\s*["']https?:\/\//i.test(source);
  if (externalResource) {
    throw new Error(`외부 URL 참조가 빌드에 남아 있습니다: ${filename}`);
  }
}
console.log(`built: ${dist} (offline cache ${cacheVersion})`);
