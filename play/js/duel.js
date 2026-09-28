/* =====================================================================
   The duel screen: both mages, their boards and cauldrons, your hand,
   picking and targeting, the info strip, animations for everything the
   rules report, and the rival mage taking their turn.
   ===================================================================== */
"use strict";
let pick = null;                 // { t: 'card'|'fam'|'power'|'look', u, r }
let seenHand = new Set(), seenFam = new Set(), duelFound = [];

// ---------- sizing ----------
function sizeDuel() {
  const avail = Math.min(innerWidth, 480) - 32;
  const n = Math.max(6, G ? G.p[0].hand.length : 6);
  const cw = Math.min(76, Math.floor(avail / 5.1));
  const overlap = Math.max(0, (n * cw - avail + 24) / (2 * n) + 1);
  const fw = Math.min(86, Math.floor((avail - 3 * 8) / 4));
  const s = document.documentElement.style;
  s.setProperty('--cw', cw + 'px'); s.setProperty('--overlap', overlap + 'px'); s.setProperty('--fw', fw + 'px');
}
addEventListener('resize', () => { if (G) { sizeDuel(); renderDuel(); } });

// ---------- rendering ----------
const elOf = r => r ? document.getElementById(r) : null;
function renderDuel() {
  if (!G) return;
  sizeDuel();
  [0, 1].forEach(s => { renderMage(s); renderBoard(s); renderCauldron(s); renderInk(s); });
  renderHand(); renderPower(); renderEnd(); renderMid(); markTargets(); renderInfo();
}
function renderMage(s) {
  const P = G.p[s], L = lordOf(P), el = elOf('m' + s);
  const tag = s === 1 ? `${P.champ ? 'Champion · ' : ''}Sworn to ${L.name}` : `Sworn to ${L.name}`;
  const counts = s === 1 ? ` · ${plural(P.hand.length, 'card')}` : '';
  el.innerHTML = `${portrait(L.el)}<div class="who"><b>${P.name}</b><small>${tag}${counts} · ${P.deck.length} in satchel</small></div>`
    + `<div class="life">${P.blight ? `<span class="blt" title="Blight">${P.blight}</span>` : ''}${P.armor ? `<span class="arm">${ICON.shield}<b>${P.armor}</b></span>` : ''}`
    + `<b class="hpn${P.hp < P.maxHp ? ' hurt' : ''}">${Math.max(0, P.hp)}</b></div>`;
}
function famHtml(f, s) {
  const c = E.CARDS[f.id];
  const ready = s === 0 && E.canAttack(G, 0, f);
  const cls = ['fam', f.guard && 'guard', f.ward && 'ward', f.fz && 'fz', ready && 'ready', s === 0 && G.cur === 0 && !ready && (f.sleep ? 'sleep' : f.att ? 'done' : ''),
    !seenFam.has(f.u) && 'new', pick && pick.t === 'fam' && pick.u === f.u && 'sel'].filter(Boolean).join(' ');
  return `<button type="button" class="${cls}" id="f${f.u}" data-r="f${f.u}" aria-label="${c.n}, ${f.atk} attack, ${f.hp} health">`
    + `${artSvg(f.id, 'fa')}<b class="atk${f.atk > c.a ? ' up' : ''}">${f.atk}</b><b class="hp${f.hp < f.maxHp ? ' hurt' : f.maxHp > c.h ? ' up' : ''}">${f.hp}</b>`
    + (f.blight ? `<i class="bl">${f.blight}</i>` : '') + (f.fz ? `<i class="ice">${ICON.snow}</i>` : '')
    + ((f.sleep && s === 0 && G.cur === 0) ? '<i class="zz">z</i>' : '') + `</button>`;
}
function renderBoard(s) {
  const P = G.p[s], b = $('b' + s);
  let h = P.board.filter(f => f.hp > 0).map(f => famHtml(f, s)).join('');
  for (let i = E.aliveF(P).length; i < E.MAX_BOARD; i++) h += '<i class="slot"></i>';
  b.innerHTML = h;
  P.board.forEach(f => seenFam.add(f.u));
}
function renderCauldron(s) {
  const P = G.p[s], el = $('c' + s), rec = E.matchRecipe(P.cauldron);
  let slots = '';
  for (let i = 0; i < E.CAULDRON; i++) slots += P.cauldron[i] ? `<i class="rg full">${reagentSvg(P.cauldron[i])}</i>` : '<i class="rg"></i>';
  let line = '';
  if (s === 0) {
    const known = id => save.recipes[id] || P.lord === 'lumi';
    if (rec) line = known(rec.id) ? `<b>${rec.n}</b> is ready` : 'Something is brewing…';
    else if (P.cauldron.length) {
      const h = E.recipeHints(P.cauldron, P.lord).filter(x => known(x.r.id))[0];
      line = h ? `${h.r.n} needs ${h.missing.map(id => E.CARDS[id].n).join(' + ')}` : 'Pours into your next spell';
    } else line = 'Your cauldron';
  }
  el.className = 'caul' + (rec ? ' ready' : '') + (s === 1 ? ' small' : '');
  el.innerHTML = `<span class="slots">${slots}</span>${s === 0 ? `<small class="ch">${line}</small>` : ''}`;
}
function renderInk(s) {
  const P = G.p[s], el = $('ink' + s);
  let pips = '';
  const tot = Math.max(P.maxInk, P.ink);
  for (let i = 0; i < tot; i++) pips += `<i class="${i < P.ink ? 'on' : ''}"></i>`;
  el.innerHTML = `<span class="pips">${pips}</span><b>${P.ink}<small>/${P.maxInk}</small></b><span class="lb">ink</span>`;
}
function renderHand() {
  const P = G.p[0], hand = $('hand'), n = P.hand.length;
  hand.innerHTML = '';
  P.hand.forEach((h, i) => {
    const c = E.CARDS[h.id], b = document.createElement('button');
    const ok = E.canPlay(G, 0, h) && !busy;
    b.type = 'button';
    b.className = `card k-${c.k}${ok ? ' ok' : ''}${pick && pick.t === 'card' && pick.u === h.u ? ' pick' : ''}`;
    b.dataset.u = h.u;
    b.setAttribute('aria-label', `${c.n}, ${E.costOf(G, 0, c)} ink`);
    b.innerHTML = cardHtml(h.id, E.costOf(G, 0, c));
    const mid = (n - 1) / 2, off = i - mid;
    b.style.setProperty('--rot', (off * Math.min(4, 16 / n)) + 'deg');
    b.style.setProperty('--dy', (Math.abs(off) * Math.abs(off) * 1.3) + 'px');
    if (!seenHand.has(h.u)) { b.classList.add('drawn'); b.style.animationDelay = (seenHand.size ? 0 : i * .06) + 's'; }
    hand.appendChild(b);
  });
  P.hand.forEach(h => seenHand.add(h.u));
}
function renderPower() {
  const P = G.p[0], L = lordOf(P), b = $('pow'), ok = E.canPower(G, 0) && !busy;
  b.className = 'pow' + (ok ? ' ok' : '') + (P.power ? ' used' : '') + (pick && pick.t === 'power' ? ' pick' : '');
  b.innerHTML = `${portrait(L.el, 'pp')}<b>${L.power.name}</b><i class="cost">${L.power.cost}</i>`;
  b.setAttribute('aria-label', `Oath power: ${L.power.name}, ${L.power.cost} ink. ${L.power.text}`);
}
function anyMove() {
  if (G.cur !== 0 || G.over) return false;
  const P = G.p[0];
  return P.hand.some(h => E.canPlay(G, 0, h)) || E.canPower(G, 0) || P.board.some(f => E.canAttack(G, 0, f));
}
function renderEnd() {
  const b = $('endBtn'), mine = G.cur === 0 && !G.over;
  b.disabled = !mine || busy;
  b.innerHTML = mine ? 'End turn' : 'Their turn';
  b.classList.toggle('glow', mine && !busy && !anyMove());
}
function renderMid() {
  const t = $('turnTag'), mine = G.cur === 0;
  t.className = 'turn' + (mine ? ' mine' : '');
  t.textContent = mine ? 'Your turn' : `${G.p[1].name.split(' ')[0] === 'The' ? G.p[1].name : G.p[1].name.split(' ')[0]}’s turn`;
}
function targetsFor(p) {
  if (!p || G.cur !== 0) return [];
  if (p.t === 'card') { const h = G.p[0].hand.find(x => x.u === p.u), c = h && E.CARDS[h.id]; return c && c.k === 'S' && c.tgt && E.canPlay(G, 0, h) ? E.validTargets(G, 0, c.tgt) : []; }
  if (p.t === 'power') { const pw = lordOf(G.p[0]).power; return pw.tgt && E.canPower(G, 0) ? E.validTargets(G, 0, pw.tgt) : []; }
  if (p.t === 'fam') return E.attackTargets(G, 0);
  return [];
}
function markTargets() {
  document.querySelectorAll('.tgt').forEach(e => e.classList.remove('tgt'));
  targetsFor(pick).forEach(r => { const e = elOf(r); if (e) e.classList.add('tgt'); });
  $('duel').classList.toggle('aiming', targetsFor(pick).length > 0);
}

// ---------- the info strip ----------
function kwExplain(list) { return list.map(k => `<li><b>${E.KW[k][0]}.</b> ${E.KW[k][1]}</li>`).join(''); }
function brewLines(brew) {
  if (!brew.length) return '';
  const P = G.p[0];
  let amp = 0, echo = 0, chain = 0;
  brew.forEach(id => { const r = E.CARDS[id]; amp += r.amp || 0; if (r.stat) amp += P.spells; echo += r.echo || 0; chain += r.chain || 0; });
  const out = [`Pours <b>${brew.map(id => E.CARDS[id].n).join(', ')}</b> into it.`];
  if (amp) out.push(`+${amp} to its numbers.`);
  if (echo) out.push(`It happens ${echo + 1} times.`);
  if (chain) out.push(`Its damage jumps ${chain === 1 ? 'once' : chain + ' times'}.`);
  const rec = E.matchRecipe(brew);
  if (rec) out.push(save.recipes[rec.id] || P.lord === 'lumi' ? `Makes <b>${rec.n}</b>: ${rec.t}` : 'This brew makes a recipe you haven’t found yet.');
  if (brew.length === E.CAULDRON) out.push('A full brew draws you a card.');
  return `<p class="brew">${out.join(' ')}</p>`;
}
function infoHtml() {
  if (!pick) return '';
  const P = G.p[0];
  if (pick.t === 'card') {
    const h = P.hand.find(x => x.u === pick.u); if (!h) return '';
    const c = E.CARDS[h.id], why = E.whyNot(G, 0, h);
    let x = `<div class="ih"><b>${c.n}</b><span>${kindName(c)} · ${E.ELS[c.el]} · ${E.costOf(G, 0, c)} ink</span></div>`;
    if (c.k === 'F') x += `<p class="it">${c.a} attack, ${c.h} health.${c.t ? ' ' + c.t : ''}</p>${c.kw ? `<ul class="kw">${kwExplain(c.kw)}</ul>` : ''}`;
    else if (c.k === 'R') x += `<p class="it"><i>In a brew:</i> ${c.t}</p><p class="brew">It waits in your cauldron. Your next spell pours in everything there.</p>`;
    else x += `<p class="it">${c.t}</p>${brewLines(P.cauldron)}`;
    const label = c.k === 'F' ? 'Summon' : c.k === 'R' ? 'Add to cauldron' : P.cauldron.length ? 'Cast and pour' : 'Cast';
    x += why ? `<p class="why">${why}.</p>` : (c.k === 'S' && c.tgt) ? `<p class="why aim">Tap a target.</p>` : `<button class="btn" type="button" id="goBtn">${label}</button>`;
    return x;
  }
  if (pick.t === 'power') {
    const L = lordOf(P), pw = L.power;
    let x = `<div class="ih"><b>${pw.name}</b><span>Oath power · ${pw.cost} ink · once a turn</span></div><p class="it">${pw.text}</p>`;
    const why = G.cur !== 0 ? 'Not your turn' : P.power ? 'Already used this turn' : P.ink < pw.cost ? 'Not enough ink' : !E.canPower(G, 0) ? (pw.tgt ? 'Nothing to target' : 'Your cauldron is full') : '';
    x += why ? `<p class="why">${why}.</p>` : pw.tgt ? `<p class="why aim">Tap a target.</p>` : `<button class="btn" type="button" id="goBtn">Use ${pw.name}</button>`;
    return x;
  }
  if (pick.t === 'fam' || (pick.t === 'look' && pick.r[0] === 'f')) {
    const t = E.getRef(G, pick.t === 'fam' ? 'f' + pick.u : pick.r); if (!t) return '';
    const f = t.o, c = E.CARDS[f.id], kws = Object.keys(E.KW).filter(k => f[k]);
    let x = `<div class="ih"><b>${c.n}</b><span>${t.s === 0 ? 'Your familiar' : 'Their familiar'} · ${E.ELS[c.el]}</span></div>`;
    x += `<p class="it">${f.atk} attack, ${f.hp} of ${f.maxHp} health.${c.t ? ' ' + c.t : ''}</p>`;
    const st = [];
    if (f.fz) st.push('<li><b>Frozen.</b> Misses its next attack.</li>');
    if (f.blight) st.push(`<li><b>Blight ${f.blight}.</b> Takes ${f.blight} damage at the start of its turn, then the blight halves.</li>`);
    if (t.s === 0 && G.cur === 0 && f.sleep) st.push('<li><b>Just arrived.</b> It can attack next turn.</li>');
    if (t.s === 0 && G.cur === 0 && f.att) st.push('<li><b>Attacked.</b> It can attack again next turn.</li>');
    if (kws.length || st.length) x += `<ul class="kw">${kwExplain(kws)}${st.join('')}</ul>`;
    if (pick.t === 'fam') x += `<p class="why aim">Tap an enemy to attack.</p>`;
    return x;
  }
  if (pick.t === 'look' && pick.r[0] === 'm') {
    const s = +pick.r[1], Q = G.p[s], L = lordOf(Q), ch = Q.champ && E.CHAMP[Q.champ];
    let x = `<div class="ih"><b>${Q.name}</b><span>Sworn to ${L.name}, ${L.title}</span></div>`;
    x += `<p class="it">${Math.max(0, Q.hp)} of ${Q.maxHp} health${Q.armor ? `, ${Q.armor} armor` : ''}.${s === 1 ? ` ${plural(Q.hand.length, 'card')} in hand.` : ''}</p><ul class="kw">`;
    x += `<li><b>${L.power.name}</b> (${L.power.cost} ink): ${L.power.text}</li>`;
    if (ch) x += `<li><b>Champion.</b> ${ch.rule}</li>`;
    if (Q.armor) x += '<li><b>Armor.</b> Soaks up damage before health does. Blight goes straight through.</li>';
    if (Q.blight) x += `<li><b>Blight ${Q.blight}.</b> Takes ${Q.blight} damage at the start of the turn, then the blight halves.</li>`;
    return x + '</ul>';
  }
  if (pick.t === 'look' && pick.r[0] === 'c') {
    const s = +pick.r[1], Q = G.p[s];
    let x = `<div class="ih"><b>${s === 0 ? 'Your cauldron' : 'Their cauldron'}</b><span>${Q.cauldron.length} of ${E.CAULDRON} reagents</span></div>`;
    if (!Q.cauldron.length) return x + `<p class="it">Empty. Reagents wait here until ${s === 0 ? 'you cast' : 'they cast'} a spell, then it pours them all in.</p>`;
    x += `<ul class="kw">${Q.cauldron.map(id => `<li><b>${E.CARDS[id].n}.</b> ${E.CARDS[id].t}</li>`).join('')}</ul>`;
    if (s === 0) {
      const known = id => save.recipes[id] || Q.lord === 'lumi';
      const hints = E.recipeHints(Q.cauldron, Q.lord).filter(h => known(h.r.id));
      if (hints.length) x += `<p class="brew">${hints.slice(0, 3).map(h => `<b>${h.r.n}</b> needs ${h.missing.map(id => E.CARDS[id].n).join(' + ')}.`).join(' ')}</p>`;
      const rec = E.matchRecipe(Q.cauldron);
      if (rec) x += `<p class="brew">${known(rec.id) ? `<b>${rec.n}</b> is ready: ${rec.t}` : 'This brew makes a recipe you haven’t found yet.'} Cast any spell to pour it.</p>`;
    }
    return x;
  }
  return '';
}
function renderInfo() {
  const box = $('info'), h = infoHtml();
  box.classList.toggle('on', !!h);
  box.innerHTML = h ? `<button class="x" type="button" aria-label="Close">×</button>${h}` : '';
  if (!h) return;
  box.querySelector('.x').onclick = () => { pick = null; renderDuel(); };
  const go = $('goBtn');
  if (go) go.onclick = () => {
    if (pick.t === 'card') doAction({ k: 'play', u: pick.u });
    else if (pick.t === 'power') doAction({ k: 'pow' });
  };
}

// ---------- tapping ----------
function onDuelTap(e) {
  if (!G || busy || G.over) return;
  if (e.target.closest('#info') || e.target.closest('#pause')) return;
  const card = e.target.closest('.card'), ref = e.target.closest('[data-r]');
  if (card && card.closest('#hand')) {
    const u = +card.dataset.u, h = G.p[0].hand.find(x => x.u === u), c = E.CARDS[h.id];
    hideTip();
    if (pick && pick.t === 'card' && pick.u === u) {
      if (E.canPlay(G, 0, h) && !(c.k === 'S' && c.tgt)) return doAction({ k: 'play', u });
      if (!E.canPlay(G, 0, h)) nope(card);
      return;
    }
    pick = { t: 'card', u }; renderDuel();
    if (c.k === 'R') tipOnce('reagent', '<b>Reagents wait in your cauldron.</b> Your next spell pours in all of them at once and gets their effects. The right three together make a recipe.');
    return;
  }
  if (ref) {
    const r = ref.dataset.r;
    const tg = targetsFor(pick);
    if (tg.includes(r)) {
      if (pick.t === 'card') return doAction({ k: 'play', u: pick.u, t: r });
      if (pick.t === 'power') return doAction({ k: 'pow', t: r });
      if (pick.t === 'fam') return doAction({ k: 'atk', u: pick.u, t: r });
    }
    if (r[0] === 'f') {
      const x = E.famOf(G, +r.slice(1));
      if (x && x.s === 0 && E.canAttack(G, 0, x.f)) {
        if (pick && pick.t === 'fam' && pick.u === x.f.u) { pick = null; renderDuel(); return; }
        pick = { t: 'fam', u: x.f.u }; renderDuel();
        const g = E.aliveF(G.p[1]).some(f => f.guard);
        if (g) tipOnce('guard', '<b>A familiar with Guard stands in the way.</b> Enemies must attack it before anything else. Spells can still hit whatever you like.');
        return;
      }
    }
    if (pick && tg.length && !tg.includes(r)) { nope(ref); }
    pick = { t: 'look', r }; renderDuel(); return;
  }
  if (e.target.closest('#pow')) {
    if (pick && pick.t === 'power') { const pw = lordOf(G.p[0]).power; if (!pw.tgt && E.canPower(G, 0)) return doAction({ k: 'pow' }); }
    pick = { t: 'power' }; renderDuel(); return;
  }
  const cl = e.target.closest('.caul');
  if (cl) { pick = { t: 'look', r: cl.id }; renderDuel(); return; }
  if (pick) { pick = null; renderDuel(); }
}

// ---------- doing things ----------
async function doAction(a) {
  if (busy || !G || G.over) return;
  busy = true; pick = null;
  G.ev = [];
  const cardEl = a.k === 'play' ? document.querySelector(`#hand .card[data-u="${a.u}"]`) : null;
  const h = a.k === 'play' ? G.p[0].hand.find(x => x.u === a.u) : null;
  if (!E.apply(G, 0, a)) { busy = false; renderDuel(); return; }
  if (cardEl) await flyOut(cardEl, h && E.CARDS[h.id].k === 'R');
  if (a.k === 'pow') squash($('pow'));
  await playEvents(G.ev); G.ev = [];
  busy = false;
  renderDuel();
  if (G.over) return finishDuel();
  saveRun('duel');
  if (G.cur === 1) enemyTurn();
}
async function flyOut(el, toCauldron) {
  const r = el.getBoundingClientRect(), t = (toCauldron ? $('c0') : $('mid')).getBoundingClientRect();
  const dx = t.left + t.width / 2 - (r.left + r.width / 2), dy = t.top + t.height / 2 - (r.top + r.height / 2);
  el.style.zIndex = 20;
  await anim(el, [
    { transform: getComputedStyle(el).transform === 'none' ? 'none' : getComputedStyle(el).transform, opacity: 1 },
    { transform: `translate(${dx * .5}px,${dy * .5 - 30}px) scale(1.15,.9)`, opacity: 1, offset: .5 },
    { transform: `translate(${dx}px,${dy}px) scale(${toCauldron ? .3 : .8})`, opacity: 0 }], 380, 'cubic-bezier(.4,0,.6,1)');
  el.style.visibility = 'hidden';
}
async function enemyTurn() {
  busy = true; renderDuel();
  await sleep(550);
  for (let guard = 0; guard < 60 && G && G.cur === 1 && !G.over; guard++) {
    const a = guard === 59 ? { k: 'end' } : E.aiChoose(G, 1);
    G.ev = [];
    E.apply(G, 1, a);
    await playEvents(G.ev); G.ev = [];
    renderDuel();
    if (a.k !== 'end') await sleep(420);
  }
  busy = false;
  if (!G) return;
  renderDuel();
  if (G.over) return finishDuel();
  saveRun('duel');
}

// ---------- animations for what the rules report ----------
function log(t) { const l = $('log'); l.textContent = t; anim(l, [{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], 250, 'ease-out'); }
const who = s => s === 0 ? 'You' : G.p[1].name;
async function lunge(from, to) {
  const a = elOf(from), b = elOf(to); if (!a || !b) return;
  const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
  const dx = (rb.left + rb.width / 2) - (ra.left + ra.width / 2), dy = (rb.top + rb.height / 2) - (ra.top + ra.height / 2);
  a.style.zIndex = 10;
  await anim(a, [{ transform: 'none' }, { transform: `translate(${-dx * .06}px,${-dy * .06}px) scale(.94,1.06)`, offset: .25 },
    { transform: `translate(${dx * .78}px,${dy * .78}px) scale(1.08,.92)`, offset: .6 }, { transform: 'none' }], 480, 'cubic-bezier(.5,0,.5,1)');
  a.style.zIndex = '';
}
function shake(el) { if (el) anim(el, [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px) rotate(-2deg)' }, { transform: 'translateX(5px) rotate(1.5deg)' }, { transform: 'translateX(-2px)' }, { transform: 'none' }], 300, 'ease-out'); }
function splat(el) {
  if (!el) return;
  const r = el.getBoundingClientRect(), s = document.createElement('div');
  s.className = 'splat';
  s.style.left = (r.left + r.width / 2) + 'px'; s.style.top = (r.top + r.height / 2) + 'px';
  s.innerHTML = `<svg viewBox="0 0 40 40">${blobPath(Math.random() * 999 | 0)}</svg>`;
  document.body.appendChild(s);
  anim(s, [{ transform: 'translate(-50%,-50%) scale(.2)', opacity: .9 }, { transform: 'translate(-50%,-50%) scale(1.2)', opacity: .8, offset: .3 }, { transform: 'translate(-50%,-50%) scale(1.3)', opacity: 0 }], 800, 'ease-out').then(() => s.remove());
}
function blobPath(seed) {
  const rnd = E.mulberry(seed * 9973 + 17), n = 11, pts = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, rr = 12 * (0.72 + rnd() * 0.5); pts.push([20 + Math.cos(a) * rr, 20 + Math.sin(a) * rr]); }
  let d = `M${((pts[0][0] + pts[n - 1][0]) / 2).toFixed(1)},${((pts[0][1] + pts[n - 1][1]) / 2).toFixed(1)}`;
  for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; d += ` Q${p[0].toFixed(1)},${p[1].toFixed(1)} ${((p[0] + q[0]) / 2).toFixed(1)},${((p[1] + q[1]) / 2).toFixed(1)}`; }
  let drops = '';
  for (let i = 0; i < 4; i++) { const a = rnd() * Math.PI * 2, dist = 12 * (1.25 + rnd() * 0.5); drops += `<circle cx="${(20 + Math.cos(a) * dist).toFixed(1)}" cy="${(20 + Math.sin(a) * dist).toFixed(1)}" r="${(1 + rnd() * 1.6).toFixed(1)}"/>`; }
  return `<path d="${d}Z"/>${drops}`;
}
// A big card in the middle of the pit, so you can read what the rival just did.
async function reveal(html, ms = 1100) {
  const r = $('reveal');
  r.innerHTML = html; r.classList.add('on');
  await anim(r.firstElementChild, [{ transform: 'translateY(-40px) scale(.7,1.2)', opacity: 0 }, { transform: 'translateY(4px) scale(1.05,.95)', opacity: 1, offset: .6 }, { transform: 'none', opacity: 1 }], 420, 'ease-out');
  await sleep(ms);
  await anim(r.firstElementChild, [{ opacity: 1 }, { opacity: 0, transform: 'scale(.9)' }], 200, 'ease-in');
  r.classList.remove('on'); r.innerHTML = '';
}
async function banner(text, sub = '') {
  const b = $('banner');
  b.innerHTML = `<b>${text}</b>${sub ? `<small>${sub}</small>` : ''}`; b.classList.add('on');
  await anim(b, [{ transform: 'translate(-50%,-50%) scale(.6,1.3)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.12,.9)', opacity: 1, offset: .45 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }], 420, 'ease-out');
  await sleep(sub ? 1300 : 550);
  await anim(b, [{ opacity: 1, transform: 'translate(-50%,-50%)' }, { opacity: 0, transform: 'translate(-50%,-60%)' }], 220, 'ease-in');
  b.classList.remove('on');
}
async function pourFx(s, brew) {
  const slots = [...$('c' + s).querySelectorAll('.rg.full')];
  for (const [i, el] of slots.entries()) {
    anim(el, [{ transform: 'none', opacity: 1 }, { transform: 'translateY(-14px) scale(1.25,.8)', opacity: 1, offset: .4 }, { transform: 'translateY(6px) scale(.4)', opacity: 0 }], 420, 'ease-in')
      .then(() => { el.style.opacity = 0; });
    await sleep(90);
  }
  squash($('c' + s));
  await sleep(260);
}

async function playEvents(evs) {
  for (const e of evs) {
    const el = elOf(e.r);
    switch (e.t) {
      case 'play': {
        const c = E.CARDS[e.id];
        if (e.s === 1) { log(`${who(1)} ${c.k === 'F' ? 'summoned' : c.k === 'R' ? 'stirred in' : 'cast'} ${c.n}`); await reveal(bigCardHtml(e.id), c.k === 'R' ? 700 : 1000); }
        else log(`You ${c.k === 'F' ? 'summoned' : c.k === 'R' ? 'stirred in' : 'cast'} ${c.n}`);
        if (e.target && elOf(e.target)) { elOf(e.target).classList.add('hit'); setTimeout(() => { const t = elOf(e.target); if (t) t.classList.remove('hit'); }, 500); }
        break;
      }
      case 'power': {
        const pw = lordOf(G.p[e.s]).power;
        log(`${who(e.s)} used ${pw.name}`);
        if (e.s === 1) await reveal(`<div class="bigcard power">${portrait(lordOf(G.p[1]).el, 'art')}<b class="nm">${pw.name}</b><span class="ty">Oath power · ${lordOf(G.p[1]).name}</span><p class="rules">${pw.text}</p></div>`, 700);
        break;
      }
      case 'attack': await lunge(e.from, e.r); break;
      case 'dmg': if (el) { floatAt(el, '−' + e.n); shake(el); } await sleep(140); break;
      case 'rot': if (el) { floatAt(el, `−${e.n} blight`, 'ghost'); shake(el); } await sleep(260); break;
      case 'heal': if (el) floatAt(el, '+' + e.n, 'ghost'); await sleep(140); break;
      case 'armor': if (el) floatAt(el, `+${e.n} armor`, 'ghost'); await sleep(160); break;
      case 'blight': if (el) floatAt(el, `+${e.n} blight`, 'solid'); await sleep(160); break;
      case 'freeze': if (el) { floatAt(el, 'Frozen', 'ghost'); el.classList.add('fz'); } await sleep(160); break;
      case 'ward': if (el) { floatAt(el, 'Ward broke', 'ghost'); el.classList.remove('ward'); } await sleep(160); break;
      case 'buff': if (el) floatAt(el, `+${e.a}/+${e.h}`, 'solid'); await sleep(140); break;
      case 'destroy': if (el) floatAt(el, 'Destroyed', 'solid'); await sleep(160); break;
      case 'transform': if (el) { floatAt(el, 'Transmuted', 'solid'); squash(el); } await sleep(300); break;
      case 'die': if (el) { el.classList.add('dying'); splat(el); anim(el, [{ transform: 'none', opacity: 1 }, { transform: 'scale(1.2,.7)', opacity: .8, offset: .35 }, { transform: 'scale(.2,1.3) translateY(10px)', opacity: 0 }], 420, 'ease-in').then(() => { el.style.opacity = 0; }); } await sleep(260); break;
      case 'pour': await pourFx(e.s, e.brew); break;
      case 'recipe': {
        const r = E.RECIPE[e.id], fresh = e.s === 0 && !save.recipes[e.id];
        if (e.s === 0) { if (fresh) { save.recipes[e.id] = true; writeSave(); duelFound.push(e.id); } }
        log(`${who(e.s)} brewed ${r.n}`);
        await banner(fresh ? `New recipe: ${r.n}` : r.n, r.t);
        break;
      }
      case 'draw': break;
      case 'burn': floatAt(elOf('m' + e.s), `Hand full: ${E.CARDS[e.id].n} burned`, 'ghost'); await sleep(300); break;
      case 'discard': floatAt(elOf('m' + e.s), `Discarded ${E.CARDS[e.id].n}`, 'ghost'); await sleep(350); break;
      case 'spill': floatAt($('c' + e.s), 'Spilled', 'solid'); squash($('c' + e.s)); await sleep(300); break;
      case 'fatigue': floatAt(elOf('m' + e.s), `Satchel empty: −${e.n}`, 'solid'); shake(elOf('m' + e.s)); await sleep(350); break;
      case 'ink': floatAt($('ink' + e.s), e.n ? `+${e.n} ink` : 'Ink refilled', 'ghost'); await sleep(120); break;
      case 'jump': if (el) floatAt(el, 'Jump!', 'solid'); await sleep(120); break;
      case 'summon': break;
      case 'turn':
        if (e.s === 0) { renderDuel(); await banner('Your turn'); }
        else log(`${who(1)}’s turn`);
        break;
    }
  }
}

// ---------- starting, resuming and finishing a duel ----------
function enterDuel() {
  pick = null; seenHand = new Set(); seenFam = new Set();
  show('duel'); hideTip(); closeSheet();
  sizeDuel(); renderDuel();
}
async function startDuel() {
  run.tries = run.tries || 0;
  G = E.duelFor(run, 'You'); duelFound = [];
  enterDuel();
  log(G.cur === 0 ? 'You go first' : `${G.p[1].name} goes first. You start with Salt in your cauldron.`);
  saveRun('duel');
  if (G.cur === 1) { await sleep(500); enemyTurn(); }
  else { await banner('Your turn'); tipOnce('duel', '<b>Beat their mage to 0 health.</b> Each turn you get more ink. Summon familiars to fight, drop reagents in your cauldron, and cast spells to pour your brew. Tap anything to read it.'); renderDuel(); }
}
function resumeDuel(g) {
  G = g; G.ev = []; duelFound = [];
  enterDuel();
  log('Welcome back');
  if (G.cur === 1 && !G.over) enemyTurn();
}
function showPause() {
  if (!G || G.over) return;
  if (!busy) saveRun('duel');
  sheet(`<p class="evn">${E.PITS[run.pit].name} · pit ${run.pit + 1} of 5</p><h2>Paused</h2><p>Your duel is saved.</p>
    <button class="btn" id="resumeBtn">Back to the duel</button>
    <button class="btn ghost" id="bookBtn">Grimoire</button>
    <button class="btn ghost" id="howBtn2">How to play</button>
    <button class="btn ghost" id="homeBtn">Save and go to the home screen</button>
    <button class="linkbtn yield" id="yieldBtn">Give up this duel</button>`);
  $('resumeBtn').onclick = closeSheet;
  $('bookBtn').onclick = () => showGrimoire(showPause);
  $('howBtn2').onclick = () => showHow(showPause);
  $('homeBtn').onclick = () => { if (!busy) saveRun('duel'); G = null; busy = false; closeSheet(); renderTitle(); };
  $('yieldBtn').onclick = () => { if (busy) return; closeSheet(); G.over = true; G.win = 1; finishDuel(); };
}
$('duel').addEventListener('click', onDuelTap);
$('endBtn').onclick = () => { if (!busy && G && G.cur === 0) doAction({ k: 'end' }); };
$('pause').onclick = showPause;
