let player = { x: 1.5, y: 1.5, dir: 0, hp: 100, maxHp: 100, gold: 0, gems: 0, anim: 0, lightningAnim: 0 };
let damageTexts = [];

function fireballAttack() {
  player.anim = 8;
  entities.forEach(e => {
    if (!e.alive || e.type === 'chest') return;
    let dx = e.x - player.x, dy = e.y - player.y;
    let dist = Math.hypot(dx, dy);
    let angle = Math.atan2(dy, dx) - player.dir;
    while (angle < -Math.PI) angle += Math.PI * 2;
    while (angle > Math.PI) angle -= Math.PI * 2;

    if (dist < 3.2 && Math.abs(angle) < Math.PI / 4) {
      let dmg = Math.floor(Math.random() * 25) + 40;
      e.hp -= dmg;
      damageTexts.push({ txt: '🔥-' + dmg, color: '#f97316', x: cvs.width / 2 + (Math.random() - 0.5) * 40, y: cvs.height / 2, life: 30 });
      if (e.hp <= 0) { e.alive = false; player.gold += 40; player.gems += 1; checkVictory(); }
    }
  });
}

function lightningAttack() {
  player.lightningAnim = 10;
  entities.forEach(e => {
    if (!e.alive || e.type === 'chest') return;
    let dist = Math.hypot(e.x - player.x, e.y - player.y);
    if (dist < 5.0) {
      let dmg = Math.floor(Math.random() * 20) + 35;
      e.hp -= dmg;
      damageTexts.push({ txt: '⚡-' + dmg, color: '#facc15', x: cvs.width / 2 + (Math.random() - 0.5) * 100, y: cvs.height / 2 + (Math.random() - 0.5) * 60, life: 30 });
      if (e.hp <= 0) { e.alive = false; player.gold += 50; player.gems += 2; checkVictory(); }
    }
  });
}

function healPlayer() {
  if (player.hp < player.maxHp) {
    player.hp = Math.min(player.maxHp, player.hp + 40);
    document.getElementById('hp-bar').style.width = (player.hp / player.maxHp * 100) + '%';
  }
}
