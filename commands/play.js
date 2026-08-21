const { EmbedBuilder } = require('discord.js');
const settings = require('../utils/settings');
const music = require('../utils/musicPlayer');

module.exports = {
    name: 'play',
    aliases: ['p', 'tocar', 'music'],
    description: 'Adiciona música na fila e toca no canal do painel',
    async execute(message, args) {
        if (!message.guild) {
            return message.reply('Use este comando em um servidor.');
        }

        const cfg = settings.getGuild(message.guild.id);
        const voiceChannelId = cfg.musicVoiceChannel || cfg.musicChannel || null;

        if (!voiceChannelId) {
            return message.reply(
                'Nenhum **canal de voz** configurado.\n' +
                    'Painel → **🎵 Música** → escolha o canal e salve.'
            );
        }

        const query = args.join(' ').trim();
        const auto = !query;

        const loading = await message.reply(
            auto ? '🎲 Escolhendo uma música…' : `🔎 Buscando **${query.slice(0, 80)}**…`
        );

        try {
            const result = await music.enqueue(
                message.guild,
                voiceChannelId,
                message.channel.id,
                query,
                message.author.id,
                message.client
            );

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
                        name: result.started ? 'Status' : 'Posição na fila',
                        value: result.started ? 'Reproduzindo' : `#${result.position}`,
                        inline: true
                    },
                    {
                        name: 'Fila',
                        value: `${result.queueSize} aguardando · \`O.queue\``,
                        inline: true
                    }
                )
                .setFooter({ text: auto ? 'Escolha automática do bot' : `Pedido por ${message.author.username}` });

            if (result.track.thumbnail) embed.setThumbnail(result.track.thumbnail);

            await loading.edit({ content: null, embeds: [embed] });
        } catch (err) {
            console.error('[play]', err);
            await loading.edit(`❌ ${err.message || 'Falha ao tocar.'}`);
        }
    }
};
