// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------
import { pickerDefine } from "./card-picker.js";
import { VERSION } from "./core.js";
import { TempoCard, TempoMiniCard } from "./cards.js";
import { TempoCardEditor, TempoMiniCardEditor } from "./visual-editors.js";

export const define = (name, cls) => {
  if (!customElements.get(name)) pickerDefine(name, cls);
};
define("tempo-card", TempoCard);
define("tempo-mini-card", TempoMiniCard);
define("tempo-card-editor", TempoCardEditor);
define("tempo-mini-card-editor", TempoMiniCardEditor);

window.customCards = window.customCards || [];
for (const card of [
  {
    type: "tempo-card",
    name: "Tempo Card",
    description: "EDF Tempo: color of today and tomorrow, days left in the season, off-peak / peak countdown and estimated cost.",
  },
  {
    type: "tempo-mini-card",
    name: "Tempo Mini Card",
    description: "Compact EDF Tempo overview: colors of today and tomorrow and the current period.",
  },
]) {
  if (!window.customCards.some((c) => c.type === card.type))
    window.customCards.push({ ...card, preview: true, documentationURL: "https://github.com/juju35/ha-tempo-card" });
}

console.info(`%c TEMPO-CARD %c v${VERSION} `, "color: white; background: #2563eb; font-weight: 700;", "color: #2563eb; background: white; font-weight: 700;");
