// Renders the cards with mock Tempo data and saves the README screenshots and animations.
// Usage: npm run build && npm run screenshots  (the GIFs need ffmpeg on PATH)
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { entities, hassConfig, statistics, states } from "./mock-states.mjs";
import { unchanged } from "./pixels.mjs";
import { gifs, shots } from "./screenshot-list.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
mkdirSync(`${root}screenshots`, { recursive: true });

// Every capture is rendered to a temporary file and copied over screenshots/<file> only when its decoded pixels
// differ (scripts/pixels.mjs): a run that draws the same pictures changes no file, so the workflow commits nothing.
const work = mkdtempSync(join(tmpdir(), "tc-shots-"));
const keep = (fresh, name) => {
  const target = `${root}screenshots/${name}`;
  if (unchanged(fresh, target)) return console.log(`screenshots/${name} (unchanged)`);
  copyFileSync(fresh, target);
  console.log(`screenshots/${name}`);
};
const cardJs = readFileSync(`${root}dist/tempo-card.js`, "utf8");

// Every uncaught page error is collected; the script exits non-zero when any occurred.
const pageErrors = [];

const THEMES = {
  light: {
    "--primary-background-color": "#e8eaed",
    "--secondary-background-color": "#ececec",
    "--card-background-color": "#ffffff",
    "--primary-text-color": "#212121",
    "--secondary-text-color": "#727272",
    "--divider-color": "rgba(0,0,0,.12)",
  },
  dark: {
    "--primary-background-color": "#111111",
    "--secondary-background-color": "#282828",
    "--card-background-color": "#1c1c1c",
    "--primary-text-color": "#e1e1e1",
    "--secondary-text-color": "#9b9b9b",
    "--divider-color": "rgba(225,225,225,.12)",
  },
};

// Minimal stand-in for Home Assistant's <ha-card>.
const HA_CARD = `customElements.define("ha-card", class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" }).innerHTML =
      "<style>:host{display:block;background:var(--card-background-color);border-radius:12px;" +
      "border:1px solid var(--divider-color);color:var(--primary-text-color);overflow:hidden}</style><slot></slot>";
  }
});`;

const pageHtml = (theme, width) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<style>
  :root { ${Object.entries(THEMES[theme])
    .map(([k, v]) => `${k}:${v};`)
    .join("")} }
  body { margin: 0; padding: 16px; background: var(--primary-background-color); color: var(--primary-text-color);
         font-family: Roboto, "Segoe UI", Helvetica, Arial, sans-serif; width: ${width}px; }
</style></head><body><div id="root"></div></body></html>`;

// Opens a card on a fresh page, its clock fixed at `now`, and mounts it with the mock hass; `overrides` patch the
// mock states for this capture only.
async function openCard(browser, { file, type, config, theme, width, overrides, now }) {
  const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 1000, height: 2000 }, timezoneId: "Europe/Paris", locale: "en-US" });
  page.on("pageerror", (err) => {
    console.error(`pageerror (${file}): ${err.message}`);
    pageErrors.push(`${file}: ${err.message}`);
  });
  await page.clock.setFixedTime(new Date(now));
  await page.setContent(pageHtml(theme, width));
  await page.addScriptTag({ content: HA_CARD });
  await page.addScriptTag({ content: cardJs });
  await page.evaluate(
    ({ type, config, states, entities, overrides, theme, statistics, hassConfig }) => {
      for (const [id, o] of Object.entries(overrides || {})) states[id] = { ...states[id], ...o };
      const el = document.createElement(type);
      el.setConfig({ type: `custom:${type}`, ...config });
      el.hass = {
        states,
        entities,
        config: hassConfig,
        language: "en",
        locale: { language: "en" },
        themes: { darkMode: theme === "dark" },
        callService: () => {},
        callWS: async () => statistics,
      };
      document.getElementById("root").appendChild(el);
    },
    { type, config, states, entities, overrides, theme, statistics, hassConfig },
  );
  // The statistics answer (cost section) lands after the first render.
  await page.waitForTimeout(300);
  return page;
}

// Every animation of the card (its shadow root: document.getAnimations() leaves out the shadow trees).
const animations = () => document.querySelector("#root").firstElementChild.shadowRoot.getAnimations();

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
for (const s of shots) {
  const page = await openCard(browser, s);
  for (const sel of s.clicks || []) {
    // A mouse click (detail 1), not .click(): a keyboard-like click would move the focus and show its ring.
    await page.evaluate(
      (sel) =>
        document
          .querySelector("#root")
          .firstElementChild.shadowRoot.querySelector(sel)
          .dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, detail: 1 })),
      sel,
    );
    await page.waitForTimeout(150);
  }
  // Every animation at its start: the still captures are the same on every run.
  await page.evaluate(`(${animations})().forEach((a) => { a.pause(); a.currentTime = 0; })`);
  const box = await page.locator("#root").boundingBox();
  await page.screenshot({ path: join(work, `${s.file}.png`), clip: { x: 0, y: 0, width: s.width + 32, height: Math.ceil(box.height) + 32 } });
  keep(join(work, `${s.file}.png`), `${s.file}.png`);
  await page.close();
}

// Records one animated state as a looping GIF: every animation is paused and stepped frame by frame, so the GIF is
// identical whatever the machine's speed.
async function makeGif(browser, gif, { fps = 20, seconds = 2.4 } = {}) {
  const page = await openCard(browser, gif);
  const box = await page.locator("#root").boundingBox();
  const clip = { x: 0, y: 0, width: gif.width + 32, height: Math.ceil(box.height) + 32 };
  const dir = mkdtempSync(join(tmpdir(), "tc-frames-"));
  const frames = Math.round(fps * seconds);
  for (let i = 0; i < frames; i++) {
    const n = await page.evaluate(
      `(() => { const all = (${animations})(); for (const a of all) { a.pause(); a.currentTime = ${(i * 1000) / fps}; } return all.length; })()`,
    );
    if (!n) throw new Error(`${gif.file}: no animation found to step`);
    await page.screenshot({ path: join(dir, `f${String(i).padStart(3, "0")}.png`), clip });
  }
  await page.close();
  const out = join(work, `${gif.file}.gif`);
  // Halve the retina capture and build a per-clip palette; Bayer dithering is deterministic.
  execFileSync("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-framerate",
    String(fps),
    "-i",
    join(dir, "f%03d.png"),
    "-vf",
    `scale=${clip.width}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4`,
    "-loop",
    "0",
    out,
  ]);
  rmSync(dir, { recursive: true });
  keep(out, `${gif.file}.gif`);
}

for (const g of gifs) await makeGif(browser, g);
await browser.close();
rmSync(work, { recursive: true });

if (pageErrors.length) {
  console.error(`\n${pageErrors.length} page error(s) while rendering:`);
  for (const e of pageErrors) console.error(`  ${e}`);
  process.exitCode = 1;
}
