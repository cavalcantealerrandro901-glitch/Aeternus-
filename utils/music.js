/**
 * Bootstrap do sistema de música — carrega music.full.js
 */
const fs = require('fs');
const path = require('path');

const fullPath = path.join(__dirname, 'music.full.js');
if (fs.existsSync(fullPath)) {
    module.exports = require('./music.full.js');
} else {
    console.error('[music] music.full.js ausente');
    module.exports = {
        enqueue: async () => ({ ok: false, error: 'Sistema de música incompleto (music.full.js).' }),
        skip: () => false,
        pause: () => false,
        resume: () => false,
        stop: () => true,
        leave: () => {},
        setVolume: (g, v) => v,
        setLoop: () => false,
        getQueueView: () => ({ current: null, queue: [], loop: false, volume: 100, paused: false }),
        getState: () => ({}),
        fmtDuration: (s) => String(s || 0),
        resolveTrack: async () => null,
        initLavalink: async () => false
    };
}
