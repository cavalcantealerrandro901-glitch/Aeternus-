/**
 * Card de perfil → PNG com efeitos especiais.
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

function effectLayers(style) {
    if (!style) return { frame: '', avatarRing: '', particles: '', badge: '' };

    const particles = {
        stars: `
  <circle cx="80" cy="60" r="2.5" fill="#fff" opacity="0.9"/>
  <circle cx="640" cy="90" r="2" fill="#fde68a" opacity="0.85"/>
  <circle cx="120" cy="200" r="1.8" fill="#fff" opacity="0.7"/>
  <circle cx="580" cy="180" r="2.2" fill="#c4b5fd" opacity="0.8"/>
  <circle cx="200" cy="480" r="2" fill="#fff" opacity="0.75"/>
  <circle cx="520" cy="520" r="1.6" fill="#f0abfc" opacity="0.8"/>
  <circle cx="350" cy="40" r="1.5" fill="#fff" opacity="0.65"/>
  <circle cx="450" cy="700" r="2" fill="#fde68a" opacity="0.7"/>`,
        glow: '',
        neon: '',
        gold: '',
        fire: '',
        ice: '',
        rainbow: '',
        shadow: ''
    };

    const frames = {
        glow: `<rect x="10" y="10" width="700" height="880" rx="30" fill="none" stroke="#e9d5ff" stroke-width="3" opacity="0.55"/>
  <rect x="16" y="16" width="688" height="868" rx="28" fill="none" stroke="#c4b5fd" stroke-width="1.5" opacity="0.4"/>`,
        neon: `<rect x="10" y="10" width="700" height="880" rx="30" fill="none" stroke="#f0abfc" stroke-width="4"/>
  <rect x="18" y="18" width="684" height="864" rx="26" fill="none" stroke="#22d3ee" stroke-width="2" opacity="0.85"/>`,
        gold: `<rect x="10" y="10" width="700" height="880" rx="30" fill="none" stroke="#fbbf24" stroke-width="5"/>
  <rect x="18" y="18" width="684" height="864" rx="26" fill="none" stroke="#fde68a" stroke-width="2"/>`,
        fire: `<rect x="10" y="10" width="700" height="880" rx="30" fill="none" stroke="#f97316" stroke-width="4"/>
  <rect x="16" y="16" width="688" height="868" rx="28" fill="none" stroke="#ef4444" stroke-width="2" opacity="0.8"/>`,
        ice: `<rect x="10" y="10" width="700" height="880" rx="30" fill="none" stroke="#67e8f9" stroke-width="4"/>
  <rect x="16" y="16" width="688" height="868" rx="28" fill="none" stroke="#a5f3fc" stroke-width="2"/>`,
        rainbow: `<rect x="8" y="8" width="704" height="884" rx="32" fill="none" stroke="#f472b6" stroke-width="3"/>
  <rect x="12" y="12" width="696" height="876" rx="30" fill="none" stroke="#a78bfa" stroke-width="3"/>
  <rect x="16" y="16" width="688" height="868" rx="28" fill="none" stroke="#38bdf8" stroke-width="2"/>`,
        stars: `<rect x="14" y="14" width="692" height="872" rx="28" fill="none" stroke="#e9d5ff" stroke-width="2" opacity="0.5"/>`,
        shadow: `<rect x="20" y="24" width="690" height="870" rx="28" fill="#000" opacity="0.35"/>
  <rect x="14" y="14" width="692" height="872" rx="28" fill="none" stroke="#64748b" stroke-width="2"/>`
    };

    const rings = {
        glow: `<circle cx="360" cy="132" r="94" fill="none" stroke="#e9d5ff" stroke-width="6" opacity="0.55"/>
  <circle cx="360" cy="132" r="102" fill="none" stroke="#c4b5fd" stroke-width="3" opacity="0.35"/>`,
        neon: `<circle cx="360" cy="132" r="94" fill="none" stroke="#f0abfc" stroke-width="5"/>
  <circle cx="360" cy="132" r="100" fill="none" stroke="#22d3ee" stroke-width="3"/>`,
        gold: `<circle cx="360" cy="132" r="94" fill="none" stroke="#fbbf24" stroke-width="6"/>
  <circle cx="360" cy="132" r="100" fill="none" stroke="#fde68a" stroke-width="3"/>`,
        fire: `<circle cx="360" cy="132" r="94" fill="none" stroke="#f97316" stroke-width="5"/>
  <circle cx="360" cy="132" r="100" fill="none" stroke="#ef4444" stroke-width="3"/>`,
        ice: `<circle cx="360" cy="132" r="94" fill="none" stroke="#67e8f9" stroke-width="5"/>
  <circle cx="360" cy="132" r="100" fill="none" stroke="#e0f2fe" stroke-width="2"/>`,
        rainbow: `<circle cx="360" cy="132" r="94" fill="none" stroke="#f472b6" stroke-width="4"/>
  <circle cx="360" cy="132" r="100" fill="none" stroke="#a78bfa" stroke-width="3"/>
  <circle cx="360" cy="132" r="106" fill="none" stroke="#38bdf8" stroke-width="2"/>`,
        stars: `<circle cx="360" cy="132" r="94" fill="none" stroke="#fde68a" stroke-width="4" opacity="0.8"/>`,
        shadow: `<circle cx="364" cy="138" r="90" fill="#000" opacity="0.35"/>
  <circle cx="360" cy="132" r="92" fill="none" stroke="#94a3b8" stroke-width="3"/>`
    };

    return {
        frame: frames[style] || '',
        avatarRing: rings[style] || '',
        particles: particles[style] || '',
        badge: style
            ? `<text x="360" y="${style === 'stars' ? 868 : 868}" text-anchor="middle" font-family="${FONT}" font-size="11" font-weight="700" fill="#e2e8f0">efeito ativo</text>`
            : ''
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

    const titleSvg = hasTitle
        ? `<text x="360" y="286" text-anchor="middle" font-family="${FONT}" font-size="18" font-weight="700" fill="#fde68a">${title}</text>`
        : '';

    const fxName = d.effectName
        ? `<text x="60" y="${H - 48}" font-family="${FONT}" font-size="13" font-weight="700" fill="#c4b5fd">FX · ${esc(d.effectName)}</text>`
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
  </defs>

  <rect width="${W}" height="${H}" fill="url(#g)"/>
  ${bgLayer}
  <rect width="${W}" height="${H}" fill="url(#veil)"/>

  ${fx.frame}
  ${fx.particles}

  <rect x="16" y="16" width="${W - 32}" height="${H - 32}" rx="28" fill="none" stroke="#ffffff" stroke-opacity="0.28" stroke-width="2"/>

  ${fx.avatarRing}
  ${avatarLayer}
  <circle cx="360" cy="132" r="88" fill="none" stroke="#ffffff" stroke-opacity="0.75" stroke-width="4"/>

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

  <rect x="40" y="${aboutBoxY}" width="${W - 80}" height="${H - aboutBoxY - 36}" rx="20" fill="#020617" fill-opacity="0.88" stroke="#e2e8f0" stroke-width="2"/>
  <text x="58" y="${aboutBoxY + 38}" font-family="${FONT}" font-size="15" font-weight="700" fill="#f1f5f9" letter-spacing="1.5">SOBRE ELE(A)</text>
  ${aboutText}

  ${fxName}
  <text x="${W / 2}" y="${H - 22}" text-anchor="middle" font-family="${FONT}" font-size="12" font-weight="600" fill="#e2e8f0">Aeternus</text>
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
            .modulate({ brightness: 1.18, saturation: 1.12 })
            .png({ quality: 92 })
            .toBuffer();
        return { buffer: png, name: 'perfil.png' };
    } catch (e) {
        console.error('[profileCard] sharp falhou, enviando SVG:', e.message);
        return { buffer: svgBuf, name: 'perfil.svg' };
    }
}

module.exports = { render, loveTypeFor, LOVE_TYPES };
