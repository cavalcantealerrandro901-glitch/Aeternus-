/**
 * Card de perfil → PNG com efeitos (estilo vídeo contínuo).
 * Fogo: aura na foto + faixa queimando no rodapé.
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

function wrapText(text, maxLen = 34, maxLines = 4) {
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
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) return null;
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 2_500_000) return null;
        let mime = res.headers.get('content-type') || 'image/png';
        if (mime.includes(';')) mime = mime.split(';')[0].trim();
        if (!mime.startsWith('image/')) mime = 'image/png';
        if (mime === 'image/svg+xml') return null;
        return `data:${mime};base64,${buf.toString('base64')}`;
    } catch {
        return null;
    }
}

const FONT = 'DejaVu Sans,Arial,Helvetica,sans-serif';

/**
 * Efeitos: essência em volta da foto + faixa no rodapé (estilo vídeo).
 * Sem chamas subindo/descendo — aura estável e fogo embaixo.
 */
function effectLayers(style) {
    if (!style) return { defs: '', behindAvatar: '', aroundAvatar: '', footer: '' };

    const defsMap = {
        fire: `
    <radialGradient id="fxFire" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fef3c7" stop-opacity="0.35"/>
      <stop offset="35%" stop-color="#f97316" stop-opacity="0.55"/>
      <stop offset="70%" stop-color="#dc2626" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#7f1d1d" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="fxFireRing" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="40%" stop-color="#f97316"/>
      <stop offset="100%" stop-color="#b91c1c"/>
    </linearGradient>
    <linearGradient id="fxFireBar" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.95"/>
      <stop offset="40%" stop-color="#ea580c" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#7f1d1d" stop-opacity="0.85"/>
    </linearGradient>
    <linearGradient id="fxFireBar2" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#991b1b"/>
      <stop offset="25%" stop-color="#f97316"/>
      <stop offset="50%" stop-color="#fbbf24"/>
      <stop offset="75%" stop-color="#ef4444"/>
      <stop offset="100%" stop-color="#991b1b"/>
    </linearGradient>`,
        glow: `
    <radialGradient id="fxGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#f5f3ff" stop-opacity="0.5"/>
      <stop offset="50%" stop-color="#c4b5fd" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#7c3aed" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="fxGlowBar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#4c1d95"/>
      <stop offset="50%" stop-color="#c4b5fd"/>
      <stop offset="100%" stop-color="#4c1d95"/>
    </linearGradient>`,
        neon: `
    <radialGradient id="fxNeon" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#f0abfc" stop-opacity="0.4"/>
      <stop offset="55%" stop-color="#22d3ee" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#22d3ee" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="fxNeonBar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#db2777"/>
      <stop offset="50%" stop-color="#22d3ee"/>
      <stop offset="100%" stop-color="#a855f7"/>
    </linearGradient>`,
        gold: `
    <radialGradient id="fxGold" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fef9c3" stop-opacity="0.45"/>
      <stop offset="50%" stop-color="#fbbf24" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#b45309" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="fxGoldBar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#78350f"/>
      <stop offset="50%" stop-color="#fbbf24"/>
      <stop offset="100%" stop-color="#78350f"/>
    </linearGradient>`,
        ice: `
    <radialGradient id="fxIce" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#e0f2fe" stop-opacity="0.5"/>
      <stop offset="50%" stop-color="#22d3ee" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#0369a1" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="fxIceBar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0c4a6e"/>
      <stop offset="50%" stop-color="#67e8f9"/>
      <stop offset="100%" stop-color="#0c4a6e"/>
    </linearGradient>`,
        stars: `
    <radialGradient id="fxStars" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fef9c3" stop-opacity="0.35"/>
      <stop offset="55%" stop-color="#c4b5fd" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#312e81" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="fxStarsBar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#1e1b4b"/>
      <stop offset="50%" stop-color="#fde68a"/>
      <stop offset="100%" stop-color="#1e1b4b"/>
    </linearGradient>`,
        rainbow: `
    <radialGradient id="fxRb" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#f472b6" stop-opacity="0.35"/>
      <stop offset="50%" stop-color="#a78bfa" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#38bdf8" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="fxRbBar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ef4444"/>
      <stop offset="25%" stop-color="#f59e0b"/>
      <stop offset="50%" stop-color="#22c55e"/>
      <stop offset="75%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#a855f7"/>
    </linearGradient>`,
        shadow: `
    <radialGradient id="fxSh" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#000" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="fxShBar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="50%" stop-color="#64748b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>`
    };

    // Aura estável em volta da foto (essência, não sobe/desce)
    const behind = {
        fire: `
  <circle cx="360" cy="132" r="118" fill="url(#fxFire)"/>
  <circle cx="360" cy="132" r="105" fill="url(#fxFire)" opacity="0.55"/>`,
        glow: `<circle cx="360" cy="132" r="115" fill="url(#fxGlow)"/>`,
        neon: `<circle cx="360" cy="132" r="115" fill="url(#fxNeon)"/>`,
        gold: `<circle cx="360" cy="132" r="115" fill="url(#fxGold)"/>`,
        ice: `<circle cx="360" cy="132" r="115" fill="url(#fxIce)"/>`,
        stars: `<circle cx="360" cy="132" r="112" fill="url(#fxStars)"/>
  <circle cx="290" cy="80" r="2.2" fill="#fff" opacity="0.9"/>
  <circle cx="430" cy="75" r="1.8" fill="#fde68a" opacity="0.85"/>
  <circle cx="265" cy="160" r="1.6" fill="#c4b5fd" opacity="0.8"/>
  <circle cx="455" cy="155" r="2" fill="#fff" opacity="0.85"/>
  <circle cx="360" cy="45" r="1.5" fill="#fef9c3" opacity="0.9"/>`,
        rainbow: `<circle cx="360" cy="132" r="115" fill="url(#fxRb)"/>`,
        shadow: `<circle cx="368" cy="140" r="100" fill="url(#fxSh)"/>`
    };

    // Anel sólido em volta da foto
    const around = {
        fire: `
  <circle cx="360" cy="132" r="90" fill="none" stroke="url(#fxFireRing)" stroke-width="6"/>
  <circle cx="360" cy="132" r="98" fill="none" stroke="#f97316" stroke-width="2.5" opacity="0.75"/>`,
        glow: `
  <circle cx="360" cy="132" r="90" fill="none" stroke="#e9d5ff" stroke-width="5" opacity="0.9"/>
  <circle cx="360" cy="132" r="98" fill="none" stroke="#c4b5fd" stroke-width="2.5" opacity="0.6"/>`,
        neon: `
  <circle cx="360" cy="132" r="90" fill="none" stroke="#f0abfc" stroke-width="4"/>
  <circle cx="360" cy="132" r="97" fill="none" stroke="#22d3ee" stroke-width="3"/>`,
        gold: `
  <circle cx="360" cy="132" r="90" fill="none" stroke="#fbbf24" stroke-width="5"/>
  <circle cx="360" cy="132" r="98" fill="none" stroke="#fde68a" stroke-width="2.5"/>`,
        ice: `
  <circle cx="360" cy="132" r="90" fill="none" stroke="#67e8f9" stroke-width="4"/>
  <circle cx="360" cy="132" r="97" fill="none" stroke="#e0f2fe" stroke-width="2"/>`,
        stars: `
  <circle cx="360" cy="132" r="90" fill="none" stroke="#fde68a" stroke-width="3.5" opacity="0.85"/>`,
        rainbow: `
  <circle cx="360" cy="132" r="90" fill="none" stroke="#f472b6" stroke-width="3"/>
  <circle cx="360" cy="132" r="96" fill="none" stroke="#a78bfa" stroke-width="2.5"/>
  <circle cx="360" cy="132" r="102" fill="none" stroke="#38bdf8" stroke-width="2"/>`,
        shadow: `
  <circle cx="360" cy="132" r="90" fill="none" stroke="#64748b" stroke-width="3"/>`
    };

    // Rodapé: fogo queimando embaixo (faixa larga, essência de vídeo)
    const footer = {
        fire: `
  <rect x="24" y="848" width="672" height="36" rx="0" fill="url(#fxFireBar)"/>
  <rect x="24" y="848" width="672" height="12" fill="url(#fxFireBar2)" opacity="0.9"/>
  <ellipse cx="120" cy="848" rx="40" ry="14" fill="#fbbf24" opacity="0.55"/>
  <ellipse cx="280" cy="846" rx="50" ry="16" fill="#f97316" opacity="0.5"/>
  <ellipse cx="440" cy="847" rx="45" ry="15" fill="#fbbf24" opacity="0.5"/>
  <ellipse cx="600" cy="848" rx="38" ry="13" fill="#ef4444" opacity="0.55"/>`,
        glow: `<rect x="40" y="868" width="640" height="12" rx="6" fill="url(#fxGlowBar)"/>`,
        neon: `<rect x="40" y="868" width="640" height="12" rx="6" fill="url(#fxNeonBar)"/>`,
        gold: `<rect x="40" y="868" width="640" height="12" rx="6" fill="url(#fxGoldBar)"/>`,
        ice: `<rect x="40" y="868" width="640" height="12" rx="6" fill="url(#fxIceBar)"/>`,
        stars: `<rect x="40" y="868" width="640" height="12" rx="6" fill="url(#fxStarsBar)"/>`,
        rainbow: `<rect x="40" y="868" width="640" height="12" rx="6" fill="url(#fxRbBar)"/>`,
        shadow: `<rect x="40" y="868" width="640" height="12" rx="6" fill="url(#fxShBar)"/>`
    };

    return {
        defs: defsMap[style] || '',
        behindAvatar: behind[style] || '',
        aroundAvatar: around[style] || '',
        footer: footer[style] || ''
    };
}

function buildSvg(d, avatarData, bgData) {
    const W = 720;
    const H = 900;

    const name = esc((d.username || 'Usuário').slice(0, 24));
    const title = esc((d.title || '').slice(0, 28));
    const hasTitle = Boolean(title);
    const aboutLines = wrapText(d.aboutMe || 'Sem biografia ainda.', 34, 4).map(esc);
    const love = d.love || loveTypeFor(d.userId);
    const level = d.level ?? 0;
    const xpNow = fmt(d.xpRemain || 0);
    const xpNeed = fmt(d.xpNeed || 0);
    const pct = Math.max(
        0,
        Math.min(100, Math.floor(((d.xpRemain || 0) / Math.max(1, d.xpNeed || 1)) * 100))
    );

    const fxStyle = d.effectStyle || null;
    const fx = effectLayers(fxStyle);
    const shift = hasTitle ? 28 : 0;
    const isFire = fxStyle === 'fire';

    const bgLayer = bgData
        ? `<image href="${bgData}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/>`
        : '';

    const avatarLayer = avatarData
        ? `<image href="${avatarData}" x="276" y="48" width="168" height="168" clip-path="url(#av)" preserveAspectRatio="xMidYMid slice"/>`
        : `<circle cx="360" cy="132" r="84" fill="#4c1d95"/>
           <text x="360" y="150" text-anchor="middle" font-family="${FONT}" font-size="52" font-weight="700" fill="#ffffff">${esc((d.username || '?')[0]?.toUpperCase() || '?')}</text>`;

    const aboutY0 = 628 + shift;
    const aboutText = aboutLines
        .map(
            (line, i) =>
                `<text x="58" y="${aboutY0 + i * 30}" font-family="${FONT}" font-size="18" font-weight="600" fill="#ffffff">${line}</text>`
        )
        .join('\n');

    const barW = 624;
    const fillW = Math.round((barW * pct) / 100);
    const loveY = 280 + shift;
    const xpY = 422 + shift;
    const aboutBoxY = 576 + shift;
    // espaço extra no rodapé se for fogo
    const aboutH = H - aboutBoxY - (isFire ? 60 : 48);

    const titleSvg = hasTitle
        ? `<text x="360" y="286" text-anchor="middle" font-family="${FONT}" font-size="18" font-weight="700" fill="#fde68a">${title}</text>`
        : '';

    const fxName = d.effectName
        ? `<text x="60" y="${isFire ? 838 : 860}" font-family="${FONT}" font-size="13" font-weight="700" fill="#f8fafc">FX · ${esc(d.effectName)}</text>`
        : '';

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#312e81"/>
      <stop offset="100%" stop-color="#1e1b4b"/>
    </linearGradient>
    <linearGradient id="veil" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0f172a" stop-opacity="0.12"/>
      <stop offset="45%" stop-color="#0f172a" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#020617" stop-opacity="0.42"/>
    </linearGradient>
    <clipPath id="av"><circle cx="360" cy="132" r="84"/></clipPath>
    <linearGradient id="xp" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#c4b5fd"/>
      <stop offset="100%" stop-color="#f0abfc"/>
    </linearGradient>
    ${fx.defs}
  </defs>

  <rect width="${W}" height="${H}" fill="url(#g)"/>
  ${bgLayer}
  <rect width="${W}" height="${H}" fill="url(#veil)"/>

  <rect x="16" y="16" width="${W - 32}" height="${H - 32}" rx="28" fill="none" stroke="#ffffff" stroke-opacity="0.28" stroke-width="2"/>

  ${fx.behindAvatar}
  ${avatarLayer}
  <circle cx="360" cy="132" r="86" fill="none" stroke="#ffffff" stroke-opacity="0.85" stroke-width="3"/>
  ${fx.aroundAvatar}

  <text x="360" y="254" text-anchor="middle" font-family="${FONT}" font-size="34" font-weight="700" fill="#ffffff">${name}</text>
  ${titleSvg}

  <rect x="40" y="${loveY}" width="${W - 80}" height="124" rx="20" fill="#020617" fill-opacity="0.88" stroke="#f9a8d4" stroke-width="2"/>
  <text x="58" y="${loveY + 36}" font-family="${FONT}" font-size="15" font-weight="700" fill="#fce7f3" letter-spacing="1.5">RACIOCINIO AMOROSO</text>
  <text x="58" y="${loveY + 74}" font-family="${FONT}" font-size="26" font-weight="700" fill="#ffffff">${esc(love.name)}</text>
  <text x="58" y="${loveY + 104}" font-family="${FONT}" font-size="16" font-weight="600" fill="#f8fafc">${esc(love.desc)}</text>

  <rect x="40" y="${xpY}" width="${W - 80}" height="136" rx="20" fill="#020617" fill-opacity="0.88" stroke="#c4b5fd" stroke-width="2"/>
  <text x="58" y="${xpY + 36}" font-family="${FONT}" font-size="15" font-weight="700" fill="#ede9fe" letter-spacing="1.5">EXPERIENCIA</text>
  <text x="58" y="${xpY + 76}" font-family="${FONT}" font-size="30" font-weight="700" fill="#ffffff">Nivel ${level}</text>
  <text x="${W - 58}" y="${xpY + 76}" text-anchor="end" font-family="${FONT}" font-size="17" font-weight="700" fill="#ffffff">${xpNow} / ${xpNeed} XP</text>
  <rect x="48" y="${xpY + 98}" width="${barW}" height="18" rx="9" fill="#1e293b"/>
  <rect x="48" y="${xpY + 98}" width="${Math.max(0, fillW)}" height="18" rx="9" fill="url(#xp)"/>

  <rect x="40" y="${aboutBoxY}" width="${W - 80}" height="${aboutH}" rx="20" fill="#020617" fill-opacity="0.88" stroke="#e2e8f0" stroke-width="2"/>
  <text x="58" y="${aboutBoxY + 38}" font-family="${FONT}" font-size="15" font-weight="700" fill="#f1f5f9" letter-spacing="1.5">SOBRE ELE(A)</text>
  ${aboutText}

  ${fxName}
  ${fx.footer}
  <text x="${W / 2}" y="${H - 6}" text-anchor="middle" font-family="${FONT}" font-size="10" font-weight="600" fill="#e2e8f0">Aeternus</text>
</svg>`;
}

async function render(d) {
    const [avatarData, bgData] = await Promise.all([
        fetchDataUri(d.avatarURL),
        fetchDataUri(d.bgImage)
    ]);

    const svg = buildSvg(d, avatarData, bgData);
    const svgBuf = Buffer.from(svg, 'utf8');

    try {
        const sharp = require('sharp');
        const png = await sharp(svgBuf, { density: 160 })
            .modulate({ brightness: 1.15, saturation: 1.15 })
            .png({ quality: 92 })
            .toBuffer();
        return { buffer: png, name: 'perfil.png' };
    } catch (e) {
        console.error('[profileCard] sharp falhou, enviando SVG:', e.message);
        return { buffer: svgBuf, name: 'perfil.svg' };
    }
}

module.exports = { render, loveTypeFor, LOVE_TYPES };
