const { EmbedBuilder, ChannelType } = require('discord.js');
const settings = require('../utils/settings');
const music = require('../utils/musicPlayer');

module.exports = {
    name: 'play',
    aliases: ['p', 'tocar', 'music'],
    description: 'Adiciona música na fila e toca no canal de voz',
    async execute(message, args) {
        if (!message.guild) {
            return message.reply('Use este comando em um servidor.');
        }

        const cfg = settings.getGuild(message.guild.id);
        const configured = cfg.musicVoiceChannel || cfg.musicChannel || null;
        const userVc = message.member?.voice?.channelId || null;

        // Prioridade: painel → canal do usuário
        let voiceChannelId = configured || userVc;

        if (!voiceChannelId) {
            return message.reply(
                'Entre em um **canal de voz** ou configure um no **painel → 🎵 Música**.'
            );
        }

        // Se o configurado falhar, tenta o do usuário
        const query = args.join(' ').trim();
        const auto = !query;

        const loading = await message.reply(
            auto ? '🎲 Escolhendo uma música…' : `🔎 Buscando **${query.slice(0, 80)}**…`
        );

        try {
            let result;
            try {
                result = await music.enqueue(
                    message.guild,
                    voiceChannelId,
                    message.channel.id,
                    query,
                    message.author.id,
                    message.client
                );
            } catch (err) {
                // fallback: canal do usuário se painel falhou
                if (configured && userVc && userVc !== configured) {
                    console.warn('[play] fallback para VC do usuário:', err.message);
                    result = await music.enqueue(
                        message.guild,
                        userVc,
                        message.channel.id,
                        query,
                        message.author.id,
                        message.client
                    );
                    voiceChannelId = userVc;
                } else {
                    throw err;
                }
            }

            const embed = new EmbedBuilder()
                .setColor(0x1db954)
                .setTitle(result.started ? '🎶 Tocando agora' : '➕ Adicionada à fila')
                .setDescription(`**[${result.track.title}](${result.track.url})**`)
                .addFields(
                    { name: 'Canal de voz', value: `<#${voiceChannelId}>`, inline: true },
                    {
                        name: 'Duração',
                        value: music.formatDuration(result.track.duration),
                        inline: true
                    },
                    {
                        name: result.started ? 'Status' : 'Posição',
                        value: result.started ? 'Reproduzindo' : `#${result.position}`,
                        inline: true
                    }
                )
                .setFooter({ text: auto ? 'Escolha automática' : `Pedido por ${message.author.username}` });

            if (result.track.thumbnail) embed.setThumbnail(result.track.thumbnail);
            await loading.edit({ content: null, embeds: [embed] });
        } catch (err) {
            console.error('[play]', err);
            await loading.edit(`❌ ${err.message || 'Falha ao tocar.'}`);
        }
    }
};
