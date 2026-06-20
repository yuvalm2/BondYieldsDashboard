// ============================================================
// נתוני תשואות אג"ח ממשלתיות - נתוני דמו לצורך הדגמה
// ------------------------------------------------------------
// כדי לעדכן את הנתונים:
//  1. עדכנו את התאריך בשדה asOf (פורמט YYYY-MM-DD).
//  2. עדכנו את הערכים במערך yields של כל מדינה - הערכים הם
//     אחוזי תשואה שנתית (אנצואלית, לדוגמה 4.35 = 4.35% לשנה),
//     גם עבור תקופות קצרות משנה, בהתאם לסדר התקופות שמוגדר
//     במערך periods.
//  3. אפשר להוסיף/להסיר מדינות על ידי הוספה/מחיקה של אובייקט
//     במערך countries (עם name, code דו-אותיות, source/sourceName
//     ו-yields באותו אורך כמו מערך periods).
//  4. source/sourceName - הקישור שאליו מובילה הלחיצה על כל
//     ערך תשואה באותה שורה, ושמו המוצג (tooltip).
// ============================================================

const BOND_DATA = {
  // תאריך "נכון ל-" שמוצג בתחתית העמוד
  asOf: "2026-06-15",

  // כותרות העמודות - תקופות (מח"מ) האג"ח
  periods: ["3 חודשים", "1 שנה", "2 שנים", "5 שנים", "10 שנים", "30 שנים"],

  // מדינות מרכזיות + ישראל, עם תשואה שנתית (%) לכל תקופה
  countries: [
    {
      name: "ארה\"ב", code: "US",
      source: "https://www.worldgovernmentbonds.com/country/united-states/",
      sourceName: "World Government Bonds",
      yields: [5.30, 4.80, 4.60, 4.30, 4.40, 4.60]
    },
    {
      name: "גרמניה", code: "DE",
      source: "https://www.worldgovernmentbonds.com/country/germany/",
      sourceName: "World Government Bonds",
      yields: [3.60, 3.00, 2.60, 2.40, 2.50, 2.90]
    },
    {
      name: "בריטניה", code: "GB",
      source: "https://www.worldgovernmentbonds.com/country/united-kingdom/",
      sourceName: "World Government Bonds",
      yields: [4.90, 4.50, 4.20, 4.10, 4.30, 4.80]
    },
    {
      name: "יפן", code: "JP",
      source: "https://www.worldgovernmentbonds.com/country/japan/",
      sourceName: "World Government Bonds",
      yields: [0.10, 0.30, 0.40, 0.70, 1.00, 2.20]
    },
    {
      name: "צרפת", code: "FR",
      source: "https://www.worldgovernmentbonds.com/country/france/",
      sourceName: "World Government Bonds",
      yields: [3.60, 3.00, 2.80, 2.90, 3.20, 3.80]
    },
    {
      name: "איטליה", code: "IT",
      source: "https://www.worldgovernmentbonds.com/country/italy/",
      sourceName: "World Government Bonds",
      yields: [3.60, 3.10, 3.00, 3.20, 3.70, 4.30]
    },
    {
      name: "קנדה", code: "CA",
      source: "https://www.worldgovernmentbonds.com/country/canada/",
      sourceName: "World Government Bonds",
      yields: [4.20, 3.60, 3.30, 3.20, 3.40, 3.50]
    },
    {
      // לתקופות של עד שנה - תשואת מק"מ; לתקופות ארוכות יותר - אג"ח ממשלתי
      name: "ישראל", code: "IL",
      source: "https://www.boi.org.il/roles/statistics/makamandbonds/yield/",
      sourceName: "בנק ישראל - אג\"ח ומק\"מ (תשואות לפדיון)",
      yields: [4.50, 4.30, 4.20, 4.30, 4.50, 5.00]
    }
  ]
};
