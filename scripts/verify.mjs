import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import {
  BRANCHES,
  BRANCH_KEYS,
  CATEGORIES,
  CATEGORY_KEYS,
  COUNTRY_CONTEXT,
  MAP_ATTRIBUTION,
  MAP_DISPLAY_VIEWBOX,
  MAP_FOCUS_VIEWBOX,
  MAP_LANDMARKS,
  MAP_VIEWBOX,
  municipalityNames
} from "../data/regions.js";
import { ADMIN_SOURCES } from "../data/region-config.js";
import { EXHIBITION_CONTENT } from "../data/exhibition-content.js";
import { INTRO_ROUTE } from "../data/intro-route.js";
import { UI_COPY } from "../data/ui-copy.js";
import {
  DEPARTMENT_LABELS,
  inferDepartment,
  ZONE_LABELS
} from "../data/gallery-metadata.js";
import {
  EMPTY_FIXTURE_CONTENT,
  EMPTY_FIXTURE_MANIFEST,
  FULL_FIXTURE_CONTENT,
  FULL_FIXTURE_MANIFEST
} from "../data/fixture-content.js";

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
  const nestedDirectory = path.join(galleryRoot, "chungnam", "school", "baekje");
  await fs.mkdir(nestedDirectory, { recursive: true });
  await fs.writeFile(path.join(nestedDirectory, "nested.png"), tinyPng);
  await fs.writeFile(path.join(galleryRoot, "chungnam", "school", "ignored.gif"), tinyPng);
  await fs.writeFile(
    path.join(galleryRoot, "daejeon", "school", "captions.json"),
    JSON.stringify({
      "2026-08-02_daejeon_school.png": {
        caption: "대전방면 창가청년스쿨",
        alt: "창가청년스쿨에서 함께 기념 촬영한 참가자들",
        department: "women"
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
  assert.equal(manifest.photos.length, BRANCH_KEYS.length * CATEGORY_KEYS.length + 1, "방면별 두 카테고리와 권별 하위 폴더의 지원 이미지만 포함해야 합니다.");
  for (const branch of BRANCH_KEYS) {
    for (const category of CATEGORY_KEYS) {
      assert.equal(
        manifest.photos.filter((photo) => photo.branch === branch && photo.category === category).length,
        branch === "chungnam" && category === "school" ? 2 : 1,
        `${branch}/${category} 필터 결과가 정확해야 합니다.`
      );
    }
  }
  assert.equal(manifest.photos.some(({ filename }) => filename === "ignored.gif"), false, "GIF는 지원 형식이 아닙니다.");
  const nested = manifest.photos.find(({ filename }) => filename === "nested.png");
  assert.equal(nested.zone, "baekje", "권별 하위 폴더명은 manifest의 zone 메타데이터로 보존해야 합니다.");
  assert.equal(nested.department, "youth", "부서 표식이 없는 파일은 청년부 공통으로 안전하게 분류해야 합니다.");
  assert.match(nested.src, /chungnam\/school\/baekje\/nested\.png$/);
  const override = manifest.photos.find((photo) => photo.branch === "daejeon" && photo.category === "school");
  assert.equal(override.caption, "대전방면 창가청년스쿨");
  assert.equal(override.alt, "창가청년스쿨에서 함께 기념 촬영한 참가자들");
  assert.equal(override.department, "women", "captions.json의 명시적 부서가 파일명 추론보다 우선해야 합니다.");
  assert.equal(inferDepartment("(남)충주권 창가청년스쿨-01.jpg"), "men");
  assert.equal(inferDepartment("여) 충주권 일대일근행회-01.jpg"), "women");
  assert.equal(inferDepartment("충주권 창가청년스쿨-01.jpg"), "youth");

  assert.equal(COUNTRY_CONTEXT.length, 17, "전국 17개 시도 path가 모두 있어야 합니다.");
  assert.deepEqual(MAP_VIEWBOX, { x: 0, y: 0, width: 780, height: 760 });
  assert.deepEqual(MAP_DISPLAY_VIEWBOX, { x: 20, y: 28, width: 720, height: 700 }, "표시 viewBox는 독도 표식까지 포함해야 합니다.");
  assert.deepEqual(MAP_FOCUS_VIEWBOX, { x: 145, y: 150, width: 350, height: 300 }, "활동 화면에서는 세 방면을 중심으로 지도를 확대해야 합니다.");
  assert.deepEqual(MAP_LANDMARKS, [{ id: "dokdo", name: "독도", point: [724, 199] }], "원본에 없는 독도는 실제 상대 위치의 점으로 보완해야 합니다.");
  assert.equal(MAP_ATTRIBUTION, "통계청 SGIS 2020 행정구역 경계 기반, 전시용 단순화");
  assert.deepEqual(CATEGORY_KEYS, ["school", "visit"], "활동 카테고리는 창가청년스쿨과 일대일근행회만 제공해야 합니다.");
  assert.deepEqual(CATEGORIES.school, { name: "창가청년스쿨", shortName: "청년스쿨", nameJa: "創価青年スクール", shortNameJa: "青年スクール" });
  assert.deepEqual(CATEGORIES.visit, { name: "일대일근행회", shortName: "근행회", nameJa: "一対一勤行会", shortNameJa: "勤行会" });
  assert.equal(UI_COPY.ko.school, "창가청년스쿨");
  assert.equal(UI_COPY.ko.visit, "일대일근행회");
  assert.equal(UI_COPY.ja.school, "創価青年スクール");
  assert.equal(UI_COPY.ja.visit, "一対一勤行会");
  assert.equal(UI_COPY.ko.collapseIntroduction, "소개 접기");
  assert.equal(UI_COPY.ko.expandIntroduction, "소개 펼치기");
  assert.equal(UI_COPY.ja.collapseIntroduction, "紹介を閉じる");
  assert.equal(UI_COPY.ja.expandIntroduction, "紹介を開く");
  assert.equal(ZONE_LABELS.chungju.ja, "忠州圏");
  assert.equal(DEPARTMENT_LABELS.men.ja, "男子部");
  assert.equal(DEPARTMENT_LABELS.women.ja, "女子部");

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
  assert.notEqual(ADMIN_SOURCES.find(({ province }) => province === "충청남도")?.coverageFromIncludedUnits, true, "충남 외곽 색면은 전국 시도 SVG 경계와 정확히 일치해야 합니다.");
  assert.equal(ADMIN_SOURCES.find(({ province }) => province === "충청남도")?.alignProjectionByLargestPolygon, true, "충남은 서해 섬이 아닌 본토 polygon을 기준으로 전국 지도에 정렬해야 합니다.");
  assert.deepEqual(BRANCHES.chungnam.zones, ["백제권", "서해권", "천안권"]);
  assert.deepEqual(BRANCHES.chungbuk.zones, ["동청주권", "서청주권", "제천권", "충주권"]);
  assert.deepEqual(BRANCHES.daejeon.zones, ["남대전권", "대전권", "서대전권", "세종권"]);
  assert.equal(BRANCHES.chungbuk.municipalities.find(({ name }) => name === "영월군")?.parent, "강원도");
  assert.equal(BRANCHES.chungnam.fillPaths.length, 3, "충남의 서해 섬은 보존하고 대전 쪽 boolean 잔여 조각은 제거해야 합니다.");
  assert.ok(BRANCHES.chungbuk.fillPaths.length <= 3, "충북 색면에 옥천·영동 제거 과정의 작은 잔여 조각이 남으면 안 됩니다.");
  const municipalityIds = Object.values(BRANCHES).flatMap((branch) => branch.municipalities.map(({ id }) => id));
  assert.equal(new Set(municipalityIds).size, municipalityIds.length, "시군 도형은 한 방면에만 속해야 합니다.");
  assert.equal(municipalityIds.length, 36, "지도 범위용 36개 시군구 path가 모두 한 번씩 분류되어야 합니다.");
  assert.ok(
    BRANCHES.chungnam.municipalities.find(({ name }) => name === "태안군").path.match(/M/g).length > 1,
    "섬과 다중 폴리곤 subpath를 보존해야 합니다."
  );
  for (const [branchKey, branch] of Object.entries(BRANCHES)) {
    const outlineSegments = branch.outlinePaths.reduce((total, item) => total + (item.match(/L/g) || []).length, 0);
    assert.ok(branch.fillPaths.length > 0, `${branchKey} 전국 경계 기반 색면이 있어야 합니다.`);
    assert.ok(branch.outlinePaths.length > 0, `${branchKey} dissolve outline이 있어야 합니다.`);
    assert.ok(outlineSegments > 0, `${branchKey} outline에 실제 경계 선분이 있어야 합니다.`);
    assert.deepEqual(branch.outlinePaths, branch.fillPaths, `${branchKey} outline은 최종 방면 색면의 모든 경계를 빠짐없이 따라야 합니다.`);
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
  await exec(process.execPath, ["--check", path.join(root, "src", "intro.js")]);
  await exec(process.execPath, ["--check", path.join(root, "src", "compatibility.js")]);
  const sourceStyles = await fs.readFile(path.join(root, "src", "styles.css"), "utf8");
  const sourceHtml = await fs.readFile(path.join(root, "index.html"), "utf8");
  const sourceApp = await fs.readFile(path.join(root, "src", "app.js"), "utf8");
  const sourceIntro = await fs.readFile(path.join(root, "src", "intro.js"), "utf8");
  const sourceBuild = await fs.readFile(path.join(root, "scripts", "build.mjs"), "utf8");
  const sourceIntroMap = await fs.readFile(path.join(root, "assets", "intro", "korea.svg"), "utf8");
  assert.doesNotMatch(sourceStyles, /\.branch-region:hover[^{]*\{[^}]*transform\s*:/s, "hover 상태에서 방면을 확대하면 안 됩니다.");
  assert.doesNotMatch(sourceStyles, /\.branch-region[^}]*transform-box:\s*fill-box/s, "iOS Safari에서 SVG fill-box 기준 확대를 사용하면 방면이 오프셋될 수 있습니다.");
  assert.match(sourceApp, /const SELECTED_BRANCH_SCALE = 1\.035;/, "선택된 방면만 3.5% 확대해야 합니다.");
  assert.match(sourceApp, /translate\(\$\{centerX\} \$\{centerY\}\) scale\(\$\{SELECTED_BRANCH_SCALE\}\) translate\(\$\{-centerX\} \$\{-centerY\}\)/, "확대 전후 방면 중심이 움직이지 않는 SVG transform을 사용해야 합니다.");
  assert.match(sourceApp, /class:\s*["']branch-zoom-viewport["'][\s\S]*?["']clip-path["']:\s*`url\(#\$\{clipId\}\)`/, "선택 확대는 원래 방면 경계 안으로 제한해야 합니다.");
  assert.match(sourceApp, /const zoomLayer = region\.querySelector\("\.branch-zoom-layer"\)[\s\S]*zoomLayer\.setAttribute\(\s*["']transform["']/, "선택 확대는 외곽선이 아니라 경계 안 색면·내부선에만 적용해야 합니다.");
  assert.doesNotMatch(sourceApp, /region\.setAttribute\(\s*["']transform["']/, "선택 시 방면 외곽선 그룹 전체를 확대하면 제외 경계가 다른 방면 위로 이동합니다.");
  assert.match(sourceStyles, /\.exhibition\s*\{[^}]*height:\s*100vh/s, "100vh 기본값이 있어야 합니다.");
  assert.match(sourceStyles, /@supports\s*\(height:\s*100dvh\)/, "지원 브라우저용 100dvh 향상이 있어야 합니다.");
  assert.match(sourceStyles, /\.gallery-panel\s*\{[^}]*overflow-y:\s*auto[^}]*overscroll-behavior:\s*contain/s, "오른쪽 패널만 스크롤되고 overscroll을 가둬야 합니다.");
  assert.match(sourceStyles, /\.gallery-panel\s*\{[^}]*touch-action:\s*pan-y/s, "오른쪽 패널은 실제 터치의 세로 스크롤을 허용해야 합니다.");
  assert.match(sourceApp, /function bindGalleryPointerDragScroll\(\)[\s\S]*event\.pointerType === ["']touch["'][\s\S]*galleryPanel\.scrollTop = galleryPointerDrag\.scrollTop - deltaY/, "마우스로 전달되는 전자칠판 터치 드래그도 세로 스크롤로 변환해야 합니다.");
  assert.match(sourceApp, /galleryDragClickBlockUntil = Date\.now\(\) \+ 350[\s\S]*event\.stopPropagation\(\)/, "드래그 직후 사진이 실수로 확대되지 않아야 합니다.");
  assert.match(sourceApp, /img\.draggable = false/, "갤러리 이미지는 브라우저의 기본 이미지 끌기를 시작하지 않아야 합니다.");
  assert.match(sourceApp, /addEventListener\(["']dragstart["'][\s\S]*event\.target\.closest\(["']img["']\)[\s\S]*event\.preventDefault\(\)/, "구형 브라우저에서도 이미지 dragstart를 차단해야 합니다.");
  assert.match(sourceStyles, /\.gallery-panel img\s*\{[^}]*-webkit-user-drag:\s*none[^}]*user-select:\s*none/s, "WebKit 계열에서도 갤러리 이미지 끌기와 선택을 막아야 합니다.");
  assert.doesNotMatch(sourceStyles, /\.activity-toolbar\s*\{[^}]*position:\s*sticky/s, "활동 제목과 카테고리 탭은 사진 화면을 가리지 않도록 스크롤되어야 합니다.");
  assert.match(sourceHtml, /class="activity-toolbar"[\s\S]*class="section-heading"[\s\S]*class="category-tabs"/, "활동 제목과 카테고리 탭은 하나의 일반 툴바로 묶어야 합니다.");
  assert.doesNotMatch(sourceApp, /syncGalleryStickyOffset|--gallery-header-height/, "활동 툴바용 고정 오프셋 로직을 남기면 안 됩니다.");
  assert.match(sourceHtml, /id="gallery-intro-toggle"[^>]*aria-expanded="true"[^>]*aria-controls="branch-introduction-details hall-card"/, "방면 소개 접기 버튼은 소개문과 회관 사진을 함께 제어해야 합니다.");
  assert.match(sourceApp, /function setIntroductionCollapsed\(collapsed\)[\s\S]*introductionDetails\.hidden = isIntroductionCollapsed[\s\S]*hallCard\.hidden = isIntroductionCollapsed/, "방면 소개를 접으면 소개문과 회관 사진을 모두 숨겨야 합니다.");
  assert.match(sourceStyles, /\.gallery-sticky-header\.is-collapsed\s*\{[^}]*grid-template-columns:\s*auto minmax\(0, 1fr\)/s, "접힌 방면 소개는 PC와 모바일에서 낮은 높이를 사용해야 합니다.");
  assert.match(sourceStyles, /\.exhibition\.has-selection \.stage\s*\{[^}]*grid-template-columns:\s*minmax\(420px,\s*30fr\)\s*minmax\(0,\s*70fr\)/s, "방면 선택 후 지도와 사진 영역은 3:7 비율이어야 합니다.");
  assert.match(sourceStyles, /\.map-panel\s*\{[^}]*min-width:\s*420px/s, "대형 화면의 축소된 지도 패널은 최소 420px을 유지해야 합니다.");
  assert.match(sourceStyles, /\.map-panel\s*\{[^}]*position:\s*sticky[^}]*height:\s*100%/s, "가로 화면의 왼쪽 지도 패널은 고정되어야 합니다.");
  assert.match(sourceStyles, /\.branch-switcher\s*\{[^}]*position:\s*absolute[^}]*top:\s*12px[^}]*flex-direction:\s*row/s, "방면 버튼은 지도 위쪽에 가로 오버레이로 배치해야 합니다.");
  assert.match(sourceHtml, /<div class="map-shell">\s*<nav class="branch-switcher"/s, "방면 버튼은 지도 안에 배치되어야 합니다.");
  assert.match(sourceStyles, /\.exhibition\.has-selection \.country-context\s*\{[^}]*opacity:\s*0\.2[^}]*filter:\s*blur\(2\.2px\)/s, "활동 화면에서 주변 지도는 흐리게 처리해야 합니다.");
  assert.match(sourceApp, /function setMapViewport\(focused\)[\s\S]*MAP_FOCUS_VIEWBOX[\s\S]*koreaMap\.setAttribute\("viewBox"/, "활동 화면 지도는 세 방면 중심 viewBox로 전환해야 합니다.");
  assert.match(sourceStyles, /\.branch-hit-area\s*\{[^}]*stroke-width:\s*52/s, "투명 hit-area를 52px 수준으로 확대해야 합니다.");
  assert.match(sourceStyles, /\.branch-halo\s*\{[^}]*stroke-width:\s*2\.5/s, "방면 외곽선은 기본 굵기 2.5px을 유지해야 합니다.");
  assert.doesNotMatch(sourceStyles, /\.branch-region\.selected \.branch-halo\s*\{[^}]*stroke-width/s, "선택 상태에서 외곽선 굵기만 별도로 키우면 안 됩니다.");
  assert.match(sourceStyles, /\.municipalities path\s*\{[^}]*fill:\s*none/s, "시군 도형은 외곽 색면을 덮지 않고 내부선으로만 표시해야 합니다.");
  assert.match(sourceApp, /branch\.fillPaths\.forEach/, "방면 색면은 전국 경계 기반 fillPaths로 렌더링해야 합니다.");
  assert.match(sourceApp, /clipPathUnits:\s*["']userSpaceOnUse["']/, "시군 내부선은 전국 경계 색면 안으로 클리핑해야 합니다.");
  assert.match(sourceApp, /class:\s*["']branch-hit-areas["'][\s\S]*?["']clip-path["']:\s*`url\(#\$\{clipId\}\)`/, "터치 hit-area도 방면 색면 안으로 클리핑해야 합니다.");
  assert.doesNotMatch(sourceApp, /class:\s*["']branch-outlines["'][\s\S]*?["']clip-path["']:/, "최종 색면에서 생성한 outline을 다시 clip하여 경계를 끊으면 안 됩니다.");
  assert.match(sourceStyles, /prefers-reduced-motion:\s*reduce/, "reduced motion 스타일이 있어야 합니다.");
  assert.match(sourceHtml, /<div class="lightbox"[^>]*role="dialog"[^>]*aria-modal="true"/, "사진 확대는 Android에서 안정적인 고정 오버레이를 사용해야 합니다.");
  assert.doesNotMatch(sourceHtml, /<dialog class="lightbox"/, "사진 확대에 브라우저별 native dialog 구현을 사용하면 안 됩니다.");
  assert.match(sourceStyles, /\.lightbox\s*\{[^}]*position:\s*fixed[^}]*top:\s*0[^}]*bottom:\s*0[^}]*height:\s*auto/s, "사진 확대 배경은 동적 viewport 단위 없이 화면 전체를 덮어야 합니다.");
  assert.doesNotMatch(sourceStyles, /\.lightbox[^}]*dvh/s, "사진 확대 높이는 Android 동적 주소창의 dvh 계산에 의존하면 안 됩니다.");
  assert.doesNotMatch(sourceStyles, /color-mix\(/, "color-mix에 의존하지 않아야 합니다.");
  assert.doesNotMatch(sourceStyles, /offset-path|motion-path/, "CSS motion path에 의존하지 않아야 합니다.");
  assert.doesNotMatch(sourceHtml, /city-label|municipality-list|지도 표시 행정구역/, "일반 화면에 행정구역 UI를 만들면 안 됩니다.");
  assert.doesNotMatch(sourceApp, /class:\s*["']city-label|pathTitle|municipality-list/, "일반 지도에 시군 이름/툴팁을 렌더링하면 안 됩니다.");
  assert.match(sourceApp, /data-debug-city/, "행정구역 식별자는 디버그 모드에서만 제공해야 합니다.");
  assert.match(sourceApp, /MAP_LANDMARKS\.forEach/, "독도 등 원본 보완 표식을 지도에 렌더링해야 합니다.");
  assert.match(sourceHtml, /id="intro-korea-layer"[^>]*href="\.\/assets\/intro\/korea\.svg"/, "인트로 대한민국 지도는 한 번 래스터화할 수 있는 외부 SVG 이미지여야 합니다.");
  assert.match(sourceIntroMap, /<circle[^>]*r="1\.6"/, "인트로 대한민국 지도에도 독도 위치점을 표시해야 합니다.");
  assert.match(sourceHtml, /id="map-landmark-layer"/, "지도에 원본 보완 표식 레이어가 있어야 합니다.");
  assert.match(sourceApp, /class:\s*"map-landmark-dot",\s*r:\s*1\.6/, "독도는 강조 장식 없이 작은 점으로 표시해야 합니다.");
  assert.doesNotMatch(sourceStyles, /map-landmark-ring|\.map-landmark text/, "독도 위치점에 강조 링이나 지도 라벨을 추가하면 안 됩니다.");
  assert.doesNotMatch(sourceHtml, /leader-section|4부 간부/, "4부 간부 사진 영역은 화면에서 제거해야 합니다.");
  assert.doesNotMatch(sourceApp, /renderLeaders|leaderGrid|leaderSection/, "4부 간부 렌더링 코드는 제거해야 합니다.");
  assert.match(sourceHtml, /id="hall-card"/, "방면 소개 옆에 회관 전경 사진 영역이 있어야 합니다.");
  assert.match(sourceApp, /function renderHall\(branchKey\)/, "방면별 회관 전경 사진을 렌더링해야 합니다.");
  assert.match(sourceIntro, /getTotalLength\(\)/);
  assert.match(sourceIntro, /getPointAtLength/);
  assert.doesNotMatch(sourceIntro, /const pointOnPath[\s\S]*?getTotalLength\(\)/, "인트로 프레임마다 SVG 경로 길이를 다시 계산하면 안 됩니다.");
  assert.match(sourceIntro, /cancelAnimationFrame/);
  assert.match(sourceIntro, /jincheon:\s*Object\.freeze\(\{ revealAt:\s*9500, move:\s*Object\.freeze\(\[10000, 11800\]\)/, "진천 핀이 먼저 나타난 뒤 인천에서 진천으로 이동해야 합니다.");
  assert.match(sourceIntro, /daejeon:\s*Object\.freeze\(\{ revealAt:\s*11800, move:\s*Object\.freeze\(\[12300, 14000\]\)/, "대전 핀이 먼저 나타난 뒤 대전 이동을 시작해야 합니다.");
  assert.match(sourceIntro, /const domesticTravelPoint[\s\S]*groundSegments\.jincheon[\s\S]*groundSegments\.daejeon/, "국내 이동은 인천→진천과 진천→대전 두 구간으로 분리해야 합니다.");
  assert.doesNotMatch(sourceIntro, /guro|show-guro|韓国SGI本部|ソウル九老/, "인트로 코드에서 구로 본부 경유를 완전히 제거해야 합니다.");
  assert.match(sourceIntro, /groundPath\.style\.strokeDashoffset = String\(groundPathLength \* \(1 - domesticRouteProgress\(elapsed\)\)\)/, "초록 점선은 경로를 재생성하지 않고 dash offset으로 이동 구간까지만 표시해야 합니다.");
  assert.doesNotMatch(sourceIntro, /domesticRouteD/, "인트로 프레임마다 국내 이동 SVG path를 재작성하면 안 됩니다.");
  assert.match(sourceIntro, /1000 \/ 30/, "Android·4K 환경은 안정적인 30fps 렌더링 상한을 사용해야 합니다.");
  assert.match(sourceHtml, /id="intro-ground-to-jincheon"[\s\S]*id="intro-ground-to-daejeon"/, "국내 이동용 두 SVG path가 있어야 합니다.");
  assert.doesNotMatch(sourceHtml, /intro-ground-to-guro|intro-point-guro|韓国SGI本部|ソウル九老/, "인트로 마크업에서 구로 본부 핀과 선분을 제거해야 합니다.");
  assert.match(sourceHtml, /id="intro-point-jincheon" class="intro-domestic-point"/);
  assert.match(sourceHtml, /id="intro-point-daejeon" class="intro-domestic-point"/);
  assert.ok(sourceHtml.indexOf("intro-korea-layer") < sourceHtml.indexOf("intro-japan-layer"), "SVG 그리기 순서에서 일본 지도가 대한민국보다 앞에 보여야 합니다.");
  assert.match(sourceHtml, /id="intro-plane"[\s\S]*?transform="scale\(\.78\)"[\s\S]*?M40 0C40-4/, "인트로 비행기는 여객기 실루엣 SVG를 사용해야 합니다.");
  assert.match(sourceStyles, /\.intro-plane\s*\{[^}]*color:\s*#315fc4[^}]*fill:\s*currentColor[^}]*background:\s*transparent/s, "새 비행기는 기존 코발트 색상과 투명 배경을 유지해야 합니다.");
  assert.match(sourceBuild, /createHash\("sha256"\)\s*\.update\(html\)/s, "HTML 변경도 오프라인 캐시 버전을 갱신해야 합니다.");
  assert.equal(INTRO_ROUTE.cts.latitude, 42.7752);
  assert.equal(INTRO_ROUTE.icn.latitude, 37.4602);
  assert.match(sourceHtml, /新千歳空港 → 仁川国際空港/);
  assert.doesNotMatch(sourceHtml, /KOREA × JAPAN YOUTH EXCHANGE|YOUTH ACTIVITIES|TOGETHER|>ACTIVITIES</, "방문객 화면에 장식용 영문 문구가 남으면 안 됩니다.");
  assert.doesNotMatch(sourceHtml, /Natural Earth|CTS → ICN|\bSGIS\b/, "인트로와 지도 출처에 영문 명칭·공항 코드가 노출되면 안 됩니다.");
  assert.doesNotMatch(sourceIntro, /CTS → ICN|\skm`/, "인트로의 동적 안내 문구는 일본어 전체 지명과 단위를 사용해야 합니다.");
  assert.doesNotMatch(sourceApp, /galleryKicker|branch\.english/, "방면 소개에 영문 소제목을 다시 표시하면 안 됩니다.");
  assert.ok(BRANCH_KEYS.every((key) => !("english" in BRANCHES[key])), "생성된 방면 데이터에 화면용 영문 이름을 남기면 안 됩니다.");
  assert.match(sourceHtml, /data-intro-skip/);
  assert.match(sourceHtml, /id="intro-replay"/);
  assert.deepEqual(INTRO_ROUTE.cts.scenePoint, [910.8, 102.22], "CTS는 일본 SVG의 신치토세공항 위치를 사용해야 합니다.");
  assert.deepEqual(INTRO_ROUTE.icn.mapPoint, [214.2, 185.6], "ICN은 대한민국 지도에서 영종도 공항 위치를 사용해야 합니다.");
  assert.equal("guro" in INTRO_ROUTE, false, "인트로 경로 데이터에 구로 본부가 남으면 안 됩니다.");
  assert.ok(INTRO_ROUTE.jincheon.mapPoint[0] >= 296.24 && INTRO_ROUTE.jincheon.mapPoint[0] <= 324.82, "진천연수원 지점은 진천군 가로 범위 안에 있어야 합니다.");
  assert.ok(INTRO_ROUTE.jincheon.mapPoint[1] >= 241.83 && INTRO_ROUTE.jincheon.mapPoint[1] <= 273.42, "진천연수원 지점은 진천군 세로 범위 안에 있어야 합니다.");
  assert.ok(INTRO_ROUTE.daejeon.mapPoint[0] >= 291.77 && INTRO_ROUTE.daejeon.mapPoint[0] <= 322.08, "대전문화회관 지점은 대전 도형 안에 있어야 합니다.");
  const introMarkup = sourceHtml.match(/<section class="intro-screen[\s\S]*?<\/section>/)?.[0] || "";
  assert.doesNotMatch(introMarkup, /[가-힣]/, "오프닝 화면에 한국어 문구가 남아 있으면 안 됩니다.");
  assert.match(sourceStyles, /\.intro-screen\.is-complete \.intro-map[\s\S]*visibility:\s*hidden/, "인트로 종료 중 서로 다른 대한민국 지도 레이어가 겹치면 안 됩니다.");

  assert.equal(EMPTY_FIXTURE_MANIFEST.photos.length, 0);
  assert.equal(FULL_FIXTURE_MANIFEST.photos.length, BRANCH_KEYS.length * 6, "full fixture는 방면별 활동 사진 6장을 제공해야 합니다.");
  for (const branchKey of BRANCH_KEYS) {
    assert.equal(FULL_FIXTURE_MANIFEST.photos.filter(({ branch }) => branch === branchKey).length, 6);
    assert.ok(FULL_FIXTURE_CONTENT[branchKey].hallPhoto, "full fixture 회관 전경 사진이 있어야 합니다.");
    assert.ok(FULL_FIXTURE_CONTENT[branchKey].meetingPhoto, "full fixture 단체사진이 있어야 합니다.");
    assert.equal(EMPTY_FIXTURE_CONTENT[branchKey].hallPhoto, null);
    assert.equal(EMPTY_FIXTURE_CONTENT[branchKey].meetingPhoto, null);
    assert.ok(EXHIBITION_CONTENT[branchKey].hallPhoto, "프로덕션 회관 전경 사진 슬롯이 있어야 합니다.");
    assert.match(EXHIBITION_CONTENT[branchKey].hallPhoto.photo, /\/exterior\.webp$/, "프로덕션 회관 전경은 WebP 애셋을 사용해야 합니다.");
    await fs.access(path.join(root, EXHIBITION_CONTENT[branchKey].hallPhoto.photo.replace(/^\.\//, "")));
    assert.ok(EXHIBITION_CONTENT[branchKey].slogan, "프로덕션 한국어 슬로건이 있어야 합니다.");
    assert.ok(EXHIBITION_CONTENT[branchKey].sloganJa, "프로덕션 일본어 슬로건이 있어야 합니다.");
    assert.ok(EXHIBITION_CONTENT[branchKey].introductionJa, "프로덕션 일본어 소개문이 있어야 합니다.");
  }
  assert.equal(EXHIBITION_CONTENT.chungnam.slogan, "백제에서 미래로 — 문화의 은혜를 평화의 우정으로");
  assert.equal(EXHIBITION_CONTENT.chungnam.sloganJa, "百済から未来へ―文化の恩を平和の友情へ");
  assert.equal(EXHIBITION_CONTENT.chungbuk.slogan, "중원의 대지 — 조화를 배우고 사명을 계승하다");
  assert.equal(EXHIBITION_CONTENT.chungbuk.sloganJa, "中原の大地―調和を学び、使命を受け継ぐ");
  assert.equal(EXHIBITION_CONTENT.daejeon.slogan, "한 사람의 행동이 도시를 바꾼다");
  assert.equal(EXHIBITION_CONTENT.daejeon.sloganJa, "一人の行動が都市を変える");
  assert.match(sourceHtml, /class="language-tabs"[\s\S]*data-language="ko"[\s\S]*data-language="ja"/, "메인 화면에 한국어·일본어 언어 탭이 있어야 합니다.");
  assert.match(sourceHtml, /id="tab-school"[^>]*data-category="school"[^>]*>창가청년스쿨<\/button>/, "한국어 기본 화면에 창가청년스쿨 탭이 있어야 합니다.");
  assert.match(sourceHtml, /id="tab-visit"[^>]*data-category="visit"[^>]*>일대일근행회<\/button>/, "한국어 기본 화면에 일대일근행회 탭이 있어야 합니다.");
  assert.match(sourceApp, /function applyLanguage\(language\)/, "언어 탭이 메인 화면 전체 문구를 전환해야 합니다.");
  assert.match(sourceApp, /function galleryMetadataLabels\(photo\)/, "권·부서·활동 메타데이터를 파일명 대신 화면 객체로 렌더링해야 합니다.");
  assert.match(sourceApp, /meta\.appendChild\(tag\)/, "썸네일에 구조화된 메타데이터 태그를 추가해야 합니다.");

  const sourceManifestBeforeBuild = await fs.readFile(path.join(root, "assets", "gallery-manifest.json"), "utf8");
  const productionManifest = JSON.parse(sourceManifestBeforeBuild);
  assert.ok(productionManifest.photos.length > 0, "프로덕션 사진 manifest가 비어 있으면 안 됩니다.");
  assert.ok(productionManifest.photos.every(({ src }) => src.endsWith(".webp")), "전시용 사진은 모두 WebP여야 합니다.");
  assert.ok(productionManifest.photos.every(({ thumbnail }) => thumbnail && thumbnail.endsWith(".webp")), "모든 전시 사진은 별도 WebP 썸네일을 사용해야 합니다.");
  assert.ok(productionManifest.photos.every(({ zone }) => Object.hasOwn(ZONE_LABELS, zone)), "모든 전시 사진은 알려진 권 폴더에 속해야 합니다.");
  assert.ok(productionManifest.photos.every(({ department }) => Object.hasOwn(DEPARTMENT_LABELS, department)), "모든 전시 사진은 부서 메타데이터가 있어야 합니다.");
  for (const photo of productionManifest.photos) {
    await fs.access(path.join(root, decodeURIComponent(photo.thumbnail.replace(/^\.\//, ""))));
  }
  await exec(process.execPath, [path.join(root, "scripts", "build.mjs")]);
  const sourceManifestAfterBuild = await fs.readFile(path.join(root, "assets", "gallery-manifest.json"), "utf8");
  assert.equal(sourceManifestAfterBuild, sourceManifestBeforeBuild, "사진 목록이 같으면 manifest 생성 시각과 내용이 결정적으로 유지되어야 합니다.");
  const builtHtml = await fs.readFile(path.join(root, "dist", "index.html"), "utf8");
  const builtApp = await fs.readFile(path.join(root, "dist", "src", "app.js"), "utf8");
  const builtStyles = await fs.readFile(path.join(root, "dist", "src", "styles.css"), "utf8");
  assert.match(builtHtml, /href="\.\/src\/styles\.css\?v=[a-f0-9]{12}"/, "CSS에는 Safari 캐시를 우회할 build hash가 있어야 합니다.");
  assert.match(builtHtml, /src="\.\/src\/app\.js\?v=[a-f0-9]{12}"/, "JS에는 Safari 캐시를 우회할 build hash가 있어야 합니다.");
  assert.match(builtHtml, /data-build="production"/);
  assert.doesNotMatch(`${builtHtml}\n${builtStyles}`, /(?:src|href)=["']https?:\/\/|url\(["']?https?:\/\//i, "dist는 CDN이나 외부 리소스를 요청하면 안 됩니다.");
  assert.doesNotMatch(builtApp, /^\s*import\s/m, "브라우저 앱은 구형 Chromium용 단일 번들이어야 합니다.");
  await fs.access(path.join(root, "dist", ".nojekyll"));
  await fs.access(path.join(root, "dist", "assets", "gallery-manifest.json"));
  await fs.access(path.join(root, "dist", "assets", "intro", "japan.svg"));
  await fs.access(path.join(root, "dist", "assets", "intro", "korea.svg"));
  await fs.access(path.join(root, "dist", decodeURIComponent(productionManifest.photos[0].thumbnail.replace(/^\.\//, ""))));
  await fs.access(path.join(root, "dist", "service-worker.js"));
  await fs.access(path.join(root, "dist", "fixtures", "full", "meeting", "group.svg"));
  await assert.rejects(fs.access(path.join(root, "dist", "data", "vendor")));

  const kioskPort = 20000 + Math.floor(Math.random() * 20000);
  const kiosk = spawn(process.execPath, [
    path.join(root, "scripts", "kiosk-server.mjs"),
    "--host", "127.0.0.1",
    "--port", String(kioskPort)
  ], {
    cwd: root,
    stdio: "ignore"
  });
  try {
    let response;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      try {
        response = await fetch(`http://127.0.0.1:${kioskPort}/?fixture=empty`);
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
    assert.ok(response && response.ok, "kiosk 서버가 dist index를 제공해야 합니다.");
    assert.match(response.headers.get("content-type") || "", /text\/html/);
    const refresh = await fetch(`http://127.0.0.1:${kioskPort}/exhibition/branch`, { headers: { Accept: "text/html" } });
    assert.equal(refresh.status, 200, "HTML 새로고침 경로는 index로 fallback해야 합니다.");
    const worker = await fetch(`http://127.0.0.1:${kioskPort}/service-worker.js`);
    assert.match(worker.headers.get("content-type") || "", /javascript/);
    const traversal = await fetch(`http://127.0.0.1:${kioskPort}/..%2Fpackage.json`);
    assert.equal(traversal.status, 403, "kiosk 서버는 path traversal을 차단해야 합니다.");
  } finally {
    kiosk.kill("SIGTERM");
  }

  console.log("verify: SGIS 지도, 고정/스크롤 레이아웃, fixture, 인트로, 호환 번들, kiosk, 오프라인 빌드 통과");
} finally {
  await fs.rm(fixtureRoot, { recursive: true, force: true });
}
