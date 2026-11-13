// Keyboard access, readable names and reduced motion.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { load, makeHass } from "./load.mjs";

const tc = load();
const clickables = (html) => html.match(/<[a-z-]+\b[^>]*\bdata-(?:entity|action)="[^"]*"[^>]*>/g) || [];

test("every clickable element of the full and mini cards can be reached and used from the keyboard", async () => {
  const full = new tc.TempoCard();
  full.setConfig({});
  full.hass = makeHass();
  const mini = new tc.TempoMiniCard();
  mini.setConfig({});
  mini.hass = makeHass();
  await new Promise((r) => setTimeout(r, 10));
  for (const card of [full, mini]) {
    const tags = clickables(card.shadowRoot.innerHTML);
    assert.ok(tags.length > 3);
    for (const tag of tags) {
      if (tag.startsWith("<button")) continue;
      assert.match(tag, /\brole="button"/, tag);
      assert.match(tag, /\btabindex="0"/, tag);
    }
  }
});

test("Enter and Space on a button role act as a click", () => {
  const card = new tc.TempoCard();
  let clicks = 0;
  let prevented = 0;
  const target = { getAttribute: (a) => (a === "role" ? "button" : null), click: () => clicks++ };
  for (const key of ["Enter", " ", "a"]) card.shadowRoot.listeners.keydown({ key, target, preventDefault: () => prevented++ });
  assert.equal(clicks, 2);
  assert.equal(prevented, 2);
});

test("the days and the status have a name, the pictures are hidden from screen readers", () => {
  const card = new tc.TempoCard();
  card.setConfig({});
  card.hass = makeHass();
  const html = card.shadowRoot.innerHTML;
  assert.match(html, /aria-label="Today: White day"/);
  assert.match(html, /class="chip[^"]*"[^>]*aria-label="Peak hours"/);
  assert.match(html, /<svg class="scene[^"]*"[^>]*aria-hidden="true"/);
});

test("every animation stops with the reduced motion setting", () => {
  const src = readFileSync(new URL("../src/tempo-card.js", import.meta.url), "utf8");
  assert.match(src, /@media \(prefers-reduced-motion: reduce\) \{ \*, \*::before, \*::after \{ transition: none !important; animation: none !important; \} \}/);
});
