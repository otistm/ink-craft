/* =====================================================================
   Ink drawings as SVG: the seven lords' sigils, the element patterns that tell
   cards apart (no color, only ink), familiars, reagents, card faces, the trophy.
   ===================================================================== */
"use strict";
const E = Engine;

// Each element has its own ink pattern behind the card art. Void is the only inverted one (black ground).
const PATTERNS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<pattern id="p-fire" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><path d="M0 0v5" stroke="#000" stroke-width="1.1"/></pattern>
<pattern id="p-light" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M6 3.5v5M3.5 6h5" stroke="#000" stroke-width="1" stroke-linecap="round"/><circle cx="0" cy="0" r=".9"/><circle cx="12" cy="12" r=".9"/><circle cx="0" cy="12" r=".9"/><circle cx="12" cy="0" r=".9"/></pattern>
<pattern id="p-blight" width="11" height="11" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.6"/><circle cx="8.5" cy="8" r="1"/><circle cx="9" cy="2" r=".6"/></pattern>
<pattern id="p-iron" width="9" height="9" patternUnits="userSpaceOnUse"><path d="M0 .5h9M.5 0v9" stroke="#000" stroke-width="1"/><circle cx="4.5" cy="4.5" r=".9"/></pattern>
<pattern id="p-ice" width="12" height="10.4" patternUnits="userSpaceOnUse"><path d="M0 0l6 10.4L12 0M0 10.4h12" fill="none" stroke="#000" stroke-width=".8"/></pattern>
<pattern id="p-void" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#000"/><circle cx="2" cy="3" r=".8" fill="#fff"/><circle cx="7" cy="8" r=".5" fill="#fff"/></pattern>
<pattern id="p-storm" width="10" height="7" patternUnits="userSpaceOnUse"><path d="M0 4.5l2.5-3 2.5 3 2.5-3 2.5 3" fill="none" stroke="#000" stroke-width=".9"/></pattern>
<pattern id="p-neutral" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r=".55"/></pattern>
<pattern id="p-frost" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)"><path d="M0 0v6M0 0h6" stroke="#000" stroke-width=".9"/></pattern>
</defs></svg>`;

const ST = 'fill="#fff" stroke="#000" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';

// The seven lords' sigils, and a drop of ink for plain spells.
const SIGIL = {
  fire: '<path d="M24 44q-14 0-14-14q0-12 10-22q0 10 6 12q-2-10 6-18q10 12 10 28q0 14-18 14z"/><path d="M24 44q-6 0-6-7q0-5 6-10q6 5 6 10q0 7-6 7z" fill="#000"/>',
  light: '<path d="M24 3v8M24 37v8M3 24h8M37 24h8M9 9l6 6M33 33l6 6M39 9l-6 6M15 33l-6 6"/><circle cx="24" cy="24" r="10"/><circle cx="24" cy="24" r="3" fill="#000"/>',
  blight: '<path d="M11 23q0-16 13-16t13 16q0 7-4 9v7H15v-7q-4-2-4-9z"/><circle cx="18.5" cy="22" r="3.6" fill="#000"/><circle cx="29.5" cy="22" r="3.6" fill="#000"/><path d="M24 27l-2.4 4.4h4.8z" fill="#000"/><path d="M20 39v-4M24 39v-4M28 39v-4"/><path d="M33 32q1 5 0 8" />',
  iron: '<path d="M6 14h28q0 8 8 8v5H31l-3 7h6v7H14v-7h6l-3-7Q6 27 6 14z"/><path d="M14 34h20"/>',
  ice: '<path d="M24 4v40M6.7 14l34.6 20M41.3 14L6.7 34"/><path d="M19 8l5 5 5-5M19 40l5-5 5 5M6.5 21.5l7-1.5-2.5-6.5M41.5 26.5l-7 1.5 2.5 6.5M41.5 21.5l-7-1.5 2.5-6.5M6.5 26.5l7 1.5-2.5 6.5"/>',
  void: '<path d="M30 5a19 19 0 1 0 13 31A16 16 0 1 1 30 5z"/><circle cx="22" cy="26" r="3" fill="#000"/>',
  storm: '<path d="M29 3L11 26h11l-5 19 20-25H26z"/>',
  neutral: '<path d="M24 5q13 17 13 26a13 13 0 0 1-26 0q0-9 13-26z" fill="#000"/><path d="M19 30a5 5 0 0 0 5 5" stroke="#fff"/>',
};

// Familiars, drawn by kind.
const CREATURE = {
  imp: '<path d="M14 20l-4-10 9 5M34 20l4-10-9 5"/><path d="M12 27l-7-5 2 10M36 27l7-5-2 10"/><circle cx="24" cy="27" r="11"/><circle cx="20" cy="25.5" r="1.9" fill="#000"/><circle cx="28" cy="25.5" r="1.9" fill="#000"/><path d="M20 31.5q4 3 8 0"/><path d="M20 38l-2 6M28 38l2 6"/>',
  beast: '<path d="M8 24q-5-6 0-11"/><ellipse cx="20" cy="27" rx="13" ry="7.5"/><path d="M12 32v11M17 33v10M25 33v10M30 32v11"/><path d="M27 23q1-10 10-9l5 5-3 3h-5q-2 4-7 4z"/><path d="M33 14l1-6 4 6"/><circle cx="37" cy="17.5" r="1.4" fill="#000"/>',
  drake: '<path d="M22 25l-7-16 13 9z"/><path d="M5 41q11-2 15-11t14-12l6-5-1 6 5 2-7 3q-4 11-15 15z"/><circle cx="37" cy="16.5" r="1.4" fill="#000"/><path d="M8 41l-3 4"/>',
  titan: '<path d="M16 13l-5-8 8 4M32 13l5-8-8 4"/><path d="M11 45V29q0-9 13-9t13 9v16z"/><path d="M11 32l-5 6M37 32l5 6"/><circle cx="24" cy="14" r="7.5"/><path d="M20.5 14h1.5M26 14h1.5" stroke-width="3"/><path d="M18 30h12"/>',
  bird: '<path d="M5 21q10-10 19 0q9-10 19 0q-8-2-12 4l-7 11-7-11q-4-6-12-4z"/><circle cx="24" cy="22" r="4.5"/><path d="M22 26l2 4 2-4z" fill="#000"/><path d="M21 37l-2 5M27 37l2 5"/>',
  wisp: '<path d="M24 5q11 11 11 23a11 11 0 0 1-22 0q0-6 4-10q0 6 4 6q-2-11 3-19z"/><circle cx="20.5" cy="30" r="1.9" fill="#000"/><circle cx="27.5" cy="30" r="1.9" fill="#000"/>',
  robed: '<path d="M11 45q2-18 7-25q-2-11 6-15q8 4 6 15q5 7 7 25z"/><path d="M18.5 19q5.5-6 11 0"/><circle cx="21.5" cy="17.5" r="1.4" fill="#000"/><circle cx="26.5" cy="17.5" r="1.4" fill="#000"/><path d="M17 31h14M24 31v14"/>',
  knight: '<path d="M13 45V27q0-7 11-7t11 7v18z"/><path d="M15 13q0-9 9-9t9 9v8H15z"/><path d="M15 14h18M24 14v7"/><path d="M27 28h14v7q0 7-7 10q-7-3-7-10z"/>',
  gargoyle: '<path d="M8 19l7 7-3-13 9 9M40 19l-7 7 3-13-9 9"/><path d="M13 45q0-12 5-17q-3-6 6-11q9 5 6 11q5 5 5 17z"/><path d="M19 16l-2-7 4 4M29 16l2-7-4 4"/><circle cx="21.5" cy="21.5" r="1.4" fill="#000"/><circle cx="26.5" cy="21.5" r="1.4" fill="#000"/>',
  golem: '<rect x="14" y="5" width="20" height="14" rx="2"/><rect x="4" y="21" width="7" height="15" rx="2"/><rect x="37" y="21" width="7" height="15" rx="2"/><rect x="10" y="19" width="28" height="18" rx="2"/><path d="M15 37v8h7v-8M26 37v8h7v-8"/><path d="M19 12h3M26 12h3" stroke-width="3"/><path d="M18 26h12"/>',
  jar: '<path d="M16 5h16v5l5 6v25q0 4-4 4H15q-4 0-4-4V16l5-6z"/><path d="M16 10h16"/><circle cx="24" cy="24" r="4.2"/><path d="M24 28v8M19.5 32h9M20.5 41l3.5-5 3.5 5"/>',
  seraph: '<ellipse cx="24" cy="6" rx="7" ry="2.4"/><path d="M4 17q11-4 15 7q-7 2-15-7zM44 17q-11-4-15 7q7 2 15-7z"/><path d="M15 45q2-17 9-23q7 6 9 23z"/><circle cx="24" cy="15" r="5.5"/>',
  bug: '<path d="M15 22l-8-5M15 30H6M15 37l-7 5M33 22l8-5M33 30h9M33 37l7 5M21 9l-3-5M27 9l3-5"/><ellipse cx="24" cy="29" rx="9.5" ry="12.5"/><path d="M24 17v25"/><circle cx="24" cy="13" r="5"/>',
  toad: '<path d="M8 38l-4 5M40 38l4 5"/><ellipse cx="24" cy="30" rx="17" ry="11.5"/><circle cx="15.5" cy="18" r="5.5"/><circle cx="32.5" cy="18" r="5.5"/><circle cx="15.5" cy="18" r="2" fill="#000"/><circle cx="32.5" cy="18" r="2" fill="#000"/><path d="M13 30q11 6 22 0"/>',
  spider: '<path d="M16 22L6 13 3 24M16 28L3 30l2 11M32 22l10-9 3 11M32 28l13 2-2 11M18 33l-6 12M30 33l6 12"/><ellipse cx="24" cy="31" rx="9.5" ry="8.5"/><circle cx="24" cy="18.5" r="6.5"/><circle cx="21.8" cy="17.5" r="1.3" fill="#000"/><circle cx="26.2" cy="17.5" r="1.3" fill="#000"/><circle cx="24" cy="20.5" r="1" fill="#000"/>',
  drone: '<path d="M11 7h26M24 7v8"/><path d="M18 37l-3 7M30 37l3 7"/><circle cx="24" cy="26" r="11.5"/><circle cx="24" cy="26" r="4.5"/><circle cx="16" cy="20" r="1.3" fill="#000"/><circle cx="32" cy="20" r="1.3" fill="#000"/><circle cx="16" cy="32" r="1.3" fill="#000"/><circle cx="32" cy="32" r="1.3" fill="#000"/>',
  hare: '<path d="M19 20q-7-14-3-17q5 2 6 15M28 18q1-14 6-15q3 4-2 17"/><ellipse cx="24" cy="33" rx="12.5" ry="10.5"/><circle cx="37" cy="36" r="3"/><circle cx="24" cy="22.5" r="7.5"/><circle cx="21" cy="21.5" r="1.3" fill="#000"/><circle cx="27" cy="21.5" r="1.3" fill="#000"/>',
  bear: '<circle cx="14" cy="11" r="4.5"/><circle cx="34" cy="11" r="4.5"/><path d="M7 45q-2-17 7-25q10-6 20 0q9 8 7 25z"/><circle cx="24" cy="19" r="9.5"/><ellipse cx="24" cy="23.5" rx="4.5" ry="3.2"/><circle cx="24" cy="22.5" r="1.4" fill="#000"/><circle cx="20" cy="16.5" r="1.4" fill="#000"/><circle cx="28" cy="16.5" r="1.4" fill="#000"/>',
  eye: '<path d="M10 12l-4-6M24 8V2M38 12l4-6M10 36l-4 6M24 40v6M38 36l4 6"/><path d="M4 24q20-22 40 0q-20 22-40 0z"/><circle cx="24" cy="24" r="8" fill="#000"/><circle cx="21" cy="21" r="2" fill="#fff" stroke="none"/>',
  coil: '<path d="M32 8l5-3M34 14h6M16 8l-5-3M14 14H8"/><path d="M16 45h16l-3-8H19z"/><path d="M24 37V18"/><path d="M17 33q7 3 14 0M17 28q7 3 14 0M17 23q7 3 14 0"/><circle cx="24" cy="12" r="6"/>',
  sprout: '<path d="M24 44V23"/><path d="M24 29q-13 0-15-13q13 0 15 13zM24 24q11 0 13-13q-11 0-13 13z"/><path d="M14 44h20"/>',
};

// Reagents.
const REAGENT = {
  salt: '<path d="M6 39h36"/><path d="M8 39q16-23 32 0z"/><circle cx="15" cy="18" r="1.8" fill="#000"/><circle cx="25" cy="11" r="1.8" fill="#000"/><circle cx="33" cy="19" r="1.8" fill="#000"/><circle cx="20" cy="31" r="1.2" fill="#000"/><circle cx="28" cy="33" r="1.2" fill="#000"/>',
  root: '<path d="M24 22q-4-10-10-15M24 22q2-10 8-15M24 22V6"/><path d="M24 22q-11 4-9 14q2 7 9 9q7-2 9-9q2-10-9-14z"/><circle cx="21" cy="31" r="1.3" fill="#000"/><circle cx="27" cy="31" r="1.3" fill="#000"/><path d="M21 36.5q3 2 6 0"/>',
  drop: '<path d="M24 5q15 19 15 27a15 15 0 0 1-30 0q0-8 15-27z"/><path d="M28 23a8 8 0 1 0 0 14a6 6 0 1 1 0-14z" fill="#000"/>',
  ember: '<path d="M24 43q-13 0-13-12q0-10 8-19q0 8 5 9q-2-8 5-16q9 10 9 23q0 15-14 15z"/><path d="M24 43q-5.5 0-5.5-6.5q0-4.5 5.5-9q5.5 4.5 5.5 9q0 6.5-5.5 6.5z" fill="#000"/>',
  crystal: '<path d="M8 31l6-7 4 15zM40 31l-6-7-4 15z"/><path d="M24 4l10 13-10 27-10-27z"/><path d="M14 17h20M24 4v40"/>',
  feather: '<path d="M39 5Q14 11 12 40q19-6 27-35z"/><path d="M7 45l25-33"/><path d="M18 31l-6-2M22 25l-6-3M26 19l-5-3"/>',
  sun: '<path d="M24 3v7M24 38v7M3 24h7M38 24h7M9 9l5 5M34 34l5 5M39 9l-5 5M14 34l-5 5"/><circle cx="24" cy="24" r="10"/><path d="M19 24l5-6 5 6-5 6z" fill="#000"/>',
  leaf: '<path d="M7 41Q7 10 41 7q0 34-34 34z"/><path d="M7 41L30 18M18 30l-2-8M24 24l-1-9M18 30l8 1M24 24h8"/>',
  dust: '<path d="M24 6l3.5 10 10 3.5-10 3.5L24 33l-3.5-10-10-3.5 10-3.5z"/><circle cx="11" cy="37" r="2.2" fill="#000"/><circle cx="36" cy="39" r="1.7" fill="#000"/><circle cx="39" cy="9" r="1.7" fill="#000"/><circle cx="9" cy="12" r="1.3" fill="#000"/><circle cx="30" cy="44" r="1.1" fill="#000"/>',
  flower: '<path d="M24 3q0 11 8 15"/><path d="M21 21q11-7 17 4q-2 9-9 15q-9-2-12-11z"/><path d="M26 34l-2 9M31 34l2 7"/><circle cx="12" cy="35" r="4.5" fill="#000"/><circle cx="18" cy="42" r="3" fill="#000"/>',
  moss: '<path d="M14 29v-7M20 26v-9M28 26v-9M34 29v-7"/><path d="M5 41q4-17 19-17t19 17z"/><circle cx="14" cy="21" r="2" fill="#000"/><circle cx="20" cy="16" r="2" fill="#000"/><circle cx="28" cy="16" r="2" fill="#000"/><circle cx="34" cy="21" r="2" fill="#000"/>',
  bloom: '<path d="M24 37v8"/><path d="M24 15q-6-10 0-12q6 2 0 12zM29 20q10-6 12 0q-2 6-12 0zM19 20q-10-6-12 0q2 6 12 0zM24 25q-6 10 0 12q6-2 0-12z"/><circle cx="24" cy="20" r="5" fill="#000"/><circle cx="15" cy="41" r="1.8" fill="#000"/><circle cx="33" cy="42" r="1.4" fill="#000"/>',
  filings: '<path d="M8 41l6-8M16 43l4-10M24 41l6-10M34 43l3-9M11 30l6-6M26 28l4-8M18 20l4-6M32 21l6-4M14 12l3-4M36 10l2-4"/>',
  cog: '<path d="M21 4h6l1 5 4 2 4-3 4 4-3 4 2 4 5 1v6l-5 1-2 4 3 4-4 4-4-3-4 2-1 5h-6l-1-5-4-2-4 3-4-4 3-4-2-4-5-1v-6l5-1 2-4-3-4 4-4 4 3 4-2z"/><circle cx="24" cy="24" r="6"/>',
  magnet: '<path d="M11 8v17a13 13 0 0 0 26 0V8h-9v17a4 4 0 0 1-8 0V8z"/><path d="M11 8h9v7h-9zM28 8h9v7h-9z" fill="#000"/><path d="M6 36l-3 3M42 36l3 3M24 44v3"/>',
  lily: '<path d="M24 41V24M16 44h16"/><path d="M24 24q-11-2-13-15q9 0 13 9q4-9 13-9q-2 13-13 15z"/><path d="M24 18V6"/><path d="M8 34l3 3M40 34l-3 3M6 20h4M42 20h-4"/>',
  swirl: '<path d="M5 20q14-11 27-4t10 12q-4 6-10 2t0-8"/><path d="M5 31q11-4 19 0M9 39q9-2 15 2"/><circle cx="38" cy="38" r="1.5" fill="#000"/>',
  snow: '<path d="M24 4l17 10v20L24 44 7 34V14z"/><path d="M24 11v26M13 17.5l22 13M35 17.5l-22 13"/>',
  echo: '<path d="M14 14a14 14 0 0 0 0 20M34 14a14 14 0 0 1 0 20M8 8a22 22 0 0 0 0 32M40 8a22 22 0 0 1 0 32"/><circle cx="24" cy="24" r="5.5" fill="#000"/>',
  candle: '<path d="M12 44h24"/><path d="M18 20h12v21H18z"/><path d="M24 20v-4"/><path d="M24 16q-5-4 0-12q5 8 0 12z" fill="#000"/><path d="M18 24q2 4 0 7"/>',
  pearl: '<circle cx="24" cy="26" r="14"/><path d="M16 20a9 9 0 0 1 8-5"/><circle cx="25" cy="27" r="5" fill="#000"/>',
  jar: '<path d="M16 6h16v5l5 5v24q0 5-5 5H16q-5 0-5-5V16l5-5z"/><path d="M16 11h16"/><path d="M27 17l-7 11h7l-5 11" fill="none"/>',
  wire: '<path d="M3 26h5M40 26h5"/><path d="M8 26q0-10 5-10t5 10-5 10-5-10M18 26q0-10 5-10t5 10-5 10-5-10M28 26q0-10 5-10t5 10-5 10-5-10" fill="none"/>',
  static: '<path d="M7 15l6-6 6 6 6-6 6 6 6-6M7 27l6-6 6 6 6-6 6 6 6-6M7 39l6-6 6 6 6-6 6 6 6-6" fill="none"/>',
};

const glyphOf = c => c.k === 'F' ? CREATURE[c.art] : c.k === 'R' ? REAGENT[c.art] : SIGIL[c.el];
const sigilSvg = (el, cls = '') => `<svg class="${cls}" viewBox="0 0 48 48" aria-hidden="true"><g ${ST}>${SIGIL[el]}</g></svg>`;
const reagentSvg = (id, cls = '') => `<svg class="${cls}" viewBox="0 0 48 48" aria-hidden="true"><g ${ST}>${REAGENT[E.CARDS[id].art]}</g></svg>`;

// The art window on a card. Its shape says what kind of card it is:
// familiars are square, spells have an arched top, reagents are round like the mouth of a vial.
function artSvg(id, cls = 'art') {
  const c = E.CARDS[id], fill = `url(#p-${c.el})`;
  const shape = c.k === 'F' ? `<rect x="1.2" y="1.2" width="57.6" height="45.6" rx="5"/>`
    : c.k === 'S' ? `<path d="M1.2 46.8V22A28.8 21 0 0 1 58.8 22v24.8z"/>`
    : `<circle cx="30" cy="24" r="22.6"/>`;
  return `<svg class="${cls}" viewBox="0 0 60 48" aria-hidden="true"><g fill="${fill}" stroke="#000" stroke-width="2">${shape}</g>`
    + `<g transform="translate(11.5 5.5) scale(.77)" ${ST}>${glyphOf(c)}</g></svg>`;
}

// A lord's round portrait: the sigil on its element's pattern.
function portrait(el, cls = 'por') {
  return `<svg class="${cls}" viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="27.5" fill="url(#p-${el})" stroke="#000" stroke-width="2.5"/>`
    + `<circle cx="30" cy="30" r="18" fill="${el === 'void' ? '#000' : '#fff'}" stroke="none"/>`
    + `<g transform="translate(12 12) scale(.75)" ${ST}>${SIGIL[el]}</g></svg>`;
}

// ---------- card faces ----------
const kindName = c => c.k === 'F' ? 'Familiar' : c.k === 'S' ? 'Spell' : 'Reagent';
function kwLine(c) { return (c.kw || []).map(k => E.KW[k][0]).join(', '); }
function rulesHtml(c) {
  const bits = [];
  if (c.k === 'F') { const kw = kwLine(c); if (kw) bits.push(`<b>${kw}</b>`); if (c.t) bits.push(c.t); }
  else if (c.k === 'R') bits.push(`<i>In a brew:</i> ${c.t}`);
  else bits.push(c.t);
  return bits.join(' ');
}
// Small card for the hand.
function cardHtml(id, cost) {
  const c = E.CARDS[id];
  const k = cost === undefined ? c.c : cost;
  return `<i class="cost${k < c.c ? ' less' : ''}">${k}</i>${artSvg(id)}<b class="nm">${c.n}</b>`
    + (c.k === 'F' ? `<b class="atk">${c.a}</b><b class="hp">${c.h}</b>` : `<span class="kd">${c.k === 'R' ? 'Reagent' : 'Spell'}</span>`);
}
// Big card with its words, for reveals, spoils and the satchel.
function bigCardHtml(id) {
  const c = E.CARDS[id];
  return `<div class="bigcard k-${c.k}"><i class="cost">${c.c}</i><b class="nm">${c.n}</b>${artSvg(id)}`
    + `<span class="ty">${kindName(c)} · ${E.ELS[c.el]}</span><p class="rules">${rulesHtml(c)}</p>`
    + (c.k === 'F' ? `<b class="atk">${c.a}</b><b class="hp">${c.h}</b>` : '') + `</div>`;
}

// Tiny ink marks for the board.
const ICON = {
  snow: `<svg viewBox="0 0 48 48" aria-hidden="true"><g ${ST} stroke-width="4">${SIGIL.ice}</g></svg>`,
  shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" fill="#fff" stroke="#000" stroke-width="2.2" stroke-linejoin="round"/></svg>',
};

// The trophy from the sister games: solid once won, drawn in outline until then.
const TROPHY = (won) => `<svg viewBox="0 0 40 44" aria-hidden="true"><g stroke="#000" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"><path d="M10 7H5c0 6 3 9 6.5 9.5M30 7h5c0 6-3 9-6.5 9.5" fill="none"/><path d="M10 4h20v9c0 7-4.5 11-10 11S10 20 10 13z" fill="${won ? '#000' : '#fff'}"/><path d="M17 24h6v6h-6z" fill="#fff"/><path d="M11 31h18v6H11z" fill="${won ? '#000' : '#fff'}"/></g></svg>`;
const CROWN = '<svg viewBox="0 0 24 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 12 2 3l5 4 5-6 5 6 5-4-1 9z"/></svg>';
const CAULDRON_SVG = '<svg class="pot" viewBox="0 0 120 40" preserveAspectRatio="none" aria-hidden="true"><path d="M4 6h112M10 6q-2 24 16 30h68q18-6 16-30" fill="#fff" stroke="#000" stroke-width="2.4" stroke-linejoin="round"/><path d="M30 36l-6 4M90 36l6 4" stroke="#000" stroke-width="2.4" stroke-linecap="round"/></svg>';
