import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argumentsMap = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  argumentsMap.set(process.argv[index], process.argv[index + 1]);
}

const sourceRoot = path.resolve(argumentsMap.get("--source") || path.join(root, "assets", "gallery"));
const outputRoot = path.resolve(argumentsMap.get("--output") || path.join(root, "assets", "gallery-thumbnails"));
const maxDimension = Number(argumentsMap.get("--max-dimension") || 720);
const quality = Number(argumentsMap.get("--quality") || 72);
const force = argumentsMap.get("--force") === "true";
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

async function listImages(directory, relativeDirectory = "") {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = path.join(relativeDirectory, entry.name);
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listImages(absolutePath, relativePath));
    else if (entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase())) files.push(relativePath);
  }
  return files.sort((a, b) => a.localeCompare(b, "ko", { numeric: true, sensitivity: "base" }));
}

const sources = await listImages(sourceRoot);
let cursor = 0;
let generated = 0;
let reused = 0;

async function createNext() {
  while (cursor < sources.length) {
    const relativeSource = sources[cursor];
    cursor += 1;
    const relativeThumbnail = relativeSource.replace(/\.[^.]+$/, ".webp");
    const source = path.join(sourceRoot, relativeSource);
    const destination = path.join(outputRoot, relativeThumbnail);
    if (!force) {
      try {
        const stat = await fs.stat(destination);
        if (stat.size > 0) {
          reused += 1;
          continue;
        }
      } catch {}
    }
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await sharp(source)
      .rotate()
      .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true })
      .webp({ quality, effort: 4, smartSubsample: true })
      .toFile(destination);
    generated += 1;
  }
}

await Promise.all(Array.from({ length: Math.min(4, Math.max(1, sources.length)) }, () => createNext()));
console.log(`gallery thumbnails: ${generated} generated, ${reused} reused → ${outputRoot}`);
