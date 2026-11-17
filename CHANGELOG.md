# Changelog

## 1.1.0 - 2026-11-17

### Features
- Illustrated header on both cards (90 px), in the style of the other cards: the title and the current price on a sky at the left, the pylon feeding the house on the right, standing on a 10 px lawn strip that runs edge to edge. The roof, the current and the glow take the color of the day; the sun shines at peak hours and the moon off-peak; the current comes in from afar and flows faster as the day gets dearer; the warning flashes on a red day at peak hours.
- Night sky after sunset (`sun.sun`) or with the dark theme, forced with `illustration_theme: day | night`; `illustration: false` keeps the classic header (and the picture beside the days on the full card).
- The header icon tells the status: the color of the day, deep at peak hours and light off-peak, grey while unknown; it pulses on a red day at peak hours.
- New options in the visual editor of both cards.
- The status pill (a dot in the day's color and the current period) sits on the title row right after the title only when the whole title and its whole label fit there (measured, in every language); otherwise on its own line under the subtitle (then kept to one line), and only its dot when even that does not fit in the banner above the lawn or beside the picture, or on a card 200 px wide or less. The same rule on the classic header. The mini card's detail button sits in the banner's top-right corner, in the frosted style of the other cards.
- Night picture with the dark theme even while the sun is up (a day picture would glare on a dark dashboard); `illustration_theme: day | night` still forces one.

## 1.0.3 - 2026-11-14

### Changes
- Redrawn scene, in the style of the appliances of the other cards: a steel pylon with its insulators, a house with a lit front, a shaded side, dark glass windows and a Linky meter, and a glow on the floor in the color of the day (golden off-peak). The current runs as glowing beads, the sun has a soft halo, the moon is a crescent with its halo, and the warning on a red day at peak hours is a badge on the roof. Every animation still loops in 2.4 s and stops with `prefers-reduced-motion`.

## 1.0.2 - 2026-11-14

### Fixes
- `currency` is now in the visual editor of both cards.
- The mini card's visual editor now offers the full card's options its detail view uses (`show_period`, `show_season`, `show_cost`, `collapsed`): they could only be set in YAML.

## 1.0.1 - 2026-11-13

### Fixes
- Folding back on a tap elsewhere now works on iOS (Safari and the companion app): a tap on something that is not clickable sent no click to the page, so the detailed view of the mini card and the unfolded sections stayed open. The press and the release are caught instead; a slider dragged out of the card and a scroll do not fold anything.
- Leaving the card (another dashboard view, a conditional card hidden) brings it back in its default state.
- Clicks lost under an update: Home Assistant updates the card several times a second, and an update that rewrote the card between the press and the release replaced the element pressed, so that the click landed on the card itself and did nothing. The card is no longer rewritten while a press is in progress; the pending update is drawn at the click, or right after the release.
- Focus ring after a mouse click: the focus was put back on the clicked element after each update, which drew the focus ring. It is now kept across updates only for the keyboard (and in a text field).

## 1.0.0 - 2026-11-13

### Features
- **Tempo Card** (`custom:tempo-card`): colors of today and tomorrow (animated), current off-peak / peak period with its hours, progress and countdown, current and next price per kWh, days left of each color in the season, and estimated cost of the day and of the month from the meter indexes and a configurable price grid (optional monthly subscription).
- **Tempo Mini Card** (`custom:tempo-mini-card`): today and tomorrow as two colored pills and the current period, with a detail button that switches to the full card's content and back (a click elsewhere brings the compact view back).
- Animated scene: a pylon feeds a house under the sky of the period (turning sun at peak hours, moon and twinkling stars off-peak), the current flows faster as the day gets dearer, a warning bolt flashes on a red day at peak hours; today's disc ripples (blue), shimmers (white) or pulses (red) and tomorrow's turns while its color is not published. Everything stops with `prefers-reduced-motion`.
- Entities found automatically from the entity registry: RTE Tempo, Tarif EDF, EDF Tempo, Linky TIC and a ZLinky_TIC in Zigbee2MQTT; every entity can also be set in the options.
- Estimated cost from the long-term statistics of the six Tempo indexes; default price grid of the EDF regulated Tempo prices of 1 August 2026, prices can be numbers or price entities.
- Collapsible sections (period, season, cost) folding back on a click elsewhere, visual editor for both cards, light and dark themes.
- 22 languages: English in the bundle, every other language in its own file loaded on demand.
