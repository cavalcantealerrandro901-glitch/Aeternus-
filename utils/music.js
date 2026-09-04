/**
 * Sistema de música — carrega music.full.js ou baixa do histórico do repo.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const FULL = path.join(__dirname, 'music.full.js');
const CACHE = path.join(__dirname, '.music.impl.cache.js');
const REMOTE =
    'https://raw.githubusercontent.com/cavalcantealerrandro901-glitch/Aeternus-/004b08c3140614a99c83418072d3885e2ad9a111/utils/music.js';

function tryRequire(p) {
    try {
        delete require.cache[require.resolve(p)];
        return require(p);
    } catch (_) {
        return null;
    }
}

function downloadRemote() {
    return new Promise((resolve, reject) => {
        https
            .get(REMOTE, (res) => {
                if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    https.get(res.headers.location, (res2) => collect(res2, resolve, reject)).on('error', reject);
                    return;
                }
                collect(res, resolve, reject);
            })
            .on('error', reject);
    });

    function collect(res, resolve, reject) {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        res.on('error', reject);
    }
}

let impl = null;

if (fs.existsSync(FULL)) {
    impl = tryRequire(FULL);
}
if (!impl && fs.existsSync(CACHE)) {
    impl = tryRequire(CACHE);
}

if (!impl) {
    // tenta baixar uma vez (sync-ish via deasync não disponível — usa stubs até aquecer)
    const stubs = {
        _ready: false,
        enqueue: async (...args) => {
            await ensure();
            return impl.enqueue(...args);
        },
        skip: (g) => (impl ? impl.skip(g) : false),
        pause: (g) => (impl ? impl.pause(g) : false),
        resume: (g) => (impl ? impl.resume(g) : false),
        stop: (g) => (impl ? impl.stop(g) : true),
        leave: (g) => (impl ? impl.leave(g) : undefined),
        setVolume: (g, v) => (impl ? impl.setVolume(g, v) : v),
        setLoop: (g, m) => (impl ? impl.setLoop(g, m) : false),
        getQueueView: (g) =>
            impl
                ? impl.getQueueView(g)
                : { current: null, queue: [], loop: false, volume: 100, paused: false },
        getState: (g) => (impl ? impl.getState(g) : {}),
        fmtDuration: (s) => (impl ? impl.fmtDuration(s) : String(s || 0)),
        resolveTrack: async (...a) => {
            await ensure();
            return impl.resolveTrack(...a);
        },
        initLavalink: async (c) => {
            await ensure();
            return impl.initLavalink ? impl.initLavalink(c) : false;
        }
    };

    async function ensure() {
        if (impl) return;
        try {
            const code = await downloadRemote();
            if (!code || !code.includes('createAudioPlayer')) throw new Error('download inválido');
            fs.writeFileSync(CACHE, code, 'utf8');
            impl = tryRequire(CACHE);
            if (!impl) throw new Error('require cache falhou');
            console.log('[music] implementação carregada do histórico do repositório');
        } catch (e) {
            console.error('[music] falha ao carregar implementação:', e.message);
            throw e;
        }
    }

    // aquecimento em background
    ensure().catch(() => {});
    module.exports = stubs;
} else {
    module.exports = impl;
}
