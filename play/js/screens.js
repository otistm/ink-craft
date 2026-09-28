/* =====================================================================
   Every screen except the duel: home, swearing an oath, the pit intro,
   spoils, the satchel, the Grimoire, how to play, winning and losing,
   and saving the gauntlet in progress.
   ===================================================================== */
"use strict";

// ---------- the gauntlet in progress ----------
// Saved under its own key so a refresh or a pause picks up where you were: the run, and the duel if one is on.
// { run, phase: 'intro'|'duel'|'spoils', G (only while duelling), offer (only on spoils), at }
const RUN_KEY = 'inkcraft-run';
function saveRun(phase, extra = {}) {
  if (!run) return;
  try { localStorage.setItem(RUN_KEY, JSON.stringify({ v: 1, run, phase, G: phase === 'duel' && G && !G.over ? { ...G, ev: [] } : null, at: Date.now(), ...extra })); } catch (e) {}
}
function clearRun() { try { localStorage.removeItem(RUN_KEY); } catch (e) {} }
function loadRun() {
  try {
    const r = JSON.parse(localStorage.getItem(RUN_KEY) || 'null');
    if (!r || r.v !== 1 || !r.run || !E.LORDS[r.run.lord]) return null;
    return r;
  } catch (e) { return null; }
}
function resumeRun(r) {
  try {
    run = r.run; closeSheet();
    if (r.phase === 'duel' && r.G) { resumeDuel(r.G); return true; }
    if (r.phase === 'spoils') { showSpoils(r.offer); return true; }
    showIntro(); return true;
  } catch (e) { console.warn('Could not resume', e); clearRun(); run = null; G = null; return false; }
}
function savedLine(r) {
  const where = r.phase === 'spoils' ? `Saved after winning pit ${r.run.pit}.` : r.phase === 'duel' ? `Saved mid-duel in pit ${r.run.pit + 1} of 5.` : `Saved before pit ${r.run.pit + 1} of 5.`;
  return `<strong>${where}</strong> ${plural(r.run.lives, 'life')} left, ${r.run.deck.length} cards in your satchel. Tap to continue.`;
}

// ---------- home ----------
function renderTitle() {
  G = null; busy = false;
  const list = $('lords'), R = loadRun();
  list.innerHTML = '';
  E.LORDS.forEach((L, i) => {
    const won = save.trophies[i], saved = R && R.run.lord === i;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'event lord';
    b.style.animationDelay = (i * 0.05) + 's';
    b.innerHTML = `<div class="tw-wrap">${portrait(L.el, 'lp')}<span class="tro">${TROPHY(won)}</span></div>`
      + `<div class="ev"><i>${L.title}</i><b>${L.name}</b><span${saved ? ' class="saved"' : ''}>${saved ? savedLine(R) : won ? 'Champion of the Undercroft. ' + L.line : L.line}</span></div>`;
    b.onclick = () => { if (saved && resumeRun(R)) return; oathSheet(i); };
    list.appendChild(b);
  });
  const found = Object.keys(save.recipes).filter(id => E.RECIPE[id]).length, wins = save.trophies.filter(Boolean).length;
  $('homeStats').innerHTML = `${wins} of 7 trophies · <button class="linkbtn" id="bookBtn0">Grimoire</button> ${found} of ${E.RECIPES.length} recipes · <button class="linkbtn" id="howBtn">How to play</button>`;
  $('bookBtn0').onclick = () => showGrimoire();
  $('howBtn').onclick = () => showHow();
  show('title');
}

function oathSheet(i) {
  const L = E.LORDS[i], R = loadRun();
  const own = E.RECIPES.filter(r => r.el === L.el), found = own.filter(r => save.recipes[r.id]).length;
  const replace = R && R.run.lord !== i ? `<p class="resnote">This ends your gauntlet with ${E.LORDS[R.run.lord].name}.</p>` : '';
  sheet(`<div class="oathhead">${portrait(L.el, 'bigpor')}<div><p class="evn">${L.title}</p><h2>${L.name}</h2><span class="elname">${E.ELS[L.el]}</span></div></div>
    <p class="about">${L.about}</p>
    <div class="how"><p><b>Oath power: ${L.power.name}</b> (${L.power.cost} ink, once a turn). ${L.power.text}</p>
    <p><b>Your oath binds you to ${E.ELS[L.el]}.</b> Only ${E.ELS[L.el]} cards and plain cards will answer you.</p>
    <p><b>Signature recipes:</b> ${found} of ${own.length} found.</p></div>
    ${replace}
    <button class="btn" id="swearBtn">Swear the oath</button>
    <button class="btn ghost" id="notYet">Not yet</button>`);
  $('swearBtn').onclick = () => startRun(i);
  $('notYet').onclick = closeSheet;
}
function startRun(i) {
  run = E.newRun(i, (Date.now() ^ (Math.random() * 1e9)) | 0);
  closeSheet(); showIntro(true);
}

// ---------- before each pit ----------
function pipsHtml() {
  let h = '';
  for (let p = 0; p < 5; p++) {
    const cls = p < run.pit ? 'done' : p === run.pit ? 'now' : '';
    h += p === 4 ? `<i class="crown ${cls}">${CROWN}</i>` : `<i class="${cls}"></i>`;
  }
  return h;
}
function livesHtml() {
  let h = '';
  for (let i = 0; i < E.LIVES; i++) h += `<i class="${i < run.lives ? 'on' : ''}"></i>`;
  return `<span class="lives">${h}</span>`;
}
function showIntro(sworn) {
  G = null;
  const foe = run.foes[run.pit], L = E.LORD[foe.lord], pit = E.PITS[run.pit], me = E.LORDS[run.lord];
  const champ = foe.champ && E.CHAMP[foe.champ];
  $('introPanel').innerHTML = `<div class="prog">${pipsHtml()}</div>
    <div class="sub">Pit ${run.pit + 1} of 5 · ${pit.name}</div>
    <p class="story">${sworn ? `You swore your oath to ${me.name}, ${me.title}. The Undercroft’s gate grinds open below you. ` : ''}${pit.story}</p>
    <div class="foecard">${portrait(L.el, 'bigpor')}<div><h2>${foe.name}</h2><div class="sub">${champ ? 'Champion, sworn' : 'Sworn'} to ${L.name}, ${L.title}</div></div></div>
    <div class="nums"><div><div class="big">${foe.hp}</div><small>their health</small></div><div><div class="big">${E.START_HP}</div><small>your health</small></div></div>
    ${champ ? `<div class="how"><p><b>${champ.name}.</b> ${champ.rule}</p></div>` : ''}
    <div class="lifeRow">${livesHtml()}<span>${run.lives === E.LIVES ? `You can lose ${E.LIVES - 1} duels and fight again.` : `${plural(run.lives, 'life')} left. Lose them all and the gauntlet ends.`}</span></div>
    <button class="btn" id="enterBtn">${run.tries ? 'Fight again' : 'Enter the pit'}</button>
    <button class="btn ghost" id="satchelBtn">Your satchel · ${run.deck.length} cards</button>
    <button class="linkbtn" id="introHome">Save and go to the home screen</button>`;
  $('enterBtn').onclick = () => startDuel();
  $('satchelBtn').onclick = () => showSatchel();
  $('introHome').onclick = () => renderTitle();
  saveRun('intro');
  show('intro');
  const p = $('introPanel'); p.style.animation = 'none'; void p.offsetHeight; p.style.animation = '';
}
function showSatchel(back) {
  const counts = {};
  run.deck.forEach(id => counts[id] = (counts[id] || 0) + 1);
  const order = { R: 0, S: 1, F: 2 };
  const ids = Object.keys(counts).sort((a, b) => order[E.CARDS[a].k] - order[E.CARDS[b].k] || E.CARDS[a].c - E.CARDS[b].c);
  sheet(`<h2>Your satchel</h2><p>${run.deck.length} cards. Your duels draw from these.</p>
    <div class="satchel">${ids.map(id => `<div class="sc">${bigCardHtml(id)}${counts[id] > 1 ? `<b class="x2">×${counts[id]}</b>` : ''}</div>`).join('')}</div>
    <button class="btn" id="satBack">Close</button>`);
  $('satBack').onclick = () => back ? back() : closeSheet();
}

// ---------- after a duel ----------
async function finishDuel() {
  busy = true;
  const won = G.win === 0;
  await sleep(500);
  if (won) await banner('Victory');
  else await banner('Defeated');
  busy = false;
  const alive = E.afterDuel(run, won);
  const found = duelFound.slice();
  G = null;
  if (won && run.pit >= 5) {
    save.trophies[run.lord] = true; writeSave(); clearRun();
    const L = E.LORDS[run.lord];
    sheet(`<p class="evn">Sworn to ${L.name}</p><h2>Champion of the Undercroft</h2>
      <div class="award">${TROPHY(true).replace('<svg', '<svg class="troph"')}<p>${L.name}’s trophy</p></div>
      <p>The whole Undercroft knows your lord’s name now.</p>
      <button class="btn" id="homeBtn2">Back to the home screen</button>`, false);
    $('homeBtn2').onclick = () => { run = null; closeSheet(); renderTitle(); };
    return;
  }
  if (won) {
    const offer = E.spoils(run);
    saveRun('spoils', { offer });
    sheet(`<p class="evn">Pit ${run.pit} of 5 cleared</p><h2>Victory</h2>
      <div class="board">
        <div class="row"><span class="nm">${E.PITS[run.pit - 1].name}<small>${run.foes[run.pit - 1].name} is beaten</small></span><b>Won</b></div>
        ${found.map(id => `<div class="row me"><span class="nm">New recipe<small>${E.RECIPE[id].mix.map(x => E.CARDS[x].n).join(' + ')}</small></span><b>${E.RECIPE[id].n}</b></div>`).join('')}
        <div class="row"><span class="nm">Lives left</span><b>${run.lives}</b></div>
      </div>
      <button class="btn" id="spoilBtn">Claim your spoils</button>`, false);
    $('spoilBtn').onclick = () => { closeSheet(); showSpoils(offer); };
    return;
  }
  if (alive) {
    saveRun('intro');
    sheet(`<p class="evn">${E.PITS[run.pit].name}</p><h2>Defeated</h2>
      <div class="lifeRow center">${livesHtml()}</div>
      <p>${plural(run.lives, 'life')} left. The crowd wants a rematch.</p>
      <button class="btn" id="againBtn">Fight again</button>
      <button class="btn ghost" id="leaveBtn">Save and go to the home screen</button>`, false);
    $('againBtn').onclick = () => { closeSheet(); startDuel(); };
    $('leaveBtn').onclick = () => { closeSheet(); renderTitle(); };
    return;
  }
  clearRun();
  const li = run.lord;
  sheet(`<p class="evn">Pit ${run.pit + 1} of 5</p><h2>The gauntlet is over</h2>
    <p>You fell in ${E.PITS[run.pit].name} with no lives left. Your oath still holds, if you want to try again.</p>
    <button class="btn" id="reBtn">Swear to ${E.LORDS[li].name} again</button>
    <button class="btn ghost" id="homeBtn3">Back to the home screen</button>`, false);
  $('reBtn').onclick = () => startRun(li);
  $('homeBtn3').onclick = () => { run = null; closeSheet(); renderTitle(); };
}

// ---------- spoils: pick one card for your satchel ----------
function showSpoils(offer) {
  let chosen = -1;
  const list = $('spoilList');
  list.innerHTML = offer.map((id, i) => `<button type="button" class="spoil" data-i="${i}" style="animation-delay:${i * .08}s">${bigCardHtml(id)}</button>`).join('');
  $('spoilNote').textContent = `Pit ${run.pit} of 5 cleared. Take one card for your satchel, or leave them all.`;
  const take = $('takeBtn');
  take.disabled = true; take.textContent = 'Pick a card';
  list.onclick = e => {
    const b = e.target.closest('.spoil'); if (!b) return;
    chosen = +b.dataset.i;
    list.querySelectorAll('.spoil').forEach(x => x.classList.toggle('on', x === b));
    squash(b);
    take.disabled = false; take.textContent = `Take ${E.CARDS[offer[chosen]].n}`;
  };
  take.onclick = () => { if (chosen < 0) return; run.deck.push(offer[chosen]); showIntro(); };
  $('leaveSpoils').onclick = () => showIntro();
  $('spoilSatchel').onclick = () => showSatchel();
  saveRun('spoils', { offer });
  show('spoils');
}

// ---------- the Grimoire: every recipe, found or not ----------
function showGrimoire(back) {
  const guided = run && E.LORDS[run.lord].id === 'lumi';
  const groups = [...E.LORDS.map(L => ({ el: L.el, name: `${L.name} · ${E.ELS[L.el]}` })), { el: 'neutral', name: 'Plain · any lord' }];
  const found = E.RECIPES.filter(r => save.recipes[r.id]).length;
  let h = `<h2>Grimoire</h2><p>${found} of ${E.RECIPES.length} recipes found. Pour exactly these three reagents into one spell.</p><div class="grim">`;
  for (const g of groups) {
    h += `<div class="gh">${sigilSvg(g.el, 'gs')}<span>${g.name}</span></div>`;
    for (const r of E.RECIPES.filter(x => x.el === g.el)) {
      const known = save.recipes[r.id], peek = known || (guided && (g.el === 'light' || g.el === 'neutral'));
      h += `<div class="grow${known ? '' : ' unk'}"><div class="gmix">${r.mix.map(id => peek ? `<i>${reagentSvg(id)}</i>` : '<i class="q">?</i>').join('')}</div>`
        + `<div class="gtx"><b>${known ? r.n : peek ? r.n + ' (not brewed yet)' : 'Unknown recipe'}</b><small>${peek ? r.mix.map(id => E.CARDS[id].n).join(' + ') + '. ' + r.t : 'Brew it to learn what it does.'}</small></div></div>`;
    }
  }
  h += `</div><button class="btn" id="grimBack">Close</button>`;
  sheet(h);
  $('grimBack').onclick = () => back ? back() : closeSheet();
}

function showHow(back) {
  sheet(`<h2>How to play</h2><p>Swear an oath. Brew spells. Get trophies.</p>
  <div class="how">
  <p><b>Swear an oath to a mage lord.</b> Your oath binds you to their element: only their cards and plain cards will answer you. Each lord has an oath power you can use once a turn.</p>
  <p><b>Beat the other mage to 0 health.</b> You get 1 more ink every turn, up to 8. Cards cost ink.</p>
  <p><b>Familiars</b> fight for you. They can attack the turn after you summon them. Tap one, then tap an enemy.</p>
  <p><b>Reagents</b> go into your cauldron, which holds 3. They wait there.</p>
  <p><b>Spells pour the cauldron.</b> Every reagent in it adds its effect to the spell. Three reagents make a full brew and draw you a card.</p>
  <p><b>Recipes.</b> The right three reagents together make something extra happen. Found recipes go in your Grimoire.</p>
  <p><b>The Undercroft</b> has 5 pits. Win a duel to take a card for your satchel. You have ${E.LIVES} lives: lose a duel and you can fight that pit again.</p>
  <p><b>Win the champion’s pit</b> for your lord’s trophy.</p></div>
  <button class="btn" id="howBack">Got it</button>`);
  $('howBack').onclick = () => back ? back() : closeSheet();
}
