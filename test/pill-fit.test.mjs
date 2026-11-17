// The status pill's place, decided by measurement (_fitPill), on a stand-in layout: on the title row only when the
// whole title and the pill's whole label fit; otherwise on its own line under the subtitle; in the 90 px banner, its
// dot alone when title, subtitle and pill still do not fit above the ground strip. No fixed width decides it.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { load } from "./load.mjs";

const SRC = readFileSync(new URL("../src/tempo-card.js", import.meta.url), "utf8");

// A title block (.titles > .trow > .name + .chip, then .sub) in a banner `bannerH` px high (null: a classic header),
// whose boxes follow the classes _fitPill sets: the parts stacked and centred above the 10 px ground strip.
function block({ rowW, titleW, chipW, nameH = 20, subH = 17, bannerH = 90 }) {
  const classes = new Set(["titles"]);
  const classList = {
    add: (...c) => {
      for (const x of c) classes.add(x);
    },
    remove: (...c) => {
      for (const x of c) classes.delete(x);
    },
    contains: (c) => classes.has(c),
  };
  const box = (top, height, width = 100) => ({ top, bottom: top + height, height, width, left: 0, right: width });
  const layout = () => {
    const below = classes.has("pill-below");
    const height = nameH + subH + (below ? 18 : 0);
    const top = ((bannerH ?? 80) - 10 - height) / 2;
    return { name: box(top, nameH, titleW), sub: box(top + nameH, subH), chip: box(below ? top + nameH + subH : top + 2, 18, classes.has("pill-dot") ? 14 : chipW) };
  };
  const name = { scrollWidth: titleW, getBoundingClientRect: () => layout().name };
  const chip = { classList: { contains: (c) => c === "chip" }, getBoundingClientRect: () => layout().chip };
  const sub = { getBoundingClientRect: () => layout().sub };
  const row = { children: [name, chip], querySelector: () => name, getBoundingClientRect: () => box(0, 20, rowW) };
  name.classList = { contains: () => false };
  const banner = bannerH === null ? null : { getBoundingClientRect: () => box(0, bannerH) };
  const titles = { classList, querySelector: () => row, querySelectorAll: () => [sub], closest: () => banner, getBoundingClientRect: () => row.getBoundingClientRect() };
  return { titles, classes };
}

const fit = (b) => load().TempoCard.prototype._fitPill.call({ shadowRoot: { querySelectorAll: () => [b.titles] } });

test("the pill stays on the title row when the whole title and its whole label fit", () => {
  const b = block({ rowW: 300, titleW: 120, chipW: 70 });
  fit(b);
  assert.ok(!b.classes.has("pill-below") && !b.classes.has("pill-dot"));
});

test("a title that would be cut sends the pill under the subtitle, with its whole label", () => {
  for (const bannerH of [90, null]) {
    const b = block({ rowW: 200, titleW: 150, chipW: 70, bannerH });
    fit(b);
    assert.ok(b.classes.has("pill-below"), "pill under the subtitle");
    assert.ok(!b.classes.has("pill-dot"), "whole label");
  }
});

test("the title is never cut by the pill: one pixel short is enough to move it", () => {
  const b = block({ rowW: 199, titleW: 120, chipW: 71 });
  fit(b);
  assert.ok(b.classes.has("pill-below"));
});

test("no room left above the banner's ground strip: the pill keeps its dot only", () => {
  const b = block({ rowW: 200, titleW: 250, chipW: 70, nameH: 50, subH: 17 });
  fit(b);
  assert.ok(b.classes.has("pill-below") && b.classes.has("pill-dot"));
});

test("a label wider than the text column under the subtitle: the pill keeps its dot only", () => {
  const b = block({ rowW: 120, titleW: 110, chipW: 140 });
  fit(b);
  assert.ok(b.classes.has("pill-below") && b.classes.has("pill-dot"));
});

test("a new measure starts afresh: back on the title row once the card is wide again", () => {
  const b = block({ rowW: 200, titleW: 250, chipW: 70, nameH: 40 });
  fit(b);
  b.titles.querySelector().getBoundingClientRect = () => ({ width: 600 });
  fit(b);
  assert.ok(!b.classes.has("pill-below") && !b.classes.has("pill-dot"));
});

// The body of every `@container (max-width: N px)` rule of the source, with N.
function containerRules(src) {
  const out = [];
  for (const m of src.matchAll(/@container[^{]*\(max-width:\s*(\d+)px\)[^{]*\{/g)) {
    let depth = 1;
    let i = m.index + m[0].length;
    for (; depth && i < src.length; i++) depth += src[i] === "{" ? 1 : src[i] === "}" ? -1 : 0;
    out.push([Number(m[1]), src.slice(m.index + m[0].length, i - 1)]);
  }
  return out;
}

test("no fixed width decides the pill's place, only its dot at 200 px or less", () => {
  for (const [w, body] of containerRules(SRC)) {
    if (/\.chip|\.trow|\.titles/.test(body)) assert.ok(w <= 200, `pill rule at ${w} px: ${body.trim().slice(0, 80)}`);
  }
  assert.match(SRC, /\.titles\.pill-below\s/);
  assert.match(SRC, /\.titles\.pill-dot\s/);
});
