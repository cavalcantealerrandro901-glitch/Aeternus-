/**
 * Card de ranking Aeternus. Rasterização reduzida e sem downloads de avatares.
 * Limita dimensões e linhas para reduzir picos de memória no host.
 */
function esc(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function fmt(n) { return Number(n || 0).toLocaleString('pt-BR'); }
const FONT = 'DejaVu Sans,Arial,Helvetica,sans-serif';
const W = 900, ROW_H = 104, HEADER = 160, FOOTER = 56, MAX_ROWS = 5;
function medalColor(i) { return ['#f2d18b', '#d5d9e8', '#c58a69'][i] || '#a78bfa'; }
function buildSvg(opts, rows) {
  const { title, subtitle, economy, page, totalPages, tip } = opts;
  const H = HEADER + rows.length * ROW_H + FOOTER;
  let rowSvg = '';
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i], y = HEADER + i * ROW_H, accent = medalColor(i);
    const max = Math.max(1, Number(rows[0]?.value || 1));
    const fill = Math.max(3, Math.round((Number(r.value || 0) / max) * 220));
    const metric = `${fmt(r.value)} ${economy ? 'ÉTER' : 'XP'}`;
    rowSvg += `<g>
      <rect x="22" y="${y}" width="${W-44}" height="92" rx="10" fill="#120d1c" stroke="${accent}" stroke-opacity=".45"/>
      <circle cx="58" cy="${y+35}" r="20" fill="${accent}" fill-opacity=".15" stroke="${accent}"/>
      <text x="58" y="${y+41}" text-anchor="middle" font-family="Arial,sans-serif" font-size="19" font-weight="700" fill="#fff">${Number(r.rank || i+1)}</text>
      <circle cx="112" cy="${y+35}" r="24" fill="#211536" stroke="#a78bfa"/>
      <path d="M100 ${y+35} l8 -9 l8 9 l-8 9 Z" fill="none" stroke="#b9a0ff"/>
      <text x="150" y="${y+30}" font-family="${FONT}" font-size="19" font-weight="700" fill="#f5f0ff">${esc(r.name).slice(0,22)}</text>
      <text x="150" y="${y+53}" font-family="${FONT}" font-size="12" fill="#c4b5d8">ID · ${esc(r.id)}</text>
      <text x="${W-38}" y="${y+34}" text-anchor="end" font-family="${FONT}" font-size="20" font-weight="800" fill="${accent}">${esc(metric)}</text>
      <text x="${W-38}" y="${y+56}" text-anchor="end" font-family="${FONT}" font-size="11" fill="#c4b5d8">${economy ? 'VALOR TOTAL' : 'NÍVEL ' + fmt(r.level || 0)}</text>
      <rect x="150" y="${y+72}" width="${W-210}" height="4" rx="2" fill="#2a203b"/>
      <rect x="150" y="${y+72}" width="${Math.min(W-210,fill)}" height="4" rx="2" fill="${accent}"/>
    </g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#07050d"/><stop offset="1" stop-color="#130a20"/></linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <text x="28" y="28" font-family="${FONT}" font-size="10" fill="#a78bfa" letter-spacing="2">OS REGISTROS DO ÉTER</text>
  <text x="26" y="62" font-family="${FONT}" font-size="29" font-weight="900" fill="#d8c4ff">RANK AETERNUS</text>
  <text x="28" y="88" font-family="${FONT}" font-size="15" font-weight="700" fill="#f5f0ff">${esc(subtitle || (economy ? 'RANKING DE ÉTER' : 'RANKING DE XP')).toUpperCase()}</text>
  <text x="28" y="109" font-family="${FONT}" font-size="10" fill="#9f8db8">${esc(title || 'COLISEU DOS AVENTUREIROS').toUpperCase().slice(0,48)}</text>
  <circle cx="830" cy="58" r="29" fill="none" stroke="#8b5cf6"/><path d="M830 25 L836 52 L863 58 L836 64 L830 91 L824 64 L797 58 L824 52 Z" fill="none" stroke="#b9a0ff"/>
  <text x="${W-24}" y="128" text-anchor="end" font-family="${FONT}" font-size="10" fill="#9380ac">PÁGINA ${Number(page || 1)} / ${Number(totalPages || 1)}</text>
  ${rowSvg}
  <path d="M22 ${H-35} H${W-22}" stroke="#8b5cf6" stroke-opacity=".38"/>
  <text x="${W/2}" y="${H-15}" text-anchor="middle" font-family="${FONT}" font-size="10" fill="#a99bbd">${esc(tip || 'O éter registra cada conquista.').slice(0,100)}</text>
  </svg>`;
}
async function render(opts = {}) {
  // Não baixa avatares remotos nem converte imagens em data URI/base64.
  const rows = Array.isArray(opts.rows) ? opts.rows.slice(0, MAX_ROWS) : [];
  const svgBuf = Buffer.from(buildSvg(opts, rows), 'utf8');
  try {
    const mod = require('sharp');
    const sharp = typeof mod === 'function' ? mod : mod?.default;
    if (typeof sharp !== 'function') throw new TypeError('Exportação do sharp inválida');
    // 96 DPI em vez de 190 reduz fortemente os pixels temporários e o uso de RAM.
    const pipeline = sharp(svgBuf, { density: 96, limitInputPixels: 1000000 });
    const png = await pipeline.png({ compressionLevel: 9, palette: true }).toBuffer();
    return { buffer: png, name: 'aeternus-rank.png' };
  } catch (err) {
    console.warn('[rankCard] PNG indisponível; usando SVG:', err?.message || err);
    return { buffer: svgBuf, name: 'aeternus-rank.svg' };
  }
}
module.exports = { render };
