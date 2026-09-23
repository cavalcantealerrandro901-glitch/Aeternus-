/**
 * Comando admin: recarrega comando(s) ou sistema(s) em runtime.
 *
 * Uso:
 *   O.reload comando daily
 *   O.reload sistema dailyReminder
 *   O.reload all commands
 *   O.reload all systems
 */
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'reload',
    aliases: ['recarregar', 'rl'],
    description: 'Recarrega comandos ou sistemas sem reiniciar o bot (apenas dono/admin)',
    slash: false,
    noSlash: true,

    async execute(message, args, client) {
        const ownerIds = String(process.env.OWNER_ID || '')
            .split(/[,\s]+/)
            .map((s) => s.trim())
            .filter(Boolean);

        const isOwner = ownerIds.includes(message.author.id);
        const isAdmin =
            message.member?.permissions?.has(PermissionFlagsBits.Administrator) || false;

        if (!isOwner && !isAdmin) {
            return message.reply('❌ Apenas o dono do bot ou administradores podem usar este comando.');
        }

        const tipo = String(args[0] || '').toLowerCase();
        const alvo = String(args[1] || '').toLowerCase();

        if (!tipo) {
            return message.reply(
                [
                    '**Uso:**',
                    '`O.reload comando <nome>` — recarrega um comando',
                    '`O.reload sistema <arquivo>` — recarrega um sistema',
                    '`O.reload all commands` — recarrega todos os comandos',
                    '`O.reload all systems` — recarrega todos os sistemas'
                ].join('\n')
            );
        }

        const loaders = require('../bot/loaders');

        try {
            if (tipo === 'comando' || tipo === 'cmd' || tipo === 'command') {
                if (!alvo) return message.reply('Informe o nome do comando. Ex: `O.reload comando daily`');
                const r = loaders.reloadCommand(client, alvo);
                if (!r.ok) return message.reply(`❌ Falha: ${r.error}`);
                return message.reply(
                    `✅ Comando **${r.name}** recarregado` +
                        (r.slash ? ` (slash: /${r.slash})` : '') +
                        '.'
                );
            }

            if (tipo === 'sistema' || tipo === 'sys' || tipo === 'system') {
                if (!alvo) return message.reply('Informe o arquivo do sistema. Ex: `O.reload sistema dailyReminder`');
                const r = loaders.reloadSystem(client, alvo);
                if (!r.ok) return message.reply(`❌ Falha: ${r.error}`);
                return message.reply(`✅ Sistema **${r.name}** recarregado.`);
            }

            if (tipo === 'all' || tipo === 'tudo') {
                if (alvo === 'commands' || alvo === 'comandos' || alvo === 'cmd') {
                    loaders.loadCommands(client);
                    return message.reply(`✅ Todos os comandos recarregados (${client.commands.size} entradas).`);
                }
                if (alvo === 'systems' || alvo === 'sistemas' || alvo === 'sys') {
                    loaders.loadSystems(client);
                    return message.reply('✅ Todos os sistemas recarregados.');
                }
                return message.reply('Use `O.reload all commands` ou `O.reload all systems`.');
            }

            // atalho: O.reload daily  → tenta comando, depois sistema
            const asCmd = loaders.reloadCommand(client, tipo);
            if (asCmd.ok) {
                return message.reply(
                    `✅ Comando **${asCmd.name}** recarregado` +
                        (asCmd.slash ? ` (/${asCmd.slash})` : '') +
                        '.'
                );
            }
            const asSys = loaders.reloadSystem(client, tipo);
            if (asSys.ok) {
                return message.reply(`✅ Sistema **${asSys.name}** recarregado.`);
            }

            return message.reply(
                `❌ Não encontrei comando nem sistema chamado **${tipo}**.\n` +
                    'Use `O.reload comando <nome>` ou `O.reload sistema <arquivo>`.'
            );
        } catch (e) {
            console.error('[reload]', e);
            return message.reply(`❌ Erro ao recarregar: ${e.message}`);
        }
    }
};
