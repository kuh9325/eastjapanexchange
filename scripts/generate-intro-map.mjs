import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { COUNTRY_CONTEXT, MAP_LANDMARKS, MAP_VIEWBOX } from "../data/regions.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.join(root, "assets", "intro", "korea.svg");
const number = (value) => Number(value).toFixed(2).replace(/\.00$/, "");

const paths = COUNTRY_CONTEXT.map((province) => (
  `  <path d="${province.path}" fill-rule="${province.fillRule || "evenodd"}"/>`
));
const landmarks = MAP_LANDMARKS.map((landmark) => (
  `  <circle cx="${number(landmark.point[0])}" cy="${number(landmark.point[1])}" r="1.6"><title>${landmark.name}</title></circle>`
));
const svg = [
  "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MAP_VIEWBOX.x} ${MAP_VIEWBOX.y} ${MAP_VIEWBOX.width} ${MAP_VIEWBOX.height}">`,
  " <g fill=\"#dedbd3\" stroke=\"#c4bfb5\" stroke-width=\"1.15\" stroke-linejoin=\"round\">",
  ...paths,
  " </g>",
  " <g fill=\"#17233b\">",
  ...landmarks,
  " </g>",
  "</svg>",
  ""
].join("\n");

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, svg, "utf8");
console.log(`intro map: ${COUNTRY_CONTEXT.length} region(s), ${MAP_LANDMARKS.length} landmark(s) → ${outputPath}`);
