import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { BRANCHES, BRANCH_KEYS, CATEGORY_KEYS, municipalityNames } from "../data/regions.js";

const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "eastjapan-gallery-"));
const galleryRoot = path.join(fixtureRoot, "gallery");
const outputPath = path.join(fixtureRoot, "gallery-manifest.json");
const tinyPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");

try {
  for (const branch of BRANCH_KEYS) {
    for (const category of CATEGORY_KEYS) {
      const directory = path.join(galleryRoot, branch, category);
      await fs.mkdir(directory, { recursive: true });
      await fs.writeFile(path.join(directory, `2026-08-02_${branch}_${category}.png`), tinyPng);
    }
  }
  await fs.writeFile(path.join(galleryRoot, "chungnam", "discussion", "ignored.gif"), tinyPng);
  await fs.writeFile(
    path.join(galleryRoot, "daejeon", "future", "captions.json"),
    JSON.stringify({
      "2026-08-02_daejeon_future.png": {
        caption: "대전방면 청년미래총회",
        alt: "청년미래총회에서 함께 기념 촬영한 참가자들"
      }
    })
  );

  await exec(process.execPath, [
    path.join(root, "scripts", "generate-gallery-manifest.mjs"),
    "--gallery-root", galleryRoot,
    "--output", outputPath,
    "--src-prefix", "./fixtures"
  ]);
  const manifest = JSON.parse(await fs.readFile(outputPath, "utf8"));
  assert.equal(manifest.photos.length, BRANCH_KEYS.length * CATEGORY_KEYS.length, "지원 이미지 12개만 포함해야 합니다.");
  for (const branch of BRANCH_KEYS) {
    for (const category of CATEGORY_KEYS) {
      assert.equal(
        manifest.photos.filter((photo) => photo.branch === branch && photo.category === category).length,
        1,
        `${branch}/${category} 필터 결과가 정확해야 합니다.`
      );
    }
  }
  assert.equal(manifest.photos.some(({ filename }) => filename === "ignored.gif"), false, "GIF는 지원 형식이 아닙니다.");
  const override = manifest.photos.find((photo) => photo.branch === "daejeon" && photo.category === "future");
  assert.equal(override.caption, "대전방면 청년미래총회");
  assert.equal(override.alt, "청년미래총회에서 함께 기념 촬영한 참가자들");

  assert.deepEqual(municipalityNames("daejeon"), ["세종", "대전", "계룡", "금산", "옥천"]);
  assert.equal(municipalityNames("chungnam").some((name) => ["계룡", "금산"].includes(name)), false);
  assert.equal(municipalityNames("chungbuk").includes("옥천"), false);
  const municipalityIds = Object.values(BRANCHES).flatMap((branch) => branch.municipalities.map(({ id }) => id));
  assert.equal(new Set(municipalityIds).size, municipalityIds.length, "시군 도형은 한 방면에만 속해야 합니다.");

  await exec(process.execPath, ["--check", path.join(root, "src", "app.js")]);
  await exec(process.execPath, [path.join(root, "scripts", "build.mjs")]);
  const builtHtml = await fs.readFile(path.join(root, "dist", "index.html"), "utf8");
  assert.match(builtHtml, /href="\.\/src\/styles\.css"/);
  assert.match(builtHtml, /src="\.\/src\/app\.js"/);
  await fs.access(path.join(root, "dist", ".nojekyll"));
  await fs.access(path.join(root, "dist", "assets", "gallery-manifest.json"));

  console.log("verify: manifest, 방면 예외, 문법, dist 정적 빌드 통과");
} finally {
  await fs.rm(fixtureRoot, { recursive: true, force: true });
}
