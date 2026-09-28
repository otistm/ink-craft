# Ink Craft: notes for Claude Code

Ink Craft is a Hearthstone- and Magic-like card game drawn like a paper-and-ink cartoon. It's a sister game to Ink Nine (`../ink-nine`), Ink Rally (`../ink-rally`), Ink of Arms (`../ink-of-arms`) and Ink Sky (`../ink-sky`) and shares their look, fonts and way of working. You're a mage duelling in the Undercroft, an underground arena. You swear an oath to one of seven mage lords, which binds you to their element, and you win by brewing: reagents go in your cauldron and pour into your next spell.

## Who you're working with
Otis is the designer. He doesn't read code. He judges changes by playing them on his phone.
- Explain every change in plain language: what the player will see and feel, not how the code works.
- Keep replies short. Ask one question at a time when a design decision is his to make.

## How the project is built
- **No build step, no frameworks, no npm packages in the game.** Plain HTML, CSS and JavaScript files served as-is. The only outside code is Google Fonts.
- `index.html`: the front page (an ink cauldron bubbling with the seven lords' sigils circling it, and a Play button).
- `play/index.html`: the game page. It loads `styles.css` and then the scripts in `play/js/` **in the order listed there**.
- The scripts are classic scripts that share one global scope (`"use strict"` at the top of each). Order matters: a file can only use things defined in files above it *while it is loading*. Calls that happen later (on tap, during an animation) can use anything.
- `manifest.webmanifest`, `sw.js`, `icons/`: home-screen install. When you change files the service worker caches, bump `CACHE` in `sw.js`.
- `tools/check.js`: tests the rules without a browser. Run `node tools/check.js` (or `node tools/check.js quick`).

| File | What's in it |
|---|---|
| config.js | `VERSION` |
| engine.js | The rules, with no drawing: the seven lords and their oath powers, keywords, every card, recipes, the duel (turns, ink, the cauldron, brewing, attacks, blight, freezing), the rival mages' brains, and the gauntlet (pits, champions, lives, spoils). Exposed as `Engine`. Tuning numbers live at the top |
| art.js | Ink drawings as SVG: the element patterns, lord sigils, familiars, reagents, card faces (small and big), portraits, the trophy, the cauldron |
| ui.js | The gauntlet in progress (`run`), the duel (`G`), the save, animation helpers (`anim`, `squash`, `nope`, `floatAt`), screens, overlay cards (`sheet`), one-time tips (`tipOnce`) |
| duel.js | The duel screen: rendering both sides, tapping and targeting, the info strip, animating the events the rules report, the rival's turn, pause |
| screens.js | Home, the oath card, the pit intro, spoils, the satchel, the Grimoire, how to play, victory and defeat, saving and resuming the gauntlet |
| main.js | Startup (always last) |

## How it plays
- **Oaths.** The home screen lists the seven lords: Ignis (Fire), Lumi (Light), Morrigan (Blight), Orin (Iron), Ren (Ice), Sable (Void), Volta (Storm). Swearing to one starts a gauntlet. You only ever get that element's cards and plain cards.
- **Duels.** Both mages start at 20 health (rivals have less, see `PIT_HP`). Ink goes up by 1 a turn to 8. First player draws 3, second draws 4 and starts with Salt in the cauldron. Hand holds 8, the board holds 4 familiars a side. An empty satchel costs 1, 2, 3… health per draw.
- **Cards.** Familiars (square art) fight; they can attack the turn after they're summoned unless they're Swift. Reagents (round art) go in the cauldron, which holds 3. Spells (arched art) pour the whole cauldron: the spell happens with `amp` added to its numbers, repeats for each Echo stone, jumps for each Copper wire, then each reagent adds its own effect in the order it went in, then any recipe fires. A full brew (3 reagents) draws a card.
- **Recipes.** 17 of them: two per lord and three plain ones, each exactly three reagents in any order. Philosopher's dust stands in for any one reagent. Found recipes are saved in the Grimoire. Lumi is "guided": she sees every recipe hint, even unfound ones.
- **Keywords.** Guard (must be attacked first; spells ignore it), Swift, Ward (ignores the first damage), Drain (heals you), Venom (1 blight on hit), Frostbite (freezes on hit). Blight deals its number at the start of its owner's turn, going through armor and Ward, then halves. Frozen familiars miss their next attack and thaw at the end of their own turn.
- **Oath powers.** Once a turn, 1 to 2 ink. They matter a lot: the check showed lords win roughly 20 points more often with them.
- **The gauntlet.** 5 pits against rivals sworn to the other lords, getting tougher; pit 5 is a champion with a rule of their own (`CHAMPS`: Magister Vex gains armor, Mother Grue starts with a full cauldron and heals when she pours, the Hollow King's familiars hit harder). After each win you pick 1 of 3 cards for your satchel or leave them. You have 3 lives: a loss costs one and you fight that pit again. Win pit 5 for your lord's trophy.
- **The rival's brain** (`aiChoose`) tries every legal move on a copy of the duel, scores the result with `evaluate`, and plays the best one until nothing helps. It rolls different dice in its copies so it can't peek at random outcomes.
- **Balance check:** `node tools/check.js` has the rival brain duel itself (every lord against every other) and run 40 gauntlets per lord. At 0.1.0, lord-against-lord win rates are about 44 to 58% (Morrigan highest), and a bot wins the gauntlet 28 to 65% of the time. A thoughtful human should do better. Re-run it after changing numbers and tell Otis how the rates moved.

## Every change
1. Work on a new branch, never directly on `main`.
2. Bump `VERSION` in `play/js/config.js` (patch for fixes, minor for features) and add a line to `CHANGELOG.md` in plain language.
3. Run `node tools/check.js` if you touched the rules or card numbers.
4. Test locally: run `python -m http.server 8030` in the repo folder and open http://localhost:8030/play/ at a phone size (390 × 844). Also check a small phone (375 × 667) and a tall, wide screen (a foldable, about 640 × 860): the hand must never cover the End turn button.

## Protect players' saved progress
- `inkcraft-save`: `{ trophies: [7 bools], recipes: { id: true }, tips: {} }`, one trophy per lord by position in `LORDS`. Add new lords at the end.
- `inkcraft-run`: `{ v: 1, run, phase, G, offer, at }`. `run` is the gauntlet (`newRun`), `G` the duel in progress (plain data, including its random seed `rs`). If you change either shape in a way a default can't cover, bump `v` and make `loadRun()` convert or ignore older ones.
- Never rename a lord `id`, element key, card `id`, recipe `id`, keyword or champion `id`; saves store them.

## Look and feel (same as the other Ink games; keep it consistent)
- Paper and ink only: white `#fff` and black `#000`, with grey `#5c5c5c` only for secondary text. Never color. The elements are told apart by ink patterns behind the card art (`PATTERNS` in art.js): Fire diagonal hatching, Light little crosses, Blight spatters, Iron riveted grid, Ice triangles, Void black with white stars (the only inverted one), Storm zigzags, Plain fine dots.
- Card kinds are told apart by the shape of the art window: familiars square, spells arched, reagents round.
- Attack is a solid black circle, health a white one (dashed when hurt). Guard is a second outline, Ward a dashed ring, Frozen an ice hatch and a snowflake badge, Blight a black drop with its number. Targets pulse with a dashed ring.
- Outlines are clean 2–2.5px black lines with hard offset shadows (7px 8px on panels, 4px 5px on event cards and big cards, 3px 4px on small cards, familiars and buttons). No blur, no soft gradients.
- Fonts: Fraunces (display, italic 900 for titles and names, upright 900 for numbers) and Figtree (UI, 600–800).
- Shared components copied from the sister games: `.panel`, `.btn` and `.btn.ghost`, `.event`, `.board`, `.how`, `.prog`, `.award` and the trophy, the round pause button.
- Motion follows Disney's principles: squash and stretch, anticipation, follow-through, slow in and out. Familiars wind up before they lunge; dying ones squash into an ink splat.
- Mobile first, portrait, one thumb. Respect safe areas and `prefers-reduced-motion`.
- Writing: sentence case, short and plain, numbers as digits, no jargon.

## Smoke test
- The front page shows the bubbling cauldron with sigils circling it and a Play button. Play opens the home screen with all seven lords.
- Tapping a lord opens its oath card (power, what the oath binds you to, recipes found). Swear the oath: the pit intro shows 5 dots with a crown, the rival, both healths and 3 lives.
- Enter the pit: cards fan into your hand. Tap a reagent: the info strip explains it and "Add to cauldron" drops it in. Tap a spell with a full enough cauldron: the strip says what the brew adds. Tap a target: it pours, numbers float up.
- The right three reagents make a recipe: "New recipe: …" appears, and it's in the Grimoire afterwards.
- Summon a familiar: it drops in. Next turn it's raised with a little arrow; tap it, then an enemy: it lunges.
- End turn: the rival's cards appear big in the middle so you can read them, then "Your turn".
- Win: "Victory", then Spoils (pick 1 of 3). Lose: a life is gone and "Fight again" replays the pit.
- Pause, then Save and go to the home screen: the lord's card says where you stopped. Refreshing mid-duel comes straight back.
- No errors in the browser console.
