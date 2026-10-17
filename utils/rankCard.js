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

async function avatarData(url, sharp) {
  if (!url) return '';
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) return '';
    const input = Buffer.from(await response.arrayBuffer());
    if (input.length > 2_000_000) return '';
    const tiny = await sharp(input, { limitInputPixels: 4000000 })
      .resize(88, 88, { fit: 'cover' }).png().toBuffer();
    return 'data:image/png;base64,' + tiny.toString('base64');
  } catch { return ''; }
}
const MAX_ROWS = 5;
const TEMPLATE_PATH = path.join(__dirname, '..', 'assets', 'rank', 'rank-template.svg');
const OUTPUT_DIR = path.join(__dirname, '..', 'assets', 'rank');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'rank-card.png');
const FALLBACK_COLORS = ['#ffdf35', '#e7eaff', '#ffad63', '#e7a3ff', '#c65aff'];

function rowMarkup(r, i, y, opts, maxValue) {
  const color = FALLBACK_COLORS[i] || '#c65aff';
  const economy = opts.economy !== false;
  const barWidth = 1088;
  const fill = Math.max(0, Math.min(barWidth, Math.round((Math.max(0, Number(r.value) || 0) / Math.max(1, maxValue)) * barWidth)));
  // Preserva símbolos decorativos do nome (♡ ☆ € 《 ¤ ◇ ♧ 》 £ ₩ ♤ etc.).
  // NFKC converte letras Unicode estilizadas quando há equivalente comum;
  // a fonte DejaVu Sans cobre boa parte dos símbolos e o SVG mantém os caracteres.
  const rawName = String(r.name || 'Aventureiro')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
  const name = esc((rawName || 'Aventureiro').slice(0, 28));
  const id = esc(String(r.id || '—').slice(0, 22));
  const avatar = r.avatarData || '';
  const value = esc(fmt(r.value));
  const rank = Math.max(1, Number(r.rank) || i + 1);
  const level = Math.max(0, Number(r.level) || 0);
  const circleY = y + (i === 4 ? 63 : 76);
  const circleR = i === 4 ? 31 : 34;
  const avatarR = i === 4 ? 40 : 45;
  const cardH = i === 4 ? 126 : 151;
  const barY = y + cardH - 21;
  return `<g>
    <text x="99" y="${circleY + 9}" text-anchor="middle" font-family="DejaVu Sans, Noto Sans Symbols 2, Symbola, Noto Color Emoji, Arial, sans-serif" font-size="30" font-weight="800" fill="#fff">${rank}</text>
    <circle cx="190" cy="${circleY}" r="${avatarR-3}" fill="#130a20" stroke="${color}" stroke-opacity=".75" stroke-width="1.5"/>
    ${avatar ? `<clipPath id="avatarClip${i}"><circle cx="190" cy="${circleY}" r="${avatarR-4}"/></clipPath><image href="${avatar}" x="${190-(avatarR-4)}" y="${circleY-(avatarR-4)}" width="${(avatarR-4)*2}" height="${(avatarR-4)*2}" preserveAspectRatio="xMidYMid slice" clip-path="url(#avatarClip${i})"/>` : `<path d="M190 ${circleY-18} l5 13 13 5 -13 5 -5 13 -5 -13 -13 -5 13 -5 Z" fill="none" stroke="#e7a3ff" stroke-opacity=".9"/>`}
    <text x="262" y="${y+65}" font-family="DejaVu Sans, Noto Sans Symbols 2, Symbola, Noto Color Emoji, Arial, sans-serif" font-size="30" font-weight="800" fill="#f8f3ff">${name}</text>
    <text x="262" y="${y+103}" font-family="DejaVu Sans, Noto Sans Symbols 2, Symbola, Noto Color Emoji, Arial, sans-serif" font-size="19" letter-spacing=".6" fill="#dca9ef">ID · ${id}</text>
    <text x="1355" y="${y+64}" text-anchor="end" font-family="DejaVu Sans, Noto Sans Symbols 2, Symbola, Noto Color Emoji, Arial, sans-serif" font-size="37" font-weight="900" fill="${color}">${value} ${economy ? 'ÉTER' : 'XP'}</text>
    <text x="1355" y="${y+104}" text-anchor="end" font-family="DejaVu Sans, Noto Sans Symbols 2, Symbola, Noto Color Emoji, Arial, sans-serif" font-size="18" font-weight="800" letter-spacing="1" fill="#e9b8ff">${economy ? 'VALOR TOTAL' : 'NÍVEL ' + fmt(level)}</text>
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
  let sharp;
  try {
    const mod = require('sharp');
    sharp = typeof mod === 'function' ? mod : mod?.default;
    if (typeof sharp !== 'function') throw new TypeError('Exportação do sharp inválida');
  } catch (err) {
    // PNG é obrigatório para este card: não devolve SVG como anexo silenciosamente.
    throw new Error('Não foi possível carregar sharp para gerar o PNG do ranking: ' + (err?.message || err));
  }

  // Converte os avatares em paralelo para evitar que uma foto lenta atrase as demais.
  await Promise.all(rows.map(async row => {
    row.avatarData = await avatarData(row.avatarURL, sharp);
  }));
  const svgBuf = Buffer.from(buildSvg(opts, rows, template), 'utf8');

  // Salva o último card renderizado em arquivo e envia o mesmo buffer ao Discord.
  // O SVG-base continua preservado; o arquivo PNG é atualizado a cada chamada.
  try {
    const png = await sharp(svgBuf, { density: 72, limitInputPixels: 1600000 })
      .resize({ width: 1100, withoutEnlargement: true })
      .png({ compressionLevel: 9, palette: true })
      .toBuffer();
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, png);
    return { buffer: png, name: 'aeternus-rank.png', path: OUTPUT_PATH };
  } catch (err) {
    throw new Error('Falha ao renderizar/salvar assets/rank/rank-card.png: ' + (err?.message || err));
  }
}
module.exports = { render };
