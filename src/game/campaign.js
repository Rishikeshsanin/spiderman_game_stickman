export const THEMES = {
  station: {
    top: 0x050914, bottom: 0x10243d, accent: 0x55e7ff, warning: 0xff4b55,
    metal: 0x18283a, panel: 0x0b1522, glow: 0xbdf7ff, star: 0xffffff
  },
  breach: {
    top: 0x040811, bottom: 0x19203a, accent: 0x68f4ff, warning: 0xff5261,
    metal: 0x1b2433, panel: 0x0b1019, glow: 0xe4fdff, star: 0xffffff
  },
  reactor: {
    top: 0x10060a, bottom: 0x41141c, accent: 0xffb24a, warning: 0xff334b,
    metal: 0x2b2023, panel: 0x140b0e, glow: 0xffe8b6, star: 0xfff0d8
  },
  exterior: {
    top: 0x01030a, bottom: 0x081533, accent: 0x60dfff, warning: 0xff5366,
    metal: 0x172338, panel: 0x09111f, glow: 0xe9fbff, star: 0xffffff
  },
  collapse: {
    top: 0x08040a, bottom: 0x35101b, accent: 0x7deaff, warning: 0xff304a,
    metal: 0x241820, panel: 0x0d090d, glow: 0xffffff, star: 0xffe7eb
  }
};

const a = (x,y,extra={}) => ({type:'anchor',x,y,kind:'stable',...extra});
const f = (x,y,extra={}) => ({type:'anchor',x,y,kind:'fragile',...extra});
const q = (x,y,extra={}) => ({type:'anchor',x,y,kind:'pulse',period:2.2,duty:.62,...extra});
const p = (x,y,w=180,extra={}) => ({type:'pad',x,y,w,...extra});
const z = (x,y,w,h,extra={}) => ({type:'hazard',x,y,w,h,...extra});
const l = (x,y,w,h,extra={}) => ({type:'laser',x,y,w,h,period:2.4,duty:.56,...extra});
const v = (x,y,w,h,fx,fy,extra={}) => ({type:'vent',x,y,w,h,fx,fy,...extra});
const d = (x,y,w,h,extra={}) => ({type:'debris',x,y,w,h,...extra});
const r = (x,y,radius,extra={}) => ({type:'rotor',x,y,radius,arms:3,speed:1.1,...extra});
const c = (x,y) => ({type:'checkpoint',x,y});

export const MISSIONS = [
  {
    id:1, chapter:1, chapterName:'SYSTEM FAILURE', title:'Wake',
    environment:'station', length:2100, par:13.5, spawn:[120,505], gravity:{x:0,y:900},
    briefing:'KESTREL-7 is losing attitude control. Your mobility rig is dead. The emergency tether still answers.',
    outro:'Tether online. Main transit is gone. Engineering access is the only route left.',
    objects:[
      a(410,250),a(790,210),p(980,650,200,{boost:1.32}),a(1270,275),a(1660,205),c(1120,480)
    ]
  },
  {
    id:2, chapter:1, chapterName:'SYSTEM FAILURE', title:'Gravity Loss',
    environment:'station', length:2450, par:15.0, spawn:[120,500], gravity:{x:0,y:610},
    briefing:'Artificial gravity is collapsing section by section. Don’t fight the drift. Use it.',
    outro:'Core systems just went red. Blast shutters are sealing the reactor ring.',
    objects:[
      a(390,255),a(760,350),z(980,0,110,340),a(1160,235,{move:'y',amp:90,speed:1.2}),
      p(1460,665,210,{boost:1.36}),a(1780,260),z(2050,505,115,315),a(2260,210),c(1350,490)
    ]
  },
  {
    id:3, chapter:1, chapterName:'SYSTEM FAILURE', title:'Blast Door',
    environment:'station', length:2700, par:16.5, spawn:[120,500], gravity:{x:0,y:800},
    briefing:'The shutter cycle is corrupted. Cross each aperture before it seals.',
    outro:'You made the reactor ring. Then the hull alarms begin.',
    objects:[
      a(390,250),l(690,0,100,375,{phase:.0}),l(690,535,100,285,{phase:.0}),
      a(960,300),a(1320,215,{move:'y',amp:95,speed:1.5}),
      l(1580,0,100,430,{phase:.7}),l(1580,610,100,210,{phase:.7}),
      a(1890,260),p(2140,660,180,{boost:1.45}),a(2470,220),c(1450,485)
    ]
  },
  {
    id:4, chapter:2, chapterName:'DECOMPRESSION', title:'Hull Breach',
    environment:'breach', length:3000, par:18.0, spawn:[120,470], gravity:{x:0,y:720},
    briefing:'Deck C is open to vacuum. Every loose object is becoming a projectile.',
    outro:'Pressure is gone. The next section has no floor, no ceiling, and no forgiveness.',
    objects:[
      a(420,250),v(650,80,420,620,150,-80),d(870,315,120,38,{move:'y',amp:150,speed:1.0}),
      a(1120,210),f(1470,290),v(1640,60,380,690,190,45),a(1980,225),
      d(2260,450,150,42,{move:'y',amp:170,speed:1.4}),a(2630,260),c(1550,430)
    ]
  },
  {
    id:5, chapter:2, chapterName:'DECOMPRESSION', title:'Vacuum Run',
    environment:'breach', length:3250, par:19.5, spawn:[120,410], gravity:{x:0,y:260},
    briefing:'Minimal gravity. Momentum is now your only engine. Fragile nodes will shear after one tether.',
    outro:'Emergency bulkheads are ahead. Security power is unstable — lasers are cycling blind.',
    objects:[
      f(390,205),a(760,335),f(1110,170),z(1310,0,105,360),a(1530,300),
      f(1900,190),v(2060,60,430,680,110,-65),a(2400,330),f(2790,180),a(3100,265),c(1700,410)
    ]
  },
  {
    id:6, chapter:2, chapterName:'DECOMPRESSION', title:'Lockdown',
    environment:'breach', length:3500, par:20.5, spawn:[120,485], gravity:{x:0,y:760},
    briefing:'Security grid is firing on backup power. Watch the rhythm. Move between pulses.',
    outro:'You’re through. The reactor is venting heat directly into the transit spine.',
    objects:[
      a(400,250),l(700,120,40,520,{period:2.0,duty:.52,phase:.1}),a(930,285),
      q(1280,220,{period:2.1,duty:.65}),l(1540,0,52,390,{period:2.35,duty:.56,phase:.7}),
      l(1540,585,52,235,{period:2.35,duty:.56,phase:.7}),a(1820,260),
      q(2210,190,{period:1.8,duty:.6,phase:.3}),l(2470,190,42,470,{period:1.9,duty:.50,phase:1.0}),
      a(2750,300),p(3050,660,190,{boost:1.5}),a(3340,225),c(1900,460)
    ]
  },
  {
    id:7, chapter:3, chapterName:'REACTOR', title:'Heat Sink',
    environment:'reactor', length:3700, par:21.5, spawn:[120,500], gravity:{x:0,y:860},
    briefing:'Coolant is boiling off. Orange is hot. Red is death. Keep your line moving.',
    outro:'The turbine chamber is still spinning — but its control ring has detached.',
    objects:[
      a(410,250),z(690,560,180,260),p(880,650,190,{boost:1.48}),a(1180,210),
      l(1440,0,55,410,{period:1.8,duty:.52,phase:.4}),a(1700,285),
      z(1970,0,130,360),p(2200,660,190,{boost:1.55}),a(2520,205),
      l(2800,460,55,360,{period:2.0,duty:.55,phase:.9}),a(3070,270),a(3500,220),c(2050,460)
    ]
  },
  {
    id:8, chapter:3, chapterName:'REACTOR', title:'Turbine',
    environment:'reactor', length:3900, par:23.0, spawn:[120,500], gravity:{x:0,y:800},
    briefing:'Three turbine assemblies are free-spinning. Their magnetic collars still work.',
    outro:'Reactor access is open. Core containment is failing faster than predicted.',
    objects:[
      a(400,250),r(850,360,150,{arms:3,speed:1.0}),a(850,360,{orbit:205,speed:1.05}),
      a(1380,210),r(1770,350,165,{arms:4,speed:-1.25}),f(1770,350,{orbit:225,speed:-1.2}),
      p(2190,665,190,{boost:1.5}),a(2520,230),r(2920,360,150,{arms:3,speed:1.45}),
      a(2920,360,{orbit:210,speed:1.35}),a(3500,230),c(2220,455)
    ]
  },
  {
    id:9, chapter:3, chapterName:'REACTOR', title:'Core Transit',
    environment:'reactor', length:4200, par:24.0, spawn:[120,500], gravity:{x:0,y:900},
    briefing:'Containment pulses are knocking magnetic nodes offline. Read the flashes and commit.',
    outro:'Core transit is gone behind you. The only remaining path is outside the station.',
    objects:[
      q(410,245,{period:1.8,duty:.60}),q(800,300,{period:2.0,duty:.58,phase:.5}),
      l(1050,0,55,400,{period:1.7,duty:.50,phase:.2}),a(1280,210),
      q(1650,285,{period:1.6,duty:.58,phase:.9}),p(1920,660,190,{boost:1.55}),
      q(2250,210,{period:1.75,duty:.54,phase:.4}),z(2500,510,125,310),
      q(2790,300,{period:1.6,duty:.60,phase:.7}),l(3090,120,55,530,{period:1.8,duty:.48,phase:.1}),
      a(3380,220),q(3820,260,{period:1.7,duty:.62,phase:.6}),c(2150,460)
    ]
  },
  {
    id:10, chapter:4, chapterName:'OUTSIDE', title:'Open Space',
    environment:'exterior', length:4400, par:25.5, spawn:[120,380], gravity:{x:0,y:75},
    briefing:'External maintenance route. No gravity. No atmosphere. Kestrel-7 is rotating beneath you.',
    outro:'Solar spine ahead. The escape pod bay is on the far side of the array.',
    objects:[
      a(430,190),f(820,340),d(1110,220,170,40,{move:'y',amp:180,speed:.8}),
      a(1360,175),f(1770,360),a(2150,190,{orbit:100,speed:.8}),d(2470,470,180,44,{move:'y',amp:180,speed:1.1}),
      f(2800,210),a(3190,360),a(3620,180,{move:'y',amp:105,speed:1.0}),f(4050,300),c(2300,380)
    ]
  },
  {
    id:11, chapter:4, chapterName:'OUTSIDE', title:'Solar Array',
    environment:'exterior', length:4700, par:27.0, spawn:[120,390], gravity:{x:0,y:120},
    briefing:'The array is flexing with the station. Panels cut across the route like blades.',
    outro:'Escape bay is visible. So is the reactor plume. You have seconds, not minutes.',
    objects:[
      a(410,200),z(700,500,260,70),f(980,340),z(1260,120,300,70),a(1540,190),
      d(1880,380,260,60,{move:'y',amp:160,speed:1.0}),a(2200,350,{orbit:115,speed:1.0}),
      z(2550,140,300,70),f(2860,210),z(3180,510,280,70),a(3490,350),
      d(3840,260,250,58,{move:'y',amp:190,speed:1.2}),a(4210,190),f(4550,320),c(2500,380)
    ]
  },
  {
    id:12, chapter:5, chapterName:'COLLAPSE', title:'Final Escape',
    environment:'collapse', length:5600, par:31.0, spawn:[120,490], gravity:{x:0,y:720},
    briefing:'KESTREL-7 is breaking apart. The escape pod is drifting clear of the bay. Keep ahead of the collapse.',
    outro:'Docking seal confirmed. Kestrel-7 falls away behind you. Earth is quiet below.',
    chaser:{start:-420,speed:125},
    objects:[
      a(400,250),q(780,210,{period:1.7,duty:.62}),z(1030,510,120,310),p(1240,660,190,{boost:1.58}),
      f(1540,190),l(1790,0,55,410,{period:1.7,duty:.52,phase:.6}),a(2040,300),
      r(2390,350,150,{arms:3,speed:1.45}),a(2390,350,{orbit:210,speed:1.35}),
      f(2850,205),v(3050,70,430,660,135,-40),q(3360,310,{period:1.55,duty:.58}),
      z(3650,0,120,370),p(3900,655,190,{boost:1.62}),a(4220,210),
      d(4540,350,180,50,{move:'y',amp:190,speed:1.25}),f(4860,295),a(5200,190),c(3000,450)
    ]
  }
];

export function missionById(id) {
  return MISSIONS.find(m => m.id === id) || MISSIONS[0];
}

export function chapters() {
  const seen = new Map();
  for (const mission of MISSIONS) {
    if (!seen.has(mission.chapter)) {
      seen.set(mission.chapter, { number: mission.chapter, name: mission.chapterName, missions: [] });
    }
    seen.get(mission.chapter).missions.push(mission);
  }
  return [...seen.values()];
}
