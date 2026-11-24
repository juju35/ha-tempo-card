/*
 * Tempo Card for Home Assistant
 * https://github.com/juju35/ha-tempo-card
 *
 * Lovelace cards for the EDF Tempo electricity tariff: color of today and tomorrow, days left per color in the
 * season, current off-peak / peak period with its countdown, and the estimated cost of the day and of the month
 * from the meter indexes and a price grid.
 * Data comes from the integrations already in place: RTE Tempo (https://github.com/hekmon/rtetempo), Tarif EDF
 * (https://github.com/delphiki/hass-tarif-edf), EDF Tempo (https://github.com/chrisbansart/ha_tempo), Linky TIC
 * (https://github.com/hekmon/linkytic) and the ZLinky_TIC through Zigbee2MQTT, found through the entity registry, or
 * any entity given in the options.
 */

export const VERSION = "__VERSION__";

export const COLORS = ["blue", "white", "red"];
export const PERIODS = ["hc", "hp"];
// Index keys: color then period, in the order of the Linky Tempo registers (EASF01-06, BBRHCJB … BBRHPJR).
export const INDEX_KEYS = COLORS.flatMap((c) => PERIODS.map((p) => `${c}_${p}`));
// EDF regulated Tempo prices incl. VAT, €/kWh, in force from 1 August 2026: the default price grid.
export const DEFAULT_PRICES = { blue_hc: 0.1356, blue_hp: 0.1654, white_hc: 0.1536, white_hp: 0.1921, red_hc: 0.1615, red_hp: 0.7295 };
// Days of each color in a season (1 September to 31 August): the rest of the season is blue.
export const SEASON_TOTALS = { white: 43, red: 22 };
export const DEFAULT_OFFPEAK = "22:00-06:00";
// A Tempo day runs from 06:00 to 06:00 the next day.
export const DAY_START_MIN = 6 * 60;
export const DEFAULT_TZ = "Europe/Paris";
export const STATS_TTL = 5 * 60000;
export const SECTIONS = ["period", "season", "cost"];

export const ICONS = {
  bolt: "M11 15H6L13 1V9H18L11 23V15Z",
  sun: "M12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8M12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,8.69V4H15.31L12,0.69L8.69,4H4V8.69L0.69,12L4,15.31V20H8.69L12,23.31L15.31,20H20V15.31L23.31,12L20,8.69Z",
  night: "M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,11L19.61,12.25L20.2,14.23L18.5,13.06L16.8,14.23L17.39,12.25L15.75,11L17.81,10.95L18.5,9L19.19,10.95L21.25,11M18.97,15.95C19.8,15.92 20.37,16.71 19.92,17.4C19.65,17.83 19.37,18.24 19.03,18.65C16.17,22.12 11.07,22.59 7.6,19.73C4.13,16.87 3.66,11.77 6.5,8.3C6.85,7.88 7.23,7.5 7.63,7.16C8.25,6.6 9.18,7 9.25,7.82C9.36,10.06 10.36,12.21 12.23,13.75C14.12,15.3 16.5,15.97 18.97,15.95Z",
  calendar: "M19,19H5V8H19M16,1V3H8V1H6V3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3H18V1M17,12H12V17H17V12Z",
  euro: "M15,18.5C12.49,18.5 10.32,17.08 9.24,15H15L16,13H8.58C8.53,12.67 8.5,12.34 8.5,12C8.5,11.66 8.53,11.33 8.58,11H15L16,9H9.24C10.32,6.92 12.5,5.5 15,5.5C16.61,5.5 18.09,6.09 19.23,7.07L21,5.3C19.41,3.87 17.3,3 15,3C11.08,3 7.76,5.51 6.52,9H3L2,11H6.06C6.02,11.33 6,11.66 6,12C6,12.34 6.02,12.67 6.06,13H3L2,15H6.52C7.76,18.49 11.08,21 15,21C17.31,21 19.41,20.13 21,18.7L19.22,16.93C18.09,17.91 16.62,18.5 15,18.5Z",
  chevron_down: "M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z",
  expand: "M10,21V19H6.41L10.91,14.5L9.5,13.09L5,17.59V14H3V21H10M14.5,10.91L19,6.41V10H21V3H14V5H17.59L13.09,9.5L14.5,10.91Z",
  collapse: "M19.5,3.09L15,7.59V4H13V11H20V9H16.41L20.91,4.5L19.5,3.09M4,13V15H7.59L3.09,19.5L4.5,20.91L9,16.41V20H11V13H4Z",
};


export const LANGUAGES = [
  ["en", "English"],
  ["fr", "Français"],
  ["de", "Deutsch"],
  ["es", "Español"],
  ["sr", "Српски"],
  ["sr-Latn", "Srpski (latinica)"],
  ["it", "Italiano"],
  ["nl", "Nederlands"],
  ["pt", "Português (Portugal)"],
  ["pl", "Polski"],
  ["ro", "Română"],
  ["da", "Dansk"],
  ["sv", "Svenska"],
  ["bg", "Български"],
  ["ru", "Русский"],
  ["uk", "Українська"],
  ["hu", "Magyar"],
  ["sk", "Slovenčina"],
  ["cs", "Čeština"],
  ["sl", "Slovenščina"],
  ["lv", "Latviešu"],
  ["el", "Ελληνικά"],
];
