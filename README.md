# WEBLINE

**One button. Pure momentum.**

WEBLINE is a browser physics game inspired by the simplicity of one-button hook games: the character is always moving and the player only controls when to attach and release the line.

## Play

**https://thread-runner.vercel.app**

## Controls

- **Hold `SPACE`** — automatically attach to the best usable hook
- **Release `SPACE`** — preserve momentum and fly
- **Touch / hold anywhere** — mobile equivalent

There is no WASD movement and no mouse aiming.

## V2 gameplay

- 18 handcrafted courses
- Auto-targeting hook system
- Momentum-preserving rope physics
- Bounce pads and wall bumpers
- Moving and orbiting hooks
- Obstacle gates and precision gaps
- Checkpoints on longer levels
- Finish-line progression
- Instant restarts
- Time + restart based star ratings
- Local level unlocks and best times
- Procedural stickman animation
- Speed trails, particles, camera shake, responsive zoom
- Generated Web Audio feedback
- Desktop and mobile input

## Stack

- Phaser 3
- Vite
- JavaScript modules
- Procedural vector graphics — no external game-art assets
- Web Audio API
- LocalStorage progression

## Development

```bash
npm install
npm run dev
```

Quality check:

```bash
npm test
```

Production build:

```bash
npm run build
```

## Design rule

The game deliberately keeps the controls minimal: **movement comes from physics, not directional controls**. Course design creates the difficulty.

## License

MIT for the original code in this repository. Third-party trademarks, characters, and art are not included.
