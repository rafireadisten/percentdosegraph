import { createReadStream } from "node:fs";
import { access, readFile, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const port = Number(process.env.PORT ?? 8080);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

const server = http.createServer(async (req, res) => {
  try {
    const requestPath = new URL(req.url ?? "/", `http://${req.headers.host}`).pathname;
    const resolvedPath = await resolvePath(requestPath);
    const fileStats = await stat(resolvedPath);

    if (!fileStats.isFile()) {
      respondNotFound(res);
      return;
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": contentTypes[ext] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });
    createReadStream(resolvedPath).pipe(res);
  } catch {
    respondNotFound(res);
  }
});

server.listen(port, () => {
  console.log(`PercentDoseGraph web server listening on http://localhost:${port}`);
});

async function resolvePath(requestPath) {
  const decodedPath = decodeURIComponent(requestPath);
  const normalizedPath = path.normalize(decodedPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const candidatePath = path.join(rootDir, normalizedPath);
  const safePath = ensureInsideRoot(candidatePath);

  if (await isDirectory(safePath)) {
    return path.join(safePath, "index.html");
  }

  if (await fileExists(safePath)) {
    return safePath;
  }

  return path.join(rootDir, "index.html");
}

function ensureInsideRoot(candidatePath) {
  const relativePath = path.relative(rootDir, candidatePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error("Blocked path traversal");
  }

  return candidatePath;
}

async function isDirectory(targetPath) {
  try {
    const entryStats = await stat(targetPath);
    return entryStats.isDirectory();
  } catch {
    return false;
  }
}

async function fileExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function respondNotFound(res) {
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found");
}
