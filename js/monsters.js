let entities = [
  // Baús de Tesouro nas Salas
  { type: 'chest', x: 2.5, y: 2.5, opened: false },
  { type: 'chest', x: 6.5, y: 2.5, opened: false },
  { type: 'chest', x: 17.5, y: 2.5, opened: false },
  { type: 'chest', x: 10.5, y: 16.5, opened: false },
  { type: 'chest', x: 11.5, y: 16.5, opened: false },

  // Sala 3: Horda de Goblins
  { type: 'goblin', x: 2.5, y: 7.5, hp: 80, maxHp: 80, alive: true },
  { type: 'goblin', x: 3.5, y: 8.5, hp: 80, maxHp: 80, alive: true },
  { type: 'goblin', x: 1.5, y: 9.5, hp: 80, maxHp: 80, alive: true },
  
  // Sala 4: Guardião do Tesouro
  { type: 'guardian', x: 17.5, y: 8.5, hp: 180, maxHp: 180, alive: true },

  // Sala 5: Grande Arena (Chefe Supremo + Guardiões Ajudantes)
  { type: 'boss', x: 10.5, y: 15.5, hp: 350, maxHp: 350, alive: true },
  { type: 'goblin', x: 8.5, y: 15.5, hp: 90, maxHp: 90, alive: true },
  { type: 'goblin', x: 12.5, y: 15.5, hp: 90, maxHp: 90, alive: true }
];

function drawGoblin(ctx, size, hpRatio) {
  ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.arc(0, 0, size * 0.28, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#15803d';
  ctx.beginPath(); ctx.moveTo(-size * 0.2, -size * 0.05); ctx.lineTo(-size * 0.48, -size * 0.2); ctx.lineTo(-size * 0.2, size * 0.1); ctx.fill();
  ctx.beginPath(); ctx.moveTo(size * 0.2, -size * 0.05); ctx.lineTo(size * 0.48, -size * 0.2); ctx.lineTo(size * 0.2, size * 0.1); ctx.fill();
  ctx.fillStyle = '#facc15';
  ctx.beginPath(); ctx.arc(-size * 0.09, -size * 0.05, size * 0.05, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(size * 0.09, -size * 0.05, size * 0.05, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#450a0a'; ctx.beginPath(); ctx.arc(0, size * 0.1, size * 0.1, 0, Math.PI); ctx.fill();
  
  let barW = size * 0.6, barH = Math.max(4, size * 0.05), barY = -size * 0.45;
  ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(-barW / 2, barY, barW, barH);
  ctx.fillStyle = '#ef4444'; ctx.fillRect(-barW / 2, barY, barW * hpRatio, barH);
}

function drawGuardian(ctx, size, hpRatio) {
  // Armadura e Chifres de Aço
  ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.arc(0, 0, size * 0.35, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#cbd5e1'; ctx.beginPath(); ctx.arc(0, 0, size * 0.22, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#38bdf8'; // Olhos Azuis Arcanos
  ctx.fillRect(-size*0.1, -size*0.05, size*0.06, size*0.06);
  ctx.fillRect(size*0.04, -size*0.05, size*0.06, size*0.06);

  let barW = size * 0.7, barH = Math.max(5, size * 0.06), barY = -size * 0.5;
  ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(-barW / 2, barY, barW, barH);
  ctx.fillStyle = '#38bdf8'; ctx.fillRect(-barW / 2, barY, barW * hpRatio, barH);
}

function drawChest(ctx, size, opened) {
  ctx.fillStyle = opened ? '#78350f' : '#b45309';
  ctx.fillRect(-size * 0.25, -size * 0.15, size * 0.5, size * 0.35);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(-size * 0.05, -size * 0.05, size * 0.1, size * 0.1);
}

function checkVictory() {
  let remainingMonsters = entities.filter(e => e.alive && (e.type === 'goblin' || e.type === 'guardian' || e.type === 'boss')).length;
  document.getElementById('ui-monsters').innerText = remainingMonsters;
  document.getElementById('ui-gold').innerText = player.gold;
  document.getElementById('ui-gems').innerText = player.gems;
  if (remainingMonsters === 0) document.getElementById('victory-modal').style.display = 'flex';
}
