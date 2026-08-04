import http from "node:http";
import { promises as fs, createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rootArgumentIndex = process.argv.indexOf("--root");
const requestedRoot = rootArgumentIndex >= 0 ? process.argv[rootArgumentIndex + 1] : ".";
const serveRoot = path.resolve(projectRoot, requestedRoot || ".");
const portArgumentIndex = process.argv.indexOf("--port");
const requestedPort = portArgumentIndex >= 0 ? process.argv[portArgumentIndex + 1] : null;
const port = Number(requestedPort || process.env.PORT || 4180);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("--port에는 1~65535 값을 사용하세요.");
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif"
};

const server = http.createServer(async (request, response) => {
  try {
    const urlPath = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
    const relativePath = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
    const requestedPath = path.resolve(serveRoot, relativePath);
    const relative = path.relative(serveRoot, requestedPath);
    if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("invalid path");
    const stat = await fs.stat(requestedPath);
    const filePath = stat.isDirectory() ? path.join(requestedPath, "index.html") : requestedPath;
    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

server.listen(port, () => console.log(`Exhibition app: http://localhost:${port} (${serveRoot})`));
