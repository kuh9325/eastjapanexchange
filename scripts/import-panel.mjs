import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";

const exec = promisify(execFile);
const source = process.argv[2];
const output = process.argv[3] || path.resolve("assets", "panels");
const pdfimages = process.env.PDFIMAGES_PATH || "pdfimages";

if (!source) {
  console.error("사용법: npm run panels:import -- /path/to/panel.pdf [output-directory]");
  process.exit(1);
}

await fs.access(source, fs.constants.R_OK);
await fs.mkdir(output, { recursive: true });
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "eastjapan-panels-"));

async function optimize(sourceName, outputName, width) {
  const input = path.join(temporary, sourceName);
  await fs.access(input);
  await sharp(input)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 88, effort: 6, smartSubsample: true })
    .toFile(path.join(output, outputName));
}

try {
  await exec(pdfimages, ["-all", source, path.join(temporary, "image")]);

  const assets = [
    ["image-004.jpg", "panel-map.webp", 1200],
    ["image-005.jpg", "yu-gwan-sun.webp", 600],
    ["image-006.jpg", "kim-yu-sin.webp", 600],
    ["image-018.png", "award-chungbuk.webp", 500],
    ["image-011.png", "award-chungnam.webp", 500],
    ["image-013.png", "award-daejeon.webp", 500]
  ];
  for (const [input, filename, width] of assets) {
    await optimize(input, filename, width);
  }

  const medalColor = await sharp(path.join(temporary, "image-020.png"))
    .resize({ width: 700, withoutEnlargement: true })
    .toBuffer({ resolveWithObject: true });
  const medalMask = await sharp(path.join(temporary, "image-021.png"))
    .resize(medalColor.info.width, medalColor.info.height)
    .extractChannel(0)
    .toBuffer();
  await sharp(medalColor.data)
    .joinChannel(medalMask)
    .webp({ quality: 90, effort: 6, alphaQuality: 100 })
    .toFile(path.join(output, "award-medal.webp"));

  const oldFullPagePattern = /^panel-\d+-\d+\.(?:webp|jpg)$/i;
  for (const filename of await fs.readdir(output)) {
    if (oldFullPagePattern.test(filename)) await fs.rm(path.join(output, filename));
  }

  await fs.writeFile(
    path.join(output, "panels.json"),
    `${JSON.stringify({
      source: path.basename(source),
      mode: "html-css",
      pageCount: 3,
      assets: [...assets.map(([, filename]) => filename), "award-medal.webp"],
      omitted: ["QR code"]
    }, null, 2)}\n`,
    "utf8"
  );
  console.log(`panels: semantic assets extracted in ${output}`);
} finally {
  await fs.rm(temporary, { recursive: true, force: true });
}
