import http from "node:http";
import { createReadStream, promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const serveRoot = path.join(projectRoot, "dist");
const option = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
};
const port = Number(option("--port", "8081"));
const host = option("--host", "localhost");
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("--port에는 1~65535 값을 사용하세요.");
if (!["localhost", "127.0.0.1", "0.0.0.0"].includes(host)) throw new Error("--host는 localhost, 127.0.0.1, 0.0.0.0만 지원합니다.");

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
  ".avif": "image/avif",
  ".webm": "video/webm"
};

const server = http.createServer(async (request, response) => {
  const started = Date.now();
  try {
    const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    let pathname;
    try {
      pathname = decodeURIComponent(requestUrl.pathname);
    } catch {
      throw Object.assign(new Error("bad path"), { status: 400 });
    }
    if (pathname.includes("\0") || pathname.split("/").includes("..")) {
      throw Object.assign(new Error("forbidden path"), { status: 403 });
    }
    const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    let filePath = path.resolve(serveRoot, relativePath);
    const relative = path.relative(serveRoot, filePath);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw Object.assign(new Error("forbidden path"), { status: 403 });
    }
    try {
      const stat = await fs.stat(filePath);
      if (stat.isDirectory()) filePath = path.join(filePath, "index.html");
    } catch (error) {
      if ((request.headers.accept || "").includes("text/html")) filePath = path.join(serveRoot, "index.html");
      else throw error;
    }
    const stat = await fs.stat(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Content-Length": stat.size,
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff"
    });
    createReadStream(filePath).pipe(response);
    response.on("finish", () => console.log(`${request.method} ${requestUrl.pathname} 200 ${Date.now() - started}ms`));
  } catch (error) {
    const status = error.status || 404;
    response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" });
    response.end(status === 403 ? "Forbidden" : "Not found");
    console.log(`${request.method} ${request.url} ${status} ${Date.now() - started}ms`);
  }
});

server.listen(port, host, () => {
  console.log(`전시 서버: http://${host}:${port}`);
  console.log("종료: Ctrl+C");
});
