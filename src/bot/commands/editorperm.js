const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/db');

function isOwner(userId) {
    return process.env.OWNER_ID && String(userId) === String(process.env.OWNER_ID);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('editorperm')
        .setDescription('[Dono] Gerenciar quem acessa o Editor do painel (use o prefixo)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    aliases: ['permeditor', 'editoracesso', 'darpermeditor'],

    async execute(interaction) {
        await interaction.reply({
            content: 'Use o **prefixo**: `!editorperm @user` · `!editorperm remover @user` · `!editorperm lista`',
            ephemeral: true
        });
    },

    async executePrefix(message, args) {
        if (!isOwner(message.author.id)) {
            return message.reply('⛔ Apenas o **dono do bot** pode gerenciar permissões do Editor.');
        }

        const sub = (args[0] || '').toLowerCase();

        if (sub === 'lista' || sub === 'list' || sub === 'listar') {
            const list = await db.listEditorPermissions();
            const owner = process.env.OWNER_ID;
            const lines = [];
            if (owner) lines.push(`👑 Dono: <@${owner}> (\\`${owner}\\`)`);
            if (!list.length) {
                lines.push('Nenhum editor adicional autorizado.');
            } else {
                list.forEach(id => lines.push(`🛠️ <@${id}> (\\`${id}\\`)`));
            }
            const embed = new EmbedBuilder()
                .setColor(0x7c3aed)
                .setTitle('Permissões do Editor')
                .setDescription(lines.join('\n'))
                .setFooter({ text: '!editorperm @user  ·  !editorperm remover @user' });
            return message.reply({ embeds: [embed] });
        }

        const remove =
            ['remover', 'remove', 'tirar', 'revoke', 'del', 'delete'].includes(sub);

        const target =
            message.mentions.users.first() ||
            (args[remove ? 1 : 0] && !remove ? await message.client.users.fetch(args[0]).catch(() => null) : null) ||
            (remove && args[1] ? await message.client.users.fetch(args[1]).catch(() => null) : null);

        if (!target) {
            return message.reply(
                '**Uso (somente prefixo):**\n' +
                '`!editorperm @usuario` — dar acesso ao Editor\n' +
                '`!editorperm remover @usuario` — retirar acesso\n' +
                '`!editorperm lista` — ver quem tem acesso'
            );
        }

        if (isOwner(target.id)) {
            return message.reply('O dono sempre tem acesso; não é preciso adicionar.');
        }

        if (remove) {
            await db.removeEditorPermission(target.id);
            return message.reply(`🗑️ Acesso ao **Editor** removido de **${target.tag}**.`);
        }

        await db.addEditorPermission(target.id);
        return message.reply(
            `✅ **${target.tag}** agora pode acessar o **Sistema de Editor** no painel.\n` +
            `Peça para logar em: ${process.env.PANEL_URL || process.env.REDIRECT_URI?.replace('/auth/discord/callback', '') || 'seu painel'}`
        );
    }
};
