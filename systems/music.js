/**
 * Sistema de música Aeternus · DisTube 5
 * Fontes: YouTube, Spotify, SoundCloud, Deezer, links diretos, yt-dlp
 */
const { EmbedBuilder, PermissionsBitField } = require('discord.js');

const COLOR = 0xa78bfa;
const COLOR_ERR = 0xef4444;
const COLOR_WARN = 0xf59e0b;

/** Carrega libs de criptografia de voz (obrigatório para conectar) */
async function loadVoiceCrypto() {
    // ordem: libsodium-wrappers (JS puro) → tweetnacl fallback
    try {
        const sodium = require('libsodium-wrappers');
        await sodium.ready;
        console.log('[music] crypto: libsodium-wrappers OK');
        return true;
    } catch (e) {
        console.warn('[music] libsodium-wrappers:', e.message);
    }
    try {
        require('tweetnacl');
        console.log('[music] crypto: tweetnacl OK');
        return true;
    } catch (e) {
        console.warn('[music] tweetnacl:', e.message);
    }
    console.error('[music] NENHUMA lib de crypto de voz. Instale libsodium-wrappers.');
    return false;
}

function setup(client) {
    if (client.distube) return;

    // inicia crypto em background; play espera se precisar
    client._voiceCryptoReady = loadVoiceCrypto();

    let DisTube;
    try {
        ({ DisTube } = require('distube'));
    } catch (e) {
        console.warn('[music] distube não instalado:', e.message);
        return;
    }

    // opus: nativo ou JS
    try {
        require('@discordjs/opus');
        console.log('[music] opus: @discordjs/opus');
    } catch (_) {
        try {
            require('opusscript');
            console.log('[music] opus: opusscript (fallback)');
        } catch (e) {
            console.warn('[music] opus ausente:', e.message);
        }
    }

    const plugins = [];
    const tryPlugin = (name, factory) => {
        try {
            plugins.push(factory());
            console.log(`[music] plugin: ${name}`);
        } catch (e) {
            console.warn(`[music] plugin ${name} falhou:`, e.message);
        }
    };

    tryPlugin('youtube', () => new (require('@distube/youtube').YouTubePlugin)());
    tryPlugin('soundcloud', () => new (require('@distube/soundcloud').SoundCloudPlugin)());
    tryPlugin('spotify', () => new (require('@distube/spotify').SpotifyPlugin)());
    tryPlugin('deezer', () => new (require('@distube/deezer').DeezerPlugin)());
    tryPlugin('yt-dlp', () => new (require('@distube/yt-dlp').YtDlpPlugin)({ update: false }));
    tryPlugin('direct-link', () => new (require('@distube/direct-link').DirectLinkPlugin)());

    let ffmpegPath;
    try {
        ffmpegPath = require('ffmpeg-static');
        console.log('[music] ffmpeg:', ffmpegPath);
    } catch (_) {
        console.warn('[music] ffmpeg-static ausente');
    }

    const opts = {
        emitNewSongOnly: true,
        savePreviousSongs: true,
        nsfw: false,
        emitAddListWhenCreatingQueue: true,
        emitAddSongWhenCreatingQueue: true,
        // true = entra/troca de canal ao dar play (evita stuck)
        joinNewVoiceChannel: true,
        plugins
    };
    if (ffmpegPath) opts.ffmpeg = { path: ffmpegPath };

    client.distube = new DisTube(client, opts);
    client.distubeSettings = {
        leaveOnEmpty: true,
        leaveOnFinish: false,
        leaveOnStop: true,
        emptyCooldown: 60
    };

    const distube = client.distube;

    distube.on('playSong', (queue, song) => {
        const emb = new EmbedBuilder()
            .setColor(COLOR)
            .setTitle('🎵 Tocando')
            .setDescription(`[**${song.name}**](${song.url})`)
            .addFields(
                { name: 'Duração', value: song.formattedDuration || '—', inline: true },
                { name: 'Pedido por', value: `${song.user || '—'}`, inline: true },
                { name: 'Fila', value: `${queue.songs.length} música(s)`, inline: true }
            );
        if (song.thumbnail) emb.setThumbnail(song.thumbnail);
        queue.textChannel?.send({ embeds: [emb] }).catch(() => {});
    });

    distube.on('addSong', (queue, song) => {
        if (queue.songs.length <= 1) return;
        const emb = new EmbedBuilder()
            .setColor(COLOR)
            .setTitle('➕ Adicionada')
            .setDescription(`[**${song.name}**](${song.url}) · ${song.formattedDuration || ''}`)
            .setFooter({ text: `Posição ${queue.songs.length} na fila` });
        if (song.thumbnail) emb.setThumbnail(song.thumbnail);
        queue.textChannel?.send({ embeds: [emb] }).catch(() => {});
    });

    distube.on('addList', (queue, playlist) => {
        queue.textChannel
            ?.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLOR)
                        .setTitle('📋 Playlist')
                        .setDescription(`**${playlist.name}** · ${playlist.songs.length} música(s)`)
                ]
            })
            .catch(() => {});
    });

    distube.on('error', (error, queue) => {
        const msg = String(error?.message || error).slice(0, 500);
        console.error('[music] error:', msg);
        let tip = msg;
        if (/30 seconds|connect to the voice/i.test(msg)) {
            tip +=
                '\n\n**Dicas:**\n' +
                '• Confira se o bot tem permissão **Conectar** e **Falar** no canal\n' +
                '• No Render, voice UDP às vezes falha — tente reiniciar o deploy\n' +
                '• Espere o log `[music] crypto: libsodium-wrappers OK`';
        }
        queue?.textChannel
            ?.send({
                embeds: [
                    new EmbedBuilder().setColor(COLOR_ERR).setTitle('❌ Música').setDescription(tip)
                ]
            })
            .catch(() => {});
    });

    distube.on('finish', (queue) => {
        queue.textChannel
            ?.send({ embeds: [new EmbedBuilder().setColor(COLOR).setDescription('Fila terminou.')] })
            .catch(() => {});
    });

    distube.on('empty', (queue) => {
        queue.textChannel
            ?.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLOR_WARN)
                        .setDescription('Canal de voz vazio — saindo.')
                ]
            })
            .catch(() => {});
    });

    distube.on('disconnect', (queue) => {
        queue.textChannel
            ?.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLOR_WARN)
                        .setDescription('Desconectado do canal de voz.')
                ]
            })
            .catch(() => {});
    });

    console.log(`[music] DisTube ativo · ${plugins.length} plugin(s)`);
}

function voiceState(messageOrInteraction) {
    const member =
        messageOrInteraction.member ||
        messageOrInteraction.guild?.members?.cache?.get(messageOrInteraction.user?.id);
    const guild = messageOrInteraction.guild;
    const memberVC = member?.voice?.channel || null;
    const botVC = guild?.members?.me?.voice?.channel || null;
    const queue = guild ? messageOrInteraction.client.distube?.getQueue(guild) : null;
    return { member, guild, memberVC, botVC, queue };
}

function needVoice(ctx, { memberNeed = true, botNeed = false, same = false, queueNeed = false } = {}) {
    const { memberVC, botVC, queue, guild } = voiceState(ctx);
    if (memberNeed && !memberVC) return 'Entre em um canal de voz primeiro.';

    if (memberVC && guild?.members?.me) {
        const perms = memberVC.permissionsFor(guild.members.me);
        if (perms && !perms.has(PermissionsBitField.Flags.Connect)) {
            return 'Não tenho permissão de **Conectar** nesse canal.';
        }
        if (perms && !perms.has(PermissionsBitField.Flags.Speak)) {
            return 'Não tenho permissão de **Falar** nesse canal.';
        }
    }

    if (botNeed && !botVC) return 'Eu não estou em nenhum canal de voz.';
    if (same && memberVC && botVC && memberVC.id !== botVC.id) {
        return 'Você precisa estar no mesmo canal de voz que eu.';
    }
    if (queueNeed && !queue) return 'Não há nada tocando agora.';
    return null;
}

/** Garante crypto pronta antes de play */
async function ensureCrypto(client) {
    if (client._voiceCryptoReady) await client._voiceCryptoReady;
}

module.exports = {
    setup,
    voiceState,
    needVoice,
    ensureCrypto,
    COLOR,
    COLOR_ERR,
    COLOR_WARN
};
