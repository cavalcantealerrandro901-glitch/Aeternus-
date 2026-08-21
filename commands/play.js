const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    PermissionFlagsBits
} = require('discord.js');
const music = require('../utils/musicPlayer');
const { searchList, SearchError } = require('../utils/musicSearch');

function friendlyError(err) {
    if (!err) return 'Erro desconhecido.';
    if (err instanceof SearchError) return err.message;
    return err.message || 'Falha na busca.';
}

module.exports = {
    name: 'play',
    aliases: ['p', 'tocar', 'music'],
    description: 'Busca música, cria sala privada, bot entra e toca após 5s',
    async execute(message, args) {
        if (!message.guild) return message.reply('Use em um servidor.');

        const q = args.join(' ').trim();
        if (!q) {
            return message.reply(
                'Uso: `O.play <música>`\n' +
                    'Busca → escolhe → sala privada → bot entra → toca em **5s**.'
            );
        }

        const me = message.guild.members.me;
        const need = [
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.MoveMembers,
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.Speak
        ];
        if (me && !me.permissions.has(need)) {
            return message.reply(
                'Preciso de **Gerenciar Canais**, **Mover Membros**, **Conectar** e **Falar**.'
            );
        }

        const loading = await message.reply(`🔎 Buscando **${q.slice(0, 80)}**…`);

        let list;
        try {
            list = await searchList(q, 5);
        } catch (err) {
            return loading.edit(`❌ **Erro na busca**\n${friendlyError(err)}`);
        }

        if (!list?.length) {
            return loading.edit('Nenhum resultado. Tente outro nome.');
        }

        const embed = new EmbedBuilder()
            .setColor(0x1db954)
            .setTitle(`🔎 Escolha a música: ${q.slice(0, 60)}`)
            .setDescription(
                list
                    .map((it, i) => {
                        const link = it.youtube ? `[YouTube](${it.youtube})` : '';
                        return `**${i + 1}. ${it.title}** — ${it.artist || '—'}\n${link}`;
                    })
                    .join('\n\n')
                    .slice(0, 4000)
            )
            .setFooter({ text: 'Bot entra na sala na hora e toca após 5 segundos.' });

        if (list[0]?.artwork) embed.setThumbnail(list[0].artwork);

        const row = new ActionRowBuilder();
        list.slice(0, 5).forEach((_, i) => {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`mplay_${message.author.id}_${i}`)
                    .setLabel(`${i + 1}`)
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('▶️')
            );
        });

        await loading.edit({ content: null, embeds: [embed], components: [row] });

        const collector = loading.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60_000,
            filter: (i) =>
                i.customId.startsWith(`mplay_${message.author.id}_`) &&
                i.user.id === message.author.id
        });

        collector.on('collect', async (i) => {
            const idx = parseInt(i.customId.split('_').pop(), 10);
            const item = list[idx];
            if (!item) return i.reply({ content: 'Inválido.', ephemeral: true });

            await i.deferUpdate().catch(() => {});

            if (!message.member.voice?.channelId) {
                await loading.edit({
                    content:
                        '⚠️ Entre em **qualquer canal de voz** e clique de novo em **▶️**.\n' +
                        '(O Discord só move quem já está em um VC.)',
                    embeds: [embed],
                    components: [row]
                }).catch(() => {});
                return;
            }

            const query = item.youtube || `${item.title} ${item.artist || ''}`;

            try {
                await loading.edit({
                    content:
                        '🔒 Criando sala privada…\n' +
                        '🤖 Bot entrando na call…\n' +
                        '⏳ Música em **5 segundos**…',
                    embeds: [],
                    components: []
                });

                const result = await music.startPrivateSession(
                    message.guild,
                    message.member,
                    message.channel,
                    query,
                    message.client
                );

                await loading.edit({
                    content:
                        `🔒 Sala: <#${result.voiceChannelId}>\n` +
                        `🤖 Bot conectado · música liberada após 5s`,
                    embeds: [result.embed],
                    components: result.components
                });

                collector.stop('played');
            } catch (err) {
                console.error('[play session]', err);
                await loading.edit({
                    content:
                        `❌ ${err.message || err}\n\n` +
                        `🎵 **${item.title}**${item.youtube ? `\n${item.youtube}` : ''}`,
                    embeds: [],
                    components: []
                }).catch(() => {});
            }
        });

        collector.on('end', async (_, reason) => {
            if (reason === 'played') return;
            try {
                await loading.edit({ components: [] });
            } catch (_) {}
        });
    }
};
