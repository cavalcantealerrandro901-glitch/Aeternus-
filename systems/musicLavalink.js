/**
 * Inicializa conexão Lavalink quando o bot ficar online.
 */
const music = require('../utils/music');

function setup(client) {
    const boot = async () => {
        try {
            const ok = await music.initLavalink(client);
            if (ok) console.log('🎵 [lavalink] sistema de música com Lavalink ativo');
            else console.log('🎵 [music] Lavalink não configurado — usando fontes locais');
        } catch (e) {
            console.error('[lavalink] init:', e.message);
        }
    };

    if (client.isReady?.()) boot();
    else {
        client.once('clientReady', boot);
        client.once('ready', boot);
    }
}

module.exports = { setup };
