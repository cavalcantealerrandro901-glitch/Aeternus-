let keys = {};
let touchStartX = null;

function initControls() {
  window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
  window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

  window.addEventListener('touchstart', e => {
    if (!e.target.closest('.controls-container')) touchStartX = e.touches[0].clientX;
  });
  window.addEventListener('touchmove', e => {
    if (touchStartX !== null && !e.target.closest('.controls-container')) {
      let dx = e.touches[0].clientX - touchStartX;
      player.dir += dx * 0.006;
      touchStartX = e.touches[0].clientX;
    }
  });
  window.addEventListener('touchend', () => touchStartX = null);

  bindBtn('btn-fwd', 'fwd'); bindBtn('btn-bwd', 'bwd');
  bindBtn('btn-left', 'left'); bindBtn('btn-right', 'right');
}

function bindBtn(id, key) {
  let btn = document.getElementById(id);
  if(!btn) return;
  btn.addEventListener('touchstart', e => { e.preventDefault(); keys[key] = true; });
  btn.addEventListener('touchend', e => { e.preventDefault(); keys[key] = false; });
  btn.addEventListener('mousedown', () => keys[key] = true);
  btn.addEventListener('mouseup', () => keys[key] = false);
}

function updateMovement() {
  let speed = 0.05;
  let moveX = 0, moveY = 0;

  if (keys['fwd']) { moveX += Math.cos(player.dir); moveY += Math.sin(player.dir); }
  if (keys['bwd']) { moveX -= Math.cos(player.dir); moveY -= Math.sin(player.dir); }
  if (keys['left']) { moveX += Math.cos(player.dir - Math.PI / 2); moveY += Math.sin(player.dir - Math.PI / 2); }
  if (keys['right']) { moveX += Math.cos(player.dir + Math.PI / 2); moveY += Math.sin(player.dir + Math.PI / 2); }

  if (moveX !== 0 || moveY !== 0) {
    let newX = player.x + moveX * speed;
    let newY = player.y + moveY * speed;
    if (MAP[Math.floor(player.y)][Math.floor(newX)] !== 1) player.x = newX;
    if (MAP[Math.floor(newY)][Math.floor(player.x)] !== 1) player.y = newY;
  }

  // Dano de Armadilha de Parede (Se estiver encostado à telha 2)
  let currentTile = MAP[Math.floor(player.y)][Math.floor(player.x)];
  if (currentTile === 2) {
    player.hp = Math.max(0, player.hp - 0.4);
    document.getElementById('hp-bar').style.width = (player.hp / player.maxHp * 100) + '%';
  }

  // Abrir Baús de Tesouro ao aproximar
  entities.forEach(e => {
    if (e.type === 'chest' && !e.opened && Math.hypot(e.x - player.x, e.y - player.y) < 1.2) {
      e.opened = true;
      player.gold += 100;
      player.gems += 3;
      checkVictory();
    } else if (e.alive && (e.type === 'goblin' || e.type === 'guardian' || e.type === 'boss')) {
      if (Math.hypot(e.x - player.x, e.y - player.y) < 1.0) {
        player.hp = Math.max(0, player.hp - 0.25);
        document.getElementById('hp-bar').style.width = (player.hp / player.maxHp * 100) + '%';
      }
    }
  });
}
