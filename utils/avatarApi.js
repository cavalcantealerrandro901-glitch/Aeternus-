const path = require('path');
const fs = require('fs');
const player = require('./player');
const { requireAuth } = require('../web/auth');

function registerAvatarRoutes(app) {
    const rate = new Map();
    const limit = (max = 10, windowMs = 60_000) => (req, res, next) => {
        const key = String(req.auth?.user?.id || req.ip || 'unknown');
        const now = Date.now();
        let b = rate.get(key);
        if (!b || now - b.start >= windowMs) {
            b = { start: now, count: 0 };
            rate.set(key, b);
        }
        b.count++;
        if (b.count > max) return res.status(429).json({ error: 'Muitas requisições. Tente novamente em alguns segundos.' });
        next();
    };
    app.post('/api/avatar/upload', requireAuth, limit(10), (req, res) => {
        try {
            const body = req.body || {};
            const userId = String(req.auth.user.id);
            if (body.userId && String(body.userId) !== userId) {
                return res.status(403).json({ error: 'Você só pode enviar avatar para sua própria conta.' });
            }
            const dataUrl = String(body.dataUrl || '');
            const m = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=]+)$/i);
            if (!m) {
                return res.status(400).json({ error: 'dataUrl de imagem inválido (png/jpg/webp).' });
            }
            const ext = m[1].toLowerCase().includes('png')
                ? 'png'
                : m[1].toLowerCase().includes('webp')
                  ? 'webp'
                  : 'jpg';
            const buf = Buffer.from(m[2], 'base64');
            if (buf.length > 4.5 * 1024 * 1024) {
                return res.status(400).json({ error: 'Imagem muito grande (máx ~4MB).' });
            }
            const dir = path.join(__dirname, '..', 'public', 'uploads');
            fs.mkdirSync(dir, { recursive: true });
            const name = userId + '_' + Date.now() + '.' + ext;
            fs.writeFileSync(path.join(dir, name), buf);
            const base =
                String(process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_URL || '').replace(
                    /\/$/,
                    ''
                ) || '';
            const imageUrl = (base ? base : '') + '/uploads/' + name;
            return res.json({ ok: true, imageUrl, path: '/uploads/' + name });
        } catch (e) {
            return res.status(500).json({ error: e.message || 'erro no upload' });
        }
    });

    app.post('/api/avatar/generate', requireAuth, limit(5), (req, res) => {
        try {
            const body = req.body || {};
            const description = String(body.description || '').trim().slice(0, 400);
            const style = String(body.style || '3d_cinematic');
            let imageUrlIn = String(body.imageUrl || body.sourceUrl || '').trim();

            const styleMap = {
                '3d_cinematic':
                    'ultra detailed cinematic 3D character portrait, octane render, unreal engine 5, studio lighting, highly detailed face, almost photorealistic game avatar',
                '3d_game':
                    'AAA game character portrait, Unreal Engine 5, high poly 3D render, detailed materials, dramatic lighting',
                realistic:
                    'hyperrealistic 3D portrait, photoreal, subsurface scattering, 8k, sharp focus',
                anime_3d:
                    '3D anime character portrait, high quality, detailed face, soft cinematic lighting',
                fantasy: 'epic fantasy 3D character portrait, dramatic atmosphere, detailed costume'
            };
            const stylePrompt = styleMap[style] || styleMap['3d_cinematic'];

            let full;
            if (imageUrlIn) {
                if (imageUrlIn.startsWith('/uploads/')) {
                    const base =
                        String(process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_URL || '').replace(
                            /\/$/,
                            ''
                        ) || '';
                    if (base) imageUrlIn = base + imageUrlIn;
                }
                full =
                    (description ? description + ', ' : '') +
                    'transform this reference photo into a ' +
                    stylePrompt +
                    ', same person identity, centered bust, clean dark background, no text, no watermark';
            } else {
                if (description.length < 8) {
                    return res
                        .status(400)
                        .json({ error: 'Envie uma imagem ou uma descrição (mín. 8 caracteres).' });
                }
                full =
                    description +
                    ', ' +
                    stylePrompt +
                    ', centered character bust, clean background, no text, no watermark';
            }

            let out =
                'https://image.pollinations.ai/prompt/' +
                encodeURIComponent(full) +
                '?width=768&height=1024&nologo=true&enhance=true&model=flux';
            if (imageUrlIn && /^https?:\/\//i.test(imageUrlIn)) {
                out += '&image=' + encodeURIComponent(imageUrlIn);
            }
            return res.json({ ok: true, imageUrl: out, prompt: full, source: imageUrlIn || null });
        } catch (e) {
            return res.status(500).json({ error: e.message || 'erro ao gerar' });
        }
    });
}

module.exports = { registerAvatarRoutes };
