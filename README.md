# THREAD//RUNNER

A fast, cinematic, physics-based web-swinging stickman game that runs directly in the browser.

> **V1 goal:** make movement feel satisfying first. The project uses an original hero and original procedural/vector visuals; it does not ship Marvel/Spider-Man artwork, logos, music, character models, or other copyrighted assets.

## What is playable now

- Momentum-based grapple/web swinging with a soft rope constraint
- Running, jumping, air control, front flips and backflips
- Flow/combo meter with perfect-release and near-miss rewards
- Five escalating handcrafted/procedural level themes
  1. Rooftop Rush
  2. Downtown Velocity
  3. Construction Chaos
  4. Neon Overdrive
  5. Redline
- Drones, cranes, signs and billboards as hazards
- Cinematic follow camera, speed zoom, screen shake and speed lines
- Procedural skyline rendering, lit windows, parallax, rain and particles
- Desktop mouse/keyboard controls
- Touch/mobile controls
- Local progression, level unlocking and best-score saving
- Pause, restart, level-select and result screens
- Zero runtime dependencies and no external art/audio downloads

## Controls

| Action | Desktop | Touch |
| --- | --- | --- |
| Attach web | Hold mouse / `Space` in air | Hold **WEB** |
| Release web | Release mouse / `Space` | Release **WEB** |
| Pump / air steer | `A` / `D` or arrow keys | Left / Right |
| Jump | `Space` on a rooftop | Automatic via WEB flow / touch controls |
| Flip | `W` / `S` | **FLIP** |
| Pause | `Esc` or HUD button | HUD button |

## Run locally

No build step is required.

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Quality checks

```bash
npm test
```

The test command checks JavaScript syntax, required files, UI anchors, level generation, score thresholds and baseline geometry. GitHub Actions runs the same checks on pushes and pull requests.

## Tech

- HTML5 Canvas 2D
- Vanilla JavaScript ES modules
- CSS glassmorphism UI
- Web Audio API for generated game tones
- `localStorage` for progression

## V1 architecture

```text
index.html
styles.css
js/
  main.js      UI, menus, save data, mobile controls
  game.js      game loop, physics, rendering, collisions, scoring
  levels.js    level specs + deterministic city generation
  audio.js     procedural Web Audio cues
scripts/
  smoke-test.mjs
```

## Next upgrades

The engine is intentionally structured so V2 can add boss chase sequences, collectible routes, alternate suits/characters, richer trick chains, endless mode, music, more advanced animation rigs, authored set pieces, accessibility settings and leaderboards without rewriting the core swing system.

## License

MIT for the original source code in this repository. Third-party trademarks and copyrighted characters are not included in the project license.
