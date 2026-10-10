# WEB//SLINGER

A polished, one-button web-swinging physics game for the browser.

**Play:** https://webline-rishi.vercel.app

The project uses an original spider-inspired hero and original procedural/vector visuals. It does not bundle official Marvel artwork, logos, audio, or game assets.

## The rule

There is only one gameplay input:

- **Hold SPACE / hold touch** → attach to the nearest reachable web point.
- **Release** → let go and preserve momentum.

There is no WASD movement and no mouse aiming.

### Forgiving magnetic web targeting

The web system is intentionally generous:

- It uses the **nearest reachable hook**, not a directional cone.
- A hook can still be selected **after the player has crossed it**.
- Holding the input continuously reacquires until a hook enters range.
- The currently preferred hook is visibly highlighted.

This keeps difficulty in swing timing and course design rather than frustrating targeting misses.

## Current game

- 18 handcrafted courses
- One-button desktop and mobile controls
- Magnetic nearest-hook targeting
- Momentum-preserving web physics
- Bounce pads and wall bumpers
- Moving/orbiting web points
- Hazards, checkpoints and finish gates
- Red/blue spider-inspired presentation
- Web-strand tether rendering
- Procedural masked stick-hero animation
- Speed trails, particles, camera feedback and generated audio
- 1–3 star course ratings
- Best-time and unlock persistence

## Development

```bash
npm install
npm run dev
```

Validation and production build:

```bash
npm test
```

## Stack

Phaser 3 + Vite + JavaScript modules + Web Audio + localStorage.

## License

MIT for the original code in this repository.
