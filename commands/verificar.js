const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
    SlashCommandBuilder
} = require('discord.js');
const { getSettings } = require('../utils/settings');

module.exports = {
    name: 'verificar',
    aliases: ['verify', 'verificacao'],
    description: 'Painel de verificação',
    data: new SlashCommandBuilder()
        .setName('verificar')
        .setDescription('Painel de verificação')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(message) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply('❌ Sem permissão.');
        }
        const s = getSettings(message.guild.id)?.verify || {};
        const channel = message.mentions.channels.first() || message.channel;
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('verify:claim')
                .setLabel('Verificar')
                .setStyle(ButtonStyle.Success)
        );
        await channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x34d399)
                    .setTitle('Verificação')
                    .setDescription(
                        s.message ||
                            'Clique no botão para se verificar e acessar o servidor.'
                    )
            ],
            components: [row]
        });
        if (channel.id !== message.channel.id) {
            await message.reply(`✅ Painel enviado em ${channel}.`);
        } else {
            await message.reply({ content: '✅ Painel publicado.', allowedMentions: { repliedUser: false } });
        }
    },

    async executeSlash(interaction) {
        const fake = {
            author: interaction.user,
            member: interaction.member,
            guild: interaction.guild,
            channel: interaction.channel,
            client: interaction.client,
            mentions: { channels: { first: () => null } },
            reply: (p) => interaction.reply(p)
        };
        return module.exports.execute(fake, [], interaction.client);
    }
};
