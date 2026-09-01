const { EmbedBuilder } = require('discord.js');
const eter = require('../utils/eter');
const bank = require('../utils/bank');
const { getPrefix } = require('../utils/settings');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function bar(pct) {
    const filled = Math.min(10, Math.max(0, Math.round(pct * 10)));
    return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

module.exports = {
    name: 'banco',
    aliases: ['bank', 'extrato', 'conta'],
    description: 'Extrato bancário Aeternus',
    async execute(message) {
        const u = message.mentions.users.first() || message.author;
        const wallet = eter.get(u.id);
        const saved = bank.get(u.id);
        const total = wallet + saved;
        const pctBank = total > 0 ? saved / total : 0;
        const p = getPrefix(message.guild.id);

        const accountId = `AE-${u.id.slice(-6).toUpperCase()}`;
        const now = new Date().toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            dateStyle: 'short',
            timeStyle: 'short'
        });

        const embed = new EmbedBuilder()
            .setColor(0x0ea5e9)
            .setAuthor({
                name: 'Aeternus Bank · Private Banking',
                iconURL: message.client.user.displayAvatarURL({ size: 64 })
            })
            .setTitle('🏦  Extrato da Conta')
            .setDescription(
                [
                    '```',
                    '╔══════════════════════════════════╗',
                    '║     AETERNUS  PRIVATE  BANK      ║',
                    '╚══════════════════════════════════╝',
                    '```',
                    `**Titular:** ${u.username}`,
                    `**Conta:** \`${accountId}\``,
                    `**Emissão:** ${now} (BRT)`,
                    '',
                    '— — — — — — — — — — — — — — —'
                ].join('\n')
            )
            .addFields(
                {
                    name: '💵  Disponível (carteira)',
                    value: `✨ **${fmt(wallet)}** éter`,
                    inline: true
                },
                {
                    name: '🔒  Aplicado (cofre)',
                    value: `✨ **${fmt(saved)}** éter`,
                    inline: true
                },
                {
                    name: '📊  Patrimônio total',
                    value: `✨ **${fmt(total)}** éter`,
                    inline: false
                },
                {
                    name: '📈  Distribuição (cofre / total)',
                    value: `\`${bar(pctBank)}\` **${(pctBank * 100).toFixed(0)}%** guardado`,
                    inline: false
                },
                {
                    name: '📋  Operações',
                    value: [
                        `\`${p}depositar <valor|all|half>\` — guardar no cofre`,
                        `\`${p}sacar <valor|all|half>\` — retirar para a carteira`,
                        '',
                        '_Valores no banco ficam protegidos de roubos._'
                    ].join('\n'),
                    inline: false
                }
            )
            .setThumbnail(u.displayAvatarURL({ size: 128 }))
            .setFooter({
                text: 'Aeternus Bank · segurança e liquidez',
                iconURL: message.client.user.displayAvatarURL({ size: 32 })
            })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
};
