const THEMES = {
  sky:   { top:0x071b45, bottom:0x1858a8, accent:0xe62b3d, secondary:0x1464d2, soft:0xffffff, hazard:0x081124 },
  mint:  { top:0x07142e, bottom:0x263f86, accent:0xf03a4d, secondary:0x2672df, soft:0xf8fbff, hazard:0x070d1b },
  dusk:  { top:0x180b21, bottom:0x7b2337, accent:0xef334b, secondary:0x154dc2, soft:0xffffff, hazard:0x0c0b18 },
  neon:  { top:0x090b27, bottom:0x29266e, accent:0xff334f, secondary:0x3b8cff, soft:0xffffff, hazard:0x060714 },
  void:  { top:0x030611, bottom:0x121e46, accent:0xef3047, secondary:0x1d65d8, soft:0xeaf6ff, hazard:0x02040b },
  solar: { top:0x16070d, bottom:0x8a2630, accent:0xff4056, secondary:0x1552bf, soft:0xffffff, hazard:0x09060c }
};

const h=(x,y,extra={})=>({type:'hook',x,y,...extra});
const p=(x,y,w=190,extra={})=>({type:'pad',x,y,w,...extra});
const z=(x,y,w,hgt,extra={})=>({type:'hazard',x,y,w,h:hgt,...extra});
const c=(x,y)=>({type:'checkpoint',x,y});

export const LEVELS = [
  { name:'First Web', theme:'sky', length:1800, par:10.5, spawn:[110,540], finishY:430, objects:[h(430,280),h(880,220),h(1320,300),p(1080,650,200),c(920,520)] },
  { name:'Web Chain', theme:'mint', length:2050, par:12.0, spawn:[110,500], finishY:390, objects:[h(380,260),h(720,350),h(1060,220),h(1450,330),p(900,690,180),c(1100,520)] },
  { name:'Slingshot', theme:'dusk', length:2200, par:12.5, spawn:[110,480], finishY:420, objects:[h(430,250),p(720,650,230,{boost:1.35}),h(1040,240),p(1300,610,190,{boost:1.45}),h(1660,230),c(1120,500)] },
  { name:'Underpass', theme:'sky', length:2350, par:13.0, spawn:[110,520], finishY:390, objects:[h(390,330),z(650,0,120,390),h(880,280),z(1130,520,130,300),h(1390,210),h(1810,300),c(1260,470)] },
  { name:'Web Sense', theme:'mint', length:2500, par:14.0, spawn:[110,510], finishY:390, objects:[h(420,270,{move:'y',amp:85,speed:1.3}),h(850,230,{move:'x',amp:120,speed:1.0}),p(1120,655,210),h(1450,280,{move:'y',amp:105,speed:1.6}),h(1980,235),c(1250,500)] },
  { name:'Needle Thread', theme:'neon', length:2700, par:15.0, spawn:[110,500], finishY:360, objects:[h(390,270),z(650,0,130,300),z(650,515,130,320),h(930,290),z(1250,100,125,340),z(1250,600,125,260),h(1530,230),p(1800,655,180,{boost:1.5}),h(2200,260),c(1500,500)] },
  { name:'Pendulum', theme:'dusk', length:2800, par:16.0, spawn:[110,520], finishY:360, objects:[h(450,250,{orbit:80,speed:1.0}),h(900,250,{orbit:105,speed:-1.2}),h(1360,250,{orbit:90,speed:1.4}),p(1600,665,200),h(2050,230,{orbit:100,speed:-1.1}),c(1500,500)] },
  { name:'Leap of Faith', theme:'void', length:2950, par:16.0, spawn:[110,300], finishY:360, objects:[h(440,170),z(720,0,120,430),p(850,700,240,{boost:1.62}),h(1210,260),z(1500,460,150,390),h(1800,220),p(2100,645,190,{boost:1.52}),h(2490,270),c(1500,420)] },
  { name:'Pulse', theme:'neon', length:3100, par:17.5, spawn:[110,510], finishY:350, objects:[h(420,250),h(780,310,{move:'y',amp:140,speed:1.9}),z(1040,0,110,360),h(1270,230,{move:'x',amp:140,speed:1.4}),p(1580,665,200,{boost:1.55}),z(1850,490,130,370),h(2100,220,{move:'y',amp:115,speed:2.0}),h(2620,300),c(1650,500)] },
  { name:'No Floor', theme:'sky', length:3250, par:18.0, spawn:[110,430], finishY:330, objects:[h(420,220),h(790,340),h(1170,200),h(1560,360),h(1960,210),h(2370,330),h(2780,210),z(980,650,1050,250),c(1600,430)] },
  { name:'Ricochet', theme:'solar', length:3400, par:18.5, spawn:[110,470], finishY:350, objects:[h(400,260),p(690,650,180,{boost:1.65}),p(1080,520,150,{vertical:true,boost:1.28}),h(1320,220),p(1630,665,210,{boost:1.62}),p(2040,480,150,{vertical:true,boost:1.30}),h(2320,240),p(2650,650,190,{boost:1.55}),c(1750,470)] },
  { name:'Red Gates', theme:'solar', length:3600, par:19.0, spawn:[110,500], finishY:330, objects:[h(410,260),z(690,0,105,330),z(690,530,105,330),h(960,300),z(1240,0,110,420),h(1500,250),z(1800,500,120,360),h(2070,220),z(2360,0,120,370),h(2640,270),h(3150,220),c(1900,450)] },
  { name:'Crosswind', theme:'mint', length:3800, par:20.5, spawn:[110,500], finishY:340, wind:65, objects:[h(420,250),h(850,210,{move:'y',amp:90,speed:1.5}),p(1140,665,190,{boost:1.5}),h(1480,290),z(1780,0,125,365),h(2070,230,{move:'x',amp:160,speed:1.2}),p(2460,640,220,{boost:1.55}),h(2860,240),h(3340,300),c(2100,500)] },
  { name:'Orbital Web', theme:'void', length:4000, par:21.5, spawn:[110,500], finishY:320, objects:[h(440,250,{orbit:120,speed:1.4}),h(900,240,{orbit:135,speed:-1.55}),z(1190,480,120,380),h(1450,230,{orbit:145,speed:1.3}),p(1800,670,200,{boost:1.56}),h(2200,260,{orbit:120,speed:-1.7}),z(2540,0,120,390),h(2800,230,{orbit:135,speed:1.5}),h(3400,280),c(2050,470)] },
  { name:'Split Second', theme:'neon', length:4200, par:22.0, spawn:[110,500], finishY:330, objects:[h(400,260),z(690,0,120,380),z(690,550,120,310),h(930,270,{move:'y',amp:120,speed:2.2}),p(1230,670,200,{boost:1.6}),z(1550,0,125,430),h(1810,290),z(2100,560,125,300),h(2370,210,{move:'x',amp:160,speed:1.8}),p(2700,650,200,{boost:1.55}),z(3040,0,120,380),h(3300,280),h(3820,220),c(2200,470)] },
  { name:'Velocity', theme:'dusk', length:4450, par:22.5, spawn:[110,500], finishY:320, gravity:1010, objects:[h(420,240),p(720,665,210,{boost:1.72}),h(1060,210),p(1350,650,190,{boost:1.68}),h(1700,250,{move:'y',amp:100,speed:1.8}),z(1980,0,110,380),h(2240,220),p(2550,650,190,{boost:1.7}),h(2900,230,{orbit:100,speed:1.7}),z(3240,530,120,330),h(3500,200),h(4020,250),c(2350,460)] },
  { name:'The Gauntlet', theme:'void', length:4700, par:24.0, spawn:[110,500], finishY:310, gravity:1030, objects:[h(410,250),z(690,0,110,360),h(930,300,{move:'y',amp:130,speed:2}),z(1180,520,120,340),p(1410,660,190,{boost:1.65}),h(1720,210,{orbit:130,speed:1.5}),z(2030,0,120,410),h(2300,280,{move:'x',amp:170,speed:1.8}),p(2630,650,190,{boost:1.62}),z(2940,500,120,360),h(3210,220,{orbit:145,speed:-1.7}),z(3520,0,120,390),h(3790,260),h(4300,210),c(2500,460)] },
  { name:'Final Swing', theme:'solar', length:5200, par:26.0, spawn:[110,500], finishY:300, gravity:1040, wind:35, objects:[h(420,250,{move:'y',amp:90,speed:1.8}),z(700,0,120,370),p(950,660,190,{boost:1.65}),h(1240,230,{orbit:120,speed:1.7}),z(1540,520,120,340),h(1810,280,{move:'x',amp:150,speed:1.9}),p(2140,650,210,{boost:1.7}),z(2480,0,120,420),h(2770,210,{orbit:145,speed:-1.8}),z(3090,530,125,330),h(3380,260,{move:'y',amp:125,speed:2.1}),p(3700,660,190,{boost:1.65}),z(4020,0,120,390),h(4300,230,{orbit:125,speed:1.8}),h(4820,210),c(2700,450)] }
];

export { THEMES };
