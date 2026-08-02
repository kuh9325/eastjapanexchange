import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import {
  BRANCHES,
  BRANCH_KEYS,
  CATEGORY_KEYS,
  COUNTRY_CONTEXT,
  MAP_ATTRIBUTION,
  MAP_VIEWBOX,
  municipalityNames
} from "../data/regions.js";

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

  assert.equal(COUNTRY_CONTEXT.length, 17, "전국 17개 시도 path가 모두 있어야 합니다.");
  assert.deepEqual(MAP_VIEWBOX, { x: 0, y: 0, width: 780, height: 760 });
  assert.equal(MAP_ATTRIBUTION, "통계청 SGIS 2020 행정구역 경계 기반, 전시용 단순화");

  assert.deepEqual(municipalityNames("chungnam"), [
    "공주시", "논산시", "당진시", "보령시", "부여군", "서산시", "서천군",
    "아산시", "예산군", "천안시 동남구", "천안시 서북구", "청양군", "태안군", "홍성군"
  ]);
  assert.deepEqual(municipalityNames("chungbuk"), [
    "괴산군", "단양군", "보은군", "음성군", "제천시", "증평군",
    "진천군", "청주시 상당구", "청주시 서원구", "청주시 청원구", "청주시 흥덕구", "충주시", "영월군"
  ]);
  assert.deepEqual(municipalityNames("daejeon"), [
    "대덕구", "동구", "서구", "유성구", "중구", "세종시", "계룡시", "금산군", "옥천군"
  ]);
  assert.equal(municipalityNames("chungnam").some((name) => ["계룡시", "금산군"].includes(name)), false);
  assert.equal(municipalityNames("chungbuk").includes("옥천군"), false);
  assert.equal(municipalityNames("chungbuk").includes("영동군"), false);
  assert.equal(Object.values(BRANCHES).some((branch) => branch.municipalities.some(({ name }) => name === "영동군")), false);
  assert.deepEqual(BRANCHES.chungnam.zones, ["백제권", "서해권", "천안권"]);
  assert.deepEqual(BRANCHES.chungbuk.zones, ["동청주권", "서청주권", "제천권", "충주권"]);
  assert.deepEqual(BRANCHES.daejeon.zones, ["남대전권", "대전권", "서대전권", "세종권"]);
  assert.equal(BRANCHES.chungbuk.municipalities.find(({ name }) => name === "영월군")?.parent, "강원도");
  const municipalityIds = Object.values(BRANCHES).flatMap((branch) => branch.municipalities.map(({ id }) => id));
  assert.equal(new Set(municipalityIds).size, municipalityIds.length, "시군 도형은 한 방면에만 속해야 합니다.");
  assert.equal(municipalityIds.length, 36, "지도 범위용 36개 시군구 path가 모두 한 번씩 분류되어야 합니다.");
  assert.ok(
    BRANCHES.chungnam.municipalities.find(({ name }) => name === "태안군").path.match(/M/g).length > 1,
    "섬과 다중 폴리곤 subpath를 보존해야 합니다."
  );
  for (const [branchKey, branch] of Object.entries(BRANCHES)) {
    const municipalSegments = branch.municipalities.reduce((total, item) => total + (item.path.match(/L/g) || []).length, 0);
    const outlineSegments = branch.outlinePaths.reduce((total, item) => total + (item.match(/L/g) || []).length, 0);
    assert.ok(branch.outlinePaths.length > 0, `${branchKey} dissolve outline이 있어야 합니다.`);
    assert.ok(outlineSegments < municipalSegments, `${branchKey} outline에서 내부 중복선을 제거해야 합니다.`);
  }

  for (const sourceFile of [
    "전국_시도_경계.svg",
    "충청남도_시군구_경계.svg",
    "충청북도_시군구_경계.svg",
    "대전광역시_시군구_경계.svg",
    "세종특별자치시_시군구_경계.svg",
    "강원도_시군구_경계.svg"
  ]) {
    await fs.access(path.join(root, "data", "vendor", "statgarten-maps", "svg", "simple", sourceFile));
  }

  const generatedBefore = await fs.readFile(path.join(root, "data", "regions.js"), "utf8");
  await exec(process.execPath, [path.join(root, "scripts", "generate-map-data.mjs")]);
  const generatedAfter = await fs.readFile(path.join(root, "data", "regions.js"), "utf8");
  assert.equal(generatedAfter, generatedBefore, "동일한 원본에서 regions.js가 결정적으로 생성되어야 합니다.");

  await exec(process.execPath, ["--check", path.join(root, "src", "app.js")]);
  const sourceStyles = await fs.readFile(path.join(root, "src", "styles.css"), "utf8");
  assert.doesNotMatch(sourceStyles, /\.branch-region:hover[^{]*\{[^}]*transform\s*:/s, "hover 상태에서 방면을 확대하면 안 됩니다.");
  assert.match(sourceStyles, /\.branch-region\.selected\s*\{[^}]*transform:\s*scale\(1\.035\)/s, "선택된 방면만 3.5% 확대해야 합니다.");
  await exec(process.execPath, [path.join(root, "scripts", "build.mjs")]);
  const builtHtml = await fs.readFile(path.join(root, "dist", "index.html"), "utf8");
  assert.match(builtHtml, /href="\.\/src\/styles\.css"/);
  assert.match(builtHtml, /src="\.\/src\/app\.js"/);
  await fs.access(path.join(root, "dist", ".nojekyll"));
  await fs.access(path.join(root, "dist", "assets", "gallery-manifest.json"));
  await assert.rejects(fs.access(path.join(root, "dist", "data", "vendor")));

  console.log("verify: SGIS 지도, dissolve 외곽선, manifest, 방면 예외, 문법, dist 정적 빌드 통과");
} finally {
  await fs.rm(fixtureRoot, { recursive: true, force: true });
}
