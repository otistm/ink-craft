/* =====================================================================
   Shared state and helpers: the gauntlet in progress, the save, animation
   helpers, floating numbers, screens, overlay cards and one-time tips.
   ===================================================================== */
"use strict";
const $ = id => document.getElementById(id);
const RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
let run = null, G = null, busy = false;

// ---------- save ----------
// Saved progress. Never rename this key or remove a field, or players lose their trophies and recipes.
// { trophies: [7 bools, one per lord in LORDS order], recipes: { id: true }, tips: {} }
const SAVE_KEY = 'inkcraft-save';
function loadSave() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch (e) { return {}; } }
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
const save = loadSave();
save.trophies = save.trophies || [];
while (save.trophies.length < E.LORDS.length) save.trophies.push(false);
save.recipes = save.recipes || {};
save.tips = save.tips || {};

const sleep = ms => new Promise(r => setTimeout(r, RM ? Math.min(ms, 60) : ms));
function anim(el, frames, dur, ease = 'cubic-bezier(.3,1.5,.5,1)') {
  if (!el || !el.animate) return Promise.resolve();
  const a = el.animate(frames, { duration: RM ? 1 : dur, easing: ease });
  return a.finished.catch(() => {});
}
// Squash, stretch, settle: the bump every Ink game uses.
const squash = el => anim(el, [
  { transform: 'scale(1)' }, { transform: 'scale(1.3,.78)', offset: .3 }, { transform: 'scale(.9,1.14)', offset: .55 }, { transform: 'scale(1.04,.97)', offset: .78 }, { transform: 'scale(1)' }], 400, 'ease-out');
const nope = el => anim(el, [{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }], 260, 'linear');

// A number or word that floats up from something on the board.
// kind: '' plain (damage), 'solid' (black pill), 'ghost' (outlined pill)
function floatAt(el, text, kind = '') {
  if (!el) return;
  const r = el.getBoundingClientRect(), f = document.createElement('div');
  f.className = 'float' + (kind ? ' ' + kind : '');
  f.textContent = text;
  f.style.left = (r.left + r.width / 2) + 'px'; f.style.top = (r.top + r.height * .35) + 'px';
  document.body.appendChild(f);
  anim(f, [
    { transform: 'translate(-50%,6px) scale(.6)', opacity: 0 },
    { transform: 'translate(-50%,-14px) scale(1.15)', opacity: 1, offset: .3 },
    { transform: 'translate(-50%,-24px) scale(1)', opacity: 1, offset: .75 },
    { transform: 'translate(-50%,-34px) scale(1)', opacity: 0 }], 950, 'ease-out').then(() => f.remove());
}
function show(id) { document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id)); }
function sheet(html, dismissable = true) {
  const p = $('sheet');
  p.innerHTML = html;
  $('veil').classList.add('on');
  p.style.animation = 'none'; void p.offsetHeight; p.style.animation = '';
  $('veil').onclick = e => { if (dismissable && e.target === $('veil')) closeSheet(); };
}
const closeSheet = () => $('veil').classList.remove('on');

// A short tip shown once ever, the first time something happens.
function tipOnce(key, html) {
  if (save.tips[key] || (G && G.tut)) return;
  save.tips[key] = 1; writeSave();
  const t = $('tip');
  t.innerHTML = `${html}<button class="linkbtn" type="button">Got it</button>`;
  t.classList.add('on');
  t.querySelector('button').onclick = () => t.classList.remove('on');
  anim(t, [{ transform: 'translateY(20px) scale(.9,1.1)', opacity: 0 }, { transform: 'translateY(-3px) scale(1.02,.98)', opacity: 1, offset: .6 }, { transform: 'none', opacity: 1 }], 450, 'ease-out');
}
const hideTip = () => $('tip').classList.remove('on');

const lordOf = P => E.LORD[P.lord];
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
