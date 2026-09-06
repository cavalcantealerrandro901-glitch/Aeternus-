/** Imagem de vitória do Mines (anexa no sacar) */
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, '..', 'assets', 'mines-win.jpg');
// Conteúdo gerado a partir da arte enviada (redimensionada)
const B64 = require('./minesWinImageData.js');
function ensureMinesWinImage() {
  try {
    if (fs.existsSync(OUT) && fs.statSync(OUT).size > 1000) return OUT;
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, Buffer.from(B64, 'base64'));
    return OUT;
  } catch (e) {
    console.warn('[mines] imagem win:', e.message);
    return null;
  }
}
module.exports = { ensureMinesWinImage, WIN_IMG_PATH: OUT };
