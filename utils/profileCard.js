/**
 * Card de perfil em SVG auto-contido (imagens em base64).
 * Sem embed — só o arquivo na mensagem.
 */

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function wrapText(text, maxLen = 36, maxLines = 4) {
    const words = String(text || '')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ');
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

const LOVE_TYPES = [
    { name: 'Palavras de Afirmação', emoji: '💬', desc: 'Valoriza elogios e mensagens carinhosas.' },
    { name: 'Tempo de Qualidade', emoji: '⏳', desc: 'Prefere presença e atenção verdadeira.' },
    { name: 'Presentes', emoji: '🎁', desc: 'Se sente amado(a) com gestos e surpresas.' },
    { name: 'Atos de Serviço', emoji: '🛠️', desc: 'Amor se mostra ajudando no dia a dia.' },
    { name: 'Toque Físico', emoji: '🤍', desc: 'Carinho e proximidade falam mais alto.' },
    { name: 'Escuta Profunda', emoji: '🎧', desc: 'Quer ser ouvido(a) de verdade.' },
    { name: 'Aventura a Dois', emoji: '🌙', desc: 'Conexão nasce em experiências novas.' },
    { name: 'Cuidado Silencioso', emoji: '🌿', desc: 'Demonstra amor nos detalhes quietos.' }
];

function loveTypeFor(userId) {
    const s = String(userId || '0');
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return LOVE_TYPES[h % LOVE_TYPES.length];
}

async function fetchDataUri(url) {
    if (!url) return null;
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return null;
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 2_500_000) return null; // evita SVG gigante
        let mime = res.headers.get('content-type') || 'image/png';
        if (mime.includes(';')) mime = mime.split(';')[0].trim();
        if (!mime.startsWith('image/')) mime = 'image/png';
        return `data:${mime};base64,${buf.toString('base64')}`;
    } catch {
        return null;
    }
}

/**
 * @param {object} d
 * @returns {Promise<Buffer>}
 */
async function render(d) {
    const W = 720;
    const H = 900;

    const name = esc((d.username || 'Usuário').slice(0, 24));
    const aboutLines = wrapText(d.aboutMe || 'Sem biografia ainda.', 40, 4).map(esc);
    const love = d.love || loveTypeFor(d.userId);
    const level = d.level ?? 0;
    const xpNow = fmt(d.xpRemain || 0);
    const xpNeed = fmt(d.xpNeed || 0);
    const pct = Math.max(0, Math.min(100, Math.floor(((d.xpRemain || 0) / Math.max(1, d.xpNeed || 1)) * 100)));

    const [avatarData, bgData] = await Promise.all([
        fetchDataUri(d.avatarURL),
        fetchDataUri(d.bgImage)
    ]);

    const bgLayer = bgData
        ? `<image href="${bgData}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/>`
        : '';

    const avatarLayer = avatarData
        ? `<image href="${avatarData}" x="276" y="48" width="168" height="168" clip-path="url(#av)" preserveAspectRatio="xMidYMid slice"/>`
        : `<circle cx="360" cy="132" r="84" fill="#4c1d95"/>
           <text x="360" y="148" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="48" font-weight="700" fill="#e9d5ff">${esc((d.username || '?')[0]?.toUpperCase() || '?')}</text>`;

    const aboutText = aboutLines
        .map(
            (line, i) =>
                `<text x="48" y="${620 + i * 26}" font-family="Segoe UI,Arial,sans-serif" font-size="16" fill="#e2e8f0">${line}</text>`
        )
        .join('\n');

    const barW = 624;
    const fillW = Math.round((barW * pct) / 100);

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1e1b4b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="veil" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(15,23,42,0.45)"/>
      <stop offset="100%" stop-color="rgba(15,23,42,0.82)"/>
    </linearGradient>
    <clipPath id="av"><circle cx="360" cy="132" r="84"/></clipPath>
    <linearGradient id="xp" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#a78bfa"/>
      <stop offset="100%" stop-color="#f0abfc"/>
    </linearGradient>
  </defs>

  <!-- fundo -->
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  ${bgLayer}
  <rect width="${W}" height="${H}" fill="url(#veil)"/>

  <!-- moldura -->
  <rect x="16" y="16" width="${W - 32}" height="${H - 32}" rx="28" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="2"/>

  <!-- FOTO no meio/topo -->
  ${avatarLayer}
  <circle cx="360" cy="132" r="88" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="4"/>

  <!-- nome -->
  <text x="360" y="252" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="30" font-weight="700" fill="#f8fafc">${name}</text>

  <!-- DIVISÃO: Raciocínio amoroso -->
  <rect x="40" y="280" width="${W - 80}" height="120" rx="20" fill="rgba(15,23,42,0.78)" stroke="rgba(244,114,182,0.35)" stroke-width="1.5"/>
  <text x="60" y="312" font-family="Segoe UI,Arial,sans-serif" font-size="13" letter-spacing="2" fill="rgba(251,207,232,0.85)">RACIOCÍNIO AMOROSO</text>
  <text x="60" y="348" font-family="Segoe UI,Arial,sans-serif" font-size="22" font-weight="700" fill="#fbcfe8">${esc(love.emoji)}  ${esc(love.name)}</text>
  <text x="60" y="378" font-family="Segoe UI,Arial,sans-serif" font-size="14" fill="#cbd5e1">${esc(love.desc)}</text>

  <!-- DIVISÃO: XP -->
  <rect x="40" y="420" width="${W - 80}" height="130" rx="20" fill="rgba(15,23,42,0.78)" stroke="rgba(167,139,250,0.35)" stroke-width="1.5"/>
  <text x="60" y="452" font-family="Segoe UI,Arial,sans-serif" font-size="13" letter-spacing="2" fill="rgba(196,181,253,0.85)">EXPERIÊNCIA</text>
  <text x="60" y="488" font-family="Segoe UI,Arial,sans-serif" font-size="26" font-weight="700" fill="#f8fafc">Nível ${level}</text>
  <text x="${W - 60}" y="488" text-anchor="end" font-family="Segoe UI,Arial,sans-serif" font-size="14" fill="#cbd5e1">${xpNow} / ${xpNeed} XP</text>
  <rect x="48" y="510" width="${barW}" height="16" rx="8" fill="rgba(30,41,59,0.9)"/>
  <rect x="48" y="510" width="${fillW}" height="16" rx="8" fill="url(#xp)"/>

  <!-- DIVISÃO: Sobre ele -->
  <rect x="40" y="570" width="${W - 80}" height="${H - 570 - 40}" rx="20" fill="rgba(15,23,42,0.78)" stroke="rgba(148,163,184,0.3)" stroke-width="1.5"/>
  <text x="60" y="602" font-family="Segoe UI,Arial,sans-serif" font-size="13" letter-spacing="2" fill="rgba(226,232,240,0.75)">SOBRE ELE(A)</text>
  ${aboutText}

  <text x="${W / 2}" y="${H - 28}" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="11" fill="rgba(148,163,184,0.7)">Aeternus</text>
</svg>`;

    return Buffer.from(svg, 'utf8');
}

module.exports = { render, loveTypeFor, LOVE_TYPES };
