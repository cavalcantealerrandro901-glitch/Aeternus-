/**
 * Lavalink multi-node + cache de músicas + hooks no player
 */
const music = require('../utils/music');
const musicCache = require('../utils/musicCache');

function setup(client) {
    let booted = false;

    const boot = async () => {
        if (booted) return;
        booted = true;

        try {
            let lavalink = null;
            try {
                lavalink = require('../utils/lavalink');
            } catch (e) {
                console.error('[lavalink] load:', e.message);
            }

            if (!lavalink) {
                console.log('🎵 [music] Lavalink module ausente — fontes locais');
            } else {
                const ok = await lavalink.init(client);
                if (!ok) {
                    console.log('🎵 [music] Lavalink não configurado — usando fontes locais');
                } else {
                    const origEnqueue = music.enqueue;
                    const origSkip = music.skip;
                    const origPause = music.pause;
                    const origResume = music.resume;
                    const origStop = music.stop;
                    const origSetVolume = music.setVolume;
                    const origGetQueueView = music.getQueueView;

                    music.enqueue = async function (guild, voiceChannel, textChannel, query, user) {
                        if (lavalink.isAvailable()) {
                            const ll = await lavalink.enqueue(
                                guild,
                                voiceChannel,
                                textChannel,
                                query,
                                user
                            );
                            if (ll?.ok) return ll;
                            if (ll && !ll.fallback && ll.error) return ll;
                        }
                        return origEnqueue(guild, voiceChannel, textChannel, query, user);
                    };

                    music.skip = (guildId) =>
                        lavalink.hasPlayer(guildId) ? lavalink.skip(guildId) : origSkip(guildId);
                    music.pause = (guildId) =>
                        lavalink.hasPlayer(guildId) ? lavalink.pause(guildId) : origPause(guildId);
                    music.resume = (guildId) =>
                        lavalink.hasPlayer(guildId)
                            ? lavalink.resume(guildId)
                            : origResume(guildId);
                    music.stop = (guildId) => {
                        if (lavalink.hasPlayer(guildId) || lavalink.isAvailable()) {
                            lavalink.stop(guildId).catch(() => {});
                        }
                        return origStop(guildId);
                    };
                    music.setVolume = (guildId, vol) =>
                        lavalink.hasPlayer(guildId)
                            ? lavalink.setVolume(guildId, vol)
                            : origSetVolume(guildId, vol);
                    music.getQueueView = (guildId) =>
                        lavalink.hasPlayer(guildId)
                            ? lavalink.getQueueView(guildId)
                            : origGetQueueView(guildId);

                    const nodes = lavalink.listNodes?.() || [];
                    console.log(
                        '🎵 [lavalink] ativo com ' +
                            nodes.length +
                            ' node(s): ' +
                            nodes.map((n) => n.label + (n.active ? '*' : '')).join(', ')
                    );
                }
            }

            if (typeof music.resolveTrack === 'function') {
                const origResolve = music.resolveTrack;
                music.resolveTrack = async function (query, requestedBy) {
                    const q = String(query || '').trim();
                    if (q) {
                        const hit = musicCache.get(q, 'local');
                        if (hit) {
                            return {
                                ...hit,
                                requestedBy: requestedBy || hit.requestedBy || null,
                                _cached: true
                            };
                        }
                    }
                    const track = await origResolve(query, requestedBy);
                    if (track && q) musicCache.set(q, track, 'local');
                    return track;
                };
            }

            try {
                const st = musicCache.stats();
                console.log(
                    `[musicCache] ativo · max=${st.max} · ttl=${Math.round(st.ttlMs / 60000)}min`
                );
            } catch (_) {}
        } catch (e) {
            console.error('[lavalink] init:', e.message);
            booted = false;
        }
    };

    if (client.isReady?.()) boot();
    else client.once('clientReady', boot);
}

module.exports = { setup };
