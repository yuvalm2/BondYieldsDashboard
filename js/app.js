// ============================================================
// בניית הטבלה מתוך BOND_DATA (js/data.js) + מיון ומדרגי צבע
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  const thead = document.querySelector("#bonds-table thead");
  const tbody = document.querySelector("#bonds-table tbody");
  const asOfEl = document.getElementById("as-of");

  asOfEl.textContent = formatDate(BOND_DATA.asOf);

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

    BOND_DATA.periods.forEach((period, index) => {
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

    const rows = [...BOND_DATA.countries];
    if (sortKey !== null) {
      rows.sort((a, b) => {
        const va = sortKey === "name" ? a.name : a.yields[sortKey];
        const vb = sortKey === "name" ? b.name : b.yields[sortKey];
        if (va < vb) return -1 * sortDir;
        if (va > vb) return 1 * sortDir;
        return 0;
      });
    }

    // טווח מינ/מקס לכל עמודת תקופה, לצביעת מדרג חום
    const ranges = BOND_DATA.periods.map((_, colIndex) => {
      const values = BOND_DATA.countries.map((c) => c.yields[colIndex]);
      return { min: Math.min(...values), max: Math.max(...values) };
    });

    rows.forEach((country) => {
      const tr = document.createElement("tr");

      const nameTd = document.createElement("td");
      nameTd.classList.add("country-col");
      nameTd.innerHTML = `<span class="country-code">${country.code}</span> ${country.name}`;
      tr.appendChild(nameTd);

      country.yields.forEach((value, colIndex) => {
        const td = document.createElement("td");
        td.style.backgroundColor = heatColor(value, ranges[colIndex]);

        const link = document.createElement("a");
        link.href = country.source;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.title = `מקור: ${country.sourceName}`;
        link.textContent = `${value.toFixed(2)}%`;
        td.appendChild(link);

        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });
  }

  // צבע רקע בין ירוק (תשואה נמוכה) לאדום (תשואה גבוהה) בתוך העמודה
  function heatColor(value, { min, max }) {
    const ratio = max === min ? 0.5 : (value - min) / (max - min);
    const hue = 140 - ratio * 140; // 140=ירוק -> 0=אדום
    return `hsl(${hue}, 65%, 88%)`;
  }

  function formatDate(isoDate) {
    const [year, month, day] = isoDate.split("-");
    return `${day}.${month}.${year}`;
  }
});
