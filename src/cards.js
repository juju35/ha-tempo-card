// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------
import { COLORS, DAY_START_MIN, DEFAULT_TZ, ICONS, INDEX_KEYS, STATS_TTL } from "./core.js";
import { addDays, colorOf, epochOf, esc, fmtDate, fmtDuration, fmtMoney, fmtNum, fmtTime, intlLocale, num, parseRanges, periodAt, periodOf, seasonOf, seasonTotal, svgIcon, t, tempoDay, wall } from "./helpers.js";
import { priceOf, readSrc, sourcesOf } from "./entity-discovery.js";
import { BANNER_STYLE, BASE_STYLE, FULL_STYLE, MINI_STYLE, SCENE_STYLE, sceneSvg, skySvg } from "./styles.js";

// Elements a click acts on, and how one is told from the others across renders (focus kept by keyboard users).
export const FOCUS_SELECTOR = "[data-action], [data-entity]";
export const focusKey = (el) => {
  const data = Object.entries({ ...el.dataset });
  return data.length ? `${el.tagName}|${JSON.stringify(data)}` : "";
};
export const DIALOG_TAGS = new Set(["HA-MORE-INFO-DIALOG", "HA-DIALOG", "DIALOG"]);
export const isOutside = (card, ev) => {
  const path = ev.composedPath();
  return !path.includes(card) && !path.some((n) => DIALOG_TAGS.has(n.tagName));
};

// "A click elsewhere" is caught on the pointer, not only on the click event: on iOS (Safari and the companion app)
// a tap on something that is not clickable (the background, an empty spot, a card with no action) sends no click to
// the page. It counts when the press and the release are both outside the card (a slider dragged out of the card
// does not fold it), and a scroll does not count (the browser cancels the pointer). Keyboard clicks still go through
// the click event.
export const watchOutside = (card, handler) => {
  let downOutside = false;
  const onDown = (ev) => {
    downOutside = isOutside(card, ev);
  };
  const onUp = (ev) => {
    if (downOutside && isOutside(card, ev)) handler(ev);
    downOutside = false;
  };
  const onClick = (ev) => {
    if (ev.detail === 0 && isOutside(card, ev)) handler(ev);
  };
  return {
    on() {
      document.addEventListener("pointerdown", onDown, true);
      document.addEventListener("pointerup", onUp, true);
      document.addEventListener("click", onClick, true);
    },
    // A tap (press and release at the same spot), for the tests.
    tap(ev) {
      onDown(ev);
      onUp(ev);
    },
    off() {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("pointerup", onUp, true);
      document.removeEventListener("click", onClick, true);
    },
  };
};

// No rewrite of the card between a press and its click: Home Assistant updates the card several times a second, and a
// rewrite under the pointer replaces the element pressed, so that the click lands on the card itself and does nothing
// (a button or a row that does not react). While a press is in progress (`_pressing`), a render is left pending
// (`_dirty`): it is done at the click, or right after the release when no click follows (a drag, a scroll).
// `_byPointer` tells a mouse or touch use from the keyboard: after a rewrite, the focus is put back only for the
// keyboard (no focus ring after a click), and always in a text field.
export const holdUnderPress = (card, render) => {
  const root = card.shadowRoot;
  card._onPressEnd = () => {
    window.removeEventListener?.("pointerup", card._onPressEnd, true);
    window.removeEventListener?.("pointercancel", card._onPressEnd, true);
    setTimeout(() => card._endPress(), 0);
  };
  card._endPress = () => {
    card._pressing = false;
    if (!card._dirty) return;
    card._dirty = false;
    render();
  };
  // Left in the middle of a press (see disconnectedCallback).
  card._dropPress = () => {
    card._pressing = false;
    card._dirty = false;
    window.removeEventListener?.("pointerup", card._onPressEnd, true);
    window.removeEventListener?.("pointercancel", card._onPressEnd, true);
  };
  root.addEventListener?.("pointerdown", () => {
    card._byPointer = true;
    card._pressing = true;
    window.addEventListener?.("pointerup", card._onPressEnd, true);
    window.addEventListener?.("pointercancel", card._onPressEnd, true);
  });
  root.addEventListener?.("keydown", () => {
    card._byPointer = false;
  });
  // At the click (capture: before the card acts on it) the press is over, and what the click changes is drawn at once.
  card._pressClick = (ev) => {
    card._pressing = false;
    if (ev.detail === 0) card._byPointer = false;
  };
  root.addEventListener?.("click", card._pressClick, true);
};

// Whether the focus goes back to `el` after a rewrite (see holdUnderPress).
export const keepsFocus = (card, el) => !card._byPointer || typeof el?.selectionStart === "number";

// Night picture: forced by illustration_theme, else Home Assistant's dark theme alone (a light theme keeps the day picture after sunset).
export const isNight = (hass, config) => {
  const theme = config?.illustration_theme;
  if (theme === "night") return true;
  if (theme === "day") return false;
  return !!hass?.themes?.darkMode;
};

export let tcUid = 0;

// The banner's ground strip (the lawn), that the title block keeps clear of, and the gap between the title and the
// status pill on its row (.trow).
export const PILL_GROUND_PX = 10;
export const PILL_GAP_PX = 8;

export class TempoCard extends HTMLElement {
  constructor() {
    super();
    this._uid = ++tcUid;
    this.attachShadow({ mode: "open" });
    this._html = "";
    holdUnderPress(this, () => this._update());
    this.shadowRoot.addEventListener("click", (ev) => this._onClick(ev));
    // Enter / Space on an element with the button role acts as a click, as on a <button>.
    this.shadowRoot.addEventListener("keydown", (ev) => {
      if ((ev.key !== "Enter" && ev.key !== " ") || ev.target?.getAttribute?.("role") !== "button") return;
      ev.preventDefault();
      ev.target.click();
    });
  }

  static getConfigElement() {
    return document.createElement("tempo-card-editor");
  }

  static getStubConfig() {
    return {};
  }

  // Masonry rows of 50 px: the drawn height once the card is on the page (sections hidden or folded), 7 before it is.
  getCardSize() {
    const h = this.shadowRoot?.querySelector("ha-card")?.offsetHeight;
    return h > 0 ? Math.max(2, Math.ceil(h / 50)) : 7;
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6 };
  }

  setConfig(config) {
    if (!config) throw new Error("Invalid configuration");
    this._config = { ...config };
    this.toggleAttribute?.("hide-title", config.show_title === false);
    this.toggleAttribute?.("hide-subtitle", config.show_subtitle === false);
    this._html = "";
    this._lastDeps = null;
    this._stats = null;
    this._update();
  }

  // Home Assistant pushes a new hass on every state change: the card is rebuilt only when what it shows changed.
  set hass(hass) {
    this._hass = hass;
    const deps = this._deps();
    const prev = this._lastDeps;
    if (deps && prev && deps.length === prev.length && deps.every((d, i) => d === prev[i])) return;
    this._lastDeps = deps;
    this._update();
  }

  get hass() {
    return this._hass;
  }

  _deps() {
    const h = this._hass;
    if (!h || !this._config) return null;
    const s = sourcesOf(h, this._config);
    const ids = Object.values(s).map((x) => x?.entity);
    // The minute: countdown, period and Tempo day move on their own.
    return [h.entities, h.language, h.locale, h.themes?.darkMode, h.config?.time_zone, Math.floor(this._now() / 60000), this._stats, ...ids.map((id) => id && h.states[id])];
  }

  connectedCallback() {
    // A click elsewhere on the page folds the sections back to their defaults.
    this._outside ??= watchOutside(this, () => {
      if (!this._toggled?.size) return;
      this._toggled = new Map();
      this._update();
      this.dispatchEvent(new CustomEvent("iron-resize", { bubbles: true, composed: true }));
    });
    this._outside.on();
    this._watchPill();
    // Back on the page after leaving it: rendered again in its default state.
    if (this._hass && this._config) this._update();
    clearInterval(this._tick);
    this._tick = setInterval(() => {
      if (this._hass) this.hass = this._hass;
    }, 20000);
  }

  disconnectedCallback() {
    clearInterval(this._tick);
    this._tick = null;
    this._outside?.off();
    this._unwatchPill();
    this._dropPress();
    // Left (another dashboard view, a conditional card hidden): back to the defaults, so that the card does not
    // come back unfolded.
    this._toggled = new Map();
  }

  // The status pill goes on the title row, right after the title, only when the whole title and the pill's whole
  // label fit there; otherwise it takes its own line under the subtitle (the subtitle then on one line). In the
  // banner, when title, subtitle and pill still do not fit above the ground strip (or the pill's label runs past the
  // text, over the picture), the pill keeps its dot only.
  // Measured after each render and on every new width (or once the web font is loaded), never by a fixed width.
  _fitPill() {
    for (const t of this.shadowRoot?.querySelectorAll?.(".titles") || []) {
      const row = t.querySelector?.(".trow");
      const name = row?.querySelector(".name");
      const chips = row ? [...row.children].filter((n) => n.classList.contains("chip")) : [];
      if (!name?.getBoundingClientRect || !chips.length) continue;
      t.classList.remove("pill-below", "pill-dot");
      // The title's whole width (scrollWidth is rounded: 1 px more, so that a title that fits is never cut).
      const need = chips.reduce((w, c) => w + PILL_GAP_PX + c.getBoundingClientRect().width, name.scrollWidth + 1);
      if (need <= row.getBoundingClientRect().width + 0.5) continue;
      t.classList.add("pill-below");
      const banner = t.closest(".banner");
      if (!banner) continue;
      const box = banner.getBoundingClientRect();
      const ground = box.bottom - PILL_GROUND_PX;
      const right = t.getBoundingClientRect().right;
      const out = [name, ...t.querySelectorAll(".sub"), ...chips].some((n) => {
        const r = n.getBoundingClientRect();
        return r.height > 0 && (r.top < box.top - 0.5 || r.bottom > ground + 0.5 || r.right > right + 0.5);
      });
      if (out) t.classList.add("pill-dot");
    }
  }

  _watchPill() {
    if (typeof ResizeObserver !== "function") return;
    this._pillResize ??= new ResizeObserver((entries) => {
      const w = Math.round(entries.at(-1).contentRect.width);
      if (w === this._pillWidth) return;
      this._pillWidth = w;
      cancelAnimationFrame(this._pillFrame);
      this._pillFrame = requestAnimationFrame(() => this._fitPill());
    });
    this._pillResize.observe(this);
    document.fonts?.ready?.then(() => this._fitPill());
  }

  _unwatchPill() {
    this._pillResize?.disconnect();
    this._pillWidth = null;
  }

  _now() {
    return Date.now();
  }

  _tz() {
    return this._hass?.config?.time_zone || DEFAULT_TZ;
  }

  _t(key, vars) {
    return t(this._hass, this._config, key, vars);
  }

  _locale() {
    return intlLocale(this._hass, this._config);
  }

  _update() {
    if (!this._hass || !this._config) return;
    // Held under a press (see holdUnderPress), drawn after its click.
    if (this._pressing) {
      this._dirty = true;
      return;
    }
    this._dirty = false;
    const html = this._render();
    if (html === this._html) return;
    const kept = this._focusedSpot();
    this._html = html;
    this.shadowRoot.innerHTML = html;
    this._fitPill();
    if (kept) this._focusables(kept.key)[kept.index]?.focus({ preventScroll: true });
  }

  _focusedSpot() {
    const el = this.shadowRoot.activeElement;
    if (!el?.dataset || !keepsFocus(this, el)) return null;
    const key = focusKey(el);
    const index = key ? this._focusables(key).indexOf(el) : -1;
    return index < 0 ? null : { key, index };
  }

  _focusables(key) {
    return [...this.shadowRoot.querySelectorAll(FOCUS_SELECTOR)].filter((n) => focusKey(n) === key);
  }

  _onClick(ev) {
    const el = ev.composedPath().find((n) => n.dataset && (n.dataset.entity || n.dataset.action));
    if (!el) return;
    ev.stopPropagation();
    const { action, entity } = el.dataset;
    if (action === "zoom") return this._toggleZoom(ev);
    if (action === "toggle_section") {
      const key = el.dataset.section;
      this._toggled = new Map(this._toggled).set(key, !this._isCollapsed(key));
      this._update();
      // getCardSize() changed: the masonry view measures the card again.
      return this.dispatchEvent(new CustomEvent("iron-resize", { bubbles: true, composed: true }));
    }
    if (entity) this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: entity }, bubbles: true, composed: true }));
  }

  _toggleZoom() {}

  _isCollapsed(key) {
    if (this._toggled?.has(key)) return this._toggled.get(key);
    const c = this._config.collapsed ?? [];
    return (Array.isArray(c) ? c : [c]).includes(key);
  }

  // Everything the cards show, read once per render.
  _model() {
    const h = this._hass;
    const c = this._config;
    const tz = this._tz();
    const now = this._now();
    const day = tempoDay(now, tz);
    // Sources of calendar days (Tarif EDF) read the day before until 06:00, when the Tempo day changes.
    const beforeSix = (({ h: hh, mi }) => hh * 60 + mi < DAY_START_MIN)(wall(now, tz));
    const s = { ...sourcesOf(h, c) };
    for (const key of ["today", "tomorrow"]) if (s[key] && "early" in s[key] && beforeSix) s[key] = s[key].early;
    const read = (key) => readSrc(h, s[key]);
    const today = colorOf(read("today"));
    const tomorrow = colorOf(read("tomorrow"));
    const computed = periodAt(now, tz, parseRanges(c.offpeak_hours));
    const reported = periodOf(read("period"));
    const period = reported || computed.period;
    // The bounds come from the off-peak hours; when the entity disagrees with them, the countdown follows the
    // integration's own next change time if it has one (RTE Tempo), otherwise none is shown.
    let { start, end } = computed;
    if (period !== computed.period) {
      const change = Date.parse(read("change"));
      start = null;
      end = Number.isFinite(change) && change > now ? change : null;
    }
    // The next period belongs to the next Tempo day when the change is at 06:00: tomorrow's color then.
    const nextDay = end ? tempoDay(end + 60000, tz) : day;
    const sameDay = nextDay.d === day.d && nextDay.mo === day.mo;
    const nextColor = sameDay ? today : tomorrow;
    const price = (color, p) => (color ? priceOf(h, s[`price_${color}_${p}`], `${color}_${p}`) : null);
    return {
      s,
      tz,
      now,
      day,
      today,
      tomorrow,
      period,
      start,
      end,
      next: period === "hc" ? "hp" : "hc",
      nextColor,
      price: price(today, period),
      nextPrice: price(nextColor, period === "hc" ? "hp" : "hc"),
      priceOf: price,
      season: seasonOf(day),
      currency: c.currency || "EUR",
    };
  }

  _render() {
    const m = this._model();
    if (!m.s.today && !m.s.tomorrow && !this._config.today_entity) return `<style>${BASE_STYLE}</style><ha-card><div class="warning">${esc(this._t("no_entity"))}</div></ha-card>`;
    const c = this._config;
    const parts = [this._days(m)];
    if (c.show_period !== false) parts.push(this._periodSection(m));
    if (c.show_season !== false) parts.push(this._seasonSection(m));
    if (c.show_cost !== false) parts.push(this._costSection(m));
    return `<style>${BASE_STYLE}${FULL_STYLE}${SCENE_STYLE}${this._illustrated() ? BANNER_STYLE : ""}</style>
      <ha-card>
        ${this._header(m)}
        <div class="content">${parts.filter(Boolean).join("")}</div>
      </ha-card>`;
  }

  _colorName(color, suffix = "_day") {
    return this._t(color ? `${color}${suffix}` : "unknown_day");
  }

  _periodName(p) {
    return this._t(p === "hc" ? "offpeak" : "peak");
  }

  _illustrated() {
    return this._config.illustration !== false;
  }

  // The illustration's styles (with the hero picture's), only when it is shown.
  _bannerStyle() {
    return this._illustrated() ? `${SCENE_STYLE}${BANNER_STYLE}` : "";
  }

  _header(m) {
    const c = this._config;
    const cls = `c-${m.today || "unknown"}`;
    const icls = `${cls} p-${m.period}`;
    // On a narrow card the label gives way to the price itself.
    const sub = m.price !== null ? `<span class="sub-k">${esc(this._t("current_price"))} · </span>${esc(fmtMoney(m.price, m.currency, this._locale(), 4))}/kWh` : "";
    const chipLabel = this._periodName(m.period);
    const chipEntity = m.s.period?.entity;
    const chipAttrs = chipEntity ? ` clickable" role="button" tabindex="0" data-entity="${esc(chipEntity)}` : "";
    const icon = `<div class="type-icon ${icls}">${svgIcon(ICONS.bolt)}</div>`;
    const subText = m.price !== null ? `${this._t("current_price")} · ${fmtMoney(m.price, m.currency, this._locale(), 4)}/kWh` : "";
    const subDiv = sub ? `<div class="sub" title="${esc(subText)}">${sub}</div>` : "";
    const chip = `<span class="chip ${cls}${chipAttrs}" title="${esc(chipLabel)}" aria-label="${esc(chipLabel)}">${svgIcon(m.period === "hc" ? ICONS.night : ICONS.sun)}<span class="chip-text">${esc(chipLabel)}</span></span>`;
    if (this._illustrated()) {
      // On the sky, the pill (a dot in the day's color and the period) follows the title on its row; on a narrow card
      // it drops under the subtitle, and on a very narrow one only its dot stays (the label in its title).
      const pill = `<span class="chip ${cls}${chipAttrs}" title="${esc(chipLabel)}" aria-label="${esc(chipLabel)}"><span class="dot"></span><span class="chip-text">${esc(chipLabel)}</span></span>`;
      const bannerTitles = `<div class="trow"><div class="name">${esc(c.title || this._t("card_title"))}</div>${pill}</div>${subDiv}`;
      const night = isNight(this._hass, c) ? " night" : "";
      const zoom = this._zoomButton();
      return `
      <div class="banner${night}${zoom ? " zoomable" : ""}">${skySvg()}<div class="tc-ground"></div><div class="tc-art">${sceneSvg(m.today, m.period, this._uid, true)}</div>
        <div class="htext">${icon}<div class="titles">${bannerTitles}</div></div>
        ${zoom}
      </div>`;
    }
    return `
      <div class="header">
        ${icon}
        <div class="titles"><div class="trow"><div class="name">${esc(c.title || this._t("card_title"))}</div>${chip}</div>${subDiv}</div>
        ${this._zoomButton()}
      </div>`;
  }

  _zoomButton() {
    return "";
  }

  // A disc of a day's color; `live` animates it (the day being lived), an unknown tomorrow turns while it waits.
  _disc(color) {
    return `<div class="disc${color ? "" : " pending"}"><span class="ring"></span></div>`;
  }

  _dayAttrs(key, m, color, base) {
    const entity = m.s[key]?.entity;
    const name = `${this._t(key)}: ${this._colorName(color)}`;
    const live = key === "today" && color ? " live" : "";
    return `class="${base} c-${color || "unknown"}${live}${entity ? ` clickable" role="button" tabindex="0" data-entity="${esc(entity)}` : ""}" aria-label="${esc(name)}"`;
  }

  _days(m) {
    const locale = this._locale();
    const tile = (key, color, day) =>
      `<div ${this._dayAttrs(key, m, color, "day")}>${this._disc(color)}<div class="day-text"><div class="k">${esc(this._t(key))}</div><div class="v">${esc(
        this._colorName(color),
      )}</div><div class="date">${esc(fmtDate(day, locale))}</div></div></div>`;
    // The banner shows the picture: the hero keeps it only under a classic header.
    const picture = this._illustrated() ? "" : `<div class="picture">${sceneSvg(m.today, m.period, this._uid)}</div>`;
    return `<div class="hero">${picture}<div class="days">${tile("today", m.today, m.day)}${tile(
      "tomorrow",
      m.tomorrow,
      addDays(m.day, 1),
    )}</div></div>`;
  }

  _sectionTitle(key, icon, label) {
    const closed = this._isCollapsed(key);
    return `<div class="section-title" role="button" tabindex="0" data-action="toggle_section" data-section="${key}" aria-expanded="${!closed}">${svgIcon(icon)}<span>${esc(
      label,
    )}</span>${svgIcon(ICONS.chevron_down, "chevron")}</div>`;
  }

  _section(key, icon, label, body) {
    if (!body) return "";
    return `<div class="section">${this._sectionTitle(key, icon, label)}${this._isCollapsed(key) ? "" : `<div class="section-body">${body}</div>`}</div>`;
  }

  _periodSection(m) {
    const locale = this._locale();
    const cls = `c-${m.today || "unknown"}`;
    const range = m.start && m.end ? `${fmtTime(m.start, m.tz, locale)} – ${fmtTime(m.end, m.tz, locale)}` : "";
    const pct = m.start && m.end ? Math.round(((m.now - m.start) / (m.end - m.start)) * 100) : null;
    const entity = m.s.period?.entity;
    const line = `<div class="period-line ${cls}${entity ? ` clickable" role="button" tabindex="0" data-entity="${esc(entity)}` : ""}"><span class="p">${esc(
      this._periodName(m.period),
    )}</span><span class="muted">${esc(range)}</span>${m.end ? `<span class="end">${esc(this._t("ends_in", { time: fmtDuration(m.end - m.now, locale) }))}</span>` : ""}</div>`;
    const bar = pct === null ? "" : `<div class="bar ${cls}"><div style="width:${Math.max(0, Math.min(100, pct))}%"></div></div>`;
    const tile = (k, v, s, dotColor) =>
      `<div class="tile"><div class="k">${dotColor !== undefined ? `<span class="dot c-${dotColor || "unknown"}"></span>` : ""}<span>${esc(k)}</span></div><div class="v">${esc(v)}</div>${
        s ? `<div class="s">${esc(s)}</div>` : ""
      }</div>`;
    const priceText = (p) => (p === null ? "—" : `${fmtMoney(p, m.currency, locale, 4)}/kWh`);
    const tiles = `<div class="tiles">${tile(this._t("current_price"), priceText(m.price), `${this._colorName(m.today, "")} · ${this._t(m.period === "hc" ? "offpeak_short" : "peak_short")}`, m.today)}${tile(
      this._t("then_period", { period: this._periodName(m.next) }),
      priceText(m.nextPrice),
      m.end ? fmtTime(m.end, m.tz, locale) : "",
      m.nextColor,
    )}</div>`;
    return this._section("period", m.period === "hc" ? ICONS.night : ICONS.sun, this._t("show_period"), line + bar + tiles);
  }

  _seasonSection(m) {
    const h = this._hass;
    const locale = this._locale();
    const rows = [];
    for (const color of COLORS) {
      const s = m.s[`days_left_${color}`];
      const left = num(readSrc(h, s));
      if (left === null) continue;
      const total = seasonTotal(color, m.season);
      const pct = Math.round((left / total) * 100);
      rows.push(
        `<span class="dot c-${color}"></span><span class="lbl clickable" role="button" tabindex="0" data-entity="${esc(s.entity)}">${esc(this._t(color))}</span><div class="bar c-${color}"><div style="width:${Math.max(
          0,
          Math.min(100, pct),
        )}%"></div></div><span class="v">${esc(this._t("days_left", { left: fmtNum(left, 0, locale), total: fmtNum(total, 0, locale) }))}</span>`,
      );
    }
    if (!rows.length) return "";
    const label = this._t("season", { season: `${m.season.y}–${m.season.y + 1}` });
    return this._section("season", ICONS.calendar, label, `<div class="rows">${rows.join("")}</div>`);
  }

  // Energy of today and of the month per index, from the long-term statistics (hourly "change" of each index,
  // summed by day): { <index key>: { day, month } } in kWh, null until loaded.
  _energy(m) {
    const ids = INDEX_KEYS.map((k) => m.s[k]?.entity).filter(Boolean);
    if (!ids.length) return null;
    const monthStart = epochOf(m.tz, wall(m.now, m.tz).y, wall(m.now, m.tz).mo, 1);
    const key = `${ids.join(",")}|${monthStart}`;
    const fresh = this._stats && this._stats.key === key && m.now - this._stats.at < STATS_TTL;
    if (!fresh && !this._statsLoading) this._loadStats(ids, key, monthStart, m.now);
    if (!this._stats || this._stats.key !== key) return null;
    const w = wall(m.now, m.tz);
    const dayStart = epochOf(m.tz, w.y, w.mo, w.d);
    const out = {};
    for (const k of INDEX_KEYS) {
      const id = m.s[k]?.entity;
      const rows = (id && this._stats.data[id]) || [];
      let day = 0;
      let month = 0;
      for (const r of rows) {
        const change = num(r.change) ?? 0;
        const start = typeof r.start === "number" ? r.start : Date.parse(r.start);
        month += change;
        if (start >= dayStart) day += change;
      }
      if (id) out[k] = { day, month };
    }
    return out;
  }

  _loadStats(ids, key, monthStart, now) {
    if (typeof this._hass.callWS !== "function") return;
    this._statsLoading = true;
    Promise.resolve(
      this._hass.callWS({
        type: "recorder/statistics_during_period",
        start_time: new Date(monthStart).toISOString(),
        end_time: new Date(now + 3600000).toISOString(),
        statistic_ids: ids,
        period: "day",
        types: ["change"],
        // Home Assistant converts Wh / MWh indexes.
        units: { energy: "kWh" },
      }),
    )
      .then(
        (data) => {
          this._stats = { key, at: now, data: data || {} };
        },
        () => {
          // A failed refresh keeps the figures already read; a first read that fails shows none (not a zero cost).
          this._stats = this._stats?.key === key && !this._stats.failed ? { ...this._stats, at: now } : { key, at: now, data: {}, failed: true };
        },
      )
      .finally(() => {
        this._statsLoading = false;
        this._update();
      });
  }

  _costSection(m) {
    const energy = this._energy(m);
    if (energy === null && !INDEX_KEYS.some((k) => m.s[k])) return "";
    // The statistics could not be read: no figure rather than a cost of zero.
    const failed = energy !== null && !!this._stats?.failed;
    const locale = this._locale();
    const cur = m.currency;
    const sub = num(this._config.subscription);
    const w = wall(m.now, m.tz);
    const daysInMonth = new Date(Date.UTC(w.y, w.mo, 0)).getUTCDate();
    let dayCost = sub ? sub / daysInMonth : 0;
    let monthCost = sub || 0;
    let dayKwh = 0;
    let monthKwh = 0;
    const rows = [];
    for (const key of INDEX_KEYS) {
      const e = energy?.[key];
      if (!e || failed) continue;
      const [color, p] = key.split("_");
      const price = m.priceOf(color, p) ?? 0;
      dayCost += e.day * price;
      monthCost += e.month * price;
      dayKwh += e.day;
      monthKwh += e.month;
      rows.push(
        `<span class="dot c-${color}"></span><span class="lbl clickable" role="button" tabindex="0" data-entity="${esc(m.s[key].entity)}">${esc(
          `${this._t(color)} · ${this._t(p === "hc" ? "offpeak_short" : "peak_short")}`,
        )}</span><span class="kwh">${esc(`${fmtNum(e.month, 1, locale)} kWh`)}</span><span class="v">${esc(fmtMoney(e.month * price, cur, locale))}</span>`,
      );
    }
    const loading = energy === null;
    const kwh = (v) => (loading || failed ? "" : `${fmtNum(v, 1, locale)} kWh`);
    const tile = (k, v, s) => `<div class="tile"><div class="k"><span>${esc(k)}</span></div><div class="v">${esc(loading ? "…" : failed ? "—" : v)}</div><div class="s">${esc(s)}</div></div>`;
    const subNote = sub ? ` · ${this._t("subscription_incl")}` : "";
    const body = `<div class="tiles">${tile(this._t("today"), fmtMoney(dayCost, cur, locale), kwh(dayKwh))}${tile(this._t("this_month"), fmtMoney(monthCost, cur, locale), `${kwh(monthKwh)}${loading || failed ? "" : subNote}`)}</div>${
      rows.length ? `<div class="rows cost">${rows.join("")}</div>` : ""
    }`;
    return this._section("cost", ICONS.euro, this._t("cost"), body);
  }
}

// The mini card is a full card drawn compact: its detail button (top right, `zoom: false` removes it) switches it
// to the full card's content and back, and a click anywhere else on the page brings the compact view back.
export class TempoMiniCard extends TempoCard {
  constructor() {
    super();
    this._unzoom = watchOutside(this, () => {
      if (this._zoomed) this._setZoom(false);
    });
  }

  static getConfigElement() {
    return document.createElement("tempo-mini-card-editor");
  }

  connectedCallback() {
    super.connectedCallback();
    this._unzoom.on();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unzoom.off();
    // Back to the compact view once off the screen.
    this._zoomed = false;
  }

  getCardSize() {
    return this._zoomed ? super.getCardSize() : 3;
  }

  getGridOptions() {
    return { ...(this._zoomed ? super.getGridOptions() : { columns: 6, min_columns: 3 }), rows: "auto" };
  }

  _zoomButton() {
    if (this._config.zoom === false) return "";
    const z = this._zoomed;
    const label = esc(this._t(z ? "zoom_out" : "zoom_in"));
    return `<button class="zoom" data-action="zoom" title="${label}" aria-label="${label}">${svgIcon(z ? ICONS.collapse : ICONS.expand)}</button>`;
  }

  _setZoom(on) {
    this._zoomed = on;
    this._update();
    // getCardSize()/getGridOptions() changed: the view re-measures the card.
    this.dispatchEvent(new CustomEvent("iron-resize", { bubbles: true, composed: true }));
  }

  _toggleZoom(ev) {
    this._setZoom(!this._zoomed);
    if (ev.detail === 0) this.shadowRoot.querySelector(".zoom")?.focus({ preventScroll: true });
  }

  _render() {
    if (this._zoomed) return super._render();
    const m = this._model();
    if (!m.s.today && !m.s.tomorrow && !this._config.today_entity) return super._render();
    const pill = (key, color) =>
      `<div ${this._dayAttrs(key, m, color, "pill")}>${this._disc(color)}<div class="txt"><span class="k">${esc(this._t(key))}</span><span class="v">${esc(
        this._colorName(color, ""),
      )}</span></div></div>`;
    const locale = this._locale();
    const line = m.end ? `<div class="line c-${m.today || "unknown"}">${svgIcon(m.period === "hc" ? ICONS.night : ICONS.sun)}<span>${esc(
      `${this._periodName(m.period)} · ${this._t("ends_in", { time: fmtDuration(m.end - m.now, locale) })}`,
    )}</span></div>` : "";
    return `<style>${BASE_STYLE}${MINI_STYLE}${this._bannerStyle()}</style>
      <ha-card>
        ${this._header(m)}
        <div class="content"><div class="pills">${pill("today", m.today)}${pill("tomorrow", m.tomorrow)}</div>${line}</div>
      </ha-card>`;
  }
}
