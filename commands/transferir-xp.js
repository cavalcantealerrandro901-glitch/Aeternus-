const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const xp = require('../utils/xp');

function fmt(value) {
    const n = Number(value || 0);
    return (Number.isFinite(n) ? n : 0).toLocaleString('pt-BR');
}

async function respond(interaction, payload) {
    const data = typeof payload === 'string' ? { content: payload } : payload;
    if (interaction.deferred || interaction.replied) return interaction.editReply(data);
    return interaction.reply(data);
}

module.exports = {
    name: 'transferir-xp',
    aliases: ['transferirxp', 'payxp', 'enviarp'],
    description: 'Transfere XP para outro usuário',
    data: new SlashCommandBuilder()
        .setName('transferir-xp')
        .setDescription('Transfere XP da sua conta para outro usuário')
        .addUserOption((option) =>
            option.setName('usuario').setDescription('Quem receberá o XP').setRequired(true)
        )
        .addIntegerOption((option) =>
            option.setName('quantidade').setDescription('Quantidade inteira de XP').setRequired(true).setMinValue(1)
        ),

    async execute(message) {
        return message.reply('⭐ Para transferir XP, use o comando /transferir-xp.');
    },

    async executeSlash(interaction) {
        const target = interaction.options.getUser('usuario', true);
        const amount = interaction.options.getInteger('quantidade', true);
        const sender = interaction.user;

        if (!Number.isSafeInteger(amount) || amount <= 0) {
            return respond(interaction, '❌ Informe uma quantidade inteira de XP maior que zero.');
        }
        if (target.bot) return respond(interaction, '❌ Não é possível transferir XP para bots.');
        if (target.id === sender.id) return respond(interaction, '❌ Você não pode transferir XP para si mesmo.');

        const senderBefore = xp.get(sender.id);
        if (Number(senderBefore.xp || 0) < amount) {
            return respond(interaction, `❌ XP insuficiente. Seu saldo atual é de **${fmt(senderBefore.xp)} XP**.`);
        }

        const receiverBefore = xp.get(target.id);
        xp.addXp(sender.id, -amount);
        const receiverAfter = xp.addXp(target.id, amount);
        const senderAfter = xp.get(sender.id);

        const embed = new EmbedBuilder()
            .setColor(0x8b5cf6)
            .setAuthor({ name: 'AETERNUS • PROGRESSÃO', iconURL: interaction.client.user.displayAvatarURL({ size: 64 }) })
            .setTitle('⭐ Transferência de XP concluída')
            .setDescription('A transferência foi processada com sucesso.')
            .addFields(
                { name: '📤 Remetente', value: `<@${sender.id}>\n**${fmt(senderAfter.xp)} XP restantes**`, inline: true },
                { name: '📥 Destinatário', value: `<@${target.id}>\n**${fmt(receiverAfter.xp)} XP totais**`, inline: true },
                { name: '✨ Quantidade transferida', value: `**${fmt(amount)} XP**`, inline: false },
                { name: '📊 Resumo da operação', value: `Remetente: ${fmt(senderBefore.xp)} → ${fmt(senderAfter.xp)} XP\nDestinatário: ${fmt(receiverBefore.xp)} → ${fmt(receiverAfter.xp)} XP\nNível atual do destinatário: **${fmt(receiverAfter.level)}**`, inline: false }
            )
            .setFooter({ text: 'Aeternus • Progressão de XP' })
            .setTimestamp();

        return respond(interaction, { embeds: [embed], allowedMentions: { parse: [], users: [sender.id, target.id] } });
    }
};
