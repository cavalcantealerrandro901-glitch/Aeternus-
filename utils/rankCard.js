/**
 * Renderização nativa dos cards de ranking Aeternus (SVG convertido para PNG por sharp).
 * Inclui posição, nome, ID e valor, com identidade arcana/cósmica.
 */
function esc(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function fmt(n) { return Number(n || 0).toLocaleString('pt-BR'); }
async function fetchDataUri(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 1500000) return null;
    let mime = (res.headers.get('content-type') || 'image/png').split(';')[0].trim();
    if (!mime.startsWith('image/') || mime === 'image/svg+xml') return null;
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch (_) { return null; }
}
const FONT = 'DejaVu Sans,Arial,Helvetica,sans-serif';
const W = 1080, ROW_H = 128, HEADER = 200, FOOTER = 86;
function medalColor(i) {
  return ['#f2d18b', '#d5d9e8', '#c58a69'][i] || '#a78bfa';
}
function buildSigil() {
  return `<g transform="translate(930 88)" opacity=".85">
    <circle r="49" fill="none" stroke="#8b5cf6" stroke-width="1.2"/>
    <circle r="39" fill="none" stroke="#c4b5fd" stroke-width=".8" stroke-dasharray="2 5"/>
    <circle r="26" fill="none" stroke="#a78bfa"/>
    <path d="M0 -56 L8 -8 L48 0 L8 8 L0 56 L-8 8 L-48 0 L-8 -8 Z" fill="none" stroke="#b9a0ff"/>
    <path d="M-34 -34 L34 34 M34 -34 L-34 34" stroke="#7c3aed" stroke-width=".8"/>
    <circle r="7" fill="#c4b5fd" fill-opacity=".22" stroke="#ddd6fe"/>
    <circle cy="-49" r="2.5" fill="#e9d5ff"/><circle cx="49" r="2.5" fill="#e9d5ff"/>
    <circle cy="49" r="2.5" fill="#e9d5ff"/><circle cx="-49" r="2.5" fill="#e9d5ff"/>
  </g>`;
}
function buildSvg(opts, avatars) {
  const { title, subtitle, rows, economy, page, totalPages, tip } = opts;
  const H = HEADER + rows.length * ROW_H + FOOTER + 20;
  const rowSvg = rows.map((r, i) => {
    const y = HEADER + i * ROW_H, av = avatars[i], clipId = 'avatarClip' + i;
    const accent = medalColor(i), top = i < 3;
    const max = Math.max(1, Number(rows[0]?.value || 1));
    const fill = Math.max(3, Math.round((Number(r.value || 0) / max) * 300));
    const metric = `${fmt(r.value)} ${economy ? 'ÉTER' : 'XP'}`;
    return `<g>
      <rect x="27" y="${y}" width="${W-54}" height="114" rx="13" fill="url(#rowBg)" stroke="${top ? accent : '#5b4380'}" stroke-opacity="${top ? '.68' : '.42'}" stroke-width="${top ? '1.35' : '.8'}"/>
      <path d="M42 ${y+8} h30 M42 ${y+8} v16 M${W-42} ${y+60} v16 h-30" fill="none" stroke="${accent}" stroke-opacity=".6"/>
      <circle cx="82" cy="${y+57}" r="22" fill="${accent}" fill-opacity=".16" stroke="${accent}" stroke-width="2"/>
      <circle cx="82" cy="${y+57}" r="17" fill="#10091a" stroke="${accent}" stroke-opacity=".55" stroke-width=".8"/>
      <text x="82" y="${y+64}" text-anchor="middle" font-family="Arial,DejaVu Sans,sans-serif" font-size="20" font-weight="900" fill="#ffffff" stroke="#10091a" stroke-width=".35" paint-order="stroke">${i+1}</text>
      <defs><clipPath id="${clipId}"><circle cx="150" cy="${y+57}" r="34"/></clipPath></defs>
      ${av ? `<image href="${av}" x="116" y="${y+23}" width="68" height="68" clip-path="url(#${clipId})" preserveAspectRatio="xMidYMid slice"/>` :
        `<circle cx="150" cy="${y+57}" r="34" fill="#211536"/><path d="M107 ${y+43} l12 -14 l12 14 l-12 12 Z" fill="none" stroke="#b9a0ff" stroke-width="1.2"/>`}
      <circle cx="150" cy="${y+57}" r="34" fill="none" stroke="#a78bfa" stroke-opacity=".85" stroke-width="1.5"/>
      <text x="205" y="${y+45}" font-family="${FONT}" font-size="18" font-weight="700" fill="#f5f0ff">${esc(r.name).slice(0,24)}</text>
      <text x="205" y="${y+69}" font-family="${FONT}" font-size="11" fill="#c4b5d8" letter-spacing=".6">ID · ${esc(r.id)}</text>
      <text x="${W-48}" y="${y+45}" text-anchor="end" font-family="${FONT}" font-size="22" font-weight="800" fill="${accent}">${esc(metric)}</text>
      <text x="${W-48}" y="${y+69}" text-anchor="end" font-family="${FONT}" font-size="9" font-weight="700" fill="#817394" letter-spacing="2">VALOR TOTAL</text>
      <rect x="205" y="${y+94}" width="${W-256}" height="3" rx="1.5" fill="#2a203b"/>
      <rect x="205" y="${y+94}" width="${Math.min(W-256,fill)}" height="3" rx="1.5" fill="${accent}"/>
    </g>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#07050d"/><stop offset="48%" stop-color="#130a20"/><stop offset="100%" stop-color="#090610"/></linearGradient>
  <linearGradient id="titleG" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#f1e5ff"/><stop offset="52%" stop-color="#b99aff"/><stop offset="100%" stop-color="#8060c8"/></linearGradient>
  <linearGradient id="rowBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#171021"/><stop offset="100%" stop-color="#0d0915"/></linearGradient>
  <radialGradient id="nebula"><stop offset="0%" stop-color="#7c3aed" stop-opacity=".26"/><stop offset="100%" stop-color="#7c3aed" stop-opacity="0"/></radialGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<ellipse cx="70" cy="38" rx="220" ry="150" fill="url(#nebula)"/><ellipse cx="700" cy="${H-80}" rx="180" ry="150" fill="url(#nebula)"/>
<g fill="#d8c8ff" opacity=".55"><circle cx="190" cy="28" r="1.2"/><circle cx="280" cy="58" r=".9"/><circle cx="370" cy="22" r="1.1"/><circle cx="470" cy="76" r=".8"/><circle cx="540" cy="30" r="1.2"/><circle cx="710" cy="142" r=".9"/><circle cx="37" cy="135" r=".8"/><circle cx="725" cy="240" r="1"/></g>
<path d="M28 142 H${W-28}" stroke="#8b5cf6" stroke-opacity=".5"/><path d="M28 146 H180" stroke="#d8b4fe" stroke-opacity=".7" stroke-width="2"/>
<text x="38" y="34" font-family="${FONT}" font-size="10" font-weight="700" fill="#a78bfa" letter-spacing="3">OS REGISTROS DO ÉTER</text>
<text x="36" y="82" font-family="${FONT}" font-size="36" font-weight="900" fill="url(#titleG)">RANK AETERNUS</text>
<text x="39" y="111" font-family="${FONT}" font-size="18" font-weight="800" fill="#f5f0ff" letter-spacing="2">${esc(subtitle || (economy ? 'RANKING DE ÉTER' : 'RANKING DE XP')).toUpperCase()}</text>
<text x="39" y="130" font-family="${FONT}" font-size="10" fill="#9f8db8" letter-spacing="1.3">${esc(title || 'COLISEU DOS AVENTUREIROS').toUpperCase().slice(0,54)}</text>
${buildSigil()}
<text x="${W-35}" y="153" text-anchor="end" font-family="${FONT}" font-size="10" fill="#9380ac" letter-spacing="1.5">PÁGINA ${page} / ${totalPages}</text>
${rowSvg}
<path d="M28 ${H-58} H${W-28}" stroke="#8b5cf6" stroke-opacity=".38"/>
<text x="${W/2}" y="${H-37}" text-anchor="middle" font-family="${FONT}" font-size="10" fill="#a99bbd">${esc(tip || 'O éter registra cada conquista.')}</text>
<text x="${W/2}" y="${H-16}" text-anchor="middle" font-family="${FONT}" font-size="9" font-weight="700" fill="#a78bfa" letter-spacing="3">✦ A E T E R N U S ✦</text>
</svg>`;
}
async function render(opts) {
  const rows = (opts.rows || []).slice(0, 10);
  const avatars = await Promise.all(rows.map(r => fetchDataUri(r.avatarURL)));
  const svgBuf = Buffer.from(buildSvg({ ...opts, rows }, avatars), 'utf8');
  try {
    const sharp = require('sharp');
    const png = await sharp(svgBuf, { density: 190 }).png({ quality: 92 }).toBuffer();
    return { buffer: png, name: 'aeternus-rank.png' };
  } catch (e) {
    console.warn('[rankCard] sharp falhou:', e.message);
    return { buffer: svgBuf, name: 'aeternus-rank.svg' };
  }
}
module.exports = { render };
