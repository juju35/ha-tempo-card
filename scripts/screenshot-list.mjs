// The README screenshots (PNG) and animations (GIF) rendered by scripts/screenshots.mjs.
// Every capture has a twin in the other theme ("-dark" for a light capture, "-light" for a dark one)
// that shows exactly the same state: only the theme differs (checked by test/screenshots.test.mjs).
// `now` is the instant the page lives at (Playwright clock), so countdowns and dates stay the same on every run.
import { AFTERNOON, MORNING, NIGHT, blueDay, offPeak, pending, redDay, whiteDay } from "./mock-states.mjs";

const full = (file, theme, extra = {}) => ({ file, type: "tempo-card", theme, width: 460, now: AFTERNOON, config: {}, ...extra });
const mini = (file, theme, extra = {}) => ({ file, type: "tempo-mini-card", theme, width: 380, now: AFTERNOON, config: {}, ...extra });

export const shots = [
  full("card", "light"),
  full("card-dark", "dark"),
  full("card-folded", "light", { config: { collapsed: ["season", "cost"] } }),
  full("card-folded-dark", "dark", { config: { collapsed: ["season", "cost"] } }),
  mini("mini-card", "light"),
  mini("mini-card-dark", "dark"),
  mini("mini-card-zoom", "light", { width: 460, clicks: [".zoom"] }),
  mini("mini-card-zoom-dark", "dark", { width: 460, clicks: [".zoom"] }),
  mini("mini-card-pending", "dark", { now: MORNING, overrides: pending }),
  mini("mini-card-pending-light", "light", { now: MORNING, overrides: pending }),
  // Narrow cards: the full card at 6 of 12 columns of a phone's Sections view, the mini card at 3.
  full("card-narrow", "light", { width: 260 }),
  full("card-narrow-dark", "dark", { width: 260 }),
  mini("mini-card-narrow", "light", { width: 170 }),
  mini("mini-card-narrow-dark", "dark", { width: 170 }),
];

// One looping GIF per distinct animation of the card (each plays different keyframes):
//   blue-day     — blue day at peak hours: the sun turns its rays, the current flows slowly, ripples on today's disc
//   white-day    — white day at peak hours: faster current, light sweeping over today's disc
//   red-day      — red day at peak hours: fast red current, the warning bolt flashes on the house, today's disc pulses
//   off-peak     — off-peak hours at night: moon and twinkling stars, lit window, the current slows down
//   pending      — tomorrow's color not published yet: its dashed disc turns while it waits
// Each one is followed by its twin in the other theme.
const SCENE = { show_season: false, show_cost: false };
export const gifs = [
  full("blue-day", "light", { config: SCENE, overrides: blueDay }),
  full("blue-day-dark", "dark", { config: SCENE, overrides: blueDay }),
  full("white-day", "light", { config: SCENE, overrides: whiteDay }),
  full("white-day-dark", "dark", { config: SCENE, overrides: whiteDay }),
  full("red-day", "dark", { config: SCENE, overrides: redDay }),
  full("red-day-light", "light", { config: SCENE, overrides: redDay }),
  full("off-peak", "dark", { now: NIGHT, config: SCENE, overrides: offPeak }),
  full("off-peak-light", "light", { now: NIGHT, config: SCENE, overrides: offPeak }),
  full("pending", "light", { now: MORNING, config: SCENE, overrides: pending }),
  full("pending-dark", "dark", { now: MORNING, config: SCENE, overrides: pending }),
];
