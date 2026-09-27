function renderRaycast() {
  const FOV = Math.PI / 3;
  const NUM_RAYS = Math.floor(cvs.width / 2);
  const RAY_WIDTH = cvs.width / NUM_RAYS;
  const HALF_FOV = FOV / 2;

  // Renderizar Teto Estilo Madeira / Telhado
  ctx.drawImage(ceilingTex, 0, 0, cvs.width, cvs.height / 2);

  // Renderizar Chão Tom de Rocha Escura
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(0, cvs.height / 2, cvs.width, cvs.height / 2);

  let depthBuffer = new Array(NUM_RAYS);

  for (let i = 0; i < NUM_RAYS; i++) {
    let rayAngle = (player.dir - HALF_FOV) + (i / NUM_RAYS) * FOV;
    let distance = 0, hitWall = false;
    let cos = Math.cos(rayAngle), sin = Math.sin(rayAngle);
    let wallX = 0, tileType = 1;

    while (!hitWall && distance < 18) {
      distance += 0.03;
      let checkX = Math.floor(player.x + cos * distance);
      let checkY = Math.floor(player.y + sin * distance);

      if (checkX < 0 || checkX >= MAP_W || checkY < 0 || checkY >= MAP_H || MAP[checkY][checkX] > 0) {
        hitWall = true;
        tileType = MAP[checkY][checkX];
        let hitX = player.x + cos * distance, hitY = player.y + sin * distance;
        let fx = hitX - Math.floor(hitX), fy = hitY - Math.floor(hitY);
        wallX = Math.abs(fx - 0.5) > Math.abs(fy - 0.5) ? fy : fx;
      }
    }

    let correctedDist = distance * Math.cos(rayAngle - player.dir);
    depthBuffer[i] = correctedDist;

    let wallHeight = Math.min(cvs.height, (cvs.height / correctedDist));
    let wallTop = (cvs.height - wallHeight) / 2;

    let activeTex = tileType === 2 ? trapTex : wallTex;
    ctx.drawImage(activeTex, Math.floor(wallX * 64), 0, 1, 64, i * RAY_WIDTH, wallTop, RAY_WIDTH + 0.5, wallHeight);
    
    // Sombreamento de Distância nas Paredes
    ctx.fillStyle = `rgba(2, 6, 23, ${Math.min(1, correctedDist / 12)})`;
    ctx.fillRect(i * RAY_WIDTH, wallTop, RAY_WIDTH + 0.5, wallHeight);
  }

  // Renderizar Entidades (Goblins, Guardiões, Baús)
  let spriteList = entities
    .filter(e => e.type === 'chest' || e.alive)
    .map(e => {
      let dx = e.x - player.x, dy = e.y - player.y;
      let dist = Math.hypot(dx, dy);
      let angle = Math.atan2(dy, dx) - player.dir;
      while (angle < -Math.PI) angle += Math.PI * 2;
      while (angle > Math.PI) angle -= Math.PI * 2;
      return { e, dist, angle };
    })
    .sort((a, b) => b.dist - a.dist);

  spriteList.forEach(item => {
    let { e, dist, angle } = item;
    if (dist < 0.2 || Math.abs(angle) > FOV) return;

    let screenX = (cvs.width / 2) + Math.tan(angle) * (cvs.width / 2);
    let spriteSize = Math.min(cvs.height, (cvs.height / dist));
    let spriteTop = (cvs.height - spriteSize) / 2;

    let rayIdx = Math.floor(screenX / RAY_WIDTH);
    if (rayIdx >= 0 && rayIdx < NUM_RAYS && depthBuffer[rayIdx] < dist) return;

    ctx.save();
    ctx.translate(screenX, spriteTop + spriteSize / 2);

    if (e.type === 'goblin') drawGoblin(ctx, spriteSize, e.hp / e.maxHp);
    else if (e.type === 'guardian' || e.type === 'boss') drawGuardian(ctx, spriteSize * (e.type === 'boss' ? 1.4 : 1.0), e.hp / e.maxHp);
    else if (e.type === 'chest') drawChest(ctx, spriteSize, e.opened);

    ctx.restore();
  });

  // Animação de Feitiços e Dano
  if (player.anim > 0) {
    player.anim--;
    ctx.fillStyle = '#f97316';
    ctx.beginPath(); ctx.arc(cvs.width / 2, cvs.height / 2 + 20, 80 * (player.anim / 8), 0, Math.PI * 2); ctx.fill();
  }

  if (player.lightningAnim > 0) {
    player.lightningAnim--;
    ctx.fillStyle = 'rgba(250, 204, 21, 0.25)';
    ctx.fillRect(0, 0, cvs.width, cvs.height);
  }

  damageTexts.forEach((d, i) => {
    ctx.font = '900 24px sans-serif'; ctx.fillStyle = d.color || '#ef4444'; ctx.fillText(d.txt, d.x, d.y);
    d.y -= 1; d.life--; if (d.life <= 0) damageTexts.splice(i, 1);
  });
}
