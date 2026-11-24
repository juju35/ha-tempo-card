// ---------------------------------------------------------------------------
// Visual editors (ha-form)
// ---------------------------------------------------------------------------
import { COLORS, DEFAULT_PRICES, INDEX_KEYS, LANGUAGES, SECTIONS } from "./core.js";
import { lang, t } from "./helpers.js";

export const DEFAULTS = { illustration: true, illustration_theme: "auto", show_title: true, show_subtitle: true, show_period: true, show_season: true, show_cost: true, zoom: true, collapsed: [], currency: "EUR" };

export class TempoCardEditor extends HTMLElement {
  static get toggles() {
    return ["illustration", "show_title", "show_subtitle", "show_period", "show_season", "show_cost"];
  }

  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _label(name) {
    const [color, p] = name.split("_");
    if (INDEX_KEYS.includes(name)) return `${t(this._hass, this._config, color)} · ${t(this._hass, this._config, p === "hc" ? "offpeak_short" : "peak_short")}`;
    return t(this._hass, this._config, name);
  }

  _schema() {
    const tr = (k) => t(this._hass, this._config, k);
    const sensor = { entity: { domain: ["sensor", "binary_sensor"] } };
    const expandable = (name, icon, schema) => ({ type: "expandable", name, title: tr(name), icon, schema });
    return [
      { name: "title", selector: { text: {} } },
      { name: "today_entity", selector: { entity: { domain: "sensor" } } },
      { name: "tomorrow_entity", selector: { entity: { domain: "sensor" } } },
      { name: "offpeak_entity", selector: sensor },
      { name: "offpeak_hours", selector: { text: {} } },
      { type: "grid", name: "", schema: this.constructor.toggles.map((name) => ({ name, selector: { boolean: {} } })) },
      {
        name: "illustration_theme",
        selector: { select: { mode: "dropdown", options: ["auto", "day", "night"].map((value) => ({ value, label: tr(`theme_${value}`) })) } },
      },
      // The mini card too: its detail button shows the full card's content with this same configuration.
      {
        name: "collapsed",
        selector: { select: { multiple: true, mode: "list", options: SECTIONS.map((value) => ({ value, label: tr(`show_${value}`) })) } },
      },
      expandable(
        "indexes",
        "mdi:counter",
        INDEX_KEYS.map((name) => ({ name, selector: { entity: { domain: "sensor" } } })),
      ),
      expandable("prices", "mdi:currency-eur", [
        ...INDEX_KEYS.map((name) => ({ name, selector: { number: { min: 0, step: 0.0001, mode: "box", unit_of_measurement: "/kWh" } } })),
      ]),
      { name: "subscription", selector: { number: { min: 0, step: 0.01, mode: "box" } } },
      { name: "currency", selector: { text: {} } },
      expandable(
        "days_left_entities",
        "mdi:calendar-range",
        COLORS.map((name) => ({ name, selector: { entity: { domain: "sensor" } } })),
      ),
      { name: "language", selector: { select: { mode: "dropdown", options: [{ value: "", label: tr("lang_auto") }, ...LANGUAGES.map(([value, label]) => ({ value, label }))] } } },
    ];
  }

  _render() {
    if (!this._hass || !this._config) return;
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (s) => this._label(s.name);
      this._form.computeHelper = (s) => (s.name === "zoom" ? t(this._hass, this._config, "zoom_helper") : undefined);
      this._form.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        // The form edits prices as numbers: a price entity set in YAML stays until its number is changed.
        const value = { ...ev.detail.value };
        const kept = Object.entries(this._config.prices || {}).filter(([k, v]) => typeof v === "string" && value.prices?.[k] === DEFAULT_PRICES[k]);
        if (kept.length) value.prices = { ...value.prices, ...Object.fromEntries(kept) };
        this._config = cleanConfig(value);
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
      });
      this.appendChild(this._form);
    }
    const data = { ...DEFAULTS, ...this._config };
    // The nested forms take an object; the YAML key of the days left is days_left.
    data.indexes = { ...data.indexes };
    data.prices = { ...DEFAULT_PRICES, ...Object.fromEntries(Object.entries(data.prices || {}).filter(([, v]) => typeof v === "number")) };
    data.days_left_entities = { ...data.days_left };
    delete data.days_left;
    this._form.hass = this._hass;
    if (this._dataFor !== this._config) {
      this._dataFor = this._config;
      this._form.data = data;
    }
    const l = lang(this._hass, this._config);
    if (this._schemaLang !== l) {
      this._schemaLang = l;
      this._form.schema = this._schema();
    }
  }
}

// Keeps the YAML minimal: no empty value, no option left at its default, prices only where they differ.
export const cleanConfig = (value) => {
  const config = { ...value };
  if (config.days_left_entities) {
    config.days_left = config.days_left_entities;
    delete config.days_left_entities;
  }
  for (const [k, v] of Object.entries(config)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const o = { ...v };
      for (const [sk, sv] of Object.entries(o)) if (sv === "" || sv === undefined || sv === null || (k === "prices" && sv === DEFAULT_PRICES[sk])) delete o[sk];
      if (Object.keys(o).length) config[k] = o;
      else delete config[k];
    } else if (v === "" || v === undefined || v === null || (k in DEFAULTS && JSON.stringify(v) === JSON.stringify(DEFAULTS[k]))) delete config[k];
  }
  return config;
};

// The full card's sections too: the detail button shows the full card's content with this same configuration.
export class TempoMiniCardEditor extends TempoCardEditor {
  static get toggles() {
    return ["illustration", "show_title", "show_subtitle", "zoom", "show_period", "show_season", "show_cost"];
  }
}
