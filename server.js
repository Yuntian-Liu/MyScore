import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { CORS_HEADERS, requestAiComment } from "./lib/aiComment.js";

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const ROOT_DIR = process.cwd();

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

function sendJson(res, status, payload, extraHeaders = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...extraHeaders,
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, status, text, extraHeaders = {}) {
  res.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    ...extraHeaders,
  });
  res.end(text);
}

async function readJsonBody(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 1024 * 1024) {
      throw new Error("Request body too large");
    }
  }
  return body ? JSON.parse(body) : {};
}

async function handleCommentApi(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(200, CORS_HEADERS);
    res.end("OK");
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method Not Allowed" }, CORS_HEADERS);
    return;
  }

  try {
    const body = await readJsonBody(req);
    const config = {
      apiKey: process.env.AI_API_KEY,
      apiBaseUrl: process.env.AI_BASE_URL || "https://api.deepseek.com",
      model: process.env.AI_MODEL || "deepseek-chat",
    };
    const payload = await requestAiComment(body, config);
    sendJson(res, 200, payload, CORS_HEADERS);
  } catch (error) {
    sendJson(
      res,
      error.statusCode || 500,
      { error: error.message || "Internal Server Error" },
      CORS_HEADERS
    );
  }
}

function resolveRequestPath(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split("?")[0]);
  if (cleanPath === "/") {
    return join(ROOT_DIR, "index.html");
  }

  const relativePath = cleanPath.replace(/^\/+/, "");
  const normalizedPath = normalize(relativePath);
  const absolutePath = resolve(ROOT_DIR, normalizedPath);

  if (!absolutePath.startsWith(resolve(ROOT_DIR))) {
    return null;
  }

  return absolutePath;
}

async function serveStatic(req, res) {
  const requestedPath = resolveRequestPath(req.url || "/");
  if (!requestedPath) {
    sendText(res, 403, "Forbidden");
    return;
  }

  let filePath = requestedPath;
  try {
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) {
      filePath = join(filePath, "index.html");
    }
  } catch {
    if (!extname(filePath)) {
      filePath = join(ROOT_DIR, "index.html");
    }
  }

  if (!existsSync(filePath)) {
    sendText(res, 404, "Not Found");
    return;
  }

  const ext = extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": contentType });

  if (req.method === "HEAD") {
    res.end();
    return;
  }

  createReadStream(filePath).pipe(res);
}

const server = createServer(async (req, res) => {
  const url = req.url || "/";

  if (url.startsWith("/api/comment")) {
    await handleCommentApi(req, res);
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    sendText(res, 405, "Method Not Allowed");
    return;
  }

  await serveStatic(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`MyScore server listening on http://${HOST}:${PORT}`);
});
