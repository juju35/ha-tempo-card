# Changelog

## 1.0.0 - 2026-11-13

### Features
- **Tempo Card** (`custom:tempo-card`): colors of today and tomorrow (animated), current off-peak / peak period with its hours, progress and countdown, current and next price per kWh, days left of each color in the season, and estimated cost of the day and of the month from the meter indexes and a configurable price grid (optional monthly subscription).
- **Tempo Mini Card** (`custom:tempo-mini-card`): today and tomorrow as two colored pills and the current period, with a detail button that switches to the full card's content and back (a click elsewhere brings the compact view back).
- Animated scene: a pylon feeds a house under the sky of the period (turning sun at peak hours, moon and twinkling stars off-peak), the current flows faster as the day gets dearer, a warning bolt flashes on a red day at peak hours; today's disc ripples (blue), shimmers (white) or pulses (red) and tomorrow's turns while its color is not published. Everything stops with `prefers-reduced-motion`.
- Entities found automatically from the entity registry: RTE Tempo, Tarif EDF, EDF Tempo, Linky TIC and a ZLinky_TIC in Zigbee2MQTT; every entity can also be set in the options.
- Estimated cost from the long-term statistics of the six Tempo indexes; default price grid of the EDF regulated Tempo prices of 1 August 2026, prices can be numbers or price entities.
- Collapsible sections (period, season, cost) folding back on a click elsewhere, visual editor for both cards, light and dark themes.
- 22 languages: English in the bundle, every other language in its own file loaded on demand.
