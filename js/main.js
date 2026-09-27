const cvs = document.getElementById('view3d');
const ctx = cvs.getContext('2d');

function resize() { 
  cvs.width = window.innerWidth; 
  cvs.height = window.innerHeight; 
}

function initApp() {
  window.addEventListener('resize', resize);
  resize();

  initControls();

  document.getElementById('btn-heal').onclick = healPlayer;
  document.getElementById('btn-fireball').onclick = fireballAttack;
  document.getElementById('btn-lightning').onclick = lightningAttack;

  checkVictory();
  gameLoop();
}

function gameLoop() {
  updateMovement();
  renderRaycast();
  requestAnimationFrame(gameLoop);
}

window.addEventListener('DOMContentLoaded', initApp);
