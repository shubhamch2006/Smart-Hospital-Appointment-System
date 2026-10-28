// Moscow Hospital – tiny zero-dependency server.
// Run:  node server.js        (open http://localhost:3000)
// Optional: DISPATCH_KEY=yourSecret node server.js   -> protects the hospital dispatch screen/API
const http = require("http"), fs = require("fs"), path = require("path");

const PORT = process.env.PORT || 3000;
const KEY = process.env.DISPATCH_KEY || "";
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data"), DATA_FILE = path.join(DATA_DIR, "emergencies.json");
const STATUSES = ["new", "acknowledged", "dispatched", "resolved"];
const PUBLIC = new Set(["index.html", "dispatch.html"]);       // top-level files that may be served
const PUBLIC_DIRS = new Set(["css", "js"]);
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon" };

fs.mkdirSync(DATA_DIR, { recursive: true });
let alerts = [];
try { alerts = JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); } catch (_) {}
const save = () => fs.writeFile(DATA_FILE, JSON.stringify(alerts, null, 1), () => {});

// very small per-IP rate limit for the public endpoint (30 requests / minute)
const hits = new Map();
function limited(ip) {
  const now = Date.now(), arr = (hits.get(ip) || []).filter(t => now - t < 60000);
  arr.push(now); hits.set(ip, arr); return arr.length > 30;
}

const json = (res, code, obj) => { res.writeHead(code, { "Content-Type": "application/json", "Cache-Control": "no-store" }); res.end(JSON.stringify(obj)); };
const str = (v, n) => (typeof v === "string" ? v.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n) : "");
const num = (v, lo, hi) => (typeof v === "number" && isFinite(v) && v >= lo && v <= hi ? v : null);
const authed = req => !KEY || req.headers["x-dispatch-key"] === KEY;

function body(req) {
  return new Promise((resolve, reject) => {
    let d = "";
    req.on("data", c => { d += c; if (d.length > 10000) { reject(new Error("too large")); req.destroy(); } });
    req.on("end", () => { try { resolve(JSON.parse(d || "{}")); } catch (e) { reject(e); } });
  });
}

async function api(req, res, url) {
  const ip = req.socket.remoteAddress || "?";

  // Patient -> hospital: create / update an alert
  if (req.method === "POST" && url.pathname === "/api/emergency") {
    if (limited(ip)) return json(res, 429, { error: "Too many requests" });
    let b; try { b = await body(req); } catch (_) { return json(res, 400, { error: "Bad request" }); }
    const id = str(b.id, 32);
    if (!/^EMG-[A-Z0-9]{4,12}$/.test(id)) return json(res, 400, { error: "Bad id" });
    const lat = num(b.lat, -90, 90), lng = num(b.lng, -180, 180);
    const now = new Date().toISOString();
    let rec = alerts.find(a => a.id === id);
    if (!rec) { rec = { id, status: "new", createdAt: now, track: [] }; alerts.unshift(rec); alerts = alerts.slice(0, 500); }
    Object.assign(rec, {
      name: str(b.name, 80) || rec.name || "", phone: str(b.phone, 15) || rec.phone || "", type: str(b.type, 40) || rec.type || "",
      locationAvailable: lat !== null && lng !== null, lat, lng,
      accuracy: num(b.accuracy, 0, 100000), updatedAt: now
    });
    if (lat !== null && lng !== null) { rec.track.push({ lat, lng, t: now }); rec.track = rec.track.slice(-30); }
    save();
    return json(res, 200, { ok: true, id, status: rec.status });   // patient can't change status
  }

  // Hospital dashboard endpoints
  if (url.pathname === "/api/emergencies" || url.pathname.startsWith("/api/emergencies/")) {
    if (!authed(req)) return json(res, 401, { error: "Dispatch key required" });
    if (req.method === "GET" && url.pathname === "/api/emergencies") return json(res, 200, alerts);
    if (req.method === "PATCH") {
      const id = decodeURIComponent(url.pathname.split("/")[3] || "");
      let b; try { b = await body(req); } catch (_) { return json(res, 400, { error: "Bad request" }); }
      const rec = alerts.find(a => a.id === id);
      if (!rec) return json(res, 404, { error: "Not found" });
      if (!STATUSES.includes(b.status)) return json(res, 400, { error: "Bad status" });
      rec.status = b.status; rec.updatedAt = new Date().toISOString(); save();
      return json(res, 200, rec);
    }
  }
  json(res, 404, { error: "Not found" });
}

function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
  const parts = rel.split("/");
  const allowed = parts.length === 1 ? PUBLIC.has(rel) : PUBLIC_DIRS.has(parts[0]);
  const file = path.normalize(path.join(ROOT, rel));
  if (!allowed || !file.startsWith(ROOT + path.sep)) { res.writeHead(404); return res.end("Not found"); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
}

http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname.startsWith("/api/")) return api(req, res, url).catch(() => json(res, 500, { error: "Server error" }));
  serveStatic(req, res, url);
}).listen(PORT, () => {
  console.log(`Moscow Hospital running:  http://localhost:${PORT}`);
  console.log(`Hospital dispatch screen: http://localhost:${PORT}/dispatch.html` + (KEY ? "  (key required)" : "  (NO KEY SET – set DISPATCH_KEY before going live)"));
});
