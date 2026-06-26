// ============================================================
// שרת קטן (Node, בלי תלויות חיצוניות) שמגיש את האתר הסטטי
// ומחשב את /api/yields - מיזוג נתוני דמו עם נתונים חיים
// ============================================================

const http = require("http");
const fs = require("fs");
const path = require("path");

const DEMO_DATA = require("./data/demo-data");
const LIVE_FETCHERS = require("./data/live-sources");

const PORT = process.env.PORT || 8080;
const ROOT = __dirname;
const CACHE_TTL_MS = 60 * 60 * 1000; // שעה - אין צורך לרענן תשואות יותר מזה

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

// מטמון בזיכרון לכל מקור חי, כדי לא להציף את ה-API החיצוניים בכל בקשה
const liveCache = {}; // { [code]: { data, fetchedAt, error } }
// בקשות ריענון שכבר מתבצעות - בקשות מקבילות יחכו לאותה הבטחה במקום לשלוח בקשה כפולה למקור החיצוני
const inFlightRefresh = {}; // { [code]: Promise }

async function getLiveData(code) {
  const fetchFn = LIVE_FETCHERS[code];
  if (!fetchFn) return null;

  const cached = liveCache[code];
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  if (inFlightRefresh[code]) {
    return inFlightRefresh[code];
  }

  inFlightRefresh[code] = (async () => {
    try {
      const data = await fetchFn();
      liveCache[code] = { data, fetchedAt: Date.now() };
      return data;
    } catch (err) {
      console.error(`[live:${code}] fetch failed: ${err.message}`);
      return cached ? cached.data : null; // נשתמש בעדכון האחרון שהצליח, גם אם פג תוקפו
    } finally {
      delete inFlightRefresh[code];
    }
  })();

  return inFlightRefresh[code];
}

async function buildYieldsPayload() {
  const liveByCode = {};
  await Promise.all(
    Object.keys(LIVE_FETCHERS).map(async (code) => {
      liveByCode[code] = await getLiveData(code);
    })
  );

  const countries = DEMO_DATA.countries.map((country) => {
    const live = liveByCode[country.code];
    const cells = country.yields.map((demoValue, index) => {
      const liveValue = live && live.values[index];
      if (liveValue !== undefined && liveValue !== null) {
        return { value: liveValue, live: true, asOf: live.asOf, frequency: live.frequency || "daily" };
      }
      return { value: demoValue, live: false, asOf: DEMO_DATA.asOf };
    });
    return {
      name: country.name,
      code: country.code,
      source: country.source,
      sourceName: country.sourceName,
      cells
    };
  });

  return { periods: DEMO_DATA.periods, demoAsOf: DEMO_DATA.asOf, countries };
}

function serveStaticFile(req, res, pathname) {
  const safePath = path.normalize(pathname === "/" ? "/index.html" : pathname);
  const filePath = path.join(ROOT, safePath);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);

  if (pathname === "/api/yields") {
    try {
      const payload = await buildYieldsPayload();
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      res.end(JSON.stringify(payload));
    } catch (err) {
      console.error("Failed to build /api/yields payload:", err);
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "internal_error" }));
    }
    return;
  }

  serveStaticFile(req, res, pathname);
});

server.listen(PORT, () => {
  console.log(`לוח תשואות אג"ח רץ על http://localhost:${PORT}`);
});
