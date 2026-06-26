// ============================================================
// שליפת תשואות חיות ממקורות חינמיים וללא מפתח API
// ------------------------------------------------------------
// כל פונקציה מחזירה { asOf: "YYYY-MM-DD", values: { [periodIndex]: number } }
// periodIndex תואם לאינדקס במערך periods של demo-data.js:
//   0 = 3 חודשים, 1 = 1 שנה, 2 = 2 שנים, 3 = 5 שנים, 4 = 10 שנים, 5 = 30 שנים
// מדינה/תקופה שאין לה מקור חי - לא מופיעה ב-values, ותקבל פולבק לערך הדמו.
// ============================================================

const FETCH_TIMEOUT_MS = 15000;

async function fetchText(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

// ---- ארה"ב: Treasury.gov - Daily Treasury Par Yield Curve Rates ----
async function fetchUS() {
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const url = `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value_month=${yyyymm}`;
  const xml = await fetchText(url);

  const lastFieldValue = (name) => {
    const re = new RegExp(`<d:${name}[^>]*>([\\d.]+)</d:${name}>`, "g");
    let match;
    let last = null;
    while ((match = re.exec(xml)) !== null) last = match[1];
    return last !== null ? parseFloat(last) : null;
  };
  const lastDate = () => {
    const re = /<d:NEW_DATE[^>]*>([\d-]+)T/g;
    let match;
    let last = null;
    while ((match = re.exec(xml)) !== null) last = match[1];
    return last;
  };

  const values = {
    0: lastFieldValue("BC_3MONTH"),
    1: lastFieldValue("BC_1YEAR"),
    2: lastFieldValue("BC_2YEAR"),
    3: lastFieldValue("BC_5YEAR"),
    4: lastFieldValue("BC_10YEAR"),
    5: lastFieldValue("BC_30YEAR")
  };
  if (Object.values(values).some((v) => v === null)) {
    throw new Error("Missing field in Treasury yield curve feed");
  }
  return { asOf: lastDate(), values };
}

// ---- קנדה: Bank of Canada Valet API (אין סדרה ל-3 חודשים/שנה) ----
async function fetchCanada() {
  const seriesByIndex = {
    2: "BD.CDN.2YR.DQ.YLD",
    3: "BD.CDN.5YR.DQ.YLD",
    4: "BD.CDN.10YR.DQ.YLD",
    5: "BD.CDN.LONG.DQ.YLD" // ה"בנצ'מארק" הארוך-טווח, קרוב ל-30 שנה
  };
  const url = `https://www.bankofcanada.ca/valet/observations/${Object.values(seriesByIndex).join(",")}/json?recent=1`;
  const json = JSON.parse(await fetchText(url));
  const obs = json.observations && json.observations[0];
  if (!obs) throw new Error("No observations from Bank of Canada");

  const values = {};
  for (const [index, seriesId] of Object.entries(seriesByIndex)) {
    if (obs[seriesId]) values[index] = parseFloat(obs[seriesId].v);
  }
  return { asOf: obs.d, values };
}

// ---- גרמניה: עקום תשואות אזור האירו (AAA) של ה-ECB, כתחליף לבונדס הגרמני ----
async function fetchGermany() {
  const codesByIndex = { 0: "SR_3M", 1: "SR_1Y", 2: "SR_2Y", 3: "SR_5Y", 4: "SR_10Y", 5: "SR_30Y" };

  const fetchOne = async (code) => {
    const url = `https://data-api.ecb.europa.eu/service/data/YC/B.U2.EUR.4F.G_N_A.SV_C_YM.${code}?lastNObservations=1&format=jsondata`;
    const json = JSON.parse(await fetchText(url));
    const seriesObj = json.dataSets[0].series;
    const seriesKey = Object.keys(seriesObj)[0];
    const obsObj = seriesObj[seriesKey].observations;
    const obsKey = Object.keys(obsObj)[0];
    const value = obsObj[obsKey][0];
    const asOf = json.structure.dimensions.observation[0].values[0].id;
    return { value: Math.round(value * 100) / 100, asOf };
  };

  const entries = await Promise.all(
    Object.entries(codesByIndex).map(async ([index, code]) => [index, await fetchOne(code)])
  );

  const values = {};
  let asOf = null;
  for (const [index, result] of entries) {
    values[index] = result.value;
    asOf = result.asOf;
  }
  return { asOf, values };
}

// ---- World Government Bonds: עקום מלא (6 תקופות), יומי - JP/GB/FR/IT, וגם משלים לקנדה ----
// ה-API הפנימי שלהם (wp-json) דורש רק Referer/Origin תואמים לדפדפן - אין צורך בדפדפן headless.
const WGB_MATURITY_SLUGS = { 0: "3-months", 1: "1-year", 2: "2-years", 3: "5-years", 4: "10-years", 5: "30-years" };
const FULL_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function parseWgbDate(desc) {
  // "24 June 2026" -> "2026-06-24"
  const match = /^(\d{1,2}) (\w+) (\d{4})$/.exec(desc || "");
  if (!match) return null;
  const [, day, monthName, year] = match;
  const monthNum = FULL_MONTHS.indexOf(monthName) + 1;
  if (monthNum === 0) return null;
  return `${year}-${String(monthNum).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

async function fetchWGB(symbol, urlPage) {
  const endpoint = "https://www.worldgovernmentbonds.com/wp-json/country/v1/main";
  const postData = {
    GLOBALVAR: {
      JS_VARIABLE: "jsGlobalVars",
      FUNCTION: "Country",
      DOMESTIC: true,
      ENDPOINT: "https://www.worldgovernmentbonds.com/wp-json/country/v1/historical",
      DATE_RIF: "2099-12-31",
      OBJ: null,
      COUNTRY1: { SYMBOL: symbol, BANDIERA: "", PAESE: "", PAESE_UPPERCASE: "", URL_PAGE: urlPage },
      COUNTRY2: null,
      OBJ1: null,
      OBJ2: null
    }
  };

  const res = await fetch(endpoint, {
    method: "POST",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "Referer": `https://www.worldgovernmentbonds.com/country/${urlPage}/`,
      "Origin": "https://www.worldgovernmentbonds.com",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    },
    body: JSON.stringify(postData)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for WGB ${urlPage}`);
  const json = await res.json();
  if (!json.success) throw new Error(`WGB ${urlPage} returned success=false`);

  const html = json.mainTable || "";
  const values = {};
  for (const [index, slug] of Object.entries(WGB_MATURITY_SLUGS)) {
    const re = new RegExp(`bond-historical-data/[^/]+/${slug}/">\\s*[^<]*</a>\\s*</td>\\s*<td[^>]*>\\s*([\\d.]+)%`);
    const match = re.exec(html);
    if (match) values[index] = parseFloat(match[1]);
  }
  if (Object.keys(values).length === 0) throw new Error(`No yield curve rows parsed for WGB ${urlPage}`);

  return { asOf: parseWgbDate(json.lastDataValDesc), values };
}

// ---- קנדה: השלמת 3 חודשים/שנה (שאין ל-Valet) מ-WGB, שאר התקופות נשארות מהבנק המרכזי ----
async function fetchCanadaFull() {
  const [valet, wgb] = await Promise.all([
    fetchCanada(),
    fetchWGB("21", "canada").catch((err) => {
      console.error(`[live:CA] WGB fill-in failed: ${err.message}`);
      return null;
    })
  ]);
  if (!wgb) return valet;
  return { asOf: valet.asOf, values: { ...wgb.values, ...valet.values } };
}

// מפתח = code של המדינה ב-demo-data.js
module.exports = {
  US: fetchUS,
  CA: fetchCanadaFull,
  DE: fetchGermany,
  GB: () => fetchWGB("5", "united-kingdom"),
  JP: () => fetchWGB("11", "japan"),
  FR: () => fetchWGB("3", "france"),
  IT: () => fetchWGB("1", "italy")
};
