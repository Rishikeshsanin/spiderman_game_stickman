const palette = {
  dusk: { top: '#071323', bottom: '#19294a', haze: '#46669a', accent: '#67e8f9', moon: '#dcecff' },
  sunset: { top: '#160d24', bottom: '#62334f', haze: '#db6a73', accent: '#ff8fb7', moon: '#ffd9b2' },
  storm: { top: '#04090e', bottom: '#17262e', haze: '#32525e', accent: '#8cecff', moon: '#bde7ef' },
  neon: { top: '#08051a', bottom: '#25103c', haze: '#592a82', accent: '#bb79ff', moon: '#f1d7ff' },
  inferno: { top: '#13070a', bottom: '#4b1517', haze: '#c23e2d', accent: '#ffb25c', moon: '#ffd4a2' }
};

export const LEVELS = [
  {
    id: 1,
    name: 'Rooftop Rush',
    subtitle: 'Find the rhythm above the city.',
    theme: 'dusk',
    length: 4100,
    difficulty: 1,
    gravity: 1050,
    targetScore: [3500, 7000, 11000],
    buildingDensity: 0.90,
    gapRange: [80, 165],
    widthRange: [185, 330],
    heightRange: [210, 430],
    hazards: [
      { type: 'sign', x: 1650, y: 420, w: 105, h: 20 },
      { type: 'drone', x: 2860, y: 340, radius: 24, drift: 58 }
    ]
  },
  {
    id: 2,
    name: 'Downtown Velocity',
    subtitle: 'Long gaps. Faster streets. No hesitation.',
    theme: 'sunset',
    length: 5200,
    difficulty: 2,
    gravity: 1090,
    targetScore: [6000, 11000, 17000],
    buildingDensity: 0.84,
    gapRange: [110, 230],
    widthRange: [180, 310],
    heightRange: [180, 480],
    hazards: [
      { type: 'drone', x: 1220, y: 300, radius: 24, drift: 90 },
      { type: 'sign', x: 2380, y: 350, w: 130, h: 18 },
      { type: 'drone', x: 3650, y: 420, radius: 26, drift: 110 },
      { type: 'billboard', x: 4540, y: 250, w: 165, h: 85 }
    ]
  },
  {
    id: 3,
    name: 'Construction Chaos',
    subtitle: 'Cranes move. Platforms fall. Keep swinging.',
    theme: 'storm',
    length: 6100,
    difficulty: 3,
    gravity: 1120,
    targetScore: [8500, 15000, 23000],
    buildingDensity: 0.78,
    gapRange: [140, 280],
    widthRange: [160, 300],
    heightRange: [160, 500],
    rain: true,
    hazards: [
      { type: 'crane', x: 1320, y: 205, length: 330, speed: .55 },
      { type: 'drone', x: 2470, y: 330, radius: 26, drift: 130 },
      { type: 'crane', x: 3520, y: 250, length: 290, speed: -.65 },
      { type: 'sign', x: 4740, y: 390, w: 140, h: 18 },
      { type: 'drone', x: 5560, y: 280, radius: 28, drift: 145 }
    ]
  },
  {
    id: 4,
    name: 'Neon Overdrive',
    subtitle: 'The skyline turns electric.',
    theme: 'neon',
    length: 7200,
    difficulty: 4,
    gravity: 1140,
    targetScore: [12000, 21000, 32000],
    buildingDensity: 0.75,
    gapRange: [160, 315],
    widthRange: [165, 290],
    heightRange: [150, 520],
    hazards: [
      { type: 'drone', x: 980, y: 320, radius: 25, drift: 130 },
      { type: 'billboard', x: 1940, y: 270, w: 170, h: 90 },
      { type: 'drone', x: 3120, y: 390, radius: 28, drift: 160 },
      { type: 'crane', x: 4250, y: 210, length: 340, speed: .82 },
      { type: 'drone', x: 5480, y: 280, radius: 28, drift: 180 },
      { type: 'sign', x: 6460, y: 355, w: 170, h: 18 }
    ]
  },
  {
    id: 5,
    name: 'Redline',
    subtitle: 'A collapsing skyline at maximum speed.',
    theme: 'inferno',
    length: 8200,
    difficulty: 5,
    gravity: 1160,
    targetScore: [16000, 28000, 42000],
    buildingDensity: 0.70,
    gapRange: [185, 350],
    widthRange: [150, 280],
    heightRange: [140, 540],
    hazards: [
      { type: 'crane', x: 1080, y: 210, length: 320, speed: .9 },
      { type: 'drone', x: 2180, y: 350, radius: 29, drift: 190 },
      { type: 'billboard', x: 3460, y: 245, w: 180, h: 95 },
      { type: 'crane', x: 4630, y: 220, length: 370, speed: -1.0 },
      { type: 'drone', x: 5940, y: 310, radius: 30, drift: 210 },
      { type: 'drone', x: 7080, y: 390, radius: 30, drift: 230 }
    ]
  }
];

function mulberry32(seed) {
  return function rand() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const lerp = (a, b, t) => a + (b - a) * t;

export function buildLevel(levelIndex) {
  const spec = LEVELS[levelIndex];
  const rand = mulberry32(9301 + spec.id * 771);
  const ground = 760;
  const buildings = [];
  const anchors = [];
  let x = -320;
  let index = 0;

  while (x < spec.length + 800) {
    const w = lerp(spec.widthRange[0], spec.widthRange[1], rand());
    let h = lerp(spec.heightRange[0], spec.heightRange[1], rand());
    if (index < 2) h = 220 + index * 35;
    const y = ground - h;
    const depth = rand();
    const variant = Math.floor(rand() * 4);
    buildings.push({ x, y, w, h, depth, variant, seed: rand() });

    anchors.push({ x: x + w * (0.18 + rand() * .64), y: y - (110 + rand() * 150), type: 'air' });
    if (w > 230 && rand() > .46) anchors.push({ x: x + w * .72, y: y - 50 - rand() * 80, type: 'roof' });

    let gap = lerp(spec.gapRange[0], spec.gapRange[1], rand());
    if (index < 3) gap *= .58;
    if (rand() > spec.buildingDensity) gap *= 1.28;
    x += w + gap;
    index += 1;
  }

  buildings.push({ x: spec.length + 100, y: 250, w: 360, h: ground - 250, depth: .9, variant: 3, seed: .5 });
  anchors.push({ x: spec.length + 120, y: 185, type: 'finish' });

  return {
    ...spec,
    palette: palette[spec.theme],
    ground,
    buildings,
    anchors,
    hazards: spec.hazards.map(h => ({ ...h, baseX: h.x, baseY: h.y }))
  };
}
