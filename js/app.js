// ============================================================
// טוען נתונים מ-/api/yields ובונה את הטבלה, עם מיון ומדרגי צבע
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
  const thead = document.querySelector("#bonds-table thead");
  const tbody = document.querySelector("#bonds-table tbody");
  const asOfEl = document.getElementById("as-of");
  const statusEl = document.getElementById("load-status");

  let bondData;
  try {
    const res = await fetch("/api/yields");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    bondData = await res.json();
  } catch (err) {
    console.error("Failed to load /api/yields:", err);
    statusEl.textContent = "שגיאה בטעינת הנתונים מהשרת. ודאו ש-server.js פועל (node server.js) ורעננו את העמוד.";
    return;
  }

  statusEl.remove();
  asOfEl.textContent = formatDate(bondData.demoAsOf);

  // מצב מיון נוכחי: null = לפי הסדר המקורי, מספר = אינדקס עמודת תקופה, "name" = לפי שם מדינה
  let sortKey = null;
  let sortDir = 1; // 1 = עולה, -1 = יורד

  renderHead();
  renderBody();

  function renderHead() {
    const tr = document.createElement("tr");

    const countryTh = document.createElement("th");
    countryTh.textContent = "מדינה";
    countryTh.classList.add("sortable", "country-col");
    countryTh.addEventListener("click", () => setSort("name", countryTh));
    tr.appendChild(countryTh);

    bondData.periods.forEach((period, index) => {
      const th = document.createElement("th");
      th.textContent = period;
      th.classList.add("sortable");
      th.addEventListener("click", () => setSort(index, th));
      tr.appendChild(th);
    });

    thead.appendChild(tr);
  }

  function setSort(key, thElement) {
    if (sortKey === key) {
      sortDir *= -1;
    } else {
      sortKey = key;
      sortDir = 1;
    }

    thead.querySelectorAll("th").forEach((th) => {
      th.classList.remove("sorted-asc", "sorted-desc");
    });
    thElement.classList.add(sortDir === 1 ? "sorted-asc" : "sorted-desc");

    renderBody();
  }

  function renderBody() {
    tbody.innerHTML = "";

    const rows = [...bondData.countries];
    if (sortKey !== null) {
      rows.sort((a, b) => {
        const va = sortKey === "name" ? a.name : a.cells[sortKey].value;
        const vb = sortKey === "name" ? b.name : b.cells[sortKey].value;
        if (va < vb) return -1 * sortDir;
        if (va > vb) return 1 * sortDir;
        return 0;
      });
    }

    // טווח מינ/מקס לכל עמודת תקופה, לצביעת מדרג חום
    const ranges = bondData.periods.map((_, colIndex) => {
      const values = bondData.countries.map((c) => c.cells[colIndex].value);
      return { min: Math.min(...values), max: Math.max(...values) };
    });

    rows.forEach((country) => {
      const tr = document.createElement("tr");

      const nameTd = document.createElement("td");
      nameTd.classList.add("country-col");
      nameTd.innerHTML = `<span class="country-code">${country.code}</span> ${country.name}`;
      tr.appendChild(nameTd);

      country.cells.forEach((cell, colIndex) => {
        const td = document.createElement("td");
        td.style.backgroundColor = heatColor(cell.value, ranges[colIndex]);

        const link = document.createElement("a");
        link.href = country.source;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = `${cell.value.toFixed(2)}%`;
        link.title = cell.live
          ? `נתון חי (${cell.frequency === "monthly" ? "חודשי" : "יומי"}), נכון ל-${formatPeriodDate(cell.asOf, cell.frequency)}. מקור: ${country.sourceName}`
          : `נתון דמו. מקור: ${country.sourceName}`;
        td.appendChild(link);

        const badge = document.createElement("span");
        badge.className = cell.live ? "status-badge live" : "status-badge demo";
        badge.textContent = cell.live ? "חי" : "דמו";
        td.appendChild(badge);

        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });
  }

  // צבע רקע בין אדום (תשואה נמוכה) לירוק (תשואה גבוהה) בתוך העמודה
  function heatColor(value, { min, max }) {
    const ratio = max === min ? 0.5 : (value - min) / (max - min);
    const hue = ratio * 140; // 0=אדום -> 140=ירוק
    return `hsl(${hue}, 65%, 88%)`;
  }

  function formatDate(isoDate) {
    if (!isoDate) return "";
    const [year, month, day] = isoDate.split("-");
    return `${day}.${month}.${year}`;
  }

  // נתון חודשי מגיע כ-"YYYY-MM" (בלי יום מזויף) - מוצג כ-MM.YYYY
  function formatPeriodDate(isoDate, frequency) {
    if (!isoDate) return "";
    if (frequency === "monthly") {
      const [year, month] = isoDate.split("-");
      return `${month}.${year}`;
    }
    return formatDate(isoDate);
  }
});
