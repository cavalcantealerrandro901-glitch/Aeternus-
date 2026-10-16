/**
 * Card visual do ranking Aeternus (SVG → PNG via sharp).
 * Cada linha: foto do membro, nome, ID, XP ou saldo.
 */

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"');
}

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

async function fetchDataUri(url) {
    if (!url) return null;
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return null;
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 1_500_000) return null;
        let mime = res.headers.get('content-type') || 'image/png';
        if (mime.includes(';')) mime = mime.split(';')[0].trim();
        if (!mime.startsWith('image/')) mime = 'image/png';
        if (mime === 'image/svg+xml') return null;
        return `data:${mime};base64,${buf.toString('base64')}`;
    } catch (_) {
        return null;
    }
}

const FONT = 'DejaVu Sans,Arial,Helvetica,sans-serif';
const W = 720;
const ROW_H = 92;
const HEADER = 150;
const FOOTER = 70;

function medalColor(i) {
    if (i === 0) return '#fbbf24';
    if (i === 1) return '#cbd5e1';
    if (i === 2) return '#fdba74';
    return '#a78bfa';
}

function medalLabel(i) {
    return String(i + 1);
}

function buildSvg(opts, avatars) {
    const { title, subtitle, rows, economy, page, totalPages, tip } = opts;
    const H = HEADER + rows.length * ROW_H + FOOTER + 20;

    const rowSvg = rows.map((r, i) => {
        const y = HEADER + i * ROW_H;
        const av = avatars[i];
        const clipId = 'av' + i;
        const barMax = Math.max(1, rows[0]?.value || 1);
        const fill = Math.max(4, Math.round((Number(r.value || 0) / barMax) * 220));
        const metric = economy
            ? `Saldo: ${fmt(r.value)} éter`
            : `XP: ${fmt(r.value)}${r.level != null ? '  ·  Nv. ' + r.level : ''}`;
        const accent = medalColor(i);

        return `
  <rect x="28" y="${y}" width="${W - 56}" height="84" rx="16" fill="#0b0f1a" fill-opacity="0.92" stroke="${accent}" stroke-opacity="0.45" stroke-width="1.5"/>
  <circle cx="70" cy="${y + 42}" r="26" fill="${accent}"/>
  <text x="70" y="${y + 48}" text-anchor="middle" font-family="${FONT}" font-size="18" font-weight="800" fill="#0f172a">${medalLabel(i)}</text>
  <defs><clipPath id="${clipId}"><circle cx="128" cy="${y + 42}" r="28"/></clipPath></defs>
  ${av
      ? `<image href="${av}" x="100" y="${y + 14}" width="56" height="56" clip-path="url(#${clipId})" preserveAspectRatio="xMidYMid slice"/>`
      : `<circle cx="128" cy="${y + 42}" r="28" fill="#1e1b4b"/><text x="128" y="${y + 48}" text-anchor="middle" font-size="20" fill="#c4b5fd">?</text>`}
  <circle cx="128" cy="${y + 42}" r="28" fill="none" stroke="${accent}" stroke-width="2"/>
  <text x="172" y="${y + 28}" font-family="${FONT}" font-size="18" font-weight="700" fill="#f8fafc">${esc(r.name).slice(0, 28)}</text>
  <text x="172" y="${y + 48}" font-family="${FONT}" font-size="12" fill="#94a3b8">ID: ${esc(r.id)}</text>
  <text x="172" y="${y + 68}" font-family="${FONT}" font-size="14" font-weight="600" fill="${accent}">${esc(metric)}</text>
  <rect x="${W - 260}" y="${y + 58}" width="220" height="8" rx="4" fill="#1e293b"/>
  <rect x="${W - 260}" y="${y + 58}" width="${fill}" height="8" rx="4" fill="${accent}"/>
`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a0614"/>
      <stop offset="50%" stop-color="#12081f"/>
      <stop offset="100%" stop-color="#0b0618"/>
    </linearGradient>
    <linearGradient id="titleG" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#c4b5fd"/>
      <stop offset="50%" stop-color="#fbbf24"/>
      <stop offset="100%" stop-color="#a78bfa"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="80" cy="40" r="120" fill="#7c3aed" fill-opacity="0.12"/>
  <circle cx="${W - 60}" cy="80" r="100" fill="#fbbf24" fill-opacity="0.08"/>

  <text x="40" y="48" font-family="${FONT}" font-size="14" font-weight="700" fill="#a78bfa" letter-spacing="3">COMANDO</text>
  <text x="40" y="88" font-family="${FONT}" font-size="42" font-weight="900" fill="url(#titleG)">RANK</text>
  <text x="40" y="118" font-family="${FONT}" font-size="14" fill="#c4b5fd">${esc(subtitle || 'Ranking Aeternus')}</text>
  <text x="${W - 40}" y="48" text-anchor="end" font-family="${FONT}" font-size="13" fill="#94a3b8">Página ${page}/${totalPages}</text>
  <text x="${W - 40}" y="72" text-anchor="end" font-family="${FONT}" font-size="20" fill="#e9d5ff">👑</text>

  ${rowSvg}

  <text x="${W / 2}" y="${H - 36}" text-anchor="middle" font-family="${FONT}" font-size="12" fill="#94a3b8">${esc(tip || '')}</text>
  <text x="${W / 2}" y="${H - 14}" text-anchor="middle" font-family="${FONT}" font-size="11" font-weight="700" fill="#a78bfa" letter-spacing="2">AETERNUS BOT</text>
</svg>`;
}

/**
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} opts.subtitle
 * @param {Array<{name,id,value,level?,avatarURL?}>} opts.rows
 * @param {boolean} opts.economy
 * @param {number} opts.page
 * @param {number} opts.totalPages
 * @param {string} opts.tip
 */
async function render(opts) {
    const rows = (opts.rows || []).slice(0, 10);
    const avatars = await Promise.all(rows.map((r) => fetchDataUri(r.avatarURL)));
    const svg = buildSvg({ ...opts, rows }, avatars);
    const svgBuf = Buffer.from(svg, 'utf8');

    try {
        const sharp = require('sharp');
        const png = await sharp(svgBuf, { density: 160 })
            .png({ quality: 92 })
            .toBuffer();
        return { buffer: png, name: 'rank.png' };
    } catch (e) {
        console.warn('[rankCard] sharp falhou:', e.message);
        return { buffer: svgBuf, name: 'rank.svg' };
    }
}

module.exports = { render };
