// ── In-place redraw ──
// Home Assistant sets `hass` on every state change of the house. Rewriting the card's whole content then (innerHTML)
// replaces every node: <ha-card> and <ha-icon> come back empty until their own update, the animations start over,
// the scroll of an inner list goes back to the top and the sections view reflows under the page (it moves by
// itself). rcMorph brings the nodes in place in line with the new markup instead: same node, text and attributes
// updated; an item is matched by its key (data-id, data-entity, data-key, data-area, data-scene), the rest by
// position and tag. What the card's script sets itself after drawing is kept: the nodes it adds (data-rc-own, left
// where it put them), the attributes a node lists in data-rc-keep, and the picture of an <img> drawn without a src.
export const RC_KEEP_ATTRS = new Set(["data-wrap", "data-dot"]);
const RC_IMG_SCRIPT_ATTRS = ["src", "srcset", "style"];
const rcKeptAttrs = (a, b) => {
  const keep = new Set((b.getAttribute("data-rc-keep") || "").split(/\s+/).filter(Boolean));
  if (a.nodeName === "IMG" && !b.hasAttribute("src")) for (const n of RC_IMG_SCRIPT_ATTRS) keep.add(n);
  return keep;
};
export const rcIsOwn = (n) => n?.nodeType === 1 && n.hasAttribute("data-rc-own");
const RC_KEYS = ["data-id", "data-entity", "data-key", "data-area", "data-scene"];
export const rcKeyOf = (n) => {
  if (n.nodeType !== 1) return null;
  for (const k of RC_KEYS) {
    const v = n.getAttribute(k);
    if (v != null) return `${k}=${v}`;
  }
  return null;
};

// A form control keeps what the user is doing with it: its live value follows the new markup unless it is focused.
const rcSyncControl = (a, b) => {
  if (!["INPUT", "SELECT", "TEXTAREA"].includes(a.nodeName)) return;
  if (a.getRootNode?.().activeElement === a) return;
  if (b.hasAttribute("value") && a.value !== b.getAttribute("value")) a.value = b.getAttribute("value");
  if (a.type === "checkbox" || a.type === "radio") a.checked = b.hasAttribute("checked");
};

export const rcPatchNode = (a, b) => {
  if (a.nodeType !== 1) {
    if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue;
    return;
  }
  const keep = rcKeptAttrs(a, b);
  for (const { name, value } of b.attributes) if (!keep.has(name) && a.getAttribute(name) !== value) a.setAttribute(name, value);
  for (const { name } of [...a.attributes]) if (!b.hasAttribute(name) && !RC_KEEP_ATTRS.has(name) && !keep.has(name)) a.removeAttribute(name);
  rcSyncControl(a, b);
  // A <template> holds its markup in .content, not as children.
  if (a.nodeName === "TEMPLATE") rcMorphChildren(a.content, b.content);
  else rcMorphChildren(a, b);
};

// A key only counts when it is unique among the siblings (three buttons of one cover share its data-entity): the
// others are matched by position and tag.
const rcUniqueKeys = (nodes) => {
  const seen = new Map();
  for (const n of nodes) {
    const k = rcKeyOf(n);
    if (k != null) seen.set(`${n.nodeName}|${k}`, (seen.get(`${n.nodeName}|${k}`) ?? 0) + 1);
  }
  return (n) => {
    const k = rcKeyOf(n);
    return k != null && seen.get(`${n.nodeName}|${k}`) === 1 ? `${n.nodeName}|${k}` : null;
  };
};

export const rcMorphChildren = (from, to) => {
  const old = [...from.childNodes].filter((n) => !rcIsOwn(n));
  const fresh = [...to.childNodes];
  const oldKey = rcUniqueKeys(old);
  const newKey = rcUniqueKeys(fresh);
  const keyed = new Map();
  for (const n of old) {
    const k = oldKey(n);
    if (k != null) keyed.set(k, n);
  }
  const used = new Set();
  let cursor = 0;
  let prev = null;
  for (const n of fresh) {
    const k = newKey(n);
    let match = k != null ? (keyed.get(k) ?? null) : null;
    if (k == null) {
      while (cursor < old.length && (used.has(old[cursor]) || oldKey(old[cursor]) != null)) cursor++;
      if (old[cursor]?.nodeName === n.nodeName) match = old[cursor++];
    }
    if (match && !used.has(match)) {
      used.add(match);
      rcPatchNode(match, n);
    } else match = n;
    // Where it goes: right after the previous node, the card's own nodes staying where they are.
    let ref = prev ? prev.nextSibling : from.firstChild;
    while (rcIsOwn(ref)) ref = ref.nextSibling;
    if (ref !== match) from.insertBefore(match, ref);
    prev = match;
  }
  for (const n of old) if (!used.has(n) && n.parentNode === from) from.removeChild(n);
};

// `el`'s content brought in line with `html`, in place (see above); a plain rewrite where there is no DOM to morph.
export const rcMorph = (el, html) => {
  if (!el.childNodes || typeof document.createElement("template").content !== "object") {
    el.innerHTML = html;
    return;
  }
  const t = document.createElement("template");
  t.innerHTML = html;
  rcMorphChildren(el, t.content);
};
