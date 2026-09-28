/* =====================================================================
   The rules, with no drawing: the seven mage lords, every card, recipes,
   the duel (turns, ink, the cauldron, brewing, attacks), the rival mages'
   brains, and the gauntlet through the Undercroft. Exposed as `Engine`.
   Node can load this file too (tools/check.js).
   ===================================================================== */
"use strict";
const Engine = (() => {

// ---------- tuning ----------
const MAX_BOARD = 4, MAX_HAND = 8, MAX_INK = 8, INK_CAP = 10, CAULDRON = 3, START_HP = 20;
const PIT_HP = [10, 12, 14, 15, 18];     // rival health in pits 1 to 5 (5 is the champion)
const LIVES = 3;                          // duels you can lose in one gauntlet

// Seeded randomness kept inside the game state, so a saved duel carries on exactly.
function rnd(G) {
  let a = G.rs = (G.rs + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}
const pickR = (G, a) => a.length ? a[Math.floor(rnd(G) * a.length)] : null;
function shuffle(G, a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd(G) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------- elements and lords ----------
// Never rename a lord `id`, element key or card `id`: saves store them.
const ELS = { fire: 'Fire', light: 'Light', blight: 'Blight', iron: 'Iron', ice: 'Ice', void: 'Void', storm: 'Storm', neutral: 'Plain' };

const LORDS = [
  { id: 'ignis', name: 'Ignis', title: 'the Reckless Pyromancer', el: 'fire',
    line: 'Burn hot, burn fast, and never mind the burns.',
    about: 'Ignis’s brews hit harder than anyone’s, and they don’t always miss him. Ember makes a spell stronger and scorches your own hands.',
    power: { name: 'Spark', cost: 2, tgt: 'enemy', text: 'Deal 2 damage to an enemy and 1 to yourself.', ops: [{ op: 'dmg', n: 2, to: 'target' }, { op: 'dmg', n: 1, to: 'me' }] },
    disciples: ['Kest the Kindler', 'Bram Ashhand', 'Nell Cinders'] },
  { id: 'lumi', name: 'Lumi', title: 'the Guided Alchemist', el: 'light',
    line: 'Heal, gild, and turn your enemies to brass.',
    about: 'Lumi’s alchemists mend wounds, gild familiars with Ward and turn enemies into brass beetles. Guided: you can see every recipe you could brew, even ones you haven’t found yet.',
    power: { name: 'Distill', cost: 2, tgt: null, text: 'Add a random Light reagent to your cauldron.', ops: [{ op: 'reagent', id: 'rand' }] },
    disciples: ['Sister Aurel', 'Tobin Brightwell', 'Maud the Gilder'] },
  { id: 'morrigan', name: 'Morrigan', title: 'the Blight Weaver', el: 'blight',
    line: 'Let the rot do the work.',
    about: 'Blight eats away at its victim at the start of each of their turns, then halves. Morrigan’s brews pile it on, spread it and double it.',
    power: { name: 'Wilt', cost: 1, tgt: 'enemy', text: 'Give an enemy 1 blight.', ops: [{ op: 'blight', n: 1, to: 'target' }] },
    disciples: ['Old Hesk', 'Wren Rotwood', 'Silas Gall'] },
  { id: 'orin', name: 'Orin', title: 'the Iron Sage', el: 'iron',
    line: 'Stand behind armor and iron golems.',
    about: 'Orin’s followers wear armor, raise iron golems with Guard, and hit back with the weight of it all.',
    power: { name: 'Temper', cost: 2, tgt: null, text: 'Gain 2 armor.', ops: [{ op: 'armor', n: 2 }] },
    disciples: ['Dunmar Ironjaw', 'Petra Forgewell', 'Brother Cask'] },
  { id: 'ren', name: 'Ren', title: 'the Arctic Witch', el: 'ice',
    line: 'Freeze them solid, then shatter them.',
    about: 'A frozen familiar misses its next attack. Ren’s brews freeze what they touch, then break what’s frozen.',
    power: { name: 'Hoarfrost', cost: 2, tgt: 'efam', text: 'Deal 1 damage to an enemy familiar and freeze it.', ops: [{ op: 'dmg', n: 1, to: 'target' }, { op: 'freeze', to: 'target' }] },
    disciples: ['Ysolde Rime', 'Pike Frostmere', 'Little Anka'] },
  { id: 'sable', name: 'Sable', title: 'the Void Whisperer', el: 'void',
    line: 'Drain their life. Echo your spells.',
    about: 'Sable drains health back to you, empty the enemy’s cauldron and hand, and echo so they happen twice.',
    power: { name: 'Whisper', cost: 2, tgt: null, text: 'Drain 1 health from the enemy mage.', ops: [{ op: 'drain', n: 1, to: 'foe' }] },
    disciples: ['The Quiet One', 'Oona Hush', 'Crane Veil-eyed'] },
  { id: 'volta', name: 'Volta', title: 'the Storm Conductor', el: 'storm',
    line: 'Cast fast. Let the lightning jump.',
    about: 'Volta’s spells are cheap and stack up. Surge rewards a second spell in the same turn, and copper wire makes damage jump.',
    power: { name: 'Arc', cost: 2, tgt: null, text: 'Deal 1 damage to a random enemy, twice.', ops: [{ op: 'split', n: 2 }] },
    disciples: ['Jolt Harrow', 'Pell Sparkwright', 'Cass Thunder'] },
];
const LORD = Object.fromEntries(LORDS.map(l => [l.id, l]));
const lordOfEl = Object.fromEntries(LORDS.map(l => [l.el, l]));

// ---------- keywords (shown on cards and in the info strip) ----------
const KW = {
  guard: ['Guard', 'Enemies must attack this first.'],
  swift: ['Swift', 'Can attack the turn it’s played.'],
  ward: ['Ward', 'Ignores the first damage it takes.'],
  drain: ['Drain', 'Heals you for the damage it deals.'],
  venom: ['Venom', 'Gives 1 blight to what it hits.'],
  frostbite: ['Frostbite', 'Freezes what it hits.'],
};

// ---------- cards ----------
// k: R reagent (goes in your cauldron), S spell (pours the cauldron), F familiar.
// Reagents: amp (+ to the spell's numbers), inf (extra effects, in cauldron order), wild, echo, chain, stat.
// Targets for ops: target, hit (the target if it's an enemy, or a random enemy), hitF (the same, familiars only),
// foe, me, rand, randE, randA, allE, allFoes, allA, others, self, frozenE, allFrozenE.
const C = [];
const R = (id, el, n, c, t, x = {}) => C.push({ id, el, n, k: 'R', c, t, ...x });
const S = (id, el, n, c, tgt, t, ops, x = {}) => C.push({ id, el, n, k: 'S', c, tgt, t, ops, ...x });
const F = (id, el, n, c, a, h, art, t, x = {}) => C.push({ id, el, n, k: 'F', c, a, h, art, t, ...x });

// Plain: every lord's followers can use these.
R('salt', 'neutral', 'Salt', 0, '+1 to the spell’s numbers.', { amp: 1, art: 'salt' });
R('mandrake', 'neutral', 'Mandrake root', 1, 'Summon a 1/1 Sprout.', { inf: [{ op: 'summon', id: 'sprout' }], art: 'root' });
R('moonwater', 'neutral', 'Moonwater', 1, 'Gain 2 ink this turn.', { inf: [{ op: 'ink', n: 2 }], art: 'drop' });
S('stir', 'neutral', 'Stir', 0, null, 'Pour your brew. Draw a card.', [{ op: 'draw', n: 1 }]);
S('inklance', 'neutral', 'Ink lance', 2, 'enemy', 'Deal 3 damage to an enemy.', [{ op: 'dmg', n: 3, to: 'target' }]);
F('brawler', 'neutral', 'Pit brawler', 2, 3, 2, 'robed', '');
F('gargoyle', 'neutral', 'Pit gargoyle', 3, 2, 5, 'gargoyle', '', { kw: ['guard'] });
F('keeper', 'neutral', 'Cauldron keeper', 2, 1, 3, 'robed', 'Your reagents cost 1 less.', { aura: 'cheap' });
F('inkgolem', 'neutral', 'Ink golem', 5, 5, 6, 'golem', '');

// Fire: Ignis
R('ember', 'fire', 'Ember', 0, '+2 to the spell’s numbers. You take 1 damage.', { amp: 2, inf: [{ op: 'dmg', n: 1, to: 'me' }], art: 'ember' });
R('sulfur', 'fire', 'Sulfur', 1, 'Deal 1 damage to all enemy familiars.', { inf: [{ op: 'dmg', n: 1, to: 'allE' }], art: 'crystal' });
R('feather', 'fire', 'Phoenix feather', 1, 'Restore 3 health to you.', { inf: [{ op: 'heal', n: 3, to: 'me' }], art: 'feather' });
S('firebolt', 'fire', 'Firebolt', 1, 'enemy', 'Deal 2 damage to an enemy.', [{ op: 'dmg', n: 2, to: 'target' }]);
S('blaze', 'fire', 'Reckless blaze', 2, 'enemy', 'Deal 4 damage to an enemy and 2 to yourself.', [{ op: 'dmg', n: 4, to: 'target' }, { op: 'dmg', n: 2, to: 'me', fixed: 1 }]);
S('flamewave', 'fire', 'Flame wave', 3, null, 'Deal 2 damage to all enemy familiars.', [{ op: 'dmg', n: 2, to: 'allE' }]);
S('fireball', 'fire', 'Fireball', 4, 'enemy', 'Deal 5 damage to an enemy.', [{ op: 'dmg', n: 5, to: 'target' }]);
F('imp', 'fire', 'Cinder imp', 1, 2, 1, 'imp', 'When it dies, deal 1 damage to the enemy mage.', { death: [{ op: 'dmg', n: 1, to: 'foe' }] });
F('hound', 'fire', 'Ash hound', 2, 2, 2, 'beast', 'When you pour a brew, it gets +1 attack.', { pour: [{ op: 'buff', a: 1, h: 0, to: 'self' }] });
F('salamander', 'fire', 'Salamander', 3, 3, 3, 'drake', 'When played, deal 2 damage to a random enemy.', { play: [{ op: 'dmg', n: 2, to: 'rand' }] });
F('drake', 'fire', 'Ember drake', 4, 4, 3, 'drake', '', { kw: ['swift'] });
F('titan', 'fire', 'Pyre titan', 6, 6, 6, 'titan', 'When played, deal 2 damage to all other familiars.', { play: [{ op: 'dmg', n: 2, to: 'others' }] });
F('phoenix', 'fire', 'Phoenix', 3, 3, 2, 'bird', '', { kw: ['swift'], token: 1 });

// Light: Lumi
R('sunstone', 'light', 'Sunstone', 1, '+1 to the spell’s numbers. Restore 2 health to you.', { amp: 1, inf: [{ op: 'heal', n: 2, to: 'me' }], art: 'sun' });
R('goldleaf', 'light', 'Gold leaf', 1, 'Give a random friendly familiar +1/+1 and Ward.', { inf: [{ op: 'gild' }], art: 'leaf' });
R('dust', 'light', 'Philosopher’s dust', 1, 'Counts as any reagent for a recipe. +1 to the spell’s numbers.', { wild: 1, amp: 1, art: 'dust' });
S('ray', 'light', 'Radiant ray', 2, 'enemy', 'Deal 3 damage to an enemy. Restore 2 health to you.', [{ op: 'dmg', n: 3, to: 'target' }, { op: 'heal', n: 2, to: 'me' }]);
S('elixir', 'light', 'Elixir of life', 1, 'ally', 'Restore 5 health to you or a friendly familiar.', [{ op: 'heal', n: 5, to: 'target' }]);
S('distill', 'light', 'Distill', 2, null, 'Draw 2 cards.', [{ op: 'draw', n: 2 }]);
S('transmute', 'light', 'Transmute', 2, 'efam', 'Turn an enemy familiar into a 1/1 Brass beetle.', [{ op: 'transform', id: 'beetle', to: 'target' }]);
F('wisp', 'light', 'Lamp wisp', 1, 2, 1, 'wisp', '', { kw: ['ward'] });
F('apprentice', 'light', 'Apprentice', 2, 2, 3, 'robed', 'When played, add a random Light reagent to your cauldron.', { play: [{ op: 'reagent', id: 'rand' }] });
F('guardian', 'light', 'Gilded guardian', 3, 2, 4, 'knight', '', { kw: ['guard', 'ward'] });
F('homunculus', 'light', 'Homunculus', 4, 4, 4, 'jar', 'When you pour a brew, it gets +1/+1 for each reagent in it.', { pour: [{ op: 'buffPerBrew', to: 'self' }] });
F('seraph', 'light', 'Solar seraph', 6, 5, 6, 'seraph', 'When you pour a brew, restore 2 health to you.', { kw: ['ward'], pour: [{ op: 'heal', n: 2, to: 'me' }] });
F('beetle', 'light', 'Brass beetle', 1, 1, 1, 'bug', '', { token: 1 });

// Blight: Morrigan
R('nightshade', 'blight', 'Nightshade', 1, 'Give the target 2 blight.', { inf: [{ op: 'blight', n: 2, to: 'hit' }], art: 'flower' });
R('gravemoss', 'blight', 'Grave moss', 1, 'Give all enemies 1 blight.', { inf: [{ op: 'blight', n: 1, to: 'allFoes' }], art: 'moss' });
R('rotbloom', 'blight', 'Rot bloom', 1, 'Double the target’s blight.', { inf: [{ op: 'blightX2', to: 'hit' }], art: 'bloom' });
S('wither', 'blight', 'Wither', 2, 'enemy', 'Give an enemy 3 blight.', [{ op: 'blight', n: 3, to: 'target' }]);
S('reap', 'blight', 'Reap', 2, 'enemy', 'Deal 2 damage to an enemy, or 3 if it has blight.', [{ op: 'dmgIfBlight', n: 2, b: 1, to: 'target' }]);
S('drainlife', 'blight', 'Drain life', 3, 'enemy', 'Deal 3 damage to an enemy and restore that much health to you.', [{ op: 'drain', n: 3, to: 'target' }]);
S('plague', 'blight', 'Plague cloud', 4, null, 'Give all enemies 2 blight.', [{ op: 'blight', n: 2, to: 'allFoes' }]);
F('rotfly', 'blight', 'Rot fly', 1, 1, 1, 'bug', '', { kw: ['venom'] });
F('toad', 'blight', 'Blight toad', 2, 2, 3, 'toad', 'When it dies, give all enemies 1 blight.', { death: [{ op: 'blight', n: 1, to: 'allFoes' }] });
F('crow', 'blight', 'Carrion crow', 2, 2, 1, 'bird', '', { kw: ['swift'] });
F('weaver', 'blight', 'Web weaver', 3, 2, 4, 'spider', '', { kw: ['guard', 'venom'] });
F('mother', 'blight', 'The Blight Mother', 6, 4, 7, 'spider', 'At the end of your turn, give all enemies 1 blight.', { end: [{ op: 'blight', n: 1, to: 'allFoes' }] });

// Iron: Orin
R('filings', 'iron', 'Iron filings', 0, 'Gain 2 armor.', { inf: [{ op: 'armor', n: 2 }], art: 'filings' });
R('cog', 'iron', 'Cog', 1, 'Give your familiars +1 attack.', { inf: [{ op: 'buff', a: 1, h: 0, to: 'allA' }], art: 'cog' });
R('lodestone', 'iron', 'Lodestone', 1, '+2 to the spell’s numbers.', { amp: 2, art: 'magnet' });
S('bash', 'iron', 'Shield bash', 1, 'enemy', 'Deal damage equal to your armor to an enemy.', [{ op: 'dmgArmor', to: 'target' }]);
S('hammer', 'iron', 'Hammer blow', 2, 'enemy', 'Deal 3 damage to an enemy.', [{ op: 'dmg', n: 3, to: 'target' }]);
S('bulwark', 'iron', 'Bulwark', 2, null, 'Gain 4 armor. Draw a card.', [{ op: 'armor', n: 4 }, { op: 'draw', n: 1 }]);
S('forge', 'iron', 'Forge', 2, null, 'Summon a 3/3 Iron golem with Guard.', [{ op: 'summon', id: 'irongolem' }]);
F('drone', 'iron', 'Rivet drone', 1, 1, 3, 'drone', '', { kw: ['guard'] });
F('squire', 'iron', 'Clockwork squire', 2, 2, 3, 'knight', 'When you pour a brew, gain 1 armor.', { pour: [{ op: 'armor', n: 1 }] });
F('anvil', 'iron', 'Anvil golem', 3, 3, 4, 'golem', 'When played, gain 3 armor.', { play: [{ op: 'armor', n: 3 }] });
F('sentinel', 'iron', 'Iron sentinel', 4, 4, 6, 'golem', '', { kw: ['guard'] });
F('colossus', 'iron', 'Brass colossus', 7, 7, 8, 'titan', '', { kw: ['guard'] });
F('irongolem', 'iron', 'Iron golem', 3, 3, 3, 'golem', '', { kw: ['guard'], token: 1 });
F('steelgolem', 'iron', 'Steel golem', 4, 4, 4, 'golem', '', { kw: ['guard'], token: 1 });

// Ice: Ren
R('lily', 'ice', 'Frost lily', 0, 'Freeze the target familiar.', { inf: [{ op: 'freeze', to: 'hitF' }], art: 'lily' });
R('breath', 'ice', 'Wolf’s breath', 1, 'Deal 3 damage to a random frozen enemy.', { inf: [{ op: 'dmg', n: 3, to: 'frozenE' }], art: 'swirl' });
R('snowglass', 'ice', 'Snowglass', 1, 'Draw a card.', { inf: [{ op: 'draw', n: 1 }], art: 'snow' });
S('shard', 'ice', 'Ice shard', 1, 'enemy', 'Deal 2 damage to an enemy and freeze it.', [{ op: 'dmg', n: 2, to: 'target' }, { op: 'freeze', to: 'target' }]);
S('shatter', 'ice', 'Shatter', 2, 'efam', 'Deal 3 damage to an enemy familiar. If it’s frozen, destroy it.', [{ op: 'shatter', n: 3, to: 'target' }]);
S('winter', 'ice', 'Deep winter', 3, null, 'Draw 2 cards. Freeze a random enemy familiar.', [{ op: 'draw', n: 2 }, { op: 'freeze', to: 'randE' }]);
S('blizzard', 'ice', 'Blizzard', 4, null, 'Deal 2 damage to all enemy familiars and freeze them.', [{ op: 'dmg', n: 2, to: 'allE' }, { op: 'freeze', to: 'allE' }]);
F('hare', 'ice', 'Snow hare', 1, 1, 2, 'hare', 'When played, freeze a random enemy familiar.', { play: [{ op: 'freeze', to: 'randE' }] });
F('wolf', 'ice', 'Frost wolf', 2, 2, 3, 'beast', '', { kw: ['frostbite'] });
F('owl', 'ice', 'Rime owl', 3, 2, 4, 'bird', 'When you pour a brew, freeze a random enemy familiar.', { pour: [{ op: 'freeze', to: 'randE' }] });
F('bear', 'ice', 'Glacier bear', 4, 4, 6, 'bear', '', { kw: ['guard'] });
F('wyrm', 'ice', 'Winter wyrm', 6, 5, 5, 'drake', 'When played, freeze all enemy familiars.', { play: [{ op: 'freeze', to: 'allE' }] });

// Void: Sable
R('echo', 'void', 'Echo stone', 1, 'The spell happens one more time.', { echo: 1, art: 'echo' });
R('candle', 'void', 'Grave candle', 0, 'The enemy discards a random card.', { inf: [{ op: 'discard', n: 1 }], art: 'candle' });
R('pearl', 'void', 'Nether pearl', 1, 'Drain 2 health from the enemy mage.', { inf: [{ op: 'drain', n: 2, to: 'foe' }], art: 'pearl' });
S('voidbolt', 'void', 'Void bolt', 1, 'enemy', 'Deal 2 damage to an enemy and restore that much health to you.', [{ op: 'drain', n: 2, to: 'target' }]);
S('siphon', 'void', 'Siphon', 1, null, 'Spill the enemy’s cauldron. Draw a card for each reagent spilled.', [{ op: 'spill' }, { op: 'drawSpilled' }]);
S('harvest', 'void', 'Soul harvest', 3, null, 'Drain 1 health from every enemy.', [{ op: 'drain', n: 1, to: 'allFoes' }]);
S('unmake', 'void', 'Unmake', 4, 'efam', 'Destroy an enemy familiar.', [{ op: 'destroy', to: 'target' }]);
F('shade', 'void', 'Shade', 1, 2, 1, 'wisp', '', { kw: ['drain'] });
F('whisperer', 'void', 'Whisperer', 2, 1, 3, 'robed', 'When you pour a brew, lose 1 health and draw a card.', { pour: [{ op: 'lose', n: 1 }, { op: 'draw', n: 1 }] });
F('stalker', 'void', 'Void stalker', 3, 3, 3, 'beast', '', { kw: ['drain'] });
F('nullknight', 'void', 'Null knight', 4, 3, 4, 'knight', '', { kw: ['guard', 'drain'] });
F('maw', 'void', 'Maw of the void', 6, 5, 5, 'eye', 'When played, destroy a random enemy familiar.', { play: [{ op: 'destroy', to: 'randE' }] });

// Storm: Volta
R('jar', 'storm', 'Storm jar', 1, 'Deal 1 damage to a random enemy, 3 times.', { inf: [{ op: 'split', n: 3 }], art: 'jar' });
R('wire', 'storm', 'Copper wire', 0, 'The spell’s damage also jumps to a random other enemy.', { chain: 1, art: 'coil' });
R('static', 'storm', 'Static', 0, '+1 to the spell’s numbers for each spell you’ve already cast this turn.', { stat: 1, art: 'static' });
S('zap', 'storm', 'Zap', 0, 'enemy', 'Deal 1 damage to an enemy.', [{ op: 'dmg', n: 1, to: 'target' }]);
S('overcharge', 'storm', 'Overcharge', 1, null, 'Draw a card. Surge: draw 2 instead.', [{ op: 'draw', n: 1 }, { op: 'surge', then: [{ op: 'draw', n: 1 }] }]);
S('thunderclap', 'storm', 'Thunderclap', 2, null, 'Deal 1 damage to all enemies. Surge: do it twice.', [{ op: 'dmg', n: 1, to: 'allFoes' }, { op: 'surge', then: [{ op: 'dmg', n: 1, to: 'allFoes' }] }]);
S('chainlight', 'storm', 'Chain lightning', 3, 'enemy', 'Deal 3 damage to an enemy. It jumps to a random other enemy.', [{ op: 'dmg', n: 3, to: 'target' }], { chain: 1 });
S('stormcall', 'storm', 'Storm call', 5, null, 'Deal 6 damage split randomly among enemies.', [{ op: 'split', n: 6 }]);
F('sprite', 'storm', 'Storm sprite', 1, 1, 2, 'wisp', '', { kw: ['swift'] });
F('conduit', 'storm', 'Conduit', 2, 2, 2, 'coil', 'When you pour a brew, deal 1 damage to a random enemy.', { pour: [{ op: 'dmg', n: 1, to: 'rand' }] });
F('hawk', 'storm', 'Thunder hawk', 3, 3, 2, 'bird', '', { kw: ['swift'] });
F('tesla', 'storm', 'Tesla golem', 4, 3, 5, 'golem', 'At the end of your turn, deal 2 damage to a random enemy.', { end: [{ op: 'dmg', n: 2, to: 'rand' }] });
F('roc', 'storm', 'Storm roc', 6, 5, 5, 'bird', '', { kw: ['swift'] });

// Plain tokens
F('sprout', 'neutral', 'Sprout', 1, 1, 1, 'sprout', '', { token: 1 });
F('brute', 'neutral', 'Mandrake brute', 3, 3, 3, 'sprout', '', { token: 1 });

const CARDS = Object.fromEntries(C.map(c => [c.id, c]));

// ---------- recipes ----------
// Pour exactly these three reagents (in any order) into one spell and the recipe fires as well.
// Never rename a recipe `id`: the Grimoire in the save stores them.
const RECIPES = [
  { id: 'wildfire', el: 'fire', n: 'Wildfire', mix: ['ember', 'ember', 'sulfur'], t: 'Also deal 3 damage to the enemy mage.', ops: [{ op: 'dmg', n: 3, to: 'foe' }] },
  { id: 'phoenixdraught', el: 'fire', n: 'Phoenix draught', mix: ['ember', 'feather', 'salt'], t: 'Summon a 3/2 Phoenix with Swift.', ops: [{ op: 'summon', id: 'phoenix' }] },
  { id: 'liquidsun', el: 'light', n: 'Liquid sun', mix: ['sunstone', 'sunstone', 'goldleaf'], t: 'Restore 4 health to you. Your familiars get +1/+1.', ops: [{ op: 'heal', n: 4, to: 'me' }, { op: 'buff', a: 1, h: 1, to: 'allA' }] },
  { id: 'philstone', el: 'light', n: 'Philosopher’s stone', mix: ['dust', 'dust', 'dust'], t: 'Draw 2 cards and refill your ink.', ops: [{ op: 'draw', n: 2 }, { op: 'refill' }] },
  { id: 'blackplague', el: 'blight', n: 'Black plague', mix: ['nightshade', 'nightshade', 'gravemoss'], t: 'Give the enemy mage 3 more blight.', ops: [{ op: 'blight', n: 3, to: 'foe' }] },
  { id: 'widowskiss', el: 'blight', n: 'Widow’s kiss', mix: ['nightshade', 'rotbloom', 'salt'], t: 'Deal damage to the target equal to its blight.', ops: [{ op: 'dmgBlight', to: 'hit' }] },
  { id: 'livingsteel', el: 'iron', n: 'Living steel', mix: ['filings', 'filings', 'cog'], t: 'Summon a 4/4 Steel golem with Guard.', ops: [{ op: 'summon', id: 'steelgolem' }] },
  { id: 'temperededge', el: 'iron', n: 'Tempered edge', mix: ['lodestone', 'cog', 'salt'], t: 'Your familiars get +1/+1. Gain 4 armor.', ops: [{ op: 'buff', a: 1, h: 1, to: 'allA' }, { op: 'armor', n: 4 }] },
  { id: 'permafrost', el: 'ice', n: 'Permafrost', mix: ['lily', 'lily', 'snowglass'], t: 'Freeze all enemy familiars.', ops: [{ op: 'freeze', to: 'allE' }] },
  { id: 'avalanche', el: 'ice', n: 'Avalanche', mix: ['breath', 'lily', 'salt'], t: 'Deal 3 damage to every frozen enemy.', ops: [{ op: 'dmg', n: 3, to: 'allFrozenE' }] },
  { id: 'nightsecho', el: 'void', n: 'Night’s echo', mix: ['echo', 'echo', 'pearl'], t: 'The spell comes back to your hand.', ops: [{ op: 'returnCard' }] },
  { id: 'oblivion', el: 'void', n: 'Oblivion', mix: ['candle', 'candle', 'pearl'], t: 'The enemy discards 2 more cards. You draw one.', ops: [{ op: 'discard', n: 2 }, { op: 'draw', n: 1 }] },
  { id: 'balllightning', el: 'storm', n: 'Ball lightning', mix: ['jar', 'wire', 'wire'], t: 'Also deal 4 damage to the enemy mage.', ops: [{ op: 'dmg', n: 4, to: 'foe' }] },
  { id: 'supercell', el: 'storm', n: 'Supercell', mix: ['static', 'static', 'jar'], t: 'Your familiars get +2 attack.', ops: [{ op: 'buff', a: 2, h: 0, to: 'allA' }] },
  { id: 'mandrakestew', el: 'neutral', n: 'Mandrake stew', mix: ['mandrake', 'mandrake', 'salt'], t: 'Summon a 3/3 Mandrake brute.', ops: [{ op: 'summon', id: 'brute' }] },
  { id: 'moonbrew', el: 'neutral', n: 'Moonbrew', mix: ['moonwater', 'moonwater', 'salt'], t: 'Draw 2 cards.', ops: [{ op: 'draw', n: 2 }] },
  { id: 'brine', el: 'neutral', n: 'Brine', mix: ['salt', 'salt', 'salt'], t: 'Gain 5 armor.', ops: [{ op: 'armor', n: 5 }] },
];
const RECIPE = Object.fromEntries(RECIPES.map(r => [r.id, r]));

// Which three reagents make a recipe. Philosopher's dust stands in for any one reagent;
// a recipe that needs fewer stand-ins wins.
function matchRecipe(brew) {
  if (brew.length !== CAULDRON) return null;
  let best = null, bestW = 9;
  for (const r of RECIPES) {
    const need = r.mix.slice(); let wild = 0, bad = false;
    for (const id of brew) {
      const k = need.indexOf(id);
      if (k >= 0) need.splice(k, 1); else if (CARDS[id].wild) wild++; else { bad = true; break; }
    }
    if (!bad && need.length === wild && wild < bestW) { best = r; bestW = wild; }
  }
  return best;
}
// Recipes the cauldron could still become: [{r, missing:[ids]}]. Only recipes the lord can brew.
function recipeHints(brew, lordId) {
  if (!brew.length || brew.length >= CAULDRON) return [];
  const el = LORD[lordId].el, out = [];
  for (const r of RECIPES) {
    if (r.el !== el && r.el !== 'neutral') continue;
    const need = r.mix.slice(); let wild = 0, bad = false;
    for (const id of brew) {
      const k = need.indexOf(id);
      if (k >= 0) need.splice(k, 1); else if (CARDS[id].wild) wild++; else { bad = true; break; }
    }
    if (bad || need.length - wild > CAULDRON - brew.length) continue;
    if (need.length - wild <= 0) continue;
    out.push({ r, missing: need.slice(0, need.length - wild) });
  }
  return out;
}

// ---------- card pools and decks ----------
const poolOf = el => C.filter(c => c.el === el && !c.token).map(c => c.id);
const reagentsOf = el => C.filter(c => c.el === el && c.k === 'R').map(c => c.id);
// The satchel you start with: 20 cards.
function starterDeck(lordId) {
  const el = LORD[lordId].el, d = [];
  const own = C.filter(c => c.el === el && !c.token);
  own.filter(c => c.k === 'R').forEach(c => d.push(c.id, c.id));
  d.push('salt', 'stir');
  const spells = own.filter(c => c.k === 'S');
  spells.forEach(c => d.push(c.id));
  own.filter(c => c.k === 'F').forEach(c => d.push(c.id));
  d.push('brawler', 'gargoyle');
  let i = 0; while (d.length < 20) d.push(spells[i++ % spells.length].id);
  return d.slice(0, 20);
}

// ---------- the duel ----------
function newPlayer(G, spec) {
  return { lord: spec.lord, name: spec.name, hp: spec.hp, maxHp: spec.hp, armor: 0, blight: 0, ink: 0, maxInk: 0,
    deck: shuffle(G, spec.deck.slice()), hand: [], board: [], cauldron: [], fatigue: 0, power: false, spells: 0, champ: spec.champ || null };
}
// opts: { seed, first: 0|1, p: [spec, spec] } where spec = { lord, name, hp, deck, champ }
function newGame(opts) {
  const G = { v: 1, rs: opts.seed | 0, uid: 1, turn: 0, cur: opts.first, over: false, win: -1, ev: [], p: [] };
  G.p = opts.p.map(s => newPlayer(G, s));
  const f = opts.first, s = 1 - f;
  draw(G, f, 3); draw(G, s, 4);
  G.p[s].cauldron.push('salt');   // going second starts with a pinch of salt in the cauldron
  G.p.forEach(P => { if (P.champ === 'grue') P.cauldron = [0, 1, 2].map(() => pickR(G, reagentsOf(LORD[P.lord].el))); });
  G.ev = [];
  startTurn(G);
  return G;
}
const ev = (G, e) => { if (!G.sim) G.ev.push(e); };

function famOf(G, u) { for (let s = 0; s < 2; s++) { const f = G.p[s].board.find(x => x.u === u); if (f) return { f, s }; } return null; }
function getRef(G, r) {
  if (!r) return null;
  if (r[0] === 'm') { const s = +r[1]; return { kind: 'm', s, o: G.p[s] }; }
  const x = famOf(G, +r.slice(1)); return x ? { kind: 'f', s: x.s, o: x.f } : null;
}
const aliveF = P => P.board.filter(f => f.hp > 0);
const blightOf = (G, r) => { const t = getRef(G, r); return t ? t.o.blight || 0 : 0; };

function validTargets(G, s, tgt) {
  const o = 1 - s, me = aliveF(G.p[s]).map(f => 'f' + f.u), them = aliveF(G.p[o]).map(f => 'f' + f.u);
  switch (tgt) {
    case 'enemy': return ['m' + o, ...them];
    case 'efam': return them;
    case 'afam': return me;
    case 'fam': return [...me, ...them];
    case 'ally': return ['m' + s, ...me];
    case 'any': return ['m' + s, 'm' + o, ...me, ...them];
  }
  return [];
}
function isEnemyRef(G, s, r) { const t = getRef(G, r); return t && t.s !== s && (t.kind === 'm' ? t.o.hp > 0 : t.o.hp > 0); }

function resolve(G, s, to, ctx) {
  const o = 1 - s, P = G.p[s], Q = G.p[o];
  const enemies = () => ['m' + o, ...aliveF(Q).map(f => 'f' + f.u)];
  switch (to) {
    case 'target': { const t = getRef(G, ctx.target); return t && t.o.hp > 0 ? [ctx.target] : []; }
    case 'hit': return isEnemyRef(G, s, ctx.target) ? [ctx.target] : [pickR(G, enemies())];
    case 'hitF': { const t = getRef(G, ctx.target); if (t && t.kind === 'f' && t.s === o && t.o.hp > 0) return [ctx.target]; const e = aliveF(Q); return e.length ? ['f' + pickR(G, e).u] : []; }
    case 'foe': return ['m' + o];
    case 'me': return ['m' + s];
    case 'rand': return [pickR(G, enemies())];
    case 'randE': { const e = aliveF(Q); return e.length ? ['f' + pickR(G, e).u] : []; }
    case 'randA': { const e = aliveF(P); return e.length ? ['f' + pickR(G, e).u] : []; }
    case 'allE': return aliveF(Q).map(f => 'f' + f.u);
    case 'allFoes': return enemies();
    case 'allA': return aliveF(P).map(f => 'f' + f.u);
    case 'others': return [...aliveF(P), ...aliveF(Q)].filter(f => 'f' + f.u !== ctx.self).map(f => 'f' + f.u);
    case 'self': { const t = getRef(G, ctx.self); return t && t.o.hp > 0 ? [ctx.self] : []; }
    case 'frozenE': { const e = aliveF(Q).filter(f => f.fz); return e.length ? ['f' + pickR(G, e).u] : []; }
    case 'allFrozenE': return aliveF(Q).filter(f => f.fz).map(f => 'f' + f.u);
  }
  return [];
}

function damage(G, r, n, src) {
  if (n <= 0 || !r) return 0;
  const t = getRef(G, r); if (!t || t.o.hp <= 0) return 0;
  if (t.kind === 'm') {
    const P = t.o, ab = Math.min(P.armor, n); P.armor -= ab; P.hp -= n - ab;
    ev(G, { t: 'dmg', r, n, ab }); return n;
  }
  const f = t.o;
  if (f.ward) { f.ward = false; ev(G, { t: 'ward', r }); return 0; }
  f.hp -= n; ev(G, { t: 'dmg', r, n }); return n;
}
function heal(G, r, n) {
  const t = getRef(G, r); if (!t || t.o.hp <= 0 || n <= 0) return;
  const cap = t.kind === 'm' ? t.o.maxHp : t.o.maxHp;
  const got = Math.min(n, cap - t.o.hp); if (got <= 0) return;
  t.o.hp += got; ev(G, { t: 'heal', r, n: got });
}
function addBlight(G, r, n) { const t = getRef(G, r); if (!t || t.o.hp <= 0 || n <= 0) return; t.o.blight = (t.o.blight || 0) + n; ev(G, { t: 'blight', r, n }); }
function freeze(G, r) { const t = getRef(G, r); if (!t || t.kind !== 'f' || t.o.hp <= 0) return; t.o.fz = G.turn; ev(G, { t: 'freeze', r }); }
function buff(G, r, a, h) { const t = getRef(G, r); if (!t || t.kind !== 'f' || t.o.hp <= 0) return; t.o.atk += a; t.o.hp += h; t.o.maxHp += h; ev(G, { t: 'buff', r, a, h }); }

function mkFam(G, s, id) {
  const c = CARDS[id], kw = c.kw || [];
  const f = { u: G.uid++, id, atk: c.a, hp: c.h, maxHp: c.h, blight: 0, fz: 0, att: false,
    guard: kw.includes('guard'), ward: kw.includes('ward'), drain: kw.includes('drain'), venom: kw.includes('venom'),
    frostbite: kw.includes('frostbite'), swift: kw.includes('swift') };
  f.sleep = !f.swift;
  if (G.p[s].champ === 'hollow') f.atk += 1;
  return f;
}
function summon(G, s, id) {
  const P = G.p[s]; if (aliveF(P).length >= MAX_BOARD) return null;
  const f = mkFam(G, s, id); P.board.push(f); ev(G, { t: 'summon', s, r: 'f' + f.u }); return f;
}
function draw(G, s, n) {
  const P = G.p[s];
  for (let i = 0; i < n; i++) {
    if (!P.deck.length) { P.fatigue++; P.hp -= P.fatigue; ev(G, { t: 'fatigue', s, n: P.fatigue, r: 'm' + s }); continue; }
    const id = P.deck.pop();
    if (P.hand.length >= MAX_HAND) { ev(G, { t: 'burn', s, id }); continue; }
    const h = { u: G.uid++, id }; P.hand.push(h); ev(G, { t: 'draw', s, u: h.u });
  }
}
function addReagent(G, s, id) {
  const P = G.p[s]; if (P.cauldron.length >= CAULDRON) return;
  if (id === 'rand') id = pickR(G, reagentsOf(LORD[P.lord].el));
  P.cauldron.push(id); ev(G, { t: 'stir', s, id });
}

const AMPABLE = { dmg: 1, heal: 1, armor: 1, blight: 1, drain: 1, split: 1, dmgArmor: 1, shatter: 1, dmgIfBlight: 1 };
function runOps(G, s, ops, ctx) { for (const o of ops) { if (G.over) return; runOp(G, s, o, ctx); } }
function runOp(G, s, o, ctx) {
  const P = G.p[s], Q = G.p[1 - s];
  const n = (o.n || 0) + (ctx.amp && !o.fixed && AMPABLE[o.op] ? ctx.amp : 0);
  const each = fn => resolve(G, s, o.to, ctx).forEach(r => r && fn(r));
  switch (o.op) {
    case 'dmg': each(r => damage(G, r, n, s)); break;
    case 'drain': { let tot = 0; each(r => { tot += damage(G, r, n, s); }); heal(G, 'm' + s, tot); break; }
    case 'heal': each(r => heal(G, r, n)); break;
    case 'lose': P.hp -= o.n; ev(G, { t: 'dmg', r: 'm' + s, n: o.n, ab: 0 }); break;
    case 'armor': P.armor += n; ev(G, { t: 'armor', r: 'm' + s, n }); break;
    case 'blight': each(r => addBlight(G, r, n)); break;
    case 'blightX2': each(r => addBlight(G, r, blightOf(G, r))); break;
    case 'freeze': each(r => freeze(G, r)); break;
    case 'buff': each(r => buff(G, r, o.a, o.h)); break;
    case 'buffPerBrew': each(r => buff(G, r, ctx.brew || 0, ctx.brew || 0)); break;
    case 'gild': { const a = aliveF(P); if (a.length) { const f = pickR(G, a); buff(G, 'f' + f.u, 1, 1); f.ward = true; } break; }
    case 'draw': draw(G, s, o.n); break;
    case 'summon': for (let i = 0; i < (o.k || 1); i++) summon(G, s, o.id); break;
    case 'reagent': addReagent(G, s, o.id); break;
    case 'ink': P.ink = Math.min(INK_CAP, P.ink + o.n); ev(G, { t: 'ink', s, n: o.n }); break;
    case 'refill': P.ink = Math.max(P.ink, P.maxInk); ev(G, { t: 'ink', s, n: 0 }); break;
    case 'discard': for (let i = 0; i < o.n && Q.hand.length; i++) { const k = Math.floor(rnd(G) * Q.hand.length); const h = Q.hand.splice(k, 1)[0]; ev(G, { t: 'discard', s: 1 - s, id: h.id }); } break;
    case 'spill': ctx.spilled = Q.cauldron.length; if (Q.cauldron.length) ev(G, { t: 'spill', s: 1 - s, n: Q.cauldron.length }); Q.cauldron = []; break;
    case 'drawSpilled': draw(G, s, ctx.spilled || 0); break;
    case 'destroy': each(r => { const t = getRef(G, r); if (t && t.kind === 'f') { t.o.hp = 0; ev(G, { t: 'destroy', r }); } }); break;
    case 'transform': each(r => {
      const t = getRef(G, r); if (!t || t.kind !== 'f') return;
      const B = G.p[t.s].board, i = B.indexOf(t.o), nf = mkFam(G, t.s, o.id); nf.sleep = t.o.sleep; B[i] = nf;
      ev(G, { t: 'transform', r, to: 'f' + nf.u });
    }); break;
    case 'dmgArmor': each(r => damage(G, r, P.armor + (ctx.amp || 0), s)); break;
    case 'dmgIfBlight': each(r => damage(G, r, n + (blightOf(G, r) > 0 ? o.b : 0), s)); break;
    case 'dmgBlight': each(r => damage(G, r, blightOf(G, r), s)); break;
    case 'shatter': each(r => { const t = getRef(G, r); if (t && t.kind === 'f' && t.o.fz) { t.o.hp = 0; ev(G, { t: 'destroy', r }); } else damage(G, r, n, s); }); break;
    case 'split': for (let i = 0; i < n; i++) { const e = ['m' + (1 - s), ...aliveF(Q).map(f => 'f' + f.u)]; damage(G, pickR(G, e), 1, s); } break;
    case 'surge': if (ctx.surge) runOps(G, s, o.then, ctx); break;
    case 'returnCard': if (ctx.cardId && P.hand.length < MAX_HAND) { const h = { u: G.uid++, id: ctx.cardId }; P.hand.push(h); ev(G, { t: 'draw', s, u: h.u }); } break;
  }
}

// Dead familiars leave the board and their last words fire; then check the mages.
function cleanup(G) {
  for (let guard = 0; guard < 20; guard++) {
    let any = false;
    for (let s = 0; s < 2; s++) {
      const P = G.p[s], dead = P.board.filter(f => f.hp <= 0);
      if (!dead.length) continue;
      any = true;
      P.board = P.board.filter(f => f.hp > 0);
      for (const f of dead) {
        ev(G, { t: 'die', r: 'f' + f.u, s, id: f.id });
        const c = CARDS[f.id]; if (c.death) runOps(G, s, c.death, { self: null });
      }
    }
    if (!any) break;
  }
  const d0 = G.p[0].hp <= 0, d1 = G.p[1].hp <= 0;
  if ((d0 || d1) && !G.over) { G.over = true; G.win = d0 ? 1 : 0; ev(G, { t: 'over', win: G.win }); }
}

function costOf(G, s, c) {
  let k = c.c;
  if (c.k === 'R') k -= aliveF(G.p[s]).filter(f => CARDS[f.id].aura === 'cheap').length;
  return Math.max(0, k);
}
// Why a card can't be played right now, or '' if it can.
function whyNot(G, s, h) {
  const P = G.p[s], c = CARDS[h.id];
  if (G.over || G.cur !== s) return 'Not your turn';
  if (costOf(G, s, c) > P.ink) return 'Not enough ink';
  if (c.k === 'R' && P.cauldron.length >= CAULDRON) return 'Your cauldron is full. Cast a spell to pour it';
  if (c.k === 'F' && aliveF(P).length >= MAX_BOARD) return 'No room for another familiar';
  if (c.k === 'S' && c.tgt && !validTargets(G, s, c.tgt).length) return 'Nothing to target';
  return '';
}
const canPlay = (G, s, h) => !whyNot(G, s, h);

function playCard(G, s, u, target) {
  const P = G.p[s], i = P.hand.findIndex(h => h.u === u); if (i < 0) return false;
  const h = P.hand[i], c = CARDS[h.id];
  if (!canPlay(G, s, h)) return false;
  if (c.k === 'S' && c.tgt && !validTargets(G, s, c.tgt).includes(target)) return false;
  P.ink -= costOf(G, s, c); P.hand.splice(i, 1);
  ev(G, { t: 'play', s, id: c.id, u, target: target || null });
  if (c.k === 'R') { P.cauldron.push(c.id); ev(G, { t: 'stir', s, id: c.id }); }
  else if (c.k === 'F') { const f = summon(G, s, c.id); if (f && c.play) runOps(G, s, c.play, { self: 'f' + f.u, target: null }); }
  else castSpell(G, s, c, target);
  cleanup(G);
  return true;
}
// Casting a spell pours the whole cauldron into it: the spell happens (stronger for each amp),
// echoes and jumps, then every reagent adds its own effect in the order it went in, then any recipe.
function castSpell(G, s, c, target) {
  const P = G.p[s], brew = P.cauldron; P.cauldron = [];
  let amp = 0, echo = 0, chain = c.chain || 0;
  for (const id of brew) { const r = CARDS[id]; amp += r.amp || 0; if (r.stat) amp += P.spells; echo += r.echo || 0; chain += r.chain || 0; }
  const rec = matchRecipe(brew);
  const ctx = { target, amp, surge: P.spells > 0, cardId: c.id, brew: brew.length };
  if (brew.length) ev(G, { t: 'pour', s, brew: brew.slice(), rec: rec ? rec.id : null, amp, echo });
  for (let k = 0; k <= echo; k++) runOps(G, s, c.ops, ctx);
  const hits = c.ops.filter(o => (o.op === 'dmg' || o.op === 'drain') && o.to === 'target');
  for (let k = 0; k < chain && hits.length && !G.over; k++) {
    const others = ['m' + (1 - s), ...aliveF(G.p[1 - s]).map(f => 'f' + f.u)].filter(r => r !== target);
    const next = pickR(G, others); if (!next) break;
    ev(G, { t: 'jump', from: target, r: next });
    runOps(G, s, hits, { ...ctx, target: next });
  }
  ctx.amp = 0;
  for (const id of brew) if (CARDS[id].inf) runOps(G, s, CARDS[id].inf, ctx);
  if (rec) { ev(G, { t: 'recipe', s, id: rec.id }); runOps(G, s, rec.ops, ctx); }
  if (brew.length === CAULDRON) draw(G, s, 1);                      // a full brew draws a card
  P.spells++;
  if (brew.length) {
    for (const f of aliveF(P)) { const d = CARDS[f.id]; if (d.pour) runOps(G, s, d.pour, { self: 'f' + f.u, brew: brew.length }); }
    if (P.champ === 'grue') heal(G, 'm' + s, 2);
  }
}

function canPower(G, s) {
  const P = G.p[s], pw = LORD[P.lord].power;
  if (G.over || G.cur !== s || P.power || P.ink < pw.cost) return false;
  if (pw.tgt && !validTargets(G, s, pw.tgt).length) return false;
  if (pw.ops.some(o => o.op === 'reagent') && P.cauldron.length >= CAULDRON) return false;
  return true;
}
function usePower(G, s, target) {
  const P = G.p[s], pw = LORD[P.lord].power;
  if (!canPower(G, s)) return false;
  if (pw.tgt && !validTargets(G, s, pw.tgt).includes(target)) return false;
  P.ink -= pw.cost; P.power = true;
  ev(G, { t: 'power', s, target: target || null });
  runOps(G, s, pw.ops, { target });
  cleanup(G);
  return true;
}

const canAttack = (G, s, f) => G.cur === s && !G.over && f.hp > 0 && !f.sleep && !f.att && !f.fz && f.atk > 0;
function attackTargets(G, s) {
  const Q = G.p[1 - s], guards = aliveF(Q).filter(f => f.guard);
  if (guards.length) return guards.map(f => 'f' + f.u);
  return ['m' + (1 - s), ...aliveF(Q).map(f => 'f' + f.u)];
}
function attack(G, s, u, r) {
  const x = famOf(G, u); if (!x || x.s !== s || !canAttack(G, s, x.f)) return false;
  if (!attackTargets(G, s).includes(r)) return false;
  const f = x.f, t = getRef(G, r); f.att = true;
  ev(G, { t: 'attack', from: 'f' + u, r });
  const dealt = damage(G, r, f.atk, s);
  if (dealt > 0 && f.venom) addBlight(G, r, 1);
  if (dealt > 0 && f.frostbite) freeze(G, r);
  if (f.drain && dealt > 0) heal(G, 'm' + s, dealt);
  if (t.kind === 'f') {
    const back = damage(G, 'f' + u, t.o.atk, 1 - s);
    if (back > 0 && t.o.venom) addBlight(G, 'f' + u, 1);
    if (back > 0 && t.o.frostbite) freeze(G, 'f' + u);
    if (back > 0 && t.o.drain) heal(G, 'm' + (1 - s), back);
  }
  cleanup(G);
  return true;
}

function startTurn(G) {
  G.turn++;
  const s = G.cur, P = G.p[s];
  P.maxInk = Math.min(MAX_INK, P.maxInk + 1); P.ink = P.maxInk; P.power = false; P.spells = 0;
  P.board.forEach(f => { f.sleep = false; f.att = false; });
  ev(G, { t: 'turn', s });
  // Blight eats through armor and Ward alike, then halves.
  if (P.blight > 0) { P.hp -= P.blight; ev(G, { t: 'rot', r: 'm' + s, n: P.blight }); P.blight = P.blight >> 1; }
  for (const f of P.board) if (f.blight > 0 && f.hp > 0) { f.hp -= f.blight; ev(G, { t: 'rot', r: 'f' + f.u, n: f.blight }); f.blight = f.blight >> 1; }
  if (P.champ === 'vex') { P.armor += 1; ev(G, { t: 'armor', r: 'm' + s, n: 1 }); }
  cleanup(G); if (G.over) return;
  draw(G, s, 1);
  cleanup(G);
}
function endTurn(G) {
  if (G.over) return;
  const s = G.cur, P = G.p[s];
  for (const f of aliveF(P)) { const d = CARDS[f.id]; if (d.end) runOps(G, s, d.end, { self: 'f' + f.u }); }
  cleanup(G); if (G.over) return;
  // A familiar frozen before this turn has now missed its attack and thaws.
  P.board.forEach(f => { if (f.fz && f.fz < G.turn) { f.fz = 0; ev(G, { t: 'thaw', r: 'f' + f.u }); } });
  G.cur = 1 - s;
  startTurn(G);
}

// ---------- the rival mages' brains ----------
// A greedy player: try every move on a copy of the duel, keep the one that looks best, repeat until nothing helps.
function clone(G) {
  return { v: G.v, rs: G.rs, uid: G.uid, turn: G.turn, cur: G.cur, over: G.over, win: G.win, ev: [], sim: true,
    p: G.p.map(P => ({ ...P, deck: P.deck.slice(), hand: P.hand.map(h => ({ ...h })), board: P.board.map(f => ({ ...f })), cauldron: P.cauldron.slice() })) };
}
function actions(G, s) {
  const P = G.p[s], out = [];
  const seen = new Set();
  for (const h of P.hand) {
    if (!canPlay(G, s, h) || seen.has(h.id)) continue;
    seen.add(h.id);
    const c = CARDS[h.id];
    if (c.k === 'S' && c.tgt) validTargets(G, s, c.tgt).forEach(t => out.push({ k: 'play', u: h.u, t }));
    else out.push({ k: 'play', u: h.u });
  }
  if (canPower(G, s)) { const pw = LORD[P.lord].power; if (pw.tgt) validTargets(G, s, pw.tgt).forEach(t => out.push({ k: 'pow', t })); else out.push({ k: 'pow' }); }
  for (const f of P.board) if (canAttack(G, s, f)) attackTargets(G, s).forEach(t => out.push({ k: 'atk', u: f.u, t }));
  return out;
}
function apply(G, s, a) {
  if (a.k === 'play') return playCard(G, s, a.u, a.t);
  if (a.k === 'pow') return usePower(G, s, a.t);
  if (a.k === 'atk') return attack(G, s, a.u, a.t);
  if (a.k === 'end') { endTurn(G); return true; }
  return false;
}
const rotSum = b => { let t = 0; while (b > 0) { t += b; b >>= 1; } return t; };   // how much blight will take in total
function famValue(f) {
  if (f.hp <= 0) return 0;
  const d = CARDS[f.id];
  let v = f.atk * 1.1 + f.hp * 0.9 + (f.guard ? 1 : 0) + (f.ward ? f.atk * .5 + 1 : 0) + (f.drain ? f.atk * .5 : 0) + (f.venom ? 1 : 0) + (f.frostbite ? 1 : 0);
  if (d.pour || d.end || d.aura) v += 1.5;
  if (f.fz) v -= f.atk * .6;
  v -= Math.min(f.hp, rotSum(f.blight)) * 0.9;
  return Math.max(0, v);
}
function lifeValue(P) { const hp = P.hp - rotSum(P.blight) + P.armor * .7; return hp < 8 ? hp * 1.4 - 3.2 : hp; }
function cauldronValue(P) { let v = P.cauldron.length * 0.9; if (matchRecipe(P.cauldron)) v += 1.5; return v; }
function evaluate(G, s) {
  if (G.over) return G.win === s ? 1e5 : -1e5;
  const me = G.p[s], op = G.p[1 - s];
  let v = lifeValue(me) - lifeValue(op) * 1.15;
  v += me.board.reduce((a, f) => a + famValue(f), 0) - op.board.reduce((a, f) => a + famValue(f), 0) * 1.1;
  v += me.hand.reduce((a, h) => a + (CARDS[h.id].k === 'R' ? .6 : 1.1), 0) - op.hand.length * .3;
  v += cauldronValue(me) - cauldronValue(op) * .6;
  return v;
}
function aiChoose(G, s) {
  const base = evaluate(G, s);
  let best = null, bestV = base + 0.15;
  for (const a of actions(G, s)) {
    const X = clone(G); X.rs = (X.rs * 31 + 17) | 0;        // don't peek at the real dice
    if (!apply(X, s, a)) continue;
    const v = evaluate(X, s);
    if (v > bestV) { bestV = v; best = a; }
  }
  return best || { k: 'end' };
}

// ---------- the gauntlet ----------
const PITS = [
  { name: 'The Drain', story: 'The Undercroft’s shallowest pit. The crowd leans over the rail, mostly hoping to see you lose.' },
  { name: 'The Bone Ring', story: 'Old duels are buried in these walls. Some of them still scratch at night.' },
  { name: 'The Sump', story: 'Ink seeps from the ceiling and pools on the floor. Everything smells like a spell gone wrong.' },
  { name: 'The Hollow', story: 'The pit is so deep that the cheering reaches you a moment late.' },
  { name: 'The Crucible', story: 'The champion’s pit. Win here and the whole Undercroft learns your lord’s name.' },
];
const CHAMPS = [
  { id: 'vex', name: 'Magister Vex', rule: 'Gains 1 armor at the start of each of his turns.' },
  { id: 'grue', name: 'Mother Grue', rule: 'Her cauldron starts full, and she restores 2 health whenever she pours a brew.' },
  { id: 'hollow', name: 'The Hollow King', rule: 'His familiars have +1 attack.' },
];
const CHAMP = Object.fromEntries(CHAMPS.map(c => [c.id, c]));

function newRun(lordIdx, seed) {
  const lord = LORDS[lordIdx].id, r = mulberry(seed);
  const others = LORDS.filter(l => l.id !== lord).map(l => l.id);
  for (let i = others.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [others[i], others[j]] = [others[j], others[i]]; }
  const champ = CHAMPS[Math.floor(r() * CHAMPS.length)].id;
  const foes = PITS.map((p, i) => {
    const fl = others[i], L = LORD[fl];
    const pool = [...poolOf(L.el), ...poolOf(L.el), ...poolOf('neutral')];
    const deck = starterDeck(fl);
    for (let k = 0; k < i * 2; k++) deck.push(pool[Math.floor(r() * pool.length)]);
    const name = i === 4 ? CHAMP[champ].name : L.disciples[Math.floor(r() * L.disciples.length)];
    return { lord: fl, name, hp: PIT_HP[i], deck, champ: i === 4 ? champ : null };
  });
  return { v: 1, lord: lordIdx, seed, pit: 0, lives: LIVES, tries: 0, deck: starterDeck(lord), foes };
}
// After a duel: a win moves you to the next pit; a loss costs a life and you fight the same pit again.
// Returns false when the gauntlet is over (all lives gone).
function afterDuel(run, won) {
  if (won) { run.pit++; run.tries = 0; return true; }
  run.lives--; run.tries = (run.tries || 0) + 1;
  return run.lives > 0;
}
function duelFor(run, youName) {
  const foe = run.foes[run.pit], seed = (run.seed * 7 + run.pit * 131 + (run.tries || 0) * 977) | 0;
  const first = mulberry(seed)() < 0.5 ? 0 : 1;
  return newGame({ seed, first, p: [
    { lord: LORDS[run.lord].id, name: youName, hp: START_HP, deck: run.deck },
    { lord: foe.lord, name: foe.name, hp: foe.hp, deck: foe.deck, champ: foe.champ }] });
}
// Three cards to choose from after a win: mostly your lord's, sometimes plain.
function spoils(run) {
  const r = mulberry(run.seed * 13 + run.pit * 71 + 5), el = LORDS[run.lord].el;
  const own = poolOf(el), plain = poolOf('neutral'), out = [];
  let guard = 0;
  while (out.length < 3 && guard++ < 50) {
    const from = r() < 0.72 ? own : plain, id = from[Math.floor(r() * from.length)];
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

return { MAX_BOARD, MAX_HAND, MAX_INK, CAULDRON, START_HP, ELS, LORDS, LORD, lordOfEl, KW, CARDS, RECIPES, RECIPE, PITS, CHAMPS, CHAMP,
  matchRecipe, recipeHints, poolOf, reagentsOf, starterDeck, newGame, getRef, famOf, aliveF, validTargets, costOf, whyNot, canPlay,
  playCard, canPower, usePower, canAttack, attackTargets, attack, endTurn, actions, apply, aiChoose, evaluate, clone,
  LIVES, newRun, duelFor, afterDuel, spoils, mulberry };
})();
if (typeof module !== 'undefined') module.exports = Engine;
