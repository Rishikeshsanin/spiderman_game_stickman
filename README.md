# TETHER//ZERO

**One line between you and space.**

TETHER//ZERO is a compact one-button orbital escape game. Kestrel-7 is breaking apart, your mobility rig is offline, and the emergency magnetic tether is the only system still answering.

## Play

Production: **https://tether-zero-rishi.vercel.app**

## Controls

There is one gameplay input:

- **Hold `SPACE` / hold touch** — tether to the nearest active magnetic node.
- **Release** — disconnect and preserve momentum.

The targeting is deliberately forgiving: crossed anchors remain valid if they are nearest, and holding the input keeps reacquiring until a node enters range.

## Complete campaign

Five chapters / twelve missions:

1. **SYSTEM FAILURE** — Wake, Gravity Loss, Blast Door
2. **DECOMPRESSION** — Hull Breach, Vacuum Run, Lockdown
3. **REACTOR** — Heat Sink, Turbine, Core Transit
4. **OUTSIDE** — Open Space, Solar Array
5. **COLLAPSE** — Final Escape

The campaign introduces fragile one-use anchors, pulsing magnetic nodes, decompression vents, moving debris, security lasers, turbine rotors, bounce plates, zero-gravity exterior traversal, checkpoints, a pursuing collapse wall, and a final escape-pod sequence.

## Systems

- Momentum-preserving rope constraint
- Magnetic nearest-anchor targeting
- Tether Snap high-skill release boost
- Moving/orbiting/fragile/pulse anchors
- Dynamic gravity and decompression forces
- Lasers, turbines, debris and collision hazards
- Chapter briefings, mission log, results and epilogue
- Best times, ratings and mission unlocking in localStorage
- Procedural station/exterior rendering and particles
- Generated Web Audio feedback
- Desktop and mobile input

## Development

```bash
npm install
npm run dev
```

Validation + production build:

```bash
npm test
```

## Stack

Phaser 3 + Vite + JavaScript modules + Web Audio API + localStorage.

All game visuals and audio are original/procedural; no third-party character or franchise assets are bundled.

## License

MIT for the original code in this repository.
