import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const galleryRoot = path.join(root, "assets", "gallery");
const outputPath = path.join(root, "assets", "gallery-manifest.json");
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);
const branchKeys = ["chungnam", "chungbuk", "daejeon"];
const categoryKeys = ["discussion", "school", "future", "daily"];

function naturalSort(a, b) {
  return a.localeCompare(b, "ko", { numeric: true, sensitivity: "base" });
}

function filenameToCaption(filename) {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/^\d{4}[-_.]?\d{2}[-_.]?\d{2}[-_ ]?/, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

async function readCaptions(directory) {
  try {
    const raw = await fs.readFile(path.join(directory, "captions.json"), "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

const photos = [];
for (const branch of branchKeys) {
  for (const category of categoryKeys) {
    const directory = path.join(galleryRoot, branch, category);
    await fs.mkdir(directory, { recursive: true });
    const captions = await readCaptions(directory);
    const entries = (await fs.readdir(directory, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase()))
      .sort((a, b) => naturalSort(a.name, b.name));

    for (const entry of entries) {
      const metadata = captions[entry.name] || {};
      photos.push({
        id: `${branch}-${category}-${entry.name}`,
        branch,
        category,
        filename: entry.name,
        src: `./assets/gallery/${branch}/${category}/${encodeURIComponent(entry.name)}`,
        caption: metadata.caption || filenameToCaption(entry.name),
        alt: metadata.alt || metadata.caption || filenameToCaption(entry.name)
      });
    }
  }
}

const manifest = {
  generatedAt: new Date().toISOString(),
  photos
};
await fs.writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`gallery manifest: ${photos.length} photo(s)`);
