const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const tempRoles = require('../utils/tempRoles');

module.exports = {
    name: 'configurar-mensagem-cargo',
    aliases: ['cfg-msg-cargo', 'msgcargo', 'mensagem-cargo'],
    description: 'Configura a mensagem de aviso/expiração de cargo temporário',
    category: 'moderacao',

    data: new SlashCommandBuilder()
        .setName('configurar-mensagem-cargo')
        .setDescription('Mensagem de aviso ou expiração do cargo temporário')
        .addStringOption((o) =>
            o
                .setName('tipo')
                .setDescription('Quando a mensagem é enviada')
                .setRequired(true)
                .addChoices(
                    { name: 'Aviso (antes de acabar)', value: 'aviso' },
                    { name: 'Expirado (ao remover)', value: 'expirado' }
                )
        )
        .addStringOption((o) =>
            o
                .setName('mensagem')
                .setDescription('Texto (use {user} {cargo} {servidor} {tempo_restante} {fim})')
                .setRequired(true)
                .setMaxLength(1500)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false),

    async execute(message, args) {
        if (!message.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply('❌ Precisa de **Gerenciar Servidor**.');
        }
        const tipo = String(args[0] || '').toLowerCase();
        if (tipo !== 'aviso' && tipo !== 'expirado') {
            return message.reply(
                'Uso: `O.configurar-mensagem-cargo <aviso|expirado> <mensagem>`\n' +
                    'Variáveis: `{user}` `{cargo}` `{servidor}` `{tempo_restante}` `{fim}`'
            );
        }
        const texto = args.slice(1).join(' ').trim();
        if (!texto) return message.reply('❌ Informe a mensagem.');
        const saved = tempRoles.setMessage(message.guild.id, tipo, texto);
        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x22c55e)
                    .setTitle('Mensagem de cargo temporário')
                    .setDescription(
                        `Tipo: **${tipo}**\n\`\`\`\n${saved}\n\`\`\`\n` +
                            'Variáveis: `{user}` `{cargo}` `{servidor}` `{tempo_restante}` `{fim}`'
                    )
            ]
        });
    },

    async executeSlash(i) {
        if (!i.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
            return i.reply({
                content: '❌ Precisa de **Gerenciar Servidor**.',
                flags: 64
            });
        }
        const tipo = i.options.getString('tipo', true);
        const mensagem = i.options.getString('mensagem', true);
        const saved = tempRoles.setMessage(i.guild.id, tipo, mensagem);
        return i.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x22c55e)
                    .setTitle('Mensagem de cargo temporário')
                    .setDescription(
                        `Tipo: **${tipo}**\n\`\`\`\n${saved}\n\`\`\`\n` +
                            'Variáveis: `{user}` `{cargo}` `{servidor}` `{tempo_restante}` `{fim}`'
                    )
            ]
        });
    }
};
