import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import polygonClipping from "polygon-clipping";
import {
  ADMIN_SOURCES,
  BRANCH_CONFIG,
  CATEGORY_CONFIG,
  MAP_PADDING,
  MAP_SOURCE,
  MAP_VIEWBOX,
  NATIONAL_SOURCE_FILE
} from "../data/region-config.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vendorRoot = path.join(root, "data", "vendor", "statgarten-maps", "svg", "simple");
const outputPath = path.join(root, "data", "regions.js");
const tokenPattern = /[MLZmlz]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g;

function readAttribute(source, name) {
  const match = source.match(new RegExp(`\\b${name}="([^"]*)"`));
  return match?.[1] ?? null;
}

function parseSvg(raw, filename) {
  const svgTag = raw.match(/<svg\b[^>]*>/)?.[0];
  if (!svgTag) throw new Error(`${filename}: <svg>를 찾을 수 없습니다.`);
  const viewBox = readAttribute(svgTag, "viewBox")?.split(/\s+/).map(Number);
  if (!viewBox || viewBox.length !== 4 || viewBox.some((value) => !Number.isFinite(value))) {
    throw new Error(`${filename}: 올바른 viewBox가 없습니다.`);
  }

  const paths = [];
  for (const match of raw.matchAll(/<path\b([^>]*)\/?\s*>/g)) {
    const id = readAttribute(match[1], "id");
    const d = readAttribute(match[1], "d");
    if (!id || !d) continue;
    paths.push({
      id,
      d,
      fillRule: readAttribute(match[1], "fill-rule") || "nonzero",
      rings: parsePathData(d, `${filename}#${id}`)
    });
  }
  if (!paths.length) throw new Error(`${filename}: path를 찾을 수 없습니다.`);
  return { viewBox, paths };
}

function parsePathData(d, label) {
  const unsupported = d.match(/[ACHQSTVachqstv]/);
  if (unsupported) throw new Error(`${label}: 지원하지 않는 SVG 명령 ${unsupported[0]}`);
  if (/[mlz]/.test(d)) throw new Error(`${label}: 상대 좌표 SVG 명령은 지원하지 않습니다.`);
  const tokens = d.match(tokenPattern) || [];
  const rings = [];
  let command = null;
  let ring = null;
  let index = 0;

  const finishRing = () => {
    if (!ring?.length) return;
    if (ring.length < 3) throw new Error(`${label}: 점이 3개 미만인 subpath가 있습니다.`);
    if (!samePoint(ring[0], ring[ring.length - 1])) ring.push([...ring[0]]);
    rings.push(ring);
    ring = null;
  };

  while (index < tokens.length) {
    const token = tokens[index];
    if (/^[MLZmlz]$/.test(token)) {
      command = token.toUpperCase();
      index += 1;
      if (command === "Z") {
        finishRing();
        command = null;
      }
      continue;
    }
    if (command !== "M" && command !== "L") throw new Error(`${label}: 좌표 앞에 M/L 명령이 없습니다.`);
    const x = Number(tokens[index]);
    const y = Number(tokens[index + 1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error(`${label}: 잘못된 좌표입니다.`);
    if (command === "M") {
      finishRing();
      ring = [];
      command = "L";
    }
    ring.push([x, y]);
    index += 2;
  }
  finishRing();
  return rings;
}

function samePoint(a, b, epsilon = 1e-8) {
  return Math.abs(a[0] - b[0]) < epsilon && Math.abs(a[1] - b[1]) < epsilon;
}

function boundsOfRings(rings) {
  const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const ring of rings) {
    for (const [x, y] of ring) {
      bounds.minX = Math.min(bounds.minX, x);
      bounds.minY = Math.min(bounds.minY, y);
      bounds.maxX = Math.max(bounds.maxX, x);
      bounds.maxY = Math.max(bounds.maxY, y);
    }
  }
  bounds.width = bounds.maxX - bounds.minX;
  bounds.height = bounds.maxY - bounds.minY;
  if (!Number.isFinite(bounds.width) || bounds.width <= 0 || bounds.height <= 0) {
    throw new Error("도형 bounds를 계산할 수 없습니다.");
  }
  return bounds;
}

function createAppProjection(nationalViewBox) {
  const [sourceX, sourceY, sourceWidth, sourceHeight] = nationalViewBox;
  const availableWidth = MAP_VIEWBOX.width - MAP_PADDING * 2;
  const availableHeight = MAP_VIEWBOX.height - MAP_PADDING * 2;
  const scale = Math.min(availableWidth / sourceWidth, availableHeight / sourceHeight);
  const offsetX = MAP_VIEWBOX.x + (MAP_VIEWBOX.width - sourceWidth * scale) / 2;
  const offsetY = MAP_VIEWBOX.y + (MAP_VIEWBOX.height - sourceHeight * scale) / 2;
  return ([x, y]) => [offsetX + (x - sourceX) * scale, offsetY + (y - sourceY) * scale];
}

function createProvinceProjection(localRings, nationalRings, toApp) {
  const local = boundsOfRings(localRings);
  const national = boundsOfRings(nationalRings);
  return ([x, y]) => toApp([
    national.minX + ((x - local.minX) / local.width) * national.width,
    national.minY + ((y - local.minY) / local.height) * national.height
  ]);
}

function transformRings(rings, project) {
  return rings.map((ring) => ring.map((point) => project(point)));
}

function signedArea(ring) {
  let twiceArea = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    twiceArea += ring[index][0] * ring[index + 1][1] - ring[index + 1][0] * ring[index][1];
  }
  return twiceArea / 2;
}

function pointInRing(point, ring) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const [xi, yi] = ring[index];
    const [xj, yj] = ring[previous];
    const intersects = ((yi > point[1]) !== (yj > point[1]))
      && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function ringsToMultiPolygon(rings) {
  const records = rings
    .filter((ring) => Math.abs(signedArea(ring)) > 1e-7)
    .map((ring, index) => ({ index, ring, area: Math.abs(signedArea(ring)), parent: null, depth: 0 }));

  for (const record of records) {
    const sample = record.ring[0];
    const containers = records
      .filter((candidate) => candidate.area > record.area && pointInRing(sample, candidate.ring))
      .sort((a, b) => a.area - b.area);
    record.parent = containers[0]?.index ?? null;
  }
  const byIndex = new Map(records.map((record) => [record.index, record]));
  const getDepth = (record) => {
    if (record.parent === null) return 0;
    if (record.depth) return record.depth;
    record.depth = getDepth(byIndex.get(record.parent)) + 1;
    return record.depth;
  };
  records.forEach(getDepth);

  return records
    .filter((record) => record.depth % 2 === 0)
    .map((outer) => [
      outer.ring,
      ...records.filter((record) => record.parent === outer.index && record.depth % 2 === 1).map((record) => record.ring)
    ]);
}

function polygonCentroid(ring) {
  let areaFactor = 0;
  let x = 0;
  let y = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const cross = ring[index][0] * ring[index + 1][1] - ring[index + 1][0] * ring[index][1];
    areaFactor += cross;
    x += (ring[index][0] + ring[index + 1][0]) * cross;
    y += (ring[index][1] + ring[index + 1][1]) * cross;
  }
  if (Math.abs(areaFactor) < 1e-8) return ring[0];
  return [x / (3 * areaFactor), y / (3 * areaFactor)];
}

function distanceToSegment(point, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (dx === 0 && dy === 0) return Math.hypot(point[0] - start[0], point[1] - start[1]);
  const ratio = Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point[0] - (start[0] + ratio * dx), point[1] - (start[1] + ratio * dy));
}

function distanceToRing(point, ring) {
  let distance = Infinity;
  for (let index = 0; index < ring.length - 1; index += 1) {
    distance = Math.min(distance, distanceToSegment(point, ring[index], ring[index + 1]));
  }
  return distance;
}

function visualCenter(multiPolygon) {
  const polygon = [...multiPolygon].sort((a, b) => Math.abs(signedArea(b[0])) - Math.abs(signedArea(a[0])))[0];
  const [outer, ...holes] = polygon;
  const isInside = (point) => pointInRing(point, outer) && holes.every((hole) => !pointInRing(point, hole));
  const centroid = polygonCentroid(outer);
  if (isInside(centroid)) return centroid;

  const bounds = boundsOfRings([outer]);
  let best = outer[0];
  let bestDistance = -1;
  const gridSize = 28;
  for (let row = 0; row <= gridSize; row += 1) {
    for (let column = 0; column <= gridSize; column += 1) {
      const point = [
        bounds.minX + (bounds.width * column) / gridSize,
        bounds.minY + (bounds.height * row) / gridSize
      ];
      if (!isInside(point)) continue;
      const distance = Math.min(distanceToRing(point, outer), ...holes.map((hole) => distanceToRing(point, hole)));
      if (distance > bestDistance) {
        best = point;
        bestDistance = distance;
      }
    }
  }
  return best;
}

function shortName(name) {
  if (name.includes(" ")) return name.split(/\s+/).at(-1);
  return name.replace(/(특별자치)?시$/, "").replace(/군$/, "") || name;
}

function round(value) {
  return Number(value.toFixed(2));
}

function ringsToPath(rings) {
  return rings.map((ring) => {
    const points = ring.slice(0, -1);
    return `M${points.map(([x, y], index) => `${index ? "L" : ""}${round(x)} ${round(y)}`).join("")}Z`;
  }).join("");
}

function multiPolygonToPaths(multiPolygon) {
  return multiPolygon.map((polygon) => ringsToPath(polygon));
}

const nationalRaw = await fs.readFile(path.join(vendorRoot, NATIONAL_SOURCE_FILE), "utf8");
const nationalSvg = parseSvg(nationalRaw, NATIONAL_SOURCE_FILE);
const toApp = createAppProjection(nationalSvg.viewBox);
const nationalByName = new Map(nationalSvg.paths.map((item) => [item.id, item]));
const countryContext = nationalSvg.paths.map((item) => ({
  id: item.id,
  name: item.id,
  path: ringsToPath(transformRings(item.rings, toApp)),
  fillRule: item.fillRule
}));

const generatedBranches = Object.fromEntries(Object.entries(BRANCH_CONFIG).map(([key, metadata]) => [key, {
  ...metadata,
  label: null,
  outlinePaths: [],
  municipalities: []
}]));
const branchGeometries = Object.fromEntries(Object.keys(BRANCH_CONFIG).map((key) => [key, []]));

for (const source of ADMIN_SOURCES) {
  const nationalProvince = nationalByName.get(source.province);
  if (!nationalProvince) throw new Error(`전국 SVG에서 ${source.province} path를 찾지 못했습니다.`);
  const raw = await fs.readFile(path.join(vendorRoot, source.file), "utf8");
  const localSvg = parseSvg(raw, source.file);
  const localRings = localSvg.paths.flatMap((item) => item.rings);
  const project = createProvinceProjection(localRings, nationalProvince.rings, toApp);
  const includedNames = source.include ? new Set(source.include) : null;
  const excludedNames = new Set(source.exclude || []);

  if (includedNames) {
    for (const name of includedNames) {
      if (!localSvg.paths.some((unit) => unit.id === name)) {
        throw new Error(`${source.file}: 선택한 행정구역 ${name}을 찾지 못했습니다.`);
      }
    }
  }
  for (const name of excludedNames) {
    if (!localSvg.paths.some((unit) => unit.id === name)) {
      throw new Error(`${source.file}: 제외할 행정구역 ${name}을 찾지 못했습니다.`);
    }
  }

  for (const unit of localSvg.paths) {
    if (includedNames && !includedNames.has(unit.id)) continue;
    if (excludedNames.has(unit.id)) continue;
    const branchKey = source.overrides[unit.id] || source.defaultBranch;
    if (!branchKey) continue;
    if (!generatedBranches[branchKey]) throw new Error(`${unit.id}: 알 수 없는 방면 ${branchKey}`);
    const rings = transformRings(unit.rings, project);
    const geometry = ringsToMultiPolygon(rings);
    if (!geometry.length) throw new Error(`${unit.id}: polygon geometry를 생성하지 못했습니다.`);
    const label = visualCenter(geometry).map(round);
    generatedBranches[branchKey].municipalities.push({
      id: `${source.province}-${unit.id}`,
      name: unit.id,
      shortName: shortName(unit.id),
      parent: source.province,
      path: ringsToPath(rings),
      fillRule: unit.fillRule,
      label
    });
    branchGeometries[branchKey].push(geometry);
  }
}

for (const branchKey of Object.keys(generatedBranches)) {
  const geometries = branchGeometries[branchKey];
  if (!geometries.length) throw new Error(`${branchKey}: 행정구역 도형이 없습니다.`);
  const dissolved = polygonClipping.union(...geometries);
  generatedBranches[branchKey].outlinePaths = multiPolygonToPaths(dissolved);
  generatedBranches[branchKey].label = visualCenter(dissolved).map(round);
}

const header = `/**\n * AUTO-GENERATED by scripts/generate-map-data.mjs — DO NOT EDIT BY HAND.\n * Source: ${MAP_SOURCE.repository} @ ${MAP_SOURCE.commit}\n * ${MAP_SOURCE.attribution}\n */`;
const output = `${header}
export const MAP_VIEWBOX = Object.freeze(${JSON.stringify(MAP_VIEWBOX)});
export const MAP_ATTRIBUTION = ${JSON.stringify(MAP_SOURCE.attribution)};
export const COUNTRY_CONTEXT = Object.freeze(${JSON.stringify(countryContext, null, 2)});
export const BRANCHES = Object.freeze(${JSON.stringify(generatedBranches, null, 2)});
export const CATEGORIES = Object.freeze(${JSON.stringify(CATEGORY_CONFIG, null, 2)});
export const BRANCH_KEYS = Object.freeze(Object.keys(BRANCHES));
export const CATEGORY_KEYS = Object.freeze(Object.keys(CATEGORIES));

export function municipalityNames(branchKey) {
  return BRANCHES[branchKey]?.municipalities.map(({ name }) => name) ?? [];
}
`;

await fs.writeFile(outputPath, output, "utf8");
const unitCount = Object.values(generatedBranches).reduce((total, branch) => total + branch.municipalities.length, 0);
console.log(`map data: ${countryContext.length} provinces, ${unitCount} units → ${outputPath}`);
