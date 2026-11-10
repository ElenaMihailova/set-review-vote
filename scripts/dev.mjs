// Local preview without Vercel: serves public/, runs the api/ handlers and,
// unless real Redis credentials are set, a throwaway in-memory Redis REST stand-in.
// Usage: node scripts/dev.mjs [port]   (RESULTS_KEY defaults to "local")
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const port = Number(process.argv[2] || process.env.PORT || 8792);
const mem = new Map();
if (!process.env.KV_REST_API_URL && !process.env.UPSTASH_REDIS_REST_URL) {
  process.env.KV_REST_API_URL = `http://127.0.0.1:${port}/__redis`;
  process.env.KV_REST_API_TOKEN = "local";
}
process.env.RESULTS_KEY ||= "local";

const TYPES = { ".html": "text/html; charset=utf-8", ".jpg": "image/jpeg", ".png": "image/png", ".js": "text/javascript", ".json": "application/json" };

function fakeRedis([cmd, key, field, value]) {
  const h = mem.get(key) || new Map();
  mem.set(key, h);
  if (cmd === "HSET") { h.set(field, value); return 1; }
  if (cmd === "HGET") return h.get(field) ?? null;
  if (cmd === "HGETALL") return [...h].flat();
  throw new Error("unsupported " + cmd);
}

const readBody = req => new Promise(r => { let b = ""; req.on("data", c => (b += c)); req.on("end", () => r(b)); });

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  try {
    if (url.pathname === "/__redis") {
      const result = fakeRedis(JSON.parse(await readBody(req)));
      res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ result }));
      return;
    }
    if (url.pathname.startsWith("/api/")) {
      const mod = await import(join(root, "api", url.pathname.slice(5).replace(/[^a-z-]/g, "") + ".js"));
      const handler = mod[req.method];
      if (!handler) { res.writeHead(405).end(); return; }
      const body = ["POST", "PUT"].includes(req.method) ? await readBody(req) : undefined;
      const response = await handler(new Request(url, { method: req.method, headers: req.headers, body }));
      res.writeHead(response.status, Object.fromEntries(response.headers)).end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    let path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
    if (path.endsWith("/")) path += "index.html";
    const file = join(root, "public", path);
    const data = await readFile(file);
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream" }).end(data);
  } catch (e) {
    if (res.headersSent) { res.end(); return; }
    res.writeHead(e.code === "ENOENT" ? 404 : 500, { "Content-Type": "text/plain" }).end(String(e.message || e));
  }
}).listen(port, "127.0.0.1", () => console.log(`Set review: http://127.0.0.1:${port}  (results key: ${process.env.RESULTS_KEY})`));
