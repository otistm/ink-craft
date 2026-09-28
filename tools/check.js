// Checks the rules without a browser: recipes, keywords, freezing and blight timing,
// then rival mages duelling each other and a bot running the gauntlet for every lord.
// Run it from the repo folder with: node tools/check.js   (add "quick" for fewer games)
const E = require('../play/js/engine.js');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
const QUICK = process.argv.includes('quick');

// ---------- recipes ----------
ok(E.matchRecipe(['ember', 'sulfur', 'ember']).id === 'wildfire', 'wildfire in any order');
ok(E.matchRecipe(['ember', 'ember']) === null, 'two reagents make no recipe');
ok(E.matchRecipe(['dust', 'ember', 'ember']).id === 'wildfire', 'dust stands in');
ok(E.matchRecipe(['dust', 'dust', 'dust']).id === 'philstone', 'three dust is the stone');
ok(E.matchRecipe(['sunstone', 'dust', 'goldleaf']).id === 'liquidsun', 'dust for liquid sun');
ok(E.matchRecipe(['salt', 'salt', 'salt']).id === 'brine', 'brine');
ok(E.recipeHints(['ember'], 'ignis').some(h => h.r.id === 'wildfire'), 'hint wildfire');
ok(!E.recipeHints(['ember'], 'ignis').some(h => h.r.id === 'permafrost'), 'no ice hints for ignis');
for (const r of E.RECIPES) { ok(r.mix.every(id => E.CARDS[id] && E.CARDS[id].k === 'R'), 'recipe uses reagents ' + r.id);
  ok(r.mix.every(id => E.CARDS[id].el === r.el || E.CARDS[id].el === 'neutral'), 'recipe in its element ' + r.id); }
for (const c of Object.values(E.CARDS)) {
  if (c.k === 'F') ok(c.a >= 0 && c.h > 0 && c.art, 'familiar stats ' + c.id);
  if (c.k === 'S') ok(Array.isArray(c.ops), 'spell ops ' + c.id);
  ok(c.t !== undefined, 'text ' + c.id);
}
for (const L of E.LORDS) {
  const d = E.starterDeck(L.id);
  ok(d.length === 20, 'starter 20 ' + L.id + ' got ' + d.length);
  ok(d.every(id => E.CARDS[id] && (E.CARDS[id].el === L.el || E.CARDS[id].el === 'neutral')), 'starter keeps the oath ' + L.id);
}

// ---------- a hand-made duel ----------
function blank(lordA = 'ignis', lordB = 'ren') {
  const G = E.newGame({ seed: 5, first: 0, p: [
    { lord: lordA, name: 'A', hp: 20, deck: E.starterDeck(lordA) },
    { lord: lordB, name: 'B', hp: 20, deck: E.starterDeck(lordB) }] });
  G.p.forEach(P => { P.hand = []; P.board = []; P.cauldron = []; P.ink = P.maxInk = 8; });
  return G;
}
const give = (G, s, id) => { const h = { u: G.uid++, id }; G.p[s].hand.push(h); return h.u; };
const put = (G, s, id) => { const cur = G.cur; G.cur = s; const u = give(G, s, id); E.playCard(G, s, u); G.cur = cur; return G.p[s].board[G.p[s].board.length - 1]; };

// Firebolt with ember, ember, sulfur: 2+4 to the face, 2 back to me, wildfire 3, a card drawn
let G = blank();
G.p[0].cauldron = ['ember', 'ember', 'sulfur'];
let hand0 = G.p[0].hand.length + 1;
E.playCard(G, 0, give(G, 0, 'firebolt'), 'm1');
ok(G.p[1].hp === 20 - 6 - 3, 'wildfire firebolt hits 9, got ' + (20 - G.p[1].hp));
ok(G.p[0].hp === 18, 'embers burn me 2, got ' + G.p[0].hp);
ok(G.p[0].cauldron.length === 0, 'cauldron empties');
ok(G.p[0].hand.length === hand0 - 1 + 1, 'full brew draws a card');

// Guard and Ward
G = blank();
const w = put(G, 1, 'guardian'); w.sleep = false;
const imp = put(G, 0, 'imp'); imp.sleep = false;
ok(!E.attackTargets(G, 0).includes('m1'), 'guard blocks the face');
E.attack(G, 0, imp.u, 'f' + w.u);
ok(w.hp === 4 && !w.ward, 'ward soaks the first hit');
ok(G.p[0].board.length === 0, 'imp dies to the guardian');
ok(G.p[1].hp === 19, 'imp last words hit the mage');

// Freezing: frozen on my turn, misses the enemy's next turn, thaws after it
G = blank('ren', 'ignis');
const tgt = put(G, 1, 'brawler');
E.usePower(G, 0, 'f' + tgt.u);
ok(tgt.fz > 0 && tgt.hp === 1, 'hoarfrost hits and freezes');
E.endTurn(G);   // enemy's turn now
ok(G.cur === 1 && !E.canAttack(G, 1, tgt), 'frozen brawler cannot attack');
E.endTurn(G);
ok(tgt.fz === 0, 'thaws at the end of its own turn');

// Blight ticks at the start of its owner's turn and fades
G = blank('morrigan', 'orin');
G.p[1].armor = 5;
E.playCard(G, 0, give(G, 0, 'wither'), 'm1');
E.endTurn(G);
ok(G.p[1].hp === 17 && G.p[1].blight === 1 && G.p[1].armor === 5, 'blight skips armor, then fades: hp ' + G.p[1].hp);

// Echo stone repeats the spell; night's echo returns it
G = blank('sable', 'ignis');
G.p[0].cauldron = ['echo', 'echo', 'pearl'];
const before = G.p[0].hand.length;
E.playCard(G, 0, give(G, 0, 'voidbolt'), 'm1');
ok(G.p[1].hp === 20 - 6 - 2, 'triple void bolt + pearl, got ' + (20 - G.p[1].hp));
ok(G.p[0].hand.some(h => h.id === 'voidbolt'), 'night’s echo returns the spell');

// Chain lightning jumps
G = blank('volta', 'ignis');
put(G, 1, 'brawler');
E.playCard(G, 0, give(G, 0, 'chainlight'), 'm1');
ok(G.p[1].board.length === 0 && G.p[1].hp === 17, 'chain lightning jumps to the brawler');

// Transmute
G = blank('lumi', 'orin');
const col = put(G, 1, 'colossus');
E.playCard(G, 0, give(G, 0, 'transmute'), 'f' + col.u);
ok(G.p[1].board[0].id === 'beetle', 'transmute makes a beetle');

// ---------- rival mages duel each other ----------
function duel(a, b, seed) {
  const G = E.newGame({ seed, first: seed & 1, p: [
    { lord: a, name: 'A', hp: 20, deck: E.starterDeck(a) }, { lord: b, name: 'B', hp: 20, deck: E.starterDeck(b) }] });
  let steps = 0;
  while (!G.over && steps++ < 2000) { const s = G.cur; E.apply(G, s, E.aiChoose(G, s)); }
  return { win: G.over ? G.win : -1, turns: G.turn };
}
const N = QUICK ? 4 : 12, ids = E.LORDS.map(l => l.id), wins = {}, games = {};
let turnSum = 0, count = 0, stuck = 0;
const t0 = Date.now();
for (const a of ids) for (const b of ids) {
  if (a === b) continue;
  for (let k = 0; k < N; k++) {
    const r = duel(a, b, 1000 + k * 7 + ids.indexOf(a) * 131 + ids.indexOf(b) * 17);
    if (r.win < 0) { stuck++; continue; }
    games[a] = (games[a] || 0) + 1; games[b] = (games[b] || 0) + 1;
    wins[r.win === 0 ? a : b] = (wins[r.win === 0 ? a : b] || 0) + 1;
    turnSum += r.turns; count++;
  }
}
ok(stuck === 0, 'duels that never ended: ' + stuck);
console.log(`Lord against lord (${count} duels, ${((Date.now() - t0) / 1000).toFixed(1)} s, about ${(turnSum / count / 2).toFixed(1)} turns each):`);
for (const a of ids) console.log('  ' + a.padEnd(9) + Math.round(100 * (wins[a] || 0) / games[a]) + '%');

// ---------- a bot runs the gauntlet ----------
const RUNS = QUICK ? 6 : 40;
console.log(`The gauntlet, ${RUNS} runs per lord with ${E.LIVES} lives (bot takes the first card offered):`);
for (let li = 0; li < E.LORDS.length; li++) {
  let trophies = 0, reach = 0;
  for (let k = 0; k < RUNS; k++) {
    const run = E.newRun(li, 500 + k * 97 + li);
    let alive = true;
    while (alive && run.pit < 5) {
      const G = E.duelFor(run, 'You'); let steps = 0;
      while (!G.over && steps++ < 2000) { const s = G.cur; E.apply(G, s, E.aiChoose(G, s)); }
      if (G.win === 0) run.deck.push(E.spoils(run)[0]);
      alive = E.afterDuel(run, G.win === 0);
    }
    reach += run.pit; if (run.pit === 5) trophies++;
  }
  console.log('  ' + E.LORDS[li].id.padEnd(9) + `trophy ${Math.round(100 * trophies / RUNS)}%, average pits won ${(reach / RUNS).toFixed(1)}`);
}
console.log(fails ? `${fails} checks failed` : 'All checks passed');
process.exit(fails ? 1 : 0);
