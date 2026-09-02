const { EmbedBuilder } = require('discord.js');
const autoRepair = require('../utils/autoRepair');

module.exports = {
    name: 'reparo',
    aliases: ['autorepair', 'repair', 'reparos'],
    description: 'Status do sistema de auto-reparo (dono)',
    async execute(message) {
        const owners = autoRepair.ownerIds();
        const isOwner =
            owners.includes(message.author.id) ||
            message.author.id === message.client.application?.owner?.id;

        if (!isOwner && owners.length) {
            return message.reply('❌ Só o dono do bot pode usar este comando.');
        }

        const list = autoRepair.getStatus();
        const lines = list.length
            ? list.slice(0, 15).map((s) => {
                  const when = new Date(s.lastAt).toLocaleString('pt-BR');
                  return `• **${s.name}** — tentativas: ${s.attempts} · ${when}\n  \`${String(s.lastError).slice(0, 80)}\``;
              })
            : ['_Nenhum erro registrado desde o boot._'];

        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xf59e0b)
                    .setTitle('🔧 Auto-reparo')
                    .setDescription(
                        [
                            `**Donos notificados:** ${owners.length ? owners.map((id) => `<@${id}>`).join(', ') : '_não configurado (OWNER_ID)_'}`,
                            `**Máx. tentativas:** ${autoRepair.MAX_ATTEMPTS}`,
                            '',
                            '**Últimos erros**',
                            ...lines
                        ].join('\n')
                    )
                    .setFooter({ text: 'Defina OWNER_ID no .env / Render' })
                    .setTimestamp()
            ]
        });
    }
};
