import assert from "node:assert/strict";
import { test } from "node:test";
import { AFTERNOON, MORNING, NIGHT, entities, offPeak, pending, redDay, states } from "../scripts/mock-states.mjs";
import { load, makeHass } from "./load.mjs";

const tick = () => new Promise((r) => setTimeout(r, 10));
const TZ = "Europe/Paris";
const html = (card) => card.shadowRoot.innerHTML;

const newCard = async (config = {}, { now = AFTERNOON, overrides = {}, hass = {}, mini = false } = {}) => {
  const tc = load({ now });
  const card = new (mini ? tc.TempoMiniCard : tc.TempoCard)();
  card.setConfig(config);
  card.hass = makeHass(overrides, hass);
  card.connectedCallback();
  await tick();
  return { tc, card };
};

const tc = load();

test("colors are read in every spelling of the integrations", () => {
  for (const v of ["Bleu", "BLEU", "bleu", "blue", "HPJB", "HCJB", "HC BLEU", "Bleu HP", "1", "🔵"]) assert.equal(tc.colorOf(v), "blue", v);
  for (const v of ["Blanc", "BLAN", "white", "HPJW", "HP BLANC", "Blanc HC", "2", "⚪"]) assert.equal(tc.colorOf(v), "white", v);
  for (const v of ["Rouge", "ROUG", "red", "HPJR", "HC ROUGE", "3", "🔴"]) assert.equal(tc.colorOf(v), "red", v);
  for (const v of ["inconnu", "indéterminé", "----", "unavailable", "", null, undefined, true]) assert.equal(tc.colorOf(v), null, String(v));
});

test("periods are read from binary sensors and tariff labels", () => {
  for (const v of ["on", true, "HC", "HCJB", "HC BLEU", "Bleu HC", "Heures creuses", "off-peak"]) assert.equal(tc.periodOf(v), "hc", String(v));
  for (const v of ["off", false, "HP", "HPJR", "HP ROUGE", "Rouge HP", "Heures pleines", "peak"]) assert.equal(tc.periodOf(v), "hp", String(v));
  assert.equal(tc.periodOf("unknown"), null);
});

test("off-peak hours are parsed from a string or a list", () => {
  assert.deepEqual([...tc.parseRanges("22:00-06:00").map((r) => [...r])], [[1320, 360]]);
  assert.deepEqual([...tc.parseRanges(["12:30-14:30", "23h00-07h00"]).map((r) => [...r])], [[750, 870], [1380, 420]]);
  assert.deepEqual([...tc.parseRanges("nonsense").map((r) => [...r])], [[1320, 360]]);
});

test("the current period and its bounds follow the off-peak hours in Paris time", () => {
  const r = tc.parseRanges("22:00-06:00");
  const at = (iso) => tc.periodAt(Date.parse(iso), TZ, r);
  const peak = at(AFTERNOON);
  assert.equal(peak.period, "hp");
  assert.equal(peak.start, Date.parse("2026-11-12T06:00:00+01:00"));
  assert.equal(peak.end, Date.parse("2026-11-12T22:00:00+01:00"));
  const night = at(NIGHT);
  assert.equal(night.period, "hc");
  assert.equal(night.end, Date.parse("2026-11-13T06:00:00+01:00"));
  const early = at("2026-11-13T02:00:00+01:00");
  assert.equal(early.period, "hc");
  assert.equal(early.start, Date.parse("2026-11-12T22:00:00+01:00"));
  // Summer time: the bounds keep their wall-clock time.
  assert.equal(at("2026-07-01T12:00:00+02:00").end, Date.parse("2026-07-01T22:00:00+02:00"));
});

test("a Tempo day runs from 06:00 to 06:00 and a season from 1 September", () => {
  assert.deepEqual({ ...tc.tempoDay(Date.parse("2026-11-13T05:59:00+01:00"), TZ) }, { y: 2026, mo: 11, d: 12 });
  assert.deepEqual({ ...tc.tempoDay(Date.parse("2026-11-13T06:00:00+01:00"), TZ) }, { y: 2026, mo: 11, d: 13 });
  const s = tc.seasonOf({ y: 2027, mo: 3, d: 1 });
  assert.deepEqual({ ...s }, { y: 2026, days: 365 });
  assert.equal(tc.seasonTotal("blue", s), 300);
  assert.equal(tc.seasonTotal("white", s), 43);
  assert.equal(tc.seasonTotal("red", s), 22);
  assert.equal(tc.seasonTotal("blue", tc.seasonOf({ y: 2027, mo: 9, d: 1 })), 301, "leap season");
});

test("RTE Tempo and Linky TIC entities are found through the registry", () => {
  const s = tc.sourcesOf(makeHass(), {});
  assert.equal(s.today.entity, "sensor.rte_tempo_couleur_actuelle");
  assert.equal(s.tomorrow.entity, "sensor.rte_tempo_prochaine_couleur");
  assert.equal(s.period.entity, "binary_sensor.rte_tempo_heures_creuses");
  assert.equal(s.change.entity, "sensor.rte_tempo_heures_creuses_changement");
  assert.equal(s.days_left_red.entity, "sensor.rte_tempo_cycle_jours_restants_rouge");
  assert.equal(s.blue_hc.entity, "sensor.linky_index_tempo_blue_days_off_peak_hours");
  assert.equal(s.red_hp.entity, "sensor.linky_index_tempo_red_days_peak_hours");
  assert.equal(s.price_red_hp.value, 0.7295);
});

test("the meter alone (Linky TIC) gives today, tomorrow and the period", () => {
  const only = Object.fromEntries(Object.entries(entities).filter(([, e]) => e.platform === "linkytic"));
  const s = tc.sourcesOf({ ...makeHass(), entities: only }, {});
  assert.equal(s.today.entity, "sensor.linky_current_pricing_period");
  assert.equal(s.tomorrow.entity, "sensor.linky_next_day_color");
  assert.equal(s.period.entity, "sensor.linky_current_pricing_period");
});

test("Tarif EDF, EDF Tempo and a ZLinky in Zigbee2MQTT are found too", () => {
  const st = {};
  const en = {};
  const add = (platform, entity_id, state, attributes = {}) => {
    st[entity_id] = { entity_id, state, attributes };
    en[entity_id] = { entity_id, platform };
  };
  add("tarif_edf", "sensor.tarif_tempo_couleur_aujourd_hui", "bleu");
  add("tarif_edf", "sensor.tarif_tempo_couleur_demain", "rouge");
  add("tarif_edf", "sensor.tarif_rouge_tempo_heures_pleines_ttc", "0.75");
  add("tarif_edf", "sensor.tarif_bleu_tempo_heures_creuses_ttc", "0.13");
  add("mqtt", "sensor.zlinky_current_tier6_summ_delivered", "515.3", { unit_of_measurement: "kWh" });
  add("mqtt", "sensor.zlinky_tomorrow_color", "ROUG");
  add("mqtt", "sensor.zlinky_active_register_tier_delivered", "HPJB");
  let s = tc.sourcesOf({ states: st, entities: en }, {});
  assert.equal(s.today.entity, "sensor.tarif_tempo_couleur_aujourd_hui");
  assert.equal(s.tomorrow.entity, "sensor.tarif_tempo_couleur_demain");
  assert.equal(s.period.entity, "sensor.zlinky_active_register_tier_delivered");
  assert.equal(s.price_red_hp.entity, "sensor.tarif_rouge_tempo_heures_pleines_ttc");
  assert.equal(s.price_blue_hc.entity, "sensor.tarif_bleu_tempo_heures_creuses_ttc");
  assert.equal(s.red_hp.entity, "sensor.zlinky_current_tier6_summ_delivered");
  // EDF Tempo: one sensor, everything in its attributes.
  add("tempo", "sensor.edf_tempo", "Bleu HP", { today_color: "Bleu", tomorrow_color: "Blanc", current_period: "HP" });
  s = tc.sourcesOf({ states: st, entities: { "sensor.edf_tempo": en["sensor.edf_tempo"] } }, {});
  assert.deepEqual({ ...s.today }, { entity: "sensor.edf_tempo", attr: "today_color" });
  assert.deepEqual({ ...s.period }, { entity: "sensor.edf_tempo", attr: "current_period" });
});

test("Tarif EDF's calendar days are shifted before 06:00, when the Tempo day has not changed yet", async () => {
  const st = {};
  const en = {};
  const add = (platform, entity_id, state, extra = {}) => {
    st[entity_id] = { entity_id, state, attributes: {} };
    en[entity_id] = { entity_id, platform, ...extra };
  };
  add("tarif_edf", "sensor.tarif_tempo_couleur_hier", "blanc");
  add("tarif_edf", "sensor.tarif_tempo_couleur_aujourd_hui", "rouge");
  add("tarif_edf", "sensor.tarif_tempo_couleur_demain", "indéterminé");
  const view = async (now) => {
    const t = load({ now });
    const card = new t.TempoMiniCard();
    card.setConfig({});
    card.hass = { ...makeHass(), states: st, entities: en };
    await tick();
    return html(card);
  };
  const early = await view("2026-11-12T03:00:00+01:00");
  assert.match(early, /aria-label="Today: White day"/, "yesterday's calendar color until 06:00");
  assert.match(early, /aria-label="Tomorrow: Red day"/, "today's calendar color is the next Tempo day");
  const day = await view("2026-11-12T10:00:00+01:00");
  assert.match(day, /aria-label="Today: Red day"/);
  assert.match(day, /aria-label="Tomorrow: Not yet known"/);
});

test("Linky TIC in standard mode gives the colors from its status register", () => {
  const st = {};
  const en = {};
  const add = (key, entity_id, state) => {
    st[entity_id] = { entity_id, state, attributes: {} };
    en[entity_id] = { entity_id, platform: "linkytic", translation_key: key };
  };
  add("status_tempo_color_today", "sensor.linky_couleur_du_jour", "white");
  add("status_tempo_color_tomorrow", "sensor.linky_couleur_du_lendemain", "red");
  add("active_energy_provider_6", "sensor.linky_easf06", "515.3");
  const s = tc.sourcesOf({ states: st, entities: en }, {});
  assert.equal(s.today.entity, "sensor.linky_couleur_du_jour");
  assert.equal(s.tomorrow.entity, "sensor.linky_couleur_du_lendemain");
  assert.equal(s.red_hp.entity, "sensor.linky_easf06");
});

test("an unreadable price entity falls back to the default grid", async () => {
  const { card } = await newCard({ prices: { white_hp: "sensor.my_price" } }, { overrides: { "sensor.my_price": { state: "unavailable" } } });
  assert.match(html(card), /€0\.1921\/kWh/);
});

test("the options take precedence over the discovered entities, prices included", () => {
  const s = tc.sourcesOf(makeHass(), {
    today_entity: "sensor.linky_current_pricing_period",
    indexes: { blue_hc: "sensor.my_index" },
    prices: { red_hp: 0.8, blue_hp: "sensor.my_price" },
    days_left: { blue: "sensor.my_blue" },
  });
  assert.equal(s.today.entity, "sensor.linky_current_pricing_period");
  assert.equal(s.blue_hc.entity, "sensor.my_index");
  assert.equal(s.price_red_hp.value, 0.8);
  assert.equal(s.price_blue_hp.entity, "sensor.my_price");
  assert.equal(s.days_left_blue.entity, "sensor.my_blue");
});

test("the full card shows the days, the period with its countdown, the season and the cost", async () => {
  const { card } = await newCard();
  const h = html(card);
  assert.match(h, /aria-label="Today: White day"/);
  assert.match(h, /aria-label="Tomorrow: Red day"/);
  assert.match(h, /class="day c-white live clickable"/, "today animated");
  assert.match(h, /ends in 6 hr 18 min/);
  assert.match(h, /6:00 AM – 10:00 PM/);
  assert.match(h, /€0\.1921\/kWh/);
  assert.match(h, /Then Off-peak hours/);
  assert.match(h, /€0\.1536\/kWh/, "off-peak price of the same white day");
  assert.match(h, /Season 2026–2027/);
  assert.match(h, /19 of 22 left/);
  assert.match(h, /<div class="v">€1\.66<\/div><div class="s">9\.7 kWh<\/div>/);
  assert.match(h, /<div class="v">€37\.22<\/div>/);
  assert.match(h, /class="scene c-white p-hp"/);
});

test("the statistics are asked once per day buckets of the month, in kWh changes", async () => {
  const { card } = await newCard();
  const calls = card.hass.calls;
  assert.equal(calls.length, 1);
  assert.equal(calls[0].type, "recorder/statistics_during_period");
  assert.equal(calls[0].period, "day");
  assert.deepEqual([...calls[0].types], ["change"]);
  assert.equal(calls[0].start_time, "2026-10-31T23:00:00.000Z");
  assert.equal(calls[0].statistic_ids.length, 6);
  assert.deepEqual({ ...calls[0].units }, { energy: "kWh" }, "Wh / MWh indexes converted by Home Assistant");
  card.hass = { ...card.hass, states: { ...card.hass.states } };
  await tick();
  assert.equal(calls.length, 1, "not asked again within five minutes");
});

test("the monthly subscription is added to the cost", async () => {
  const { card } = await newCard({ subscription: 15.8 });
  // 37.22 + 15.80; the day gets 15.80 / 30.
  assert.match(html(card), /€53\.02/);
  assert.match(html(card), /€2\.18/);
  assert.match(html(card), /incl\. subscription/);
});

test("off-peak at night: tomorrow's color sets the price of the next peak hours", async () => {
  const { card } = await newCard({}, { now: NIGHT, overrides: offPeak });
  const h = html(card);
  assert.match(h, /class="scene c-blue p-hc"/);
  assert.match(h, /Then Peak hours/);
  assert.match(h, /€0\.1921\/kWh/, "white peak price after 06:00");
  assert.match(h, /ends in 6 hr 50 min/);
});

test("a red day at peak hours flashes the warning and pulses today's disc", async () => {
  const { card } = await newCard({}, { overrides: redDay });
  assert.match(html(card), /class="scene c-red p-hp"/);
  assert.match(html(card), /class="day c-red live clickable"/);
  assert.match(html(card), /€0\.7295\/kWh/);
});

test("tomorrow not yet known waits with a turning dashed disc", async () => {
  const { card } = await newCard({}, { now: MORNING, overrides: pending });
  assert.match(html(card), /aria-label="Tomorrow: Not yet known"/);
  assert.match(html(card), /<div class="disc pending">/);
});

test("when the entity disagrees with the off-peak hours, the integration's change time sets the countdown", async () => {
  const { card } = await newCard({}, { overrides: { "binary_sensor.rte_tempo_heures_creuses": { state: "on" } } });
  assert.match(html(card), /Off-peak hours/);
  assert.match(html(card), /ends in 6 hr 18 min/, "RTE Tempo's next change at 22:00");
  const other = await newCard({}, { overrides: { "binary_sensor.rte_tempo_heures_creuses": { state: "on" }, "sensor.rte_tempo_heures_creuses_changement": { state: "unknown" } } });
  assert.doesNotMatch(html(other.card), /ends in/);
});

test("sections can be hidden or folded, and fold back on a click elsewhere", async () => {
  const { tc: t, card } = await newCard({ show_cost: false, collapsed: ["season"] });
  assert.doesNotMatch(html(card), /Estimated cost/);
  assert.match(html(card), /data-section="season" aria-expanded="false"/);
  assert.doesNotMatch(html(card), /19 of 22 left/);
  const title = { dataset: { action: "toggle_section", section: "season" } };
  card.shadowRoot.listeners.click({ composedPath: () => [title, card], stopPropagation() {} });
  assert.match(html(card), /19 of 22 left/);
  t.fire("pointerdown", { composedPath: () => [] });
  t.fire("pointerup", { composedPath: () => [] });
  assert.doesNotMatch(html(card), /19 of 22 left/);
});

test("no Tempo entity: a message says what to set", async () => {
  const t = load();
  const card = new t.TempoCard();
  card.setConfig({});
  card.hass = { ...makeHass(), entities: {} };
  assert.match(html(card), /No Tempo entity found/);
});

test("the mini card shows the two days and switches to the full card and back", async () => {
  const { tc: t, card } = await newCard({}, { mini: true });
  assert.match(html(card), /class="pill c-white live clickable"/);
  assert.match(html(card), /Peak hours · ends in 6 hr 18 min/);
  assert.match(html(card), /data-action="zoom"/);
  assert.deepEqual({ ...card.getGridOptions() }, { columns: 6, min_columns: 3, rows: "auto" });
  card.shadowRoot.listeners.click({ composedPath: () => [{ dataset: { action: "zoom" } }, card], stopPropagation() {}, detail: 1 });
  assert.match(html(card), /Season 2026–2027/);
  t.fire("pointerdown", { composedPath: () => [] });
  t.fire("pointerup", { composedPath: () => [] });
  assert.doesNotMatch(html(card), /Season 2026–2027/);
  const noZoom = await newCard({ zoom: false }, { mini: true });
  assert.doesNotMatch(html(noZoom.card), /data-action="zoom"/);
});

test("a click on a day opens its entity", async () => {
  const { card } = await newCard();
  card.shadowRoot.listeners.click({ composedPath: () => [{ dataset: { entity: "sensor.rte_tempo_prochaine_couleur" } }, card], stopPropagation() {} });
  const ev = card.events.at(-1);
  assert.equal(ev.type, "hass-more-info");
  assert.equal(ev.detail.entityId, "sensor.rte_tempo_prochaine_couleur");
});

test("the cards are translated", async () => {
  const { card } = await newCard({ language: "fr" });
  assert.match(html(card), /Jour blanc/);
  assert.match(html(card), /Heures pleines/);
  assert.match(html(card), /Saison 2026–2027/);
});

test("every language has every text, and the editor lists them all", () => {
  const keys = Object.keys(tc.STRINGS.en).sort();
  for (const [l, table] of Object.entries(tc.STRINGS)) assert.deepEqual(JSON.parse(JSON.stringify(Object.keys(table).sort())), keys, l);
  assert.deepEqual(JSON.parse(JSON.stringify(tc.LANGUAGES.map(([l]) => l).sort())), Object.keys(tc.STRINGS).sort());
  assert.equal(Object.keys(tc.STRINGS).length, 22);
});

test("the editor keeps the YAML minimal", () => {
  const out = tc.cleanConfig({
    title: "",
    show_period: true,
    show_cost: false,
    collapsed: [],
    prices: { ...tc.DEFAULT_PRICES, red_hp: 0.8 },
    indexes: { blue_hc: "" },
    days_left_entities: { red: "sensor.x" },
  });
  assert.deepEqual(JSON.parse(JSON.stringify(out)), { show_cost: false, prices: { red_hp: 0.8 }, days_left: { red: "sensor.x" } });
});

test("the visual editor builds its form", () => {
  const t = load();
  const ed = new t.TempoCardEditor();
  ed.hass = makeHass();
  ed.setConfig({ prices: { red_hp: 0.8 } });
  const form = ed._form;
  assert.ok(form.schema.some((f) => f.name === "today_entity"));
  assert.equal(form.data.prices.red_hp, 0.8);
  assert.equal(form.data.prices.blue_hc, t.DEFAULT_PRICES.blue_hc);
  assert.equal(form.computeLabel({ name: "red_hp" }), "Red · Peak");
  assert.equal(t.TempoCard.getConfigElement().constructor, t.TempoCardEditor);
});

test("the editors offer the currency; the mini card's, the full card's options its detail view uses", () => {
  const t = load();
  const names = (Cls) => {
    const ed = new Cls();
    ed.hass = makeHass();
    ed.setConfig({});
    return ed._form.schema.flatMap((f) => (f.type === "grid" ? f.schema.map((x) => x.name) : [f.name]));
  };
  const full = names(t.TempoCardEditor);
  const mini = names(t.TempoMiniCardEditor);
  assert.ok(full.includes("currency") && mini.includes("currency"));
  for (const name of full) assert.ok(mini.includes(name), name);
  assert.ok(mini.includes("zoom"));
  for (const [l, table] of Object.entries(t.STRINGS)) assert.ok(table.currency, l);
  // EUR, the default, stays out of the YAML.
  assert.deepEqual(JSON.parse(JSON.stringify(t.cleanConfig({ currency: "EUR", show_season: false }))), { show_season: false });
  assert.deepEqual(JSON.parse(JSON.stringify(t.cleanConfig({ currency: "CHF" }))), { currency: "CHF" });
});

test("the visual editor keeps a price entity set in YAML", () => {
  const t = load();
  const ed = new t.TempoCardEditor();
  ed.hass = makeHass();
  ed.setConfig({ prices: { red_hp: "sensor.my_price" } });
  const changed = (value) => {
    ed._form.listeners["value-changed"]({ detail: { value }, stopPropagation() {} });
    return JSON.parse(JSON.stringify(ed.events.at(-1).detail.config));
  };
  assert.deepEqual(changed({ ...ed._form.data, title: "Tempo" }), { title: "Tempo", prices: { red_hp: "sensor.my_price" } });
  assert.deepEqual(changed({ ...ed._form.data, prices: { ...t.DEFAULT_PRICES, red_hp: 0.8 } }), { prices: { red_hp: 0.8 } });
});

test("mock states carry no personal name", () => {
  assert.ok(Object.keys(states).every((id) => /^(sensor|binary_sensor)\.(rte_tempo|linky)_/.test(id)));
});

test("folding: a tap elsewhere (pointer) folds, not a press in the card; a keyboard click too; leaving the page folds back", async () => {
  const { tc: t, card } = await newCard({ collapsed: ["season"] });
  const title = { dataset: { action: "toggle_section", section: "season" } };
  const open = () => card.shadowRoot.listeners.click({ composedPath: () => [title, card], stopPropagation() {} });
  open();
  // A slider pressed in the card and released outside of it: nothing folds.
  t.fire("pointerdown", { composedPath: () => [card] });
  t.fire("pointerup", { composedPath: () => [] });
  assert.match(html(card), /19 of 22 left/);
  // A mouse click with no pointer events around it does not fold either (the pointer does it); a keyboard one does.
  t.fire("click", { detail: 1, composedPath: () => [] });
  assert.match(html(card), /19 of 22 left/);
  t.fire("click", { detail: 0, composedPath: () => [] });
  assert.doesNotMatch(html(card), /19 of 22 left/);
  // Left with the section open and back: folded.
  open();
  card.disconnectedCallback();
  card.connectedCallback();
  assert.doesNotMatch(html(card), /19 of 22 left/);
});

test("no rewrite under a press: drawn after its release, and at once by its click", async () => {
  const { card } = await newCard({ collapsed: ["season"] });
  const before = html(card);
  card._pressing = true;
  card._toggled = new Map([["season", false]]);
  card._update();
  assert.equal(html(card), before, "no rewrite under the pointer");
  card._onPressEnd();
  await tick();
  assert.match(html(card), /19 of 22 left/, "drawn right after the release");
  card._pressing = true;
  card._pressClick({ detail: 1 });
  const title = { dataset: { action: "toggle_section", section: "season" } };
  card.shadowRoot.listeners.click({ composedPath: () => [title, card], stopPropagation() {} });
  assert.doesNotMatch(html(card), /19 of 22 left/, "the click draws at once");
  card.disconnectedCallback();
  assert.equal(card._pressing, false);
});
