import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";

const exec = promisify(execFile);
const argumentsMap = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  argumentsMap.set(process.argv[index], process.argv[index + 1]);
}

const sourceRoot = argumentsMap.get("--source");
const inventoryPath = argumentsMap.get("--inventory");
if (!sourceRoot || !inventoryPath) {
  throw new Error("--source <다운로드 폴더>와 --inventory <JSON>이 필요합니다.");
}
const outputRoot = path.resolve(argumentsMap.get("--output") || "assets/gallery");
const thumbnailRoot = path.resolve(argumentsMap.get("--thumbnail-output") || "assets/gallery-thumbnails");
const maxDimension = argumentsMap.get("--max-dimension") || "2000";
const quality = argumentsMap.get("--quality") || "82";
const thumbnailDimension = argumentsMap.get("--thumbnail-dimension") || "720";
const thumbnailQuality = argumentsMap.get("--thumbnail-quality") || "72";
const outputFormat = argumentsMap.get("--format") || "webp";
const force = argumentsMap.get("--force") === "true";
if (!new Set(["webp", "jpeg"]).has(outputFormat)) {
  throw new Error("--format은 webp 또는 jpeg를 사용하세요.");
}
const inventory = JSON.parse(await fs.readFile(path.resolve(inventoryPath), "utf8"));
const extensions = Object.freeze({
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/heif": ".heif",
  "image/heic": ".heic"
});

function safeStem(filename) {
  return path.basename(filename, path.extname(filename))
    .normalize("NFC")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

let imported = 0;
let reused = 0;
let thumbnailImported = 0;
let thumbnailReused = 0;
for (const item of inventory.files) {
  const extension = extensions[item.mimeType];
  if (!extension) continue;
  const source = path.join(path.resolve(sourceRoot), item.branch, item.category, item.zone, `${item.id}${extension}`);
  const destinationDirectory = path.join(outputRoot, item.branch, item.category, item.zone);
  const outputExtension = outputFormat === "webp" ? ".webp" : ".jpg";
  const outputStem = `${safeStem(item.title)}-${item.id.slice(0, 8)}`;
  const destination = path.join(destinationDirectory, `${outputStem}${outputExtension}`);
  await fs.mkdir(destinationDirectory, { recursive: true });
  let destinationReady = false;
  if (!force) {
    try {
      const stat = await fs.stat(destination);
      if (stat.size > 0) {
        reused += 1;
        destinationReady = true;
      }
    } catch {}
  }
  if (!destinationReady) {
    let conversionSource = source;
    let decodedSource = null;
    if (item.mimeType === "image/heif" || item.mimeType === "image/heic") {
      decodedSource = `${destination}.decoded.jpg`;
      await exec("heif-convert", ["-q", quality, source, decodedSource]);
      conversionSource = decodedSource;
    }
    const pipeline = sharp(conversionSource)
      .rotate()
      .resize({
        width: Number(maxDimension),
        height: Number(maxDimension),
        fit: "inside",
        withoutEnlargement: true
      });
    if (outputFormat === "webp") {
      await pipeline.webp({ quality: Number(quality), effort: 5, smartSubsample: true }).toFile(destination);
    } else {
      await pipeline.jpeg({ quality: Number(quality), mozjpeg: true }).toFile(destination);
    }
    if (decodedSource) await fs.rm(decodedSource, { force: true });
    imported += 1;
  }

  const thumbnailDirectory = path.join(thumbnailRoot, item.branch, item.category, item.zone);
  const thumbnailDestination = path.join(thumbnailDirectory, `${outputStem}.webp`);
  let thumbnailReady = false;
  if (!force) {
    try {
      const stat = await fs.stat(thumbnailDestination);
      if (stat.size > 0) {
        thumbnailReused += 1;
        thumbnailReady = true;
      }
    } catch {}
  }
  if (!thumbnailReady) {
    await fs.mkdir(thumbnailDirectory, { recursive: true });
    await sharp(destination)
      .rotate()
      .resize({
        width: Number(thumbnailDimension),
        height: Number(thumbnailDimension),
        fit: "inside",
        withoutEnlargement: true
      })
      .webp({ quality: Number(thumbnailQuality), effort: 4, smartSubsample: true })
      .toFile(thumbnailDestination);
    thumbnailImported += 1;
  }
}

console.log(`Drive gallery import: ${imported} converted to ${outputFormat}, ${reused} reused → ${outputRoot}`);
console.log(`Drive gallery thumbnails: ${thumbnailImported} generated, ${thumbnailReused} reused → ${thumbnailRoot}`);
