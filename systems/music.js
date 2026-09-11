/**
 * Sistema de música — Shoukaku + múltiplos nodes Lavalink.
 * Balanceamento por penalidade, moveOnDisconnect e reconexão.
 */
const { Shoukaku, Connectors } = require('shoukaku');
const { getNodes } = require('../utils/musicNodes');
const musicManager = require('../utils/musicManager');

function setup(client) {
    const nodes = getNodes();
    if (!nodes.length) {
        console.warn('[music] Nenhum node configurado — música desativada.');
        return;
    }

    const shoukaku = new Shoukaku(new Connectors.DiscordJS(client), nodes, {
        moveOnDisconnect: true,
        resume: true,
        resumeTimeout: 60,
        reconnectTries: 15,
        reconnectInterval: 5,
        restTimeout: 45,
        userAgent: 'Aeternus/2.0 (Shoukaku)',
        voiceConnectionTimeout: 30
    });

    client.shoukaku = shoukaku;

    shoukaku.on('ready', (name, reconnected) => {
        console.log(`🎵 [lavalink] node pronto: ${name}${reconnected ? ' (reconectado)' : ''}`);
    });

    shoukaku.on('error', (name, error) => {
        console.error(`🎵 [lavalink] erro em ${name}:`, error?.message || error);
    });

    shoukaku.on('close', (name, code, reason) => {
        console.warn(`🎵 [lavalink] fechado ${name} · ${code} · ${reason || ''}`);
    });

    shoukaku.on('disconnect', (name, count) => {
        console.warn(`🎵 [lavalink] disconnect ${name} · players afetados: ${count}`);
    });

    shoukaku.on('debug', (name, info) => {
        if (process.env.MUSIC_DEBUG === '1') console.log(`[music:debug] ${name}`, info);
    });

    client.on('clientReady', () => {
        const names = [...shoukaku.nodes.keys()];
        console.log(`🎵 [music] Shoukaku ativo · nodes: ${names.join(', ') || '(conectando…)'}`);
    });

    // compat ready antigo
    client.on('ready', () => {
        const names = [...shoukaku.nodes.keys()];
        console.log(`🎵 [music] Shoukaku ativo · nodes: ${names.join(', ') || '(conectando…)'}`);
    });

    console.log(`[music] Shoukaku · ${nodes.length} node(s) configurado(s)`);
    for (const n of nodes) {
        console.log(`  → ${n.name} @ ${n.url} (secure=${!!n.secure})`);
    }
}

module.exports = { setup, musicManager };
