// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

export const BASE_STYLE = `
  :host { --tc-blue: #2563eb; --tc-white: #f7f7f4; --tc-white-tint: #8a94a0; --tc-red: #dc2626;
          --tc-ok: var(--success-color, #43a047); --tc-idle: var(--secondary-text-color, #9e9e9e); --tc-accent: #2563eb;
          display: block; min-width: 0; --tc-natural-width: 360px; }
  /* A size container has no width of its own content: this empty grid gives the card a natural width without a minimum. */
  :host::before { content: ""; display: grid; grid-template-columns: minmax(0, var(--tc-natural-width)); height: 0; }
  ha-card { overflow: hidden; container: tc-card / inline-size; }
  .icon { width: 18px; height: 18px; fill: currentColor; flex: none; }
  .clickable { cursor: pointer; }
  [role="button"]:focus-visible, button:focus-visible { outline: 2px solid var(--primary-color, var(--tc-accent)); outline-offset: 2px; border-radius: 6px; }
  /* Tint (--c, text and backgrounds) and fill (--disc) of each color; white is tinted grey to stay readable. */
  .c-blue { --c: var(--tc-blue); --disc: var(--tc-blue); }
  .c-white { --c: var(--tc-white-tint); --disc: var(--tc-white); }
  .c-red { --c: var(--tc-red); --disc: var(--tc-red); }
  .c-unknown { --c: var(--tc-idle); --disc: transparent; }
  .header { display: flex; align-items: center; gap: 10px; padding: 12px 12px 0; }
  .type-icon { position: relative; width: 40px; height: 40px; border-radius: 50%; display: flex; flex: none; align-items: center; justify-content: center;
               background: color-mix(in srgb, var(--c, var(--tc-accent)) 16%, transparent); transition: background-color .3s ease; }
  .type-icon .icon { width: 24px; height: 24px; fill: color-mix(in srgb, var(--c, var(--tc-accent)) 70%, var(--primary-text-color)); }
  /* Off-peak hours: the same color, lighter. */
  .type-icon.p-hc .icon { fill: color-mix(in srgb, var(--c, var(--tc-accent)) 50%, var(--secondary-text-color)); }
  .titles { flex: 1 1 0; min-width: 5ch; display: flex; flex-direction: column; }
  :host([hide-title]) .titles .name, :host([hide-subtitle]) .titles > .sub { display: none; }
  .name { font-size: 16px; font-weight: 500; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sub { font-size: 12px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .chip { display: inline-flex; align-items: center; gap: 4px; padding: 1px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; white-space: nowrap;
          background: color-mix(in srgb, var(--c) 15%, transparent);
          color: color-mix(in srgb, var(--c) 55%, var(--primary-text-color)); flex: none; box-sizing: border-box; }
  .chip .icon { width: 14px; height: 14px; fill: var(--c); }
  .chip-text { white-space: nowrap; }
  /* The status pill (classic header and banner): on the title row, 8 px after the title, only when the whole title
     and the pill's whole label fit there; otherwise on its own line under the subtitle, which then keeps one line.
     Its dot (or icon) alone at 200 px or less, or when the banner has no room left for its label (pill-dot): the
     label stays in its title and for screen readers. Measured after each render (_fitPill), in every language,
     never by a fixed width. */
  .trow { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .trow .name { flex: 0 1 auto; min-width: 0; }
  .titles.pill-below .trow { display: contents; }
  .titles.pill-below .sub { order: 1; }
  .titles.pill-below .chip { order: 2; align-self: flex-start; margin-top: 2px; }
  .titles.pill-dot .chip { padding: 4px; }
  .titles.pill-dot .chip-text { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  .warning { padding: 16px; color: var(--secondary-text-color); }
  .disc { position: relative; flex: none; width: 44px; height: 44px; border-radius: 50%; background: var(--disc); box-sizing: border-box;
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c) 35%, transparent); }
  .c-white .disc { box-shadow: inset 0 0 0 1px rgba(0,0,0,.18); }
  .c-unknown .disc { border: 2px dashed color-mix(in srgb, var(--c) 70%, transparent); box-shadow: none; }
  /* Animations: the day being lived only (blue ripple, white shimmer, red pulse), and tomorrow while not yet known. */
  .disc .ring { position: absolute; inset: 0; border-radius: 50%; pointer-events: none; }
  .live.c-blue .disc .ring { border: 2px solid var(--tc-blue); animation: tc-ripple 2.4s ease-out infinite; }
  .live.c-white .disc { overflow: hidden; }
  .live.c-white .disc .ring { background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,.95) 50%, rgba(160,175,190,.35) 56%, transparent 70%);
                              background-size: 250% 100%; animation: tc-shimmer 2.4s ease-in-out infinite; }
  .live.c-red .disc { animation: tc-pulse 1.2s ease-in-out infinite; }
  .live.c-red .disc .ring { border: 2px solid var(--tc-red); animation: tc-ripple 1.2s ease-out infinite; }
  .c-unknown .disc.pending { animation: tc-spin 4.8s linear infinite; }
  @keyframes tc-ripple { from { transform: scale(1); opacity: .7; } to { transform: scale(1.6); opacity: 0; } }
  @keyframes tc-shimmer { from { background-position: 120% 0; } to { background-position: -120% 0; } }
  @keyframes tc-pulse { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--tc-red) 45%, transparent); }
                        50% { box-shadow: 0 0 0 7px color-mix(in srgb, var(--tc-red) 0%, transparent); } }
  @keyframes tc-spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition: none !important; animation: none !important; } }
  .bar { height: 6px; border-radius: 3px; background: var(--divider-color, rgba(127,127,127,.25)); overflow: hidden; }
  .bar > div { height: 100%; border-radius: 3px; background: var(--c, var(--tc-accent)); }
  .c-white .bar > div { background: color-mix(in srgb, var(--tc-white-tint) 70%, var(--tc-white)); }
  .zoom { all: unset; flex: none; cursor: pointer; width: 24px; height: 24px; margin: -4px -4px -4px 0; border-radius: 50%;
          display: grid; place-items: center; color: var(--secondary-text-color); }
  .zoom .icon { width: 16px; height: 16px; }
  .zoom:hover { background: color-mix(in srgb, var(--tc-idle) 16%, transparent); color: var(--primary-text-color); }
  @container tc-card (max-width: 330px) {
    .sub-k { display: none; }
  }
  @container tc-card (max-width: 230px) { .header { gap: 6px; } }
  @container tc-card (max-width: 200px) {
    .chip { padding: 4px; }
    .chip-text { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  }
`;

export const FULL_STYLE = `
  .content { padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 12px; }
  .hero { display: flex; gap: 12px; align-items: center; }
  .picture { flex: none; width: 132px; height: 110px; }
  .days { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
  .day { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 12px; min-width: 0;
         background: color-mix(in srgb, var(--c) 10%, transparent); }
  .day .disc { width: 36px; height: 36px; }
  .day.live .disc { width: 40px; height: 40px; }
  .day-text { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
  .day-text .k { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: var(--secondary-text-color); }
  .day-text .v { font-size: 16px; font-weight: 500; color: color-mix(in srgb, var(--c) 55%, var(--primary-text-color)); }
  .day-text .k, .day-text .v, .day-text .date { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .day-text .date { font-size: 12px; color: var(--secondary-text-color); }
  .section-title { all: unset; box-sizing: border-box; width: 100%; display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500;
                   text-transform: uppercase; letter-spacing: .04em; color: var(--secondary-text-color); cursor: pointer; user-select: none; }
  .section-title .icon { width: 16px; height: 16px; }
  .section-title span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .section-title .chevron { margin-left: auto; transition: transform .2s ease; }
  .section-title[aria-expanded="false"] .chevron { transform: rotate(-90deg); }
  .section-body { margin-top: 8px; display: flex; flex-direction: column; gap: 8px; }
  .period-line { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; font-size: 13px; }
  .period-line .p { font-size: 15px; font-weight: 500; color: color-mix(in srgb, var(--c) 55%, var(--primary-text-color)); }
  .period-line .muted, .muted { color: var(--secondary-text-color); }
  .period-line .end { margin-left: auto; color: var(--secondary-text-color); }
  .tiles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
  .tile { display: flex; flex-direction: column; gap: 2px; padding: 6px 10px; border-radius: 10px; min-width: 0;
          background: var(--secondary-background-color, rgba(127,127,127,.08)); }
  .tile .k { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; }
  .tile .k span { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .tile .v { font-size: 15px; font-weight: 500; line-height: 1.3; overflow-wrap: anywhere; }
  .tile .s { font-size: 11px; color: var(--secondary-text-color); }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--disc); flex: none; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c) 45%, transparent); }
  .rows { display: grid; grid-template-columns: 10px minmax(0, 1fr) minmax(70px, 1.3fr) auto; align-items: center; gap: 6px 8px; font-size: 12px; }
  .rows .lbl { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .rows .v { text-align: right; font-weight: 500; white-space: nowrap; }
  .rows.cost { grid-template-columns: 10px minmax(0, 1fr) auto auto; }
  .rows.cost .kwh { text-align: right; color: var(--secondary-text-color); white-space: nowrap; }
  @container tc-card (max-width: 230px) {
    .picture { display: none; }
  }
  @container tc-card (max-width: 330px) {
    .picture { width: 84px; height: 70px; }
    .hero { gap: 8px; }
    .rows { grid-template-columns: 10px minmax(0, 1fr) auto; }
    .rows .bar { display: none; }
  }
`;

export const MINI_STYLE = `
  :host { --tc-natural-width: 300px; }
  .content { padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 8px; }
  .pills { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
  .pill { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 22px; min-width: 0;
          background: color-mix(in srgb, var(--c) 10%, transparent); }
  .pill .disc { width: 28px; height: 28px; }
  .pill .txt { display: flex; flex-direction: column; min-width: 0; }
  .pill .k { font-size: 11px; color: var(--secondary-text-color); }
  .pill .v { font-size: 13px; font-weight: 500; color: color-mix(in srgb, var(--c) 55%, var(--primary-text-color)); }
  .pill .k, .pill .v { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .line { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--secondary-text-color); min-width: 0; }
  .line .icon { width: 16px; height: 16px; fill: var(--c); }
  .line span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  @container tc-card (max-width: 220px) {
    .pills { grid-template-columns: minmax(0, 1fr); }
  }
`;

// The hero picture, drawn like the appliances of the other ha-* cards (white and steel bodies, a glow on the floor in
// the color of the day): a pylon feeds a house. At peak hours a sun turns its rays above it; off-peak a moon glows
// among twinkling stars and the windows light up. The current runs along the line as glowing beads, faster as the day
// gets dearer (blue, white, red); on a red day at peak hours a warning badge flashes on the roof. The roof takes the
// color of the day. Every animation loops in 2.4 s (the rays turn by one ray), so the README GIFs loop seamlessly.
// prefers-reduced-motion keeps it still.
export const SUN_RAYS = Array.from({ length: 12 }, (_, i) => {
  const a = (i * Math.PI) / 6;
  const pt = (r, da) => `${(r * Math.cos(a + da)).toFixed(2)} ${(r * Math.sin(a + da)).toFixed(2)}`;
  return `M${pt(8.5, -0.14)}L${pt(12.5, 0)}L${pt(8.5, 0.14)}Z`;
}).join("");
export const SPARKLE = (x, y, r) =>
  `M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z`;
export const WIRE = "M43.5 38.5Q60 64 75.5 68";
// In the banner (`banner`), the picture is framed down to the pylon's feet and widened to the left, where the line
// comes in from afar and carries the current too. `uid` keeps the ids of each card's gradients apart on a page with
// several cards.
export const LEAD = "M16.5 40.5Q-16 44 -58 74";
export const sceneSvg = (color, period, uid = "0", banner = false) =>
  (
    `<svg class="scene c-${color || "unknown"} p-${period}" viewBox="${banner ? "-60 -1 180 91" : "0 0 120 100"}" aria-hidden="true"><defs>` +
  '<radialGradient id="tc-floor" cx=".5" cy=".5" r=".5"><stop offset="0" class="floor-stop" stop-opacity=".45"/><stop offset="1" class="floor-stop" stop-opacity="0"/></radialGradient>' +
  '<linearGradient id="tc-steel" gradientUnits="userSpaceOnUse" x1="18" y1="0" x2="42" y2="0"><stop offset="0" stop-color="#8d98a5"/><stop offset=".45" stop-color="#c9d0d8"/><stop offset="1" stop-color="#7d8894"/></linearGradient>' +
  '<linearGradient id="tc-front" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dfe4ea"/></linearGradient>' +
  '<linearGradient id="tc-side" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d3d9e0"/><stop offset="1" stop-color="#c3cad2"/></linearGradient>' +
  '<linearGradient id="tc-sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient>' +
  '<linearGradient id="tc-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a5562"/><stop offset="1" stop-color="#2b333d"/></linearGradient>' +
  '<radialGradient id="tc-sun"><stop offset="0" stop-color="#fff3b0"/><stop offset=".55" stop-color="#ffc83d"/><stop offset="1" stop-color="#ff9f1a"/></radialGradient>' +
  '<radialGradient id="tc-halo"><stop class="halo-stop" offset="0" stop-opacity=".5"/><stop class="halo-stop" offset="1" stop-opacity="0"/></radialGradient>' +
  '<mask id="tc-crescent"><circle cx="97" cy="17" r="7.5" fill="#fff"/><circle cx="101" cy="13.8" r="6.6" fill="#000"/></mask>' +
  '<filter id="tc-blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.3"/></filter>' +
  "</defs>" +
  '<ellipse class="floor" cx="62" cy="92" rx="57" ry="4.5" fill="url(#tc-floor)"/>' +
  (period === "hc"
    ? '<g class="night"><circle class="halo" cx="97" cy="17" r="16" fill="url(#tc-halo)"/>' +
      '<g mask="url(#tc-crescent)"><circle class="moon" cx="97" cy="17" r="7.5"/><circle class="crater" cx="93" cy="18" r="1.4"/><circle class="crater" cx="95.5" cy="22" r=".9"/></g>' +
      `<path class="star s1" d="${SPARKLE(74, 10, 2.4)}"/><path class="star s2" d="${SPARKLE(84, 26, 1.7)}"/><path class="star s3" d="${SPARKLE(112, 30, 1.9)}"/></g>`
    : '<g class="day"><circle class="halo" cx="97" cy="17" r="18" fill="url(#tc-halo)"/>' +
      `<g transform="translate(97 17)"><path class="rays" d="${SUN_RAYS}"/><circle r="6.8" fill="url(#tc-sun)"/></g></g>`) +
  // The pylon: steel lattice, cross arms, dark glass insulators, feet.
  '<g class="pylon" stroke="url(#tc-steel)"><path class="legs" d="M30 25L21.5 88M30 25L38.5 88"/>' +
  '<path class="lattice" d="M23.2 76H36.8M24.6 64H35.4M26 53H34M27.2 44H32.8M23.2 76L35.4 64M36.8 76L24.6 64M24.6 64L34 53M35.4 64L26 53M26 53L32.8 44M34 53L27.2 44"/>' +
  '<path class="arms" d="M16.5 37H43.5M28 37L30 31.5L32 37M19.5 47H40.5"/></g>' +
  '<g class="insulators" fill="url(#tc-glass)"><rect x="15.6" y="37.4" width="1.8" height="3.2" rx=".9"/><rect x="42.6" y="37.4" width="1.8" height="3.2" rx=".9"/>' +
  '<rect x="18.6" y="47.4" width="1.8" height="3" rx=".9"/><rect x="39.6" y="47.4" width="1.8" height="3" rx=".9"/></g>' +
  '<rect class="foot" x="18.5" y="87" width="6" height="3" rx="1"/><rect class="foot" x="35.5" y="87" width="6" height="3" rx="1"/>' +
  // The line and the current.
  (banner
      ? `<path class="wire" d="${LEAD}"/><path class="flow glow" d="${LEAD}" filter="url(#tc-blur)"/><path class="flow beads" d="${LEAD}"/>`
      : '<path class="wire" d="M16.5 40.5Q10 52 2 54"/>') +
  `<path class="wire" d="${WIRE}"/><path class="flow glow" d="${WIRE}" filter="url(#tc-blur)"/><path class="flow beads" d="${WIRE}"/>` +
  // The house: a lit front, a shaded side, a roof in the color of the day, dark glass windows that light up at night.
  '<g class="house">' +
  '<rect class="chimney" fill="url(#tc-side)" x="105.5" y="48.5" width="5" height="9" rx=".6"/><rect class="chimney-cap" x="104.8" y="47.5" width="6.4" height="2" rx=".6"/>' +
  '<path class="side" d="M96 64H113V88H96Z" fill="url(#tc-side)"/>' +
  '<path class="roof" d="M85 50.5H103.5L117 65H98.5Z"/><path class="sheen" d="M85 50.5H103.5L117 65H98.5Z" fill="url(#tc-sheen)"/>' +
  '<path class="tiles" d="M88.4 54.2H107M91.8 57.8H110.4M95.2 61.4H113.7"/>' +
  '<path class="front" d="M74.5 65L85 54L95.5 65V88H74.5Z" fill="url(#tc-front)"/>' +
  '<path class="roof-edge" d="M72 66.5L85 50.5L98.5 65"/>' +
  '<circle fill="url(#tc-glass)" class="glass attic" cx="85" cy="62" r="2.2"/>' +
  '<path class="door" d="M81 88V79.5a4 4 0 0 1 8 0V88Z"/><circle class="knob" cx="87.3" cy="84" r=".55"/>' +
  '<rect fill="url(#tc-glass)" class="glass w1" x="99" y="69.5" width="5.5" height="7" rx=".9"/><rect fill="url(#tc-glass)" class="glass w2" x="106.5" y="69.5" width="5" height="7" rx=".9"/>' +
  '<path class="mullion" d="M101.75 69.5V76.5M99 73H104.5M109 69.5V76.5M106.5 73H111.5"/>' +
  '<rect class="meter" x="77" y="72" width="3.4" height="5" rx=".7"/><circle class="led" cx="78.7" cy="73.6" r=".55"/>' +
  '<rect class="plinth" x="73.5" y="87" width="40.5" height="2.4" rx="1"/>' +
  '<path class="hook" d="M74.5 68H76.5"/><circle class="hook-cap" fill="url(#tc-glass)" cx="75.6" cy="68" r=".9"/>' +
  "</g>" +
  '<g class="warn"><circle class="warn-ring" cx="101" cy="41" r="6.5"/><circle class="warn-dot" cx="101" cy="41" r="6"/>' +
  '<path class="warn-bolt" d="M102 36.6L98.6 41.8H101L100 45.4L103.4 40.2H101Z"/></g>' +
  "</svg>"
  ).replace(/#tc-(floor|steel|front|side|sheen|glass|sun|halo|crescent|blur)\b|id="tc-(floor|steel|front|side|sheen|glass|sun|halo|crescent|blur)\b/g, (m) => `${m}-${uid}`);

export const SCENE_STYLE = `
  .scene { width: 100%; height: 100%; display: block; overflow: visible; }
  .scene .floor-stop { stop-color: var(--c); }
  .scene.c-white .floor-stop { stop-color: var(--tc-white-tint); }
  .scene.p-hc .floor-stop { stop-color: #ffc83d; }
  .scene .halo-stop { stop-color: #ffc83d; } .scene.p-hc .halo-stop { stop-color: #ffd54f; }
  .scene .halo { transform-box: fill-box; transform-origin: center; animation: tc-breathe 2.4s ease-in-out infinite; }
  .scene .rays { fill: #ffb300; transform-box: fill-box; transform-origin: center; animation: tc-spin 28.8s linear infinite; }
  .scene .moon { fill: #ffe7a3; } .scene .crater { fill: #f2c94c; opacity: .6; }
  .scene .star { fill: #ffd54f; transform-box: fill-box; transform-origin: center; animation: tc-twinkle 2.4s ease-in-out infinite; }
  .scene .star.s2 { animation-delay: -.8s; } .scene .star.s3 { animation-delay: -1.6s; }
  .scene .pylon path { fill: none; stroke-linecap: round; stroke-linejoin: round; }
  .scene .pylon .legs { stroke-width: 2; } .scene .pylon .lattice { stroke-width: .9; } .scene .pylon .arms { stroke-width: 1.6; }
  .scene .foot { fill: #9aa5b1; }
  .scene .wire { fill: none; stroke: #b6bfc9; stroke-width: 1.3; stroke-linecap: round; }
  .scene .flow { fill: none; stroke-linecap: round; stroke-dasharray: 0 6; animation: tc-flow 1.2s linear infinite; }
  .scene .flow.beads { stroke: var(--tc-flow); stroke-width: 2.3; }
  .scene .flow.glow { stroke: var(--tc-flow-glow, var(--tc-flow)); stroke-width: 4.6; opacity: .5; }
  .scene.c-blue { --tc-flow: var(--tc-blue); }
  .scene.c-white { --tc-flow: #ffffff; --tc-flow-glow: var(--tc-white-tint); }
  .scene.c-red { --tc-flow: var(--tc-red); }
  .scene.c-white .flow.glow { opacity: .9; stroke-width: 4.2; }
  .scene.c-white .flow { animation-duration: .8s; }
  .scene.c-red .flow { animation-duration: .4s; }
  .scene.p-hc .flow { animation-duration: 2.4s; }
  .scene.c-unknown .flow { display: none; }
  .scene .front, .scene .side { stroke: #c3cad2; stroke-width: 1; stroke-linejoin: round; }
  .scene .roof { fill: var(--disc); stroke: color-mix(in srgb, var(--c) 70%, #1f2937); stroke-width: 1; stroke-linejoin: round; }
  .scene .roof-edge { fill: none; stroke: color-mix(in srgb, var(--c) 70%, #1f2937); stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
  .scene.c-white .roof, .scene.c-white .roof-edge { stroke: #9aa5b1; }
  .scene.c-unknown .roof { fill: #d3d9e0; } .scene.c-unknown .roof, .scene.c-unknown .roof-edge { stroke: #9aa5b1; }
  .scene .tiles { fill: none; stroke: #000; stroke-width: .5; opacity: .12; }
  .scene .chimney { stroke: #c3cad2; stroke-width: .8; } .scene .chimney-cap { fill: #9aa5b1; }
  .scene .mullion { stroke: #c3cad2; stroke-width: .6; }
  .scene .door { fill: #9aa5b1; } .scene .knob { fill: #e8edf2; }
  .scene .meter { fill: #c9e265; stroke: #8fa53b; stroke-width: .5; } .scene .led { fill: var(--tc-ok); }
  .scene .plinth { fill: #9aa5b1; }
  .scene .hook { stroke: #9aa5b1; stroke-width: 1; stroke-linecap: round; }
  .scene.p-hc .glass:not(.hook-cap) { fill: #ffd54f; animation: tc-glow 2.4s ease-in-out infinite; }
  .scene.p-hc .glass.w2 { animation-delay: -1.2s; }
  .scene .warn { display: none; }
  .scene.c-red.p-hp .warn { display: inline; }
  .scene .warn-dot { fill: var(--tc-red); stroke: var(--card-background-color, #fff); stroke-width: 1; }
  .scene .warn-bolt { fill: #fff; }
  .scene .warn-ring { fill: none; stroke: var(--tc-red); stroke-width: 1.2; transform-box: fill-box; transform-origin: center; animation: tc-ping 1.2s ease-out infinite; }
  .scene .warn-dot, .scene .warn-bolt { transform-box: view-box; transform-origin: 101px 41px; animation: tc-alert 1.2s ease-in-out infinite; }
  @keyframes tc-flow { to { stroke-dashoffset: -12; } }
  @keyframes tc-glow { 0%, 100% { opacity: .7; } 50% { opacity: 1; } }
  @keyframes tc-alert { 0%, 100% { transform: scale(1); } 50% { transform: scale(.86); } }
  @keyframes tc-ping { from { transform: scale(1); opacity: .8; } to { transform: scale(1.5); opacity: 0; } }
  @keyframes tc-breathe { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(.85); opacity: .65; } }
  @keyframes tc-twinkle { 0%, 100% { opacity: .35; transform: scale(.6); } 50% { opacity: 1; transform: scale(1.1); } }
`;

// The illustrated header: the sky (day, or night with a dark theme), a hill, the pylon feeding the house of the hero
// picture on the right, and a 10 px strip of lawn under the whole banner, edge to edge. The text sits on the sky at
// the left, over the far end of the line. The icon's color always tells the status: the color of the day, deep at
// peak hours and light off-peak, grey while the day is unknown.
export const SKY_STARS = [
  [18, 10],
  [64, 22],
  [118, 8],
  [150, 30],
  [176, 14],
  [212, 26],
  [238, 6],
  [262, 34],
  [290, 12],
  [312, 28],
];
export const CLOUD = (x, y, k) =>
  `<g transform="translate(${x} ${y}) scale(${k})"><path class="tc-cloud" d="M-14 4C-17 4-18 0-14.5-1-14-5-8-6-6-3-4-8 4-8 5-2 9-3 12 0 10 4Z"/></g>`;
export const skySvg = () =>
  '<svg class="tc-sky" viewBox="0 0 320 80" preserveAspectRatio="xMaxYMax meet" aria-hidden="true">' +
  `<g class="tc-stars">${SKY_STARS.map(([x, y], i) => `<circle class="tc-star${i % 3 ? "" : " tw"}" cx="${x}" cy="${y}" r=".7"/>`).join("")}</g>` +
  `<g class="tc-clouds">${CLOUD(150, 22, 1)}${CLOUD(214, 34, 0.75)}${CLOUD(120, 46, 0.6)}</g>` +
  '<path class="tc-hill far" d="M96 80C150 68 196 62 250 64S300 70 320 68V80Z"/>' +
  '<path class="tc-hill" d="M150 80C200 74 250 72 320 73V80Z"/>' +
  "</svg>";

export const BANNER_STYLE = `
  .banner { position: relative; overflow: hidden; height: var(--tc-banner-h, 90px); color: #10283f;
            background: linear-gradient(90deg, #f1f8ff 0%, #e2f1fd 34%, #b9def8 70%, #9fd0f3 100%); }
  .banner.night { color: #fff; background: linear-gradient(90deg, #1b2f52 0%, #15284a 36%, #0f1f3d 72%, #0a1830 100%); }
  .tc-sky { position: absolute; left: 0; top: 0; width: 100%; height: calc(100% - var(--tc-ground-h, 10px)); }
  .tc-stars { display: none; } .night .tc-stars { display: inline; } .night .tc-clouds { display: none; }
  .tc-star { fill: #fff; opacity: .8; } .tc-star.tw { animation: tc-twinkle-sky 3.2s ease-in-out infinite alternate; }
  .tc-cloud { fill: #fff; opacity: .9; animation: tc-drift 4.8s ease-in-out infinite alternate; }
  .tc-hill { fill: #a7d39f; } .tc-hill.far { fill: #c6e4bd; }
  .night .tc-hill { fill: #1d3a4a; } .night .tc-hill.far { fill: #1a3150; }
  /* The lawn: a 10 px strip under the whole banner; the glow of the day's color under the house spills over it. */
  .tc-ground { position: absolute; left: 0; right: 0; bottom: 0; height: var(--tc-ground-h, 10px);
               background: repeating-linear-gradient(90deg, #5aa83d 0 22px, #6cbb4c 22px 44px); }
  .night .tc-ground { background: repeating-linear-gradient(90deg, #1f4a2a 0 22px, #245433 22px 44px); }
  /* The picture (viewBox 180 × 91, the pylon's feet at its bottom) stands on the strip. */
  .tc-art { position: absolute; right: 6px; bottom: var(--tc-ground-h, 10px); height: calc(var(--tc-banner-h, 90px) - var(--tc-ground-h, 10px) - 2px);
            aspect-ratio: 180 / 91; width: calc((var(--tc-banner-h, 90px) - var(--tc-ground-h, 10px) - 2px) * 180 / 91); }
  .banner .scene .wire { stroke: #9aa7b4; }
  .night .scene .wire { stroke: #6f7f92; }
  .night .scene .house { filter: brightness(.92); }
  .htext { position: absolute; z-index: 1; left: 12px; top: 0; bottom: var(--tc-ground-h, 10px); right: var(--tc-text-right, 104px);
           display: flex; align-items: center; gap: 10px; min-width: 0; }
  .htext .titles { flex: 1 1 auto; min-width: 0; gap: 1px; justify-content: center; }
  .banner .name { font-weight: 600; }
  .banner .sub { color: #3d5670; }
  .night .sub { color: rgba(255,255,255,.82); }
  .banner .type-icon { background: rgba(255,255,255,.62); box-shadow: inset 0 0 0 1px rgba(47,125,225,.18); }
  .banner.night .type-icon { background: rgba(255,255,255,.12); box-shadow: inset 0 0 0 1px rgba(255,255,255,.14); }
  .banner .type-icon .icon { fill: var(--tc-ic); }
  .banner .type-icon.c-blue { --tc-ic: #2563eb; } .banner .type-icon.c-blue.p-hc { --tc-ic: #6ea2f5; }
  .banner .type-icon.c-white { --tc-ic: #64748b; } .banner .type-icon.c-white.p-hc { --tc-ic: #a3afbf; }
  .banner .type-icon.c-red { --tc-ic: #dc2626; } .banner .type-icon.c-red.p-hc { --tc-ic: #f08080; }
  .banner .type-icon.c-unknown { --tc-ic: #9aa3ad; }
  .night .type-icon.c-blue { --tc-ic: #7fb0ff; } .night .type-icon.c-blue.p-hc { --tc-ic: #4f7fc9; }
  .night .type-icon.c-white { --tc-ic: #f1f5f9; } .night .type-icon.c-white.p-hc { --tc-ic: #a3afbf; }
  .night .type-icon.c-red { --tc-ic: #ff6b6b; } .night .type-icon.c-red.p-hc { --tc-ic: #c45a5a; }
  .night .type-icon.c-unknown { --tc-ic: #7c8693; }
  .banner .type-icon.c-red.p-hp { animation: tc-pulse 1.2s ease-in-out infinite; }
  /* The status pill on the sky: the day's color on frosted glass. */
  .banner .chip { padding: 1px 8px; border-radius: 12px; font-size: 11px; font-weight: 500;
                  line-height: 16px; background: color-mix(in srgb, var(--c) 18%, rgba(255,255,255,.78)); color: color-mix(in srgb, var(--c) 45%, #0d2a45); }
  .banner.night .chip { background: color-mix(in srgb, var(--c) 30%, rgba(8,18,38,.55)); color: color-mix(in srgb, var(--c) 35%, #ffffff); }
  .banner .chip .dot { width: 7px; height: 7px; border-radius: 50%; flex: none; background: var(--disc); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c) 60%, transparent); }
  .banner.zoomable { --tc-text-right: 128px; } .banner.zoomable .tc-art { right: 30px; }
  .banner .zoom { position: absolute; z-index: 2; top: 5px; right: 5px; margin: 0; color: #33506b; background: rgba(255,255,255,.55);
                  box-shadow: inset 0 0 0 1px rgba(255,255,255,.7); backdrop-filter: blur(4px); }
  .banner .zoom:hover { background: rgba(255,255,255,.75); color: #33506b; }
  .banner.night .zoom { color: #ffffff; background: rgba(255,255,255,.12); box-shadow: inset 0 0 0 1px rgba(255,255,255,.2); }
  .banner.night .zoom:hover { background: rgba(255,255,255,.22); color: #ffffff; }
  @keyframes tc-drift { to { transform: translateX(4px); } }
  @keyframes tc-twinkle-sky { from { opacity: .3; } to { opacity: 1; } }
  /* Narrow card: no room for the picture beside the text, the sky alone stays. */
  @container tc-card (max-width: 250px) { .tc-art { display: none; } .htext { right: 36px; } }
  @media (prefers-reduced-motion: reduce) { .tc-cloud, .tc-star, .banner .type-icon, .banner .scene * { animation: none !important; } }
`;
