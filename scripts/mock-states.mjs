// Mock Home Assistant data for the screenshots and the tests: RTE Tempo (colors, days left, off-peak flag) and a
// Linky read by Linky TIC in historic Tempo mode (six indexes), on Thursday 12 November 2026, a white day before a red one
// (red days fall on weekdays from November to March, never on a weekend or a public holiday such as 11 November).
const sensor = (entity_id, state, attributes = {}) => ({ entity_id, state, attributes });

export const states = {};
export const entities = {};
const add = (platform, s, extra = {}) => {
  states[s.entity_id] = s;
  entities[s.entity_id] = { entity_id: s.entity_id, platform, device_id: platform, ...extra };
};

add("rtetempo", sensor("sensor.rte_tempo_couleur_actuelle", "Blanc", { friendly_name: "RTE Tempo Couleur actuelle", options: ["Bleu", "Blanc", "Rouge", "inconnu"] }));
add("rtetempo", sensor("sensor.rte_tempo_couleur_actuelle_visuel", "⚪", { friendly_name: "RTE Tempo Couleur actuelle (visuel)" }));
add("rtetempo", sensor("sensor.rte_tempo_prochaine_couleur", "Rouge", { friendly_name: "RTE Tempo Prochaine couleur", options: ["Bleu", "Blanc", "Rouge", "inconnu"] }));
add("rtetempo", sensor("sensor.rte_tempo_prochaine_couleur_visuel", "🔴", { friendly_name: "RTE Tempo Prochaine couleur (visuel)" }));
add("rtetempo", sensor("sensor.rte_tempo_prochaine_couleur_changement", "2026-11-13T05:00:00+00:00", { friendly_name: "RTE Tempo Prochaine couleur (changement)", device_class: "timestamp" }));
add("rtetempo", sensor("sensor.rte_tempo_heures_creuses_changement", "2026-11-12T21:00:00+00:00", { friendly_name: "RTE Tempo Heures Creuses (changement)", device_class: "timestamp" }));
add("rtetempo", sensor("sensor.rte_tempo_cycle_jours_restants_bleu", "235", { friendly_name: "RTE Tempo Cycle Jours restants (non planifiés) Bleu", unit_of_measurement: "j" }));
add("rtetempo", sensor("sensor.rte_tempo_cycle_jours_restants_blanc", "37", { friendly_name: "RTE Tempo Cycle Jours restants (non planifiés) Blanc", unit_of_measurement: "j" }));
add("rtetempo", sensor("sensor.rte_tempo_cycle_jours_restants_rouge", "19", { friendly_name: "RTE Tempo Cycle Jours restants (non planifiés) Rouge", unit_of_measurement: "j" }));
add("rtetempo", sensor("binary_sensor.rte_tempo_heures_creuses", "off", { friendly_name: "RTE Tempo Heures Creuses" }));

const INDEXES = [
  ["bluehc", "sensor.linky_index_tempo_blue_days_off_peak_hours", 4821.4],
  ["bluehp", "sensor.linky_index_tempo_blue_days_peak_hours", 7310.9],
  ["whitehc", "sensor.linky_index_tempo_white_days_off_peak_hours", 912.6],
  ["whitehp", "sensor.linky_index_tempo_white_days_peak_hours", 1288.2],
  ["redhc", "sensor.linky_index_tempo_red_days_off_peak_hours", 402.8],
  ["redhp", "sensor.linky_index_tempo_red_days_peak_hours", 515.3],
];
for (const [key, id, v] of INDEXES) {
  add("linkytic", sensor(id, String(v), { unit_of_measurement: "kWh", device_class: "energy", state_class: "total_increasing" }), { translation_key: `index_tempo_${key}` });
}
add("linkytic", sensor("sensor.linky_current_pricing_period", "HPJW"), { translation_key: "current_tarif" });
add("linkytic", sensor("sensor.linky_next_day_color", "ROUG"), { translation_key: "tomorrow_color" });

export const hassConfig = { time_zone: "Europe/Paris" };

// Daily energy of each index this month (recorder/statistics_during_period, period "day", type "change"): the
// colors of the days 1 to 12 November (red on Monday 9 and Tuesday 10), today (12th) counted until mid-afternoon.
// With tomorrow's red day and four white days in October, the season has placed 65 blue, 6 white and 3 red days.
const NOV = "BBBWBBBBRRBW";
const DAILY = { hc: [6.8, 7.4, 6.1, 7.9, 6.5, 7.2, 6.9, 7.7, 5.3, 5.0, 6.6, 5.4], hp: [10.2, 9.6, 11.4, 12.8, 9.9, 10.7, 11.1, 9.4, 6.4, 6.1, 10.1, 4.3] };
export const statistics = {};
INDEXES.forEach(([key, id]) => {
  const color = key[0].toUpperCase();
  const period = key.slice(-2);
  statistics[id] = [...NOV].map((c, i) => ({
    start: Date.UTC(2026, 10, i + 1) - 3600000,
    end: Date.UTC(2026, 10, i + 2) - 3600000,
    change: c === color ? DAILY[period][i] : 0,
  }));
});

// Instants of the captures (Paris time): mid-afternoon at peak hours, late evening off-peak, morning before
// tomorrow's color is published.
export const AFTERNOON = "2026-11-12T15:42:00+01:00";
export const NIGHT = "2026-11-12T23:10:00+01:00";
export const MORNING = "2026-11-12T09:30:00+01:00";

const color = (today, tomorrow) => ({
  "sensor.rte_tempo_couleur_actuelle": { state: today },
  "sensor.rte_tempo_prochaine_couleur": { state: tomorrow },
});
// Overrides of the animated states, one per animation.
export const blueDay = color("Bleu", "Bleu");
export const whiteDay = color("Blanc", "Rouge");
export const redDay = { ...color("Rouge", "Blanc"), "sensor.linky_current_pricing_period": { state: "HPJR" } };
export const offPeak = { ...color("Bleu", "Blanc"), "binary_sensor.rte_tempo_heures_creuses": { state: "on" }, "sensor.linky_current_pricing_period": { state: "HCJB" } };
export const pending = { ...color("Bleu", "inconnu"), "sensor.linky_next_day_color": { state: "----" } };
