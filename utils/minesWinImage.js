/** Imagem de vitória do Mines
 * Defina MINES_IMG_WIN com o link direto da imagem (JPG/PNG).
 * O embed usa setThumbnail → canto superior direito ao sacar.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const OUT = path.join(__dirname, '..', 'assets', 'mines-win.jpg');

function ensureMinesWinImage() {
    try {
        if (fs.existsSync(OUT) && fs.statSync(OUT).size > 1000) return OUT;
        const url = String(process.env.MINES_IMG_WIN || process.env.MINES_WIN_IMAGE || '').trim();
        if (!url || !/^https?:\/\//i.test(url)) return null;
        fs.mkdirSync(path.dirname(OUT), { recursive: true });
        const lib = url.startsWith('https') ? https : http;
        lib
            .get(url, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    return;
                }
                if (res.statusCode !== 200) return;
                const chunks = [];
                res.on('data', (c) => chunks.push(c));
                res.on('end', () => {
                    try {
                        fs.writeFileSync(OUT, Buffer.concat(chunks));
                        console.log('[mines] imagem win salva');
                    } catch (e) {
                        console.warn('[mines] save img:', e.message);
                    }
                });
            })
            .on('error', (e) => console.warn('[mines] download img:', e.message));
        return null;
    } catch (e) {
        console.warn('[mines] imagem win:', e.message);
        return null;
    }
}

module.exports = { ensureMinesWinImage, WIN_IMG_PATH: OUT };
