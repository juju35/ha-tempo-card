// ---------------------------------------------------------------------------
// Entity discovery
// ---------------------------------------------------------------------------
import { COLORS, DEFAULT_PRICES, INDEX_KEYS } from "./core.js";
import { colorOf, fold, num, valid } from "./helpers.js";

// A source is { entity, attr }: the state of the entity, or one of its attributes.
export const src = (entity, attr) => (entity ? { entity, attr } : null);

// The text that tells the entities of an integration apart: entity id and name (they are fixed, in French, by the
// integrations that have no translation keys).
export const label = (hass, id) => fold(`${id} ${hass.states[id]?.attributes?.friendly_name ?? ""}`).replace(/[^a-z0-9]+/g, "_");

export const COLOR_WORDS = { blue: "(bleu|blue)", white: "(blanc|white)", red: "(rouge|red)" };

// What the integrations found in the entity registry provide, each key with the first entity found:
// today, tomorrow, period (off-peak flag or tariff period), change (next off-peak / peak change), days_left_<color>,
// <color>_<period> (meter indexes) and price_<color>_<period>.
// Integrations in order of preference when several provide the same thing (the Tempo services before the meter).
export const RANK = { rtetempo: 0, tarif_edf: 1, tempo: 2, linkytic: 3, mqtt: 4 };

export const discover = (hass) => {
  const found = {};
  let rank = 0;
  const put = (key, value) => {
    if (value && (!found[key] || found[key].rank > rank)) found[key] = { rank, value };
  };
  // Tarif EDF's colors of yesterday, today and tomorrow are calendar days: matched after the loop.
  const edf = {};
  for (const e of Object.values(hass.entities || {})) {
    rank = RANK[e.platform];
    const id = e.entity_id;
    if (rank === undefined || !id || !hass.states[id]) continue;
    const l = label(hass, id);
    const domain = id.split(".")[0];
    switch (e.platform) {
      // RTE Tempo (hekmon/rtetempo): French entity names; the "(visuel)" twins carry emoji.
      case "rtetempo":
        if (domain === "binary_sensor") put("period", src(id));
        else if (/visuel/.test(l)) break;
        else if (/couleur_actuelle/.test(l)) put("today", src(id));
        else if (/prochaine_couleur(?!_changement)/.test(l)) put("tomorrow", src(id));
        else if (/heures_creuses_changement/.test(l)) put("change", src(id));
        else if (/jours_restants/.test(l)) for (const c of COLORS) if (new RegExp(COLOR_WORDS[c]).test(l)) put(`days_left_${c}`, src(id));
        break;
      // Tarif EDF (delphiki/hass-tarif-edf): colors of the calendar days and the Tempo prices.
      case "tarif_edf":
        if (/couleur_hier/.test(l)) edf.yesterday ??= id;
        else if (/couleur_aujourd/.test(l)) edf.today ??= id;
        else if (/couleur_demain/.test(l)) edf.tomorrow ??= id;
        else if (/tempo/.test(l))
          for (const c of COLORS)
            for (const [p, word] of [
              ["hc", "creuses"],
              ["hp", "pleines"],
            ])
              if (new RegExp(COLOR_WORDS[c]).test(l) && l.includes(word)) put(`price_${c}_${p}`, src(id));
        break;
      // EDF Tempo (chrisbansart/ha_tempo): one sensor, everything in its attributes.
      case "tempo": {
        const a = hass.states[id].attributes || {};
        if ("today_color" in a) {
          put("today", src(id, "today_color"));
          put("tomorrow", src(id, "tomorrow_color"));
          put("period", src(id, "current_period"));
        }
        break;
      }
      // Linky TIC (hekmon/linkytic): translation keys, historic (BBR…, PTEC, DEMAIN) and standard (EASF, LTARF).
      case "linkytic": {
        const k = e.translation_key || "";
        const tempo = k.match(/^index_tempo_(blue|white|red)(hc|hp)$/);
        if (tempo) put(`${tempo[1]}_${tempo[2]}`, src(id));
        else if (k === "tomorrow_color" || k === "status_tempo_color_tomorrow") put("tomorrow", src(id));
        else if (k === "status_tempo_color_today") put("today", src(id));
        else if (k === "current_tarif" || k === "current_tarif_label") {
          put("today", src(id));
          put("period", src(id));
        } else {
          const easf = k.match(/^active_energy_provider_([1-6])$/);
          if (easf) put(`linky_${easf[1]}`, src(id));
        }
        break;
      }
      // ZLinky_TIC through Zigbee2MQTT: entity ids end with the exposed property.
      case "mqtt": {
        const m = id.match(/_(tomorrow_color|active_register_tier_delivered|current_price|current_tier([1-6])_summ_delivered)$/);
        if (!m) break;
        if (m[1] === "tomorrow_color") put("tomorrow", src(id));
        else if (m[2]) put(`linky_${m[2]}`, src(id));
        else {
          put("today", src(id));
          put("period", src(id));
        }
        break;
      }
    }
  }
  // A Tempo day starts at 06:00: before then, the day being lived is the calendar day before (`early`).
  rank = RANK.tarif_edf;
  if (edf.today) put("today", { ...src(edf.today), early: src(edf.yesterday) });
  if (edf.tomorrow) put("tomorrow", { ...src(edf.tomorrow), early: src(edf.today) });
  const out = Object.fromEntries(Object.entries(found).map(([k, v]) => [k, v.value]));
  // Standard (EASF01-06) and Zigbee (tier 1-6) indexes are Tempo indexes only on a Tempo meter (a Tempo color read).
  const linkyTempo = ["today", "tomorrow"].some((k) => out[k] && colorOf(readSrc(hass, out[k])));
  INDEX_KEYS.forEach((key, i) => {
    if (linkyTempo && !out[key] && out[`linky_${i + 1}`]) out[key] = out[`linky_${i + 1}`];
    delete out[`linky_${i + 1}`];
  });
  return out;
};

export const readSrc = (hass, s) => {
  const st = s && hass.states[s.entity];
  if (!valid(st)) return undefined;
  return s.attr ? st.attributes?.[s.attr] : st.state;
};

// Discovery is redone only when the registry or the list of states changed.
export const DISCOVERED = new WeakMap();
export const discovered = (hass) => {
  const key = hass.entities || hass.states;
  let hit = DISCOVERED.get(key);
  if (!hit || hit.states !== hass.states) {
    hit = { states: hass.states, out: discover(hass) };
    DISCOVERED.set(key, hit);
  }
  return hit.out;
};

// The sources the card reads, the options first: { today, tomorrow, period, change, days_left_<color>, <index keys>,
// price_<index keys> }.
export const sourcesOf = (hass, config) => {
  const found = discovered(hass);
  const c = config || {};
  const opt = (v) => (typeof v === "string" && v.includes(".") ? src(v) : null);
  const out = {
    today: opt(c.today_entity) || found.today || null,
    tomorrow: opt(c.tomorrow_entity) || found.tomorrow || null,
    period: opt(c.offpeak_entity) || found.period || null,
    change: found.change || null,
  };
  for (const color of COLORS) out[`days_left_${color}`] = opt(c.days_left?.[color]) || found[`days_left_${color}`] || null;
  for (const key of INDEX_KEYS) {
    out[key] = opt(c.indexes?.[key]) || found[key] || null;
    const p = c.prices?.[key];
    out[`price_${key}`] = typeof p === "number" ? { value: p } : opt(p) || (c.prices?.[key] === undefined && found[`price_${key}`]) || { value: DEFAULT_PRICES[key] };
  }
  return out;
};

// Price of an index key: the number, or the entity's state; the default grid while a price entity is unreadable.
export const priceOf = (hass, s, key) => (s?.value !== undefined ? s.value : (num(readSrc(hass, s)) ?? DEFAULT_PRICES[key] ?? null));
