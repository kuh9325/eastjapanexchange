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
  await fs.writeFile(path.join(galleryRoot, "chungnam", "future", "ignored.gif"), tinyPng);
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
  assert.equal(manifest.photos.length, BRANCH_KEYS.length * CATEGORY_KEYS.length, "방면별 두 카테고리의 지원 이미지만 포함해야 합니다.");
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
  assert.deepEqual(MAP_DISPLAY_VIEWBOX, { x: 20, y: 28, width: 720, height: 700 }, "표시 viewBox는 독도 표식까지 포함해야 합니다.");
  assert.deepEqual(MAP_FOCUS_VIEWBOX, { x: 145, y: 150, width: 350, height: 300 }, "활동 화면에서는 세 방면을 중심으로 지도를 확대해야 합니다.");
  assert.deepEqual(MAP_LANDMARKS, [{ id: "dokdo", name: "독도", point: [724, 199] }], "원본에 없는 독도는 실제 상대 위치의 점으로 보완해야 합니다.");
  assert.equal(MAP_ATTRIBUTION, "통계청 SGIS 2020 행정구역 경계 기반, 전시용 단순화");
  assert.deepEqual(CATEGORY_KEYS, ["future", "visit"], "활동 카테고리는 청년미래총회와 방문 일대일 근행회만 제공해야 합니다.");

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
  assert.doesNotMatch(sourceStyles, /color-mix\(/, "color-mix에 의존하지 않아야 합니다.");
  assert.doesNotMatch(sourceStyles, /offset-path|motion-path/, "CSS motion path에 의존하지 않아야 합니다.");
  assert.doesNotMatch(sourceHtml, /city-label|municipality-list|지도 표시 행정구역/, "일반 화면에 행정구역 UI를 만들면 안 됩니다.");
  assert.doesNotMatch(sourceApp, /class:\s*["']city-label|pathTitle|municipality-list/, "일반 지도에 시군 이름/툴팁을 렌더링하면 안 됩니다.");
  assert.match(sourceApp, /data-debug-city/, "행정구역 식별자는 디버그 모드에서만 제공해야 합니다.");
  assert.match(sourceApp, /MAP_LANDMARKS\.forEach/, "독도 등 원본 보완 표식을 지도에 렌더링해야 합니다.");
  assert.match(sourceApp, /appendMapLandmarks\(mapLandmarkLayer\)[\s\S]*appendMapLandmarks\(introKoreaLayer\)/, "독도 위치점은 본 화면과 인트로 대한민국 지도에 모두 표시해야 합니다.");
  assert.match(sourceHtml, /id="map-landmark-layer"/, "지도에 원본 보완 표식 레이어가 있어야 합니다.");
  assert.match(sourceApp, /class:\s*"map-landmark-dot",\s*r:\s*1\.6/, "독도는 강조 장식 없이 작은 점으로 표시해야 합니다.");
  assert.doesNotMatch(sourceStyles, /map-landmark-ring|\.map-landmark text/, "독도 위치점에 강조 링이나 지도 라벨을 추가하면 안 됩니다.");
  assert.doesNotMatch(sourceHtml, /leader-section|4부 간부/, "4부 간부 사진 영역은 화면에서 제거해야 합니다.");
  assert.doesNotMatch(sourceApp, /renderLeaders|leaderGrid|leaderSection/, "4부 간부 렌더링 코드는 제거해야 합니다.");
  assert.match(sourceHtml, /id="hall-card"/, "방면 소개 옆에 회관 전경 사진 영역이 있어야 합니다.");
  assert.match(sourceApp, /function renderHall\(branchKey\)/, "방면별 회관 전경 사진을 렌더링해야 합니다.");
  assert.match(sourceIntro, /getTotalLength\(\)/);
  assert.match(sourceIntro, /getPointAtLength/);
  assert.match(sourceIntro, /cancelAnimationFrame/);
  assert.match(sourceIntro, /guro:\s*Object\.freeze\(\{ revealAt:\s*9500, move:\s*Object\.freeze\(\[10000, 10800\]\)/, "구로 핀이 먼저 나타난 뒤 구로 이동을 시작해야 합니다.");
  assert.match(sourceIntro, /jincheon:\s*Object\.freeze\(\{ revealAt:\s*10800, move:\s*Object\.freeze\(\[11300, 12400\]\)/, "진천 핀이 먼저 나타난 뒤 진천 이동을 시작해야 합니다.");
  assert.match(sourceIntro, /daejeon:\s*Object\.freeze\(\{ revealAt:\s*12400, move:\s*Object\.freeze\(\[12900, 14000\]\)/, "대전 핀이 먼저 나타난 뒤 대전 이동을 시작해야 합니다.");
  assert.match(sourceIntro, /const domesticTravelPoint[\s\S]*groundSegments\.guro[\s\S]*groundSegments\.jincheon[\s\S]*groundSegments\.daejeon/, "국내 이동은 목적지별 세 구간으로 분리해야 합니다.");
  assert.match(sourceIntro, /groundPath\.setAttribute\("d", domesticRouteD\(elapsed\)\)/, "초록 점선은 이동점이 이동한 구간까지만 이어져야 합니다.");
  assert.match(sourceHtml, /id="intro-ground-to-guro"[\s\S]*id="intro-ground-to-jincheon"[\s\S]*id="intro-ground-to-daejeon"/, "국내 이동용 세 SVG path가 있어야 합니다.");
  assert.match(sourceHtml, /id="intro-point-guro" class="intro-domestic-point"/);
  assert.match(sourceHtml, /id="intro-point-jincheon" class="intro-domestic-point"/);
  assert.match(sourceHtml, /id="intro-point-daejeon" class="intro-domestic-point"/);
  assert.ok(sourceHtml.indexOf("intro-korea-layer") < sourceHtml.indexOf("intro-japan-layer"), "SVG 그리기 순서에서 일본 지도가 대한민국보다 앞에 보여야 합니다.");
  assert.match(sourceHtml, /id="intro-plane"[\s\S]*?transform="scale\(\.78\)"[\s\S]*?M40 0C40-4/, "인트로 비행기는 여객기 실루엣 SVG를 사용해야 합니다.");
  assert.match(sourceStyles, /\.intro-plane\s*\{[^}]*color:\s*#315fc4[^}]*fill:\s*currentColor[^}]*background:\s*transparent/s, "새 비행기는 기존 코발트 색상과 투명 배경을 유지해야 합니다.");
  assert.match(sourceBuild, /createHash\("sha256"\)\s*\.update\(html\)/s, "HTML 변경도 오프라인 캐시 버전을 갱신해야 합니다.");
  assert.equal(INTRO_ROUTE.cts.latitude, 42.7752);
  assert.equal(INTRO_ROUTE.icn.latitude, 37.4602);
  assert.match(sourceHtml, /CTS → ICN/);
  assert.match(sourceHtml, /data-intro-skip/);
  assert.match(sourceHtml, /id="intro-replay"/);
  assert.deepEqual(INTRO_ROUTE.cts.scenePoint, [910.8, 102.22], "CTS는 일본 SVG의 신치토세공항 위치를 사용해야 합니다.");
  assert.deepEqual(INTRO_ROUTE.icn.mapPoint, [214.2, 185.6], "ICN은 대한민국 지도에서 영종도 공항 위치를 사용해야 합니다.");
  assert.ok(INTRO_ROUTE.guro.mapPoint[0] >= 245.72 && INTRO_ROUTE.guro.mapPoint[0] <= 285.99, "구로 본부 지점은 서울 도형 안에 있어야 합니다.");
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
    assert.equal(EXHIBITION_CONTENT[branchKey].slogan, "", "확정되지 않은 프로덕션 슬로건을 만들면 안 됩니다.");
  }

  const sourceManifestBeforeBuild = await fs.readFile(path.join(root, "assets", "gallery-manifest.json"), "utf8");
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
