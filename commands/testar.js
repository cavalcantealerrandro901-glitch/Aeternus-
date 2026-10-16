const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'testar',
    aliases: ['teste', 'test'],
    description: 'Executa um teste isolado de um comando compatível',
    slash: false,
    noSlash: true,

    async execute(message, args, client) {
        const ownerIds = String(process.env.OWNER_ID || '')
            .split(/[,\s]+/)
            .map((id) => id.trim())
            .filter(Boolean);

        const isOwner =
            ownerIds.includes(message.author.id) ||
            message.author.id === message.client.application?.owner?.id;

        const permissions = message.member?.permissions;
        const isAdmin = Boolean(
            permissions?.has?.(PermissionFlagsBits.Administrator) ||
            permissions?.has?.(PermissionFlagsBits.ManageGuild)
        );

        if (!isOwner && !isAdmin) {
            return message.reply('❌ Apenas o dono do bot ou administradores do servidor podem testar comandos.');
        }

        const tipo = String(args[0] || '').toLowerCase();
        const nome = String(args[1] || '').toLowerCase();

        if (!['comando', 'cmd', 'command'].includes(tipo) || !nome) {
            return message.reply([
                '**🧪 Central de testes Aeternus**',
                '',
                'Uso: `O.testar comando <comando> [argumentos]`',
                'Exemplo: `O.testar comando mines 1 1k`',
                '',
                'Os testes só funcionam para comandos que possuem modo de teste isolado. Nesse modo, efeitos reais como cobranças e pagamentos devem ficar desativados.'
            ].join('\n'));
        }

        const normalized = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const command = client.commands.get(nome) ||
            client.commands.get(normalized) ||
            [...client.commands.values()].find((cmd) =>
                cmd?.name === normalized ||
                (Array.isArray(cmd?.aliases) && cmd.aliases.some((alias) =>
                    String(alias).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === normalized
                ))
            );

        if (!command?.executeTest || typeof command.executeTest !== 'function') {
            return message.reply(
                '⚠️ O comando **' + nome + '** não possui um adaptador de teste seguro. Nenhuma ação foi executada.'
            );
        }

        try {
            await command.executeTest(message, args.slice(2), client);
        } catch (error) {
            console.error('[testar comando ' + nome + ']', error);
            return message.reply('❌ O teste falhou com segurança. Consulte os logs do bot; o comando normal não foi recarregado nem alterado.');
        }
    }
};
