const { EmbedBuilder } = require('discord.js');
const settings = require('../utils/settings');
const music = require('../utils/musicPlayer');

module.exports = {
    name: 'play',
    aliases: ['p', 'tocar', 'music'],
    description: 'Toca música no canal de voz configurado no painel',
    async execute(message, args) {
        if (!message.guild) {
            return message.reply('Use este comando em um servidor.');
        }

        const cfg = settings.getGuild(message.guild.id);
        const voiceChannelId = cfg.musicVoiceChannel || cfg.musicChannel || null;

        if (!voiceChannelId) {
            return message.reply(
                'Nenhum **canal de voz** configurado para música.\n' +
                    'Abra o **painel → Música** e escolha o canal onde o bot deve tocar.'
            );
        }

        const query = args.join(' ').trim();
        const auto = !query;

        const loading = await message.reply(
            auto
                ? '🎲 Sem música escolhida — o bot vai escolher uma…'
                : `🔎 Buscando **${query.slice(0, 80)}**…`
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
                .setTitle(result.started ? '🎶 Tocando' : '➕ Na fila')
                .setDescription(`**[${result.track.title}](${result.track.url})**`)
                .addFields(
                    {
                        name: 'Canal de voz',
                        value: `<#${voiceChannelId}>`,
                        inline: true
                    },
                    {
                        name: auto ? 'Escolha' : 'Pedido',
                        value: auto ? 'Aleatória do bot' : `<@${message.author.id}>`,
                        inline: true
                    }
                )
                .setFooter({ text: 'O.stop · O.skip · Painel → Música' });

            if (result.track.thumbnail) embed.setThumbnail(result.track.thumbnail);
            if (!result.started) {
                embed.addFields({ name: 'Posição na fila', value: String(result.position), inline: true });
            }

            await loading.edit({ content: null, embeds: [embed] });
        } catch (err) {
            console.error('[play]', err);
            await loading.edit(
                `❌ ${err.message || 'Não foi possível tocar a música.'}\n` +
                    'Confira: canal de voz no painel, permissões **Conectar/Falar** e se o `npm install` instalou `@discordjs/voice` e `play-dl`.'
            );
        }
    }
};
