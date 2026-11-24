// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
import { DAY_START_MIN, DEFAULT_OFFPEAK, DEFAULT_TZ, SEASON_TOTALS } from "./core.js";
import { STRINGS } from "./i18n/strings.js";

export const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const lang = (hass, config) => {
  const l = config?.language || (hass && (hass.locale?.language || hass.language)) || "en";
  return STRINGS[l] ? l : STRINGS[l.split("-")[0]] ? l.split("-")[0] : "en";
};

// Locale for Intl: the card's language, with HA's region when it matches (pt-BR, de-CH); a bare "pt" is European.
export const intlLocale = (hass, config) => {
  const l = lang(hass, config);
  const src = config?.language || (hass && (hass.locale?.language || hass.language)) || "";
  const out = src && src.split("-")[0] === l.split("-")[0] ? src : l;
  return out === "pt" ? "pt-PT" : out;
};

export const t = (hass, config, key, vars = {}) =>
  String(STRINGS[lang(hass, config)][key] ?? STRINGS.en[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");

export const valid = (s) => !!s && !["unknown", "unavailable", ""].includes(s.state);

export const num = (v) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export const svgIcon = (path, cls = "") => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;

// Lower case without accents, to read color and period names in any of the integrations' spellings.
export const fold = (v) =>
  String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

// Tempo color of a state or attribute value: "Bleu", "blanc", "ROUGE", "BLEU"/"BLAN"/"ROUG" (TIC DEMAIN), "HPJR"
// (TIC PTEC), "HC BLEU" (TIC LTARF), "Bleu HP" (EDF Tempo), "blue", 1-3, or the emoji of RTE Tempo. null: unknown.
export const colorOf = (v) => {
  if (v === null || v === undefined || typeof v === "boolean") return null;
  const s = fold(v);
  const ptec = s.match(/^h[pc]j([bwr])$/);
  if (ptec) return { b: "blue", w: "white", r: "red" }[ptec[1]];
  if (s === "1" || s.includes("🔵") || /(^|[^a-z])(bleu|blue)/.test(s)) return "blue";
  if (s === "2" || s.includes("⚪") || /(^|[^a-z])(blanc?|white)([^a-z]|$)/.test(s)) return "white";
  if (s === "3" || s.includes("🔴") || /(^|[^a-z])(rouge?|red)([^a-z]|$)/.test(s)) return "red";
  return null;
};

// Off-peak ("hc") or peak ("hp") of a value: a binary sensor (on = off-peak), "HC"/"HP", "HCJB" (PTEC), "HC BLEU"
// (LTARF), "Bleu HP", "Heures creuses", "off-peak". null: unknown.
export const periodOf = (v) => {
  if (v === true || v === "on") return "hc";
  if (v === false || v === "off") return "hp";
  const s = fold(v);
  if (/(^|[^a-z])hc|creuse|off.?peak/.test(s)) return "hc";
  if (/(^|[^a-z])hp|pleine|peak/.test(s)) return "hp";
  return null;
};

// Off-peak ranges as [start, end] minutes since midnight, from "22:00-06:00" or a list of them ("12:30-14:30").
export const parseRanges = (value) => {
  const list = Array.isArray(value) ? value : String(value || DEFAULT_OFFPEAK).split(/[,;]/);
  const ranges = [];
  for (const item of list) {
    const m = String(item).match(/(\d{1,2})[:h](\d{2})\s*[-–>à]+\s*(\d{1,2})[:h](\d{2})/);
    if (m) ranges.push([Number(m[1]) * 60 + Number(m[2]), Number(m[3]) * 60 + Number(m[4])]);
  }
  return ranges.length ? ranges : parseRanges(DEFAULT_OFFPEAK);
};

// Wall-clock time of an instant in a time zone: { y, mo (1-12), d, h, mi, s }.
export const WALL = {};
export const wall = (ms, tz) => {
  let f = WALL[tz];
  if (!f) {
    try {
      f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
    } catch (_err) {
      return wall(ms, DEFAULT_TZ);
    }
    WALL[tz] = f;
  }
  const p = {};
  for (const x of f.formatToParts(new Date(ms))) if (x.type !== "literal") p[x.type] = Number(x.value);
  return { y: p.year, mo: p.month, d: p.day, h: p.hour % 24, mi: p.minute, s: p.second };
};

// Instant of a wall-clock time in a time zone; the day and the minutes may overflow (day 0, minute 1500).
export const epochOf = (tz, y, mo, d, minutes = 0) => {
  const guess = Date.UTC(y, mo - 1, d, 0, minutes);
  const w = wall(guess, tz);
  return guess - (Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi) - guess);
};

// Calendar date { y, mo, d } a number of days after another one.
export const addDays = ({ y, mo, d }, n) => {
  const x = new Date(Date.UTC(y, mo - 1, d + n));
  return { y: x.getUTCFullYear(), mo: x.getUTCMonth() + 1, d: x.getUTCDate() };
};

// The Tempo day an instant belongs to (06:00 to 06:00): before 06:00, the day before.
export const tempoDay = (ms, tz) => {
  const w = wall(ms, tz);
  return w.h * 60 + w.mi < DAY_START_MIN ? addDays(w, -1) : { y: w.y, mo: w.mo, d: w.d };
};

// Current period from the off-peak ranges: { period, start, end } with the instants of its bounds.
export const periodAt = (ms, tz, ranges) => {
  const w = wall(ms, tz);
  const minute = w.h * 60 + w.mi + w.s / 60;
  const segs = [];
  for (const day of [-1, 0, 1]) for (const [a, b] of ranges) segs.push([day * 1440 + a, day * 1440 + (b <= a ? b + 1440 : b)]);
  segs.sort((x, y) => x[0] - y[0]);
  const on = segs.find(([a, b]) => minute >= a && minute < b);
  const at = (m) => epochOf(tz, w.y, w.mo, w.d, m);
  if (on) return { period: "hc", start: at(on[0]), end: at(on[1]) };
  const before = Math.max(...segs.filter(([, b]) => b <= minute).map(([, b]) => b));
  const after = Math.min(...segs.filter(([a]) => a > minute).map(([a]) => a));
  return { period: "hp", start: at(before), end: at(after) };
};

// Season (1 September to 31 August) of a Tempo day: its first year and its length in days.
export const seasonOf = (day) => {
  const y = day.mo >= 9 ? day.y : day.y - 1;
  return { y, days: Math.round((Date.UTC(y + 1, 8, 1) - Date.UTC(y, 8, 1)) / 86400000) };
};

export const seasonTotal = (color, season) => SEASON_TOTALS[color] ?? season.days - SEASON_TOTALS.white - SEASON_TOTALS.red;

export const UNIT_FMT = {};
export const fmtUnit = (v, unit, locale) => (UNIT_FMT[`${locale}|${unit}`] ??= new Intl.NumberFormat(locale, { style: "unit", unit, unitDisplay: "short" })).format(v);

// Duration until an instant: "6 hr 18 min", "12 min".
export const fmtDuration = (ms, locale) => {
  const total = Math.max(0, Math.ceil(ms / 60000));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${fmtUnit(h, "hour", locale)} ${fmtUnit(m, "minute", locale)}` : fmtUnit(m, "minute", locale);
};

export const fmtTime = (ms, tz, locale) => {
  try {
    return new Date(ms).toLocaleTimeString(locale, { timeZone: tz, hour: "numeric", minute: "2-digit" });
  } catch (_err) {
    return new Date(ms).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  }
};

export const fmtDate = (day, locale) => new Date(Date.UTC(day.y, day.mo - 1, day.d, 12)).toLocaleDateString(locale, { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });

export const fmtMoney = (v, currency, locale, digits = 2) => {
  if (v === null || v === undefined) return "—";
  try {
    return Number(v).toLocaleString(locale, { style: "currency", currency, minimumFractionDigits: digits, maximumFractionDigits: digits });
  } catch (_err) {
    return `${Number(v).toFixed(digits)} ${currency}`;
  }
};

export const fmtNum = (v, digits, locale) => (v === null || v === undefined ? "—" : Number(v).toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }));
