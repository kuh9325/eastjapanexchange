import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BRANCH_KEYS, CATEGORY_KEYS } from "../data/regions.js";
import { DEPARTMENT_LABELS, inferDepartment } from "../data/gallery-metadata.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argumentsMap = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  argumentsMap.set(process.argv[index], process.argv[index + 1]);
}

const galleryRoot = path.resolve(argumentsMap.get("--gallery-root") || path.join(root, "assets", "gallery"));
const outputPath = path.resolve(argumentsMap.get("--output") || path.join(root, "assets", "gallery-manifest.json"));
const sourcePrefix = argumentsMap.get("--src-prefix") || "./assets/gallery";
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

function naturalSort(a, b) {
  return a.localeCompare(b, "ko", { numeric: true, sensitivity: "base" });
}

function filenameToCaption(filename) {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/^\d{4}[-_.]?\d{2}[-_.]?\d{2}[-_ ]?/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "청년 활동의 순간";
}

async function readCaptions(directory) {
  const captionsPath = path.join(directory, "captions.json");
  try {
    const raw = await fs.readFile(captionsPath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      throw new TypeError("최상위 값은 객체여야 합니다.");
    }
    return parsed;
  } catch (error) {
    if (error.code === "ENOENT") return {};
    console.warn(`[captions] ${captionsPath}: ${error.message} — 기본 캡션을 사용합니다.`);
    return {};
  }
}

async function readImageEntries(directory, relativeDirectory = "") {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const images = [];
  for (const entry of entries.sort((a, b) => naturalSort(a.name, b.name))) {
    const relativePath = path.join(relativeDirectory, entry.name);
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      images.push(...await readImageEntries(absolutePath, relativePath));
    } else if (entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase())) {
      images.push({ name: entry.name, relativePath, directory });
    }
  }
  return images;
}

const encodedPath = (...segments) => segments
  .flatMap((segment) => String(segment).split(path.sep))
  .map((segment) => encodeURIComponent(segment))
  .join("/");

const photos = [];
for (const branch of BRANCH_KEYS) {
  for (const category of CATEGORY_KEYS) {
    const directory = path.join(galleryRoot, branch, category);
    await fs.mkdir(directory, { recursive: true });
    const entries = await readImageEntries(directory);
    const captionsByDirectory = new Map();

    for (const entry of entries) {
      if (!captionsByDirectory.has(entry.directory)) {
        captionsByDirectory.set(entry.directory, await readCaptions(entry.directory));
      }
      const captions = captionsByDirectory.get(entry.directory);
      const fallbackCaption = filenameToCaption(entry.name);
      const configured = captions[entry.name];
      const metadata = configured && typeof configured === "object" ? configured : {};
      const pathSegments = entry.relativePath.split(path.sep);
      const inferredDepartment = inferDepartment(entry.name);
      const department = Object.hasOwn(DEPARTMENT_LABELS, metadata.department)
        ? metadata.department
        : inferredDepartment;
      photos.push({
        id: `${branch}-${category}-${pathSegments.join("-")}`,
        branch,
        category,
        filename: entry.name,
        zone: pathSegments.length > 1 ? pathSegments[0] : null,
        department,
        src: `${sourcePrefix}/${encodedPath(branch, category, entry.relativePath)}`,
        caption: typeof metadata.caption === "string" && metadata.caption.trim() ? metadata.caption.trim() : fallbackCaption,
        alt: typeof metadata.alt === "string" && metadata.alt.trim()
          ? metadata.alt.trim()
          : (typeof metadata.caption === "string" && metadata.caption.trim() ? metadata.caption.trim() : fallbackCaption)
      });
    }
  }
}

let generatedAt = new Date().toISOString();
try {
  const existing = JSON.parse(await fs.readFile(outputPath, "utf8"));
  if (existing && existing.generatedAt && JSON.stringify(existing.photos) === JSON.stringify(photos)) {
    generatedAt = existing.generatedAt;
  }
} catch {
  // 첫 생성이거나 기존 manifest가 손상된 경우 현재 생성 시각을 사용한다.
}

const manifest = {
  version: 1,
  generatedAt,
  photos
};
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`gallery manifest: ${photos.length} photo(s) → ${outputPath}`);
