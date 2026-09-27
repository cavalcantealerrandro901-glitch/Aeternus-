// 0: Chão livre, 1: Parede de Pedra, 2: Parede com Armadilha
const MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,1,0,0,0,1,0,0,0,0,0,1,0,0,0,0,1], // Sala 1 (Entrada) -> Sala 2 (Tesouro)
  [1,0,0,0,1,0,0,0,1,0,0,0,0,0,1,0,0,0,0,1],
  [1,0,0,0,1,0,0,0,1,0,0,0,0,0,1,0,0,0,0,1],
  [1,1,2,1,1,0,0,0,1,1,2,2,1,1,1,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // Corredor Principal com Armadilhas
  [1,1,2,1,1,0,0,0,1,1,1,1,1,1,1,0,0,0,0,1],
  [1,0,0,0,1,0,0,0,1,0,0,0,0,0,1,0,0,0,0,1],
  [1,0,0,0,1,0,0,0,1,0,0,0,0,0,1,0,0,0,0,1], // Sala 3 (Horda Goblin) -> Sala 4 (Guardião)
  [1,0,0,0,1,0,0,0,1,0,0,0,0,0,1,0,0,0,0,1],
  [1,1,1,1,1,2,2,1,1,1,1,2,2,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // Corredor da Arena
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,1,1,1,1,0,0,0,0,0,0,1,1,1,1,0,0,1],
  [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1], // GIANTE ARENA DA TORRE
  [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
  [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
  [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
  [1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];
const MAP_W = 20, MAP_H = 20;

// Textura de Parede de Pedra
const wallTex = document.createElement('canvas');
wallTex.width = 64; wallTex.height = 64;
const wCtx = wallTex.getContext('2d');
wCtx.fillStyle = '#334155'; wCtx.fillRect(0, 0, 64, 64);
wCtx.strokeStyle = '#0f172a'; wCtx.lineWidth = 2;
for(let y = 0; y <= 64; y += 16) { wCtx.beginPath(); wCtx.moveTo(0, y); wCtx.lineTo(64, y); wCtx.stroke(); }
for(let r = 0; r < 4; r++) {
  let y = r * 16, offset = (r % 2) * 16;
  for(let x = offset; x <= 64; x += 32) { wCtx.beginPath(); wCtx.moveTo(x, y); wCtx.lineTo(x, y + 16); wCtx.stroke(); }
}

// Textura de Parede de Armadilha (Com Espinhos/Gargula de Aço)
const trapTex = document.createElement('canvas');
trapTex.width = 64; trapTex.height = 64;
const tCtx = trapTex.getContext('2d');
tCtx.fillStyle = '#1e293b'; tCtx.fillRect(0, 0, 64, 64);
tCtx.fillStyle = '#dc2626'; tCtx.beginPath(); tCtx.arc(32, 32, 16, 0, Math.PI * 2); tCtx.fill();
tCtx.fillStyle = '#94a3b8';
for(let i=0; i<8; i++) {
  let ang = (i / 8) * Math.PI * 2;
  tCtx.fillRect(32 + Math.cos(ang)*18 - 2, 32 + Math.sin(ang)*18 - 2, 5, 5);
}

// Textura do Teto de Madeira ("Estilo Casa / Telhado da Torre")
const ceilingTex = document.createElement('canvas');
ceilingTex.width = 64; ceilingTex.height = 64;
const cCtx = ceilingTex.getContext('2d');
cCtx.fillStyle = '#451a03'; cCtx.fillRect(0, 0, 64, 64);
cCtx.strokeStyle = '#270e02'; cCtx.lineWidth = 4;
for(let y = 0; y <= 64; y += 16) { cCtx.beginPath(); cCtx.moveTo(0, y); cCtx.lineTo(64, y); cCtx.stroke(); }
