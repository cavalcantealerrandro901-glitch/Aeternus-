/**
 * Renderizador leve do card de ranking Aeternus.
 * Usa o SVG-base versionado em assets/rank; sem baixar avatares ou gerar data URI.
 */
const fs = require('node:fs');
const path = require('node:path');

function esc(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function fmt(n) { return Number(n || 0).toLocaleString('pt-BR'); }
const MAX_ROWS = 5;
const TEMPLATE_PATH = path.join(__dirname, '..', 'assets', 'rank', 'rank-template.svg');
const FALLBACK_COLORS = ['#ffdf35', '#e7eaff', '#ffad63', '#e7a3ff', '#c65aff'];

function rowMarkup(r, i, y, opts, maxValue) {
  const color = FALLBACK_COLORS[i] || '#c65aff';
  const economy = opts.economy !== false;
  const barWidth = 1088;
  const fill = Math.max(0, Math.min(barWidth, Math.round((Math.max(0, Number(r.value) || 0) / Math.max(1, maxValue)) * barWidth)));
  const name = esc(String(r.name || 'Aventureiro').slice(0, 28));
  const id = esc(String(r.id || '—').slice(0, 22));
  const value = esc(fmt(r.value));
  const rank = Math.max(1, Number(r.rank) || i + 1);
  const level = Math.max(0, Number(r.level) || 0);
  const circleY = y + (i === 4 ? 63 : 76);
  const circleR = i === 4 ? 31 : 34;
  const avatarR = i === 4 ? 40 : 45;
  const cardH = i === 4 ? 126 : 151;
  const barY = y + cardH - 21;
  return `<g>
    <text x="99" y="${circleY + 9}" text-anchor="middle" font-family="DejaVu Sans,Arial,sans-serif" font-size="30" font-weight="800" fill="#fff">${rank}</text>
    <circle cx="190" cy="${circleY}" r="${avatarR-3}" fill="#130a20" stroke="${color}" stroke-opacity=".75" stroke-width="1.5"/>
    <path d="M190 ${circleY-18} l5 13 13 5 -13 5 -5 13 -5 -13 -13 -5 13 -5 Z" fill="none" stroke="#e7a3ff" stroke-opacity=".9"/>
    <text x="262" y="${y+65}" font-family="DejaVu Sans,Arial,sans-serif" font-size="30" font-weight="800" fill="#f8f3ff">${name}</text>
    <text x="262" y="${y+103}" font-family="DejaVu Sans,Arial,sans-serif" font-size="19" letter-spacing=".6" fill="#dca9ef">ID · ${id}</text>
    <text x="1355" y="${y+64}" text-anchor="end" font-family="DejaVu Sans,Arial,sans-serif" font-size="37" font-weight="900" fill="${color}">${value} ${economy ? 'ÉTER' : 'XP'}</text>
    <text x="1355" y="${y+104}" text-anchor="end" font-family="DejaVu Sans,Arial,sans-serif" font-size="18" font-weight="800" letter-spacing="1" fill="#e9b8ff">${economy ? 'VALOR TOTAL' : 'NÍVEL ' + fmt(level)}</text>
    <path d="M262 ${barY} H1350" stroke="#10063b" stroke-width="6" stroke-linecap="round"/>
    <path d="M262 ${barY} H${262 + fill}" stroke="${color}" stroke-width="6" stroke-linecap="round"/>
  </g>`;
}

function buildSvg(opts, rows, template) {
  const economy = opts.economy !== false;
  const title = esc(String(opts.title || 'AETERNUS · RANK GERAL').toUpperCase().slice(0, 48));
  const subtitle = esc(String(opts.subtitle || (economy ? 'RANKING DE ÉTER' : 'RANKING DE XP')).toUpperCase().slice(0, 32));
  const page = Math.max(1, Number(opts.page) || 1);
  const totalPages = Math.max(1, Number(opts.totalPages) || 1);
  const ys = [262, 431, 600, 769, 938];
  const maxValue = Math.max(1, ...rows.map(r => Math.max(0, Number(r.value) || 0)));
  let svg = template
    .replace('RANKING DE ÉTER', subtitle)
    .replace('✧ AETERNUS · RANK GERAL', title)
    .replace('PÁGINA 1 / 1', `PÁGINA ${page} / ${totalPages}`);
  const inserts = rows.map((r, i) => rowMarkup(r, i, ys[i], opts, maxValue)).join('');
  // Os dados são inseridos dentro das cinco molduras vazias do SVG-base.
  return svg.replace('</svg>', inserts + '</svg>');
}

async function render(opts = {}) {
  const rows = Array.isArray(opts.rows) ? opts.rows.slice(0, MAX_ROWS) : [];
  let template;
  try { template = fs.readFileSync(TEMPLATE_PATH, 'utf8'); }
  catch (err) {
    console.warn('[rankCard] Modelo SVG não encontrado; usando modelo mínimo:', err.message);
    template = '<svg xmlns="http://www.w3.org/2000/svg" width="1383" height="1100" viewBox="0 0 1383 1100"><rect width="1383" height="1100" fill="#030207"/><text x="40" y="80" fill="#e9a8ff" font-size="42">RANK AETERNUS</text></svg>';
  }
  const svgBuf = Buffer.from(buildSvg(opts, rows, template), 'utf8');
  try {
    const mod = require('sharp');
    const sharp = typeof mod === 'function' ? mod : mod?.default;
    if (typeof sharp !== 'function') throw new TypeError('Exportação do sharp inválida');
    const png = await sharp(svgBuf, { density: 72, limitInputPixels: 1600000 })
      .resize({ width: 1100, withoutEnlargement: true })
      .png({ compressionLevel: 9, palette: true }).toBuffer();
    return { buffer: png, name: 'aeternus-rank.png' };
  } catch (err) {
    console.warn('[rankCard] PNG indisponível; usando SVG:', err?.message || err);
    return { buffer: svgBuf, name: 'aeternus-rank.svg' };
  }
}
module.exports = { render };
