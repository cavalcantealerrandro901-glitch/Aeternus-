const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const autoRepair = require('../utils/autoRepair');

module.exports = {
    name: 'reparo',
    aliases: ['autorepair', 'repair', 'scan'],
    description: 'Status do auto-reparo',
    data: new SlashCommandBuilder()
        .setName('reparo')
        .setDescription('Status do auto-reparo')
        .addStringOption((o) =>
            o.setName('busca').setDescription('Varrer arquivos por nome').setRequired(false)
        ),

    async execute(message, args) {
        const owners = autoRepair.ownerIds();
        const isOwner =
            owners.includes(message.author.id) ||
            message.author.id === message.client.application?.owner?.id;

        if (!isOwner && owners.length) {
            return message.reply('❌ Só o dono do bot pode usar este comando.');
        }

        const query = (args[0] || '').toLowerCase();
        const list = autoRepair.getStatus();
        const lines = list.length
            ? list.slice(0, 12).map((s) => {
                  const when = new Date(s.lastAt).toLocaleString('pt-BR');
                  return `• **${s.name}** — tentativas: ${s.attempts} · ${when}\n  \`${String(s.lastError).slice(0, 80)}\``;
              })
            : ['_Nenhum erro registrado desde o boot._'];

        let scanBlock = '';
        if (query) {
            const hits = autoRepair.scanAll(query);
            scanBlock =
                hits.length > 0
                    ? hits
                          .slice(0, 8)
                          .map((h, i) => `${i + 1}. \`${h.rel}\` (${h.score}) — ${h.reason}`)
                          .join('\n')
                    : '_Nada encontrado._';
        }

        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xf59e0b)
                    .setTitle('Auto-reparo')
                    .setDescription(
                        [
                            `**Donos:** ${owners.length ? owners.map((id) => `<@${id}>`).join(', ') : '_OWNER_ID não definido_'}`,
                            `**Máx. reload:** ${autoRepair.MAX_ATTEMPTS}`,
                            '',
                            '**Últimos erros**',
                            ...lines,
                            query ? '' : null,
                            query ? `**Scan \`${query}\`**` : null,
                            query ? scanBlock : null
                        ]
                            .filter((x) => x != null)
                            .join('\n')
                    )
            ]
        });
    },

    async executeSlash(interaction) {
        const q = interaction.options.getString('busca');
        const fake = {
            author: interaction.user,
            member: interaction.member,
            guild: interaction.guild,
            channel: interaction.channel,
            client: interaction.client,
            reply: (p) => interaction.reply(p)
        };
        return module.exports.execute(fake, q ? [q] : [], interaction.client);
    }
};
