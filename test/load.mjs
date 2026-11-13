// Evaluates src/tempo-card.js (a classic script, bundled as is by scripts/build.mjs) in a sandbox with minimal DOM
// stand-ins and returns the names the tests need. No dependency, no browser.
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { entities, hassConfig, statistics, states } from "../scripts/mock-states.mjs";

const source = readFileSync(new URL("../src/tempo-card.js", import.meta.url), "utf8");

const fakeRoot = () => ({
  innerHTML: "",
  listeners: {},
  activeElement: null,
  addEventListener(type, fn) {
    this.listeners[type] = fn;
  },
  querySelector() {
    return null;
  },
  querySelectorAll() {
    return [];
  },
});

const fakeNode = (tag) => ({
  tagName: String(tag).toUpperCase(),
  children: [],
  listeners: {},
  appendChild(child) {
    this.children.push(child);
    return child;
  },
  addEventListener(type, fn) {
    this.listeners[type] = fn;
  },
});

// `now`: the instant the cards live at (Date.now and new Date() without argument), an ISO string or ms.
export const load = ({ now = "2026-11-12T15:42:00+01:00" } = {}) => {
  const registry = new Map();
  const fixed = typeof now === "number" ? now : Date.parse(now);
  class FixedDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [fixed]));
    }
    static now() {
      return fixed;
    }
  }
  class HTMLElement {
    attachShadow() {
      this.shadowRoot = fakeRoot();
      return this.shadowRoot;
    }
    dispatchEvent(ev) {
      (this.events ||= []).push(ev);
    }
    appendChild() {}
    toggleAttribute(name, on) {
      (this.attrs ||= new Set())[on ? "add" : "delete"](name);
    }
  }
  class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  }
  const listeners = {};
  const sandbox = {
    HTMLElement,
    CustomEvent,
    Intl,
    Date: FixedDate,
    Promise,
    console: { info() {}, warn() {} },
    customElements: { get: (t) => registry.get(t), define: (t, c) => registry.set(t, c) },
    document: {
      createElement: (t) => (registry.has(t) ? new (registry.get(t))() : fakeNode(t)),
      addEventListener(type, fn) {
        (listeners[type] ||= new Set()).add(fn);
      },
      removeEventListener(type, fn) {
        listeners[type]?.delete(fn);
      },
    },
    fire: (type, ev) => {
      for (const fn of [...(listeners[type] || [])]) fn(ev);
    },
    setTimeout,
    clearTimeout,
    setInterval: () => 0,
    clearInterval() {},
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  return vm.runInContext(
    `${source}
    ({ colorOf, periodOf, parseRanges, periodAt, tempoDay, seasonOf, seasonTotal, wall, epochOf, discover, sourcesOf, cleanConfig, STRINGS, LANGUAGES,
       DEFAULT_PRICES, INDEX_KEYS, TempoCard: customElements.get("tempo-card"), TempoMiniCard: customElements.get("tempo-mini-card"),
       TempoCardEditor: customElements.get("tempo-card-editor"), TempoMiniCardEditor: customElements.get("tempo-mini-card-editor"), window, document, fire })`,
    sandbox,
  );
};

// A hass with the mock data; `overrides` patch states ({ id: { state, attributes } }), `stats` answers the
// statistics query.
export const makeHass = (overrides = {}, { stats = statistics, ...extra } = {}) => {
  const st = { ...states };
  for (const [id, o] of Object.entries(overrides)) st[id] = { ...(st[id] || { entity_id: id, attributes: {} }), ...o };
  const calls = [];
  return {
    states: st,
    entities,
    language: "en",
    locale: { language: "en" },
    config: hassConfig,
    themes: {},
    calls,
    callWS: async (msg) => {
      calls.push(msg);
      return stats;
    },
    callService() {},
    ...extra,
  };
};
