/**
 * Loader do player — prefere music.full.js local; fallback histórico do GitHub
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const LOCAL = path.join(__dirname, 'music.full.js');
const CACHE = path.join(__dirname, '.music.cache.js');
const REMOTE =
    'https://raw.githubusercontent.com/cavalcantealerrandro901-glitch/Aeternus-/main/utils/music.full.js';

function loadFile(p) {
    try {
        delete require.cache[require.resolve(p)];
        return require(p);
    } catch (e) {
        console.error('[music] load', path.basename(p), e.message);
        return null;
    }
}

function load() {
    if (fs.existsSync(LOCAL)) {
        const m = loadFile(LOCAL);
        if (m) {
            console.log('[music] implementação local (music.full.js)');
            return m;
        }
    }
    if (fs.existsSync(CACHE)) {
        const m = loadFile(CACHE);
        if (m) {
            console.log('[music] implementação do cache local');
            return m;
        }
    }
    const stubs = {
        enqueue: async () => ({ ok: false, error: 'Sistema de música carregando…' }),
        skip: () => false,
        pause: () => false,
        resume: () => false,
        stop: () => false,
        setVolume: () => 100,
        getQueueView: () => ({ current: null, queue: [], loop: false, volume: 100 }),
        resolveTrack: async () => null,
        initLavalink: async () => false
    };
    https
        .get(REMOTE, (res) => {
            if (res.statusCode !== 200) return;
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => {
                try {
                    const body = Buffer.concat(chunks).toString('utf8');
                    fs.writeFileSync(CACHE, body);
                    const impl = loadFile(CACHE);
                    if (impl) {
                        Object.assign(module.exports, impl);
                        console.log('[music] implementação carregada do GitHub');
                    }
                } catch (e) {
                    console.error('[music] remote apply:', e.message);
                }
            });
        })
        .on('error', (e) => console.error('[music] remote:', e.message));
    return stubs;
}

module.exports = load();
