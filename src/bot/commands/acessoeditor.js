const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('acessoeditor')
        .setDescription('Mostra o link do painel Editor (se você tiver permissão)'),

    aliases: ['acessoeditor', 'editor'],

    async execute(interaction) {
        const ok = await db.canAccessEditor(interaction.user.id);
        const panel =
            process.env.PANEL_URL ||
            process.env.REDIRECT_URI?.replace(/\/auth\/discord\/callback.*/, '') ||
            'https://seu-app.onrender.com';
        if (!ok) {
            return interaction.reply({
                content: 'Você não tem permissão. Peça ao dono: `!daracesso @você`.',
                ephemeral: true
            });
        }
        return interaction.reply({
            content: `Editor: ${panel.replace(/\/$/, '')}/editor`,
            ephemeral: true
        });
    },

    async executePrefix(message) {
        const ok = await db.canAccessEditor(message.author.id);
        const panel =
            process.env.PANEL_URL ||
            process.env.REDIRECT_URI?.replace(/\/auth\/discord\/callback.*/, '') ||
            'https://seu-app.onrender.com';
        if (!ok) {
            return message.reply('Sem permissão. Dono usa: `!daracesso @você`.');
        }
        return message.reply(`Editor: ${panel.replace(/\/$/, '')}/editor`);
    }
};
