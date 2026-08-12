const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/db');

function isOwner(userId) {
    return process.env.OWNER_ID && String(userId) === String(process.env.OWNER_ID);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('acessoeditor')
        .setDescription('[Dono] Liberar ou tirar acesso ao Editor do painel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    aliases: [
        'daracesso',
        'liberaracesso',
        'liberareditor',
        'permissaoeditor',
        'tiraracesso',
        'removeracesso',
        'editorperm',
        'permeditor'
    ],

    async execute(interaction) {
        await interaction.reply({
            content:
                'Use o **prefixo**:\n' +
                '`!daracesso @user` — liberar\n' +
                '`!tiraracesso @user` — remover\n' +
                '`!acessoeditor lista` — listar',
            ephemeral: true
        });
    },

    async executePrefix(message, args) {
        if (!isOwner(message.author.id)) {
            return message.reply('⛔ Só o **dono do bot** pode gerenciar o acesso ao Editor.');
        }

        const cmd = message.content.slice((message.guild ? (require('../../database/db').getGuildConfig(message.guild.id).prefix || '!') : '!').length).trim().split(/\s+/)[0].toLowerCase();

        let sub = (args[0] || '').toLowerCase();
        let forceRemove = ['tiraracesso', 'removeracesso'].includes(cmd);
        let forceAdd = ['daracesso', 'liberaracesso', 'liberareditor'].includes(cmd);

        if (sub === 'lista' || sub === 'list' || sub === 'listar') {
            const list = await db.listEditorPermissions();
            const owner = process.env.OWNER_ID;
            const lines = [];
            if (owner) lines.push(`👑 Dono: <@${owner}>`);
            if (!list.length) lines.push('Ninguém extra autorizado.');
            else list.forEach((id) => lines.push(`🛠️ <@${id}>`));

            const embed = new EmbedBuilder()
                .setColor(0x7c3aed)
                .setTitle('Acesso ao Editor')
                .setDescription(lines.join('\n'))
                .setFooter({ text: '!daracesso @user · !tiraracesso @user' });
            return message.reply({ embeds: [embed] });
        }

        if (['remover', 'remove', 'tirar', 'revoke', 'del'].includes(sub)) {
            forceRemove = true;
            args = args.slice(1);
        } else if (['dar', 'liberar', 'add', 'adicionar'].includes(sub)) {
            forceAdd = true;
            args = args.slice(1);
        }

        let target = message.mentions.users.first();
        if (!target && args[0]) {
            target = await message.client.users.fetch(args[0]).catch(() => null);
        }

        if (!target) {
            return message.reply(
                '**Uso:**\n' +
                '`!daracesso @usuario` — liberar Editor no painel\n' +
                '`!tiraracesso @usuario` — remover acesso\n' +
                '`!acessoeditor lista` — ver quem tem acesso'
            );
        }

        if (isOwner(target.id)) {
            return message.reply('O dono já tem acesso permanente.');
        }

        if (forceRemove) {
            await db.removeEditorPermission(target.id);
            return message.reply(`🗑️ Acesso removido de **${target.username}**.`);
        }

        await db.addEditorPermission(target.id);
        const base =
            process.env.PANEL_URL ||
            (process.env.REDIRECT_URI
                ? process.env.REDIRECT_URI.replace(/\/auth\/discord\/callback\/?$/, '')
                : 'https://aeternus-q7gt.onrender.com');

        return message.reply(
            `✅ **${target.username}** liberado no Editor.\nPainel: ${base}/editor`
        );
    }
};
