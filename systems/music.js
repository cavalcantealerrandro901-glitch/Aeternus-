/**
 * Sistema de música Aeternus · DisTube 5
 * Fontes: YouTube, Spotify, SoundCloud, Deezer, links diretos, yt-dlp
 */
const { EmbedBuilder } = require('discord.js');

const COLOR = 0xa78bfa;
const COLOR_ERR = 0xef4444;
const COLOR_WARN = 0xf59e0b;

function setup(client) {
    if (client.distube) return;

    let DisTube;
    try {
        ({ DisTube } = require('distube'));
    } catch (e) {
        console.warn('[music] distube não instalado:', e.message);
        return;
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
    tryPlugin('yt-dlp', () => new (require('@distube/yt-dlp').YtDlpPlugin)());
    tryPlugin('direct-link', () => new (require('@distube/direct-link').DirectLinkPlugin)());

    let ffmpegPath;
    try {
        ffmpegPath = require('ffmpeg-static');
    } catch (_) {}

    const opts = {
        emitNewSongOnly: true,
        savePreviousSongs: true,
        nsfw: false,
        emitAddListWhenCreatingQueue: true,
        emitAddSongWhenCreatingQueue: true,
        joinNewVoiceChannel: false,
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
                {
                    name: 'Fila',
                    value: `${queue.songs.length} música(s)`,
                    inline: true
                }
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
        const emb = new EmbedBuilder()
            .setColor(COLOR)
            .setTitle('📋 Playlist')
            .setDescription(
                `**${playlist.name}** · ${playlist.songs.length} música(s)`
            );
        queue.textChannel?.send({ embeds: [emb] }).catch(() => {});
    });

    distube.on('error', (error, queue) => {
        const msg = String(error?.message || error).slice(0, 400);
        console.error('[music]', msg);
        queue?.textChannel
            ?.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLOR_ERR)
                        .setTitle('❌ Música')
                        .setDescription(msg)
                ]
            })
            .catch(() => {});
    });

    distube.on('finish', (queue) => {
        queue.textChannel
            ?.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLOR)
                        .setDescription('Fila terminou.')
                ]
            })
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

/** Helpers de voz para comandos */
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
    const { memberVC, botVC, queue } = voiceState(ctx);
    if (memberNeed && !memberVC) return 'Entre em um canal de voz primeiro.';
    if (botNeed && !botVC) return 'Eu não estou em nenhum canal de voz.';
    if (same && memberVC && botVC && memberVC.id !== botVC.id) {
        return 'Você precisa estar no mesmo canal de voz que eu.';
    }
    if (queueNeed && !queue) return 'Não há nada tocando agora.';
    return null;
}

module.exports = { setup, voiceState, needVoice, COLOR, COLOR_ERR, COLOR_WARN };
