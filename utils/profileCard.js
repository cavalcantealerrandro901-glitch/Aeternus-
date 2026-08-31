/**
 * Gera SVG do perfil: imagem de fundo + cards separados para cada info.
 * Discord renderiza o SVG anexado como imagem única.
 */

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .slice(0, 80);
}

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function wrapText(text, maxLen = 42, maxLines = 3) {
    const words = String(text || '').split(/\s+/);
    const lines = [];
    let cur = '';
    for (const w of words) {
        const next = cur ? `${cur} ${w}` : w;
        if (next.length > maxLen) {
            if (cur) lines.push(cur);
            cur = w;
            if (lines.length >= maxLines) break;
        } else cur = next;
    }
    if (cur && lines.length < maxLines) lines.push(cur);
    return lines.length ? lines : ['—'];
}

/**
 * @param {object} d
 * @returns {Buffer}
 */
function render(d) {
    const W = 900;
    const H = 520;
    const bg = d.bgImage || '';
    const name = esc(d.username || 'Usuário');
    const title = esc(d.title || 'Membro');
    const aboutLines = wrapText(d.aboutMe || 'Sem biografia ainda.', 48, 3).map(esc);
    const decName = esc(d.decorationName || 'Padrão');

    const cards = [
        { x: 40, y: 210, w: 200, h: 88, label: 'NÍVEL', value: String(d.level ?? 0), sub: `${fmt(d.xpRemain || 0)} / ${fmt(d.xpNeed || 0)} XP` },
        { x: 256, y: 210, w: 200, h: 88, label: 'FLOCOS', value: fmt(d.flocos), sub: 'carteira' },
        { x: 472, y: 210, w: 200, h: 88, label: 'CRISTAIS', value: fmt(d.cristais), sub: 'premium' },
        { x: 688, y: 210, w: 172, h: 88, label: 'BANCO', value: fmt(d.bank), sub: 'guardado' }
    ];

    const cardSvg = cards
        .map(
            (c) => `
  <g>
    <rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="16"
      fill="rgba(15,23,42,0.72)" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/>
    <text x="${c.x + 16}" y="${c.y + 28}" font-family="Segoe UI,Arial,sans-serif" font-size="12" fill="rgba(226,232,240,0.7)" letter-spacing="1.5">${c.label}</text>
    <text x="${c.x + 16}" y="${c.y + 56}" font-family="Segoe UI,Arial,sans-serif" font-size="22" font-weight="700" fill="#f8fafc">${esc(c.value)}</text>
    <text x="${c.x + 16}" y="${c.y + 74}" font-family="Segoe UI,Arial,sans-serif" font-size="11" fill="rgba(148,163,184,0.95)">${esc(c.sub)}</text>
  </g>`
        )
        .join('');

    const aboutY = 318;
    const aboutH = 150;
    const aboutText = aboutLines
        .map(
            (line, i) =>
                `<text x="56" y="${aboutY + 52 + i * 22}" font-family="Segoe UI,Arial,sans-serif" font-size="15" fill="#e2e8f0">${line}</text>`
        )
        .join('');

    // fundo: tenta imagem; sempre tem gradiente por baixo
    const bgLayer = bg
        ? `<image href="${esc(bg)}" xlink:href="${esc(bg)}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/>`
        : '';

    const avatar = d.avatarURL
        ? `<image href="${esc(d.avatarURL)}" xlink:href="${esc(d.avatarURL)}" x="48" y="48" width="96" height="96" clip-path="url(#av)" preserveAspectRatio="xMidYMid slice"/>`
        : `<circle cx="96" cy="96" r="48" fill="#312e81"/>`;

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="fallback" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1e1b4b"/>
      <stop offset="50%" stop-color="#312e81"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="veil" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(2,6,23,0.35)"/>
      <stop offset="100%" stop-color="rgba(2,6,23,0.75)"/>
    </linearGradient>
    <clipPath id="av"><circle cx="96" cy="96" r="48"/></clipPath>
    <filter id="soft"><feGaussianBlur stdDeviation="0.5"/></filter>
  </defs>

  <!-- FUNDO (imagem de decoração cobre o card inteiro) -->
  <rect width="${W}" height="${H}" fill="url(#fallback)"/>
  ${bgLayer}
  <rect width="${W}" height="${H}" fill="url(#veil)"/>

  <!-- moldura -->
  <rect x="12" y="12" width="${W - 24}" height="${H - 24}" rx="22" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="2"/>

  <!-- avatar + nome -->
  ${avatar}
  <circle cx="96" cy="96" r="50" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="3"/>
  <text x="168" y="82" font-family="Segoe UI,Arial,sans-serif" font-size="28" font-weight="700" fill="#f8fafc">${name}</text>
  <text x="168" y="112" font-family="Segoe UI,Arial,sans-serif" font-size="15" fill="#c4b5fd">${title}</text>
  <text x="168" y="136" font-family="Segoe UI,Arial,sans-serif" font-size="13" fill="rgba(226,232,240,0.75)">Background · ${decName}</text>

  <!-- cards de stats -->
  ${cardSvg}

  <!-- card Sobre Mim -->
  <rect x="40" y="${aboutY}" width="${W - 80}" height="${aboutH}" rx="18"
    fill="rgba(15,23,42,0.78)" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/>
  <text x="56" y="${aboutY + 28}" font-family="Segoe UI,Arial,sans-serif" font-size="13" fill="rgba(226,232,240,0.7)" letter-spacing="1.5">SOBRE MIM</text>
  ${aboutText}

  <text x="${W - 28}" y="${H - 22}" text-anchor="end" font-family="Segoe UI,Arial,sans-serif" font-size="11" fill="rgba(148,163,184,0.8)">Aeternus Profile</text>
</svg>`;

    return Buffer.from(svg, 'utf8');
}

module.exports = { render };
