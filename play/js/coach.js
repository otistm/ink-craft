/* =====================================================================
   The tutorial: a short practice duel against Wick's straw dummy, with Wick
   as coach. The hands and satchels are fixed so it always plays out the same
   and can always be won. Nothing is saved during it, so a gauntlet in
   progress is never touched. Finishing sets save.tutDone.
   ===================================================================== */
"use strict";
const TUT_FOE_HP = 12;
const isCard = (a, id, t) => a.k === 'play' && (G.p[0].hand.find(h => h.u === a.u) || {}).id === id && (!t || a.t === t);

/* Tutorial steps. when: the event that shows the step (none = right after the one before).
   until: the event that moves on ('next' = an explanation, closed with the x once it's been read).
   allow: which moves you can make while the step is up; everything else shakes the tip.
   target: what to point at. pos: where the tip sits (top, mid). */
const TUT = [
  { until: 'next', pos: 'mid', target: '#m1', text: 'Welcome to the Undercroft. I’m Wick, and I keep the ink down here. Let’s have a practice duel with my straw dummy. Knock its health to 0 to win.' },
  { until: 'next', pos: 'top', target: '#ink0', text: 'Every turn you get 1 more ink, up to 8. Cards cost ink: the number in their corner.' },
  { until: 'summon', pos: 'top', target: '#hand .card[data-id="imp"]', allow: a => isCard(a, 'imp'), text: 'Familiars fight for you. Tap Cinder imp, then tap Summon.' },
  { until: 'endTurn', pos: 'top', target: '#endBtn', allow: a => a.k === 'end', text: 'A new familiar needs a turn to wake up. Tap End turn.' },
  { when: 'myTurn', until: 'attack', pos: 'top', target: '#b0', allow: a => a.k === 'atk', text: 'Your imp is awake. It sits up with a little arrow under it. Tap it, then tap the dummy’s Sprout.' },
  { until: 'next', pos: 'top', target: '#m1', text: 'When the imp dies it singes the dummy for 1. Tap any card to read what it does.' },
  { until: 'stir', pos: 'top', target: '#hand .card[data-id="ember"]', allow: a => isCard(a, 'ember'), text: 'Now let’s brew. Tap Ember and add it to your cauldron.' },
  { until: 'stir', pos: 'top', target: '#hand .card[data-id="salt"]', allow: a => isCard(a, 'salt'), text: 'Reagents wait in the cauldron until you cast a spell. Add Salt too.' },
  { until: 'cast', pos: 'mid', target: '#hand .card[data-id="firebolt"]', allow: a => isCard(a, 'firebolt', 'm1'), text: 'Tap Firebolt, then tap the dummy. The spell pours your brew in: Ember adds 2, Salt adds 1.' },
  { until: 'next', pos: 'mid', target: '#m1', text: 'A 2-damage spell hit for 5. Ember scorched you for 1 as well. That’s Fire for you.' },
  { until: 'endTurn', pos: 'top', target: '#endBtn', allow: a => a.k === 'end', text: 'You’re out of ink. End your turn.' },
  { when: 'myTurn', until: 'next', pos: 'top', target: '#pow', text: 'This is your oath power. Every lord gives one, and you can use it once a turn. Ignis’s Spark costs 2 ink.' },
  { until: 'brewReady', pos: 'top', target: '#c0', allow: a => isCard(a, 'ember') || isCard(a, 'sulfur'), text: 'Recipes: the right three reagents make something extra happen. Ember, Ember and Sulfur make Wildfire. Put all three in.' },
  { until: 'cast', pos: 'mid', target: '#hand .card[data-id="firebolt"]', allow: a => isCard(a, 'firebolt', 'm1'), text: 'Wildfire is ready. A full cauldron also draws you a card. Cast Firebolt at the dummy to pour it.' },
];

function startTutorial() {
  run = null; closeSheet();
  const G0 = E.newGame({ seed: 7, first: 0, p: [
    { lord: 'ignis', name: 'You', hp: E.START_HP, deck: E.starterDeck('ignis') },
    { lord: 'orin', name: 'Straw dummy', hp: TUT_FOE_HP, deck: Array(10).fill('sprout') }] });
  const me = G0.p[0], dummy = G0.p[1], card = id => ({ u: G0.uid++, id });
  me.hand = ['imp', 'ember', 'salt', 'firebolt', 'sulfur', 'firebolt'].map(card);
  me.deck = ['brawler', 'drake', 'fireball', 'ember', 'ember'];       // drawn from the end: Ember, Ember, then Fireball
  dummy.hand = [card('sprout')];
  dummy.deck = ['sprout', 'sprout', 'sprout', 'sprout', 'sprout'];
  dummy.cauldron = [];
  G0.tut = { i: 0, on: false };
  G = G0; duelFound = [];
  enterDuel();
  log('Practice duel');
  setTimeout(() => showStep(), 500);
}
// The dummy plays its Sprouts and swings at you. It never casts or uses a power.
function tutEnemyMove() {
  const P = G.p[1], h = P.hand.find(x => E.canPlay(G, 1, x));
  if (h) return { k: 'play', u: h.u };
  const f = P.board.find(x => E.canAttack(G, 1, x));
  if (f) return { k: 'atk', u: f.u, t: E.attackTargets(G, 1)[0] };
  return { k: 'end' };
}
function tutAllows(a) {
  const st = TUT[G.tut.i];
  return !!(st && st.allow && st.allow(a));
}
// The duel reports what just happened; the tutorial moves on when it's what the step was waiting for.
function coach(ev) {
  if (!G || !G.tut) return;
  const T = G.tut, st = TUT[T.i]; if (!st) return;
  if (!T.on && st.when && [].concat(st.when).includes(ev)) return showStep();
  if ([].concat(st.until).includes(ev)) advance();
}
function coachAfter(a, kind) {
  if (a.k === 'play') {
    coach(kind === 'F' ? 'summon' : kind === 'R' ? 'stir' : 'cast');
    if (kind === 'R' && E.matchRecipe(G.p[0].cauldron)) coach('brewReady');
  } else if (a.k === 'atk') coach('attack');
  else if (a.k === 'end') coach('endTurn');
}
function advance() {
  const T = G.tut; hideCoach(); T.i++; T.on = false;
  const nx = TUT[T.i];
  if (nx && !nx.when) setTimeout(() => { if (G && G.tut === T && !T.on && TUT[T.i] === nx) showStep(); }, 350);
}
function showStep() {
  const T = G.tut, st = TUT[T.i]; if (!st) return;
  T.on = true;
  bubble(st.text, { pos: st.pos, label: `Tip ${T.i + 1} of ${TUT.length}`, explain: st.until === 'next' });
  markCoach();
}
// Point at the step's target. Called after every render, since rendering rebuilds the table.
function markCoach() {
  document.querySelectorAll('.coach-hi').forEach(e => e.classList.remove('coach-hi'));
  if (!G || !G.tut || !G.tut.on) return;
  const st = TUT[G.tut.i], el = st && st.target && document.querySelector(st.target);
  if (el) el.classList.add('coach-hi');
}
// A blocked move: shake the tip (and bring it back if it was tucked away).
function tutNope() {
  const c = $('coach');
  if (c && c.classList.contains('on')) nope(c);
  else if (G.tut.on) showStep();
}

/* ---------- Wick's tip bubble ----------
   A ring fills while you read, then turns into an x. On an explanation the x moves on;
   on a step that wants you to do something it just tucks the tip away.
   The bubble lets taps through; only its own buttons take taps. */
const readMs = text => Math.max(2500, Math.min(7000, 1500 + text.split(/\s+/).length * 180));
const WICK = `<svg class="wick" viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="27.5" fill="url(#p-neutral)" stroke="#000" stroke-width="2.5"/><circle cx="30" cy="31" r="19" fill="#fff"/><g transform="translate(12 11) scale(.75)" ${ST}>${CREATURE.robed}</g></svg>`;
function bubble(text, o = {}) {
  const c = $('coach'), dur = RM ? 800 : readMs(text);
  clearTimeout(c._t);
  c.className = 'coach on ' + (o.pos || 'top');
  c.innerHTML = `${WICK}<div class="cb">${o.label ? `<small>${o.label}</small>` : ''}<p>${text}</p><button class="linkbtn" type="button" id="skipTut">Skip tutorial</button></div>`
    + `<span class="ring" style="--dur:${dur}ms" aria-hidden="true"><svg viewBox="0 0 28 28"><circle class="track" cx="14" cy="14" r="11"/><circle class="prog" cx="14" cy="14" r="11" pathLength="100"/></svg></span>`;
  $('skipTut').onclick = () => finishTutorial(false);
  anim(c, [{ transform: 'translateY(-14px) scale(.92,1.08)', opacity: 0 }, { transform: 'translateY(2px) scale(1.02,.98)', opacity: 1, offset: .6 }, { transform: 'none', opacity: 1 }], 380, 'ease-out');
  c._t = setTimeout(() => {
    const ring = c.querySelector('.ring'); if (!ring) return;
    const x = document.createElement('button');
    x.type = 'button'; x.className = 'cx'; x.setAttribute('aria-label', o.explain ? 'Next tip' : 'Hide tip');
    x.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15"/></svg>';
    x.onclick = () => { if (o.explain) advance(); else hideCoach(); };
    ring.replaceWith(x); squash(x);
  }, dur);
}
function hideCoach() { const c = $('coach'); clearTimeout(c._t); c.classList.remove('on'); c.innerHTML = ''; document.querySelectorAll('.coach-hi').forEach(e => e.classList.remove('coach-hi')); }

function finishTutorial(won) {
  hideCoach();
  save.tutDone = true;
  ['duel', 'reagent'].forEach(k => save.tips[k] = 1);
  writeSave();
  G = null; busy = false;
  if (!won) { renderTitle(); return; }
  sheet(`${WICK.replace('class="wick"', 'class="wick big"')}<h2>Well brewed</h2>
    <p>That’s the whole trick: stir reagents in, then pour them into a spell. Wildfire is in your Grimoire now.</p>
    <div class="how"><p><b>Next, swear an oath.</b> Each of the seven lords has their own element, cards, power and recipes. Your oath binds you to them for a whole gauntlet.</p>
    <p><b>The Undercroft</b> is 5 pits of rival mages, then a champion. Win them all for your lord’s trophy.</p></div>
    <button class="btn" id="tutDone">Choose your lord</button>`, false);
  $('tutDone').onclick = () => { closeSheet(); renderTitle(); };
}
