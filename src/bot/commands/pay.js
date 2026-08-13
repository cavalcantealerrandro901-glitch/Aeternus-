const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const { economyConfig, formatAlmas } = require('../utils/economy');
const { aiPayNote } = require('../utils/phrases');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pay')
        .setDescription('Enviar Almas para outro usuário')
        .addUserOption((o) => o.setName('usuario').setDescription('Destino').setRequired(true))
        .addIntegerOption((o) =>
            o.setName('quantidade').setDescription('Valor').setRequired(true).setMinValue(1)
        ),
    aliases: ['pagar', 'enviar', 'transferir'],

    async run(fromId, toId, guildId, amount) {
        const eco = economyConfig(guildId);
        if (!eco.enabled) return { error: 'Economia desativada.' };
        if (fromId === toId) return { error: 'Não pode pagar a si mesmo.' };

        const from = await db.getUser(fromId, guildId);
        if (from.almas < amount) return { error: 'Saldo insuficiente.' };

        const to = await db.getUser(toId, guildId);
        from.almas -= amount;
        to.almas += amount;
        await from.save();
        await to.save();

        try {
            await db.logTransfer({ guildId, fromId, toId, amount });
        } catch (err) {
            console.error('logTransfer:', err.message);
        }

        const note = await aiPayNote(amount);
        return { amount, fromTotal: from.almas, toTotal: to.almas, note };
    },

    async execute(interaction) {
        const target = interaction.options.getUser('usuario');
        const amount = interaction.options.getInteger('quantidade');
        if (target.bot) return interaction.reply({ content: 'Não pode pagar bots.', ephemeral: true });

        const r = await this.run(interaction.user.id, target.id, interaction.guild.id, amount);
        if (r.error) return interaction.reply({ content: `⚠️ ${r.error}`, ephemeral: true });

        const embed = new EmbedBuilder()
            .setColor(0x22c55e)
            .setTitle('Transferência')
            .setDescription(
                `${r.note || 'Transferência concluída.'}\n\n` +
                    `${interaction.user} enviou ${formatAlmas(r.amount, interaction.guild.id)} para ${target}`
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    async executePrefix(message, args) {
        const target = message.mentions.users.first();
        const amount = parseInt(args.find((a) => /^\d+$/.test(a)) || args[1], 10);
        if (!target || !amount) {
            return message.reply('Uso: `pay @user <quantidade>`');
        }
        if (target.bot) return message.reply('Não pode pagar bots.');

        const r = await this.run(message.author.id, target.id, message.guild.id, amount);
        if (r.error) return message.reply(`⚠️ ${r.error}`);

        const embed = new EmbedBuilder()
            .setColor(0x22c55e)
            .setTitle('Transferência')
            .setDescription(
                `${r.note || 'Transferência concluída.'}\n\n` +
                    `${message.author} enviou ${formatAlmas(r.amount, message.guild.id)} para ${target}`
            )
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
};
