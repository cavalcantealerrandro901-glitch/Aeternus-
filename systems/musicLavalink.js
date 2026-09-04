/**
 * Lavalink + hooks no sistema de música (multi-node)
 */
const music = require('../utils/music');

function setup(client) {
    const boot = async () => {
        try {
            let lavalink = null;
            try {
                lavalink = require('../utils/lavalink');
            } catch (e) {
                console.error('[lavalink] load:', e.message);
            }

            if (!lavalink) {
                console.log('🎵 [music] Lavalink module ausente — fontes locais');
                return;
            }

            const ok = await lavalink.init(client);
            if (!ok) {
                console.log('🎵 [music] Lavalink não configurado — usando fontes locais');
                return;
            }

            const origEnqueue = music.enqueue;
            const origSkip = music.skip;
            const origPause = music.pause;
            const origResume = music.resume;
            const origStop = music.stop;
            const origSetVolume = music.setVolume;
            const origGetQueueView = music.getQueueView;

            music.enqueue = async function (guild, voiceChannel, textChannel, query, user) {
                if (lavalink.isAvailable()) {
                    const ll = await lavalink.enqueue(guild, voiceChannel, textChannel, query, user);
                    if (ll?.ok) return ll;
                    if (ll && !ll.fallback && ll.error) return ll;
                }
                return origEnqueue(guild, voiceChannel, textChannel, query, user);
            };

            music.skip = function (guildId) {
                if (lavalink.hasPlayer(guildId)) return lavalink.skip(guildId);
                return origSkip(guildId);
            };
            music.pause = function (guildId) {
                if (lavalink.hasPlayer(guildId)) return lavalink.pause(guildId);
                return origPause(guildId);
            };
            music.resume = function (guildId) {
                if (lavalink.hasPlayer(guildId)) return lavalink.resume(guildId);
                return origResume(guildId);
            };
            music.stop = function (guildId) {
                if (lavalink.hasPlayer(guildId) || lavalink.isAvailable()) {
                    lavalink.stop(guildId).catch(() => {});
                }
                return origStop(guildId);
            };
            music.setVolume = function (guildId, vol) {
                if (lavalink.hasPlayer(guildId)) return lavalink.setVolume(guildId, vol);
                return origSetVolume(guildId, vol);
            };
            music.getQueueView = function (guildId) {
                if (lavalink.hasPlayer(guildId)) return lavalink.getQueueView(guildId);
                return origGetQueueView(guildId);
            };

            const nodes = lavalink.listNodes?.() || [];
            console.log(
                '🎵 [lavalink] ativo com ' +
                    nodes.length +
                    ' node(s): ' +
                    nodes.map((n) => n.label + (n.active ? '*' : '')).join(', ')
            );
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
