const fs = require('fs');
const path = require('path');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const autoRepair = require('../utils/autoRepair');

function config() { return { guildId: String(process.env.AUTO_REPAIR_GUILD_ID || '').trim(), channelId: String(process.env.AUTO_REPAIR_CHANNEL_ID || '').trim(), roleId: String(process.env.AUTO_REPAIR_ROLE_ID || '').trim() }; }
function allowed(ctx) {
    const c = config();
    if (!c.guildId || !c.channelId || !c.roleId) return { ok: false, reason: 'Configure AUTO_REPAIR_GUILD_ID, AUTO_REPAIR_CHANNEL_ID e AUTO_REPAIR_ROLE_ID no Render.' };
    if (String(ctx.guild?.id || '') !== c.guildId) return { ok: false, reason: 'Central disponível apenas no servidor configurado.' };
    if (String(ctx.channel?.id || '') !== c.channelId) return { ok: false, reason: 'Use o canal configurado para a central de reparo.' };
    if (!ctx.member?.roles?.cache?.has(c.roleId) && !autoRepair.ownerIds().includes(String(ctx.author?.id || ctx.user?.id))) return { ok: false, reason: 'Você não tem o cargo autorizado para a central de reparo.' };
    return { ok: true };
}
function rows() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('reparo:testar').setLabel('Testar comando').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('reparo:novamente').setLabel('Testar novamente').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('reparo:interface').setLabel('Mostrar interface').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('reparo:codigo').setLabel('Mostrar código').setStyle(ButtonStyle.Secondary)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('reparo:aprovar').setLabel('Aprovar').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('reparo:recusar').setLabel('Recusar').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('reparo:cancelar').setLabel('Cancelar').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('reparo:aceitar').setLabel('Aceitar').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('reparo:enviar').setLabel('Enviar').setStyle(ButtonStyle.Primary)
        )
    ];
}
function embed() {
    return new EmbedBuilder().setColor(0x6366f1).setTitle('AETERNUS • CENTRAL DE REPARO').setDescription([
        'Central restrita ao servidor, canal e cargo configurados no Render.',
        '',
        'Use os botões para consultar o código e iniciar testes seguros.',
        'A aprovação/publicação só pode acontecer quando existir uma proposta de correção ativa e validada.',
        '',
        'Comandos de prefixo: reparo interface | reparo testar comando | reparo testar novamente | reparo mostrar codigo | reparo aprovar | reparo recusar | reparo cancelar | reparo aceitar | reparo enviar'
    ].join('\n')).setFooter({ text: 'Aeternus • Reparos auditáveis' });
}
function latestCode() {
    const latest = autoRepair.getStatus()[0];
    const name = String(latest?.name || '').replace(/[^a-z0-9_-]/gi, '');
    if (!name) return null;
    const candidates = [path.join(__dirname, name + '.js'), path.join(__dirname, '..', 'commands', name + '.js')];
    const file = candidates.find((p) => fs.existsSync(p) && p.startsWith(path.join(__dirname, '..')));
    return file ? { name, file, code: fs.readFileSync(file, 'utf8').slice(0, 1700) } : null;
}
async function actionReply(ctx, action) {
    if (action === 'interface' || action === 'mostrar interface') return ctx.reply({ embeds: [embed()], components: rows() });
    if (action === 'mostrar codigo' || action === 'mostrar código' || action === 'codigo') {
        const item = latestCode();
        if (!item) return ctx.reply('Não encontrei arquivo associado ao último erro. Consulte os logs da hospedagem.');
        return ctx.reply('Arquivo: ' + item.name + '.js\n```js\n' + item.code.replace(/```/g, "'''") + '\n```');
    }
    if (action === 'testar comando' || action === 'testar' || action === 'testar novamente' || action === 'novamente') return ctx.reply('Execute novamente o comando que falhou. O próximo erro será registrado na central. Evite testes que movimentem moeda, punam membros ou causem efeitos irreversíveis.');
    if (['aprovar', 'aceitar', 'recusar', 'cancelar', 'enviar'].includes(action)) return ctx.reply('Nenhuma proposta de correção está vinculada a esta interface neste momento. A ação não foi executada e nada foi publicado. Aguarde a proposta validada do autorreparo.');
    return ctx.reply('Ação desconhecida. Use reparo interface.');
}
module.exports = {
    name: 'reparo', aliases: ['autorepair', 'repair'], description: 'Central de reparo restrita à equipe',
    data: new SlashCommandBuilder().setName('reparo').setDescription('Central de reparo do Aeternus').addStringOption((o) => o.setName('acao').setDescription('Ação da central').setRequired(false)),
    async execute(message, args) { const gate = allowed({ author: message.author, member: message.member, guild: message.guild, channel: message.channel }); if (!gate.ok) return message.reply('⛔ ' + gate.reason); return actionReply(message, String((args || []).join(' ') || 'interface').toLowerCase()); },
    async executeSlash(interaction) {
        const gate = allowed({ user: interaction.user, author: interaction.user, member: interaction.member, guild: interaction.guild, channel: interaction.channel });
        if (!gate.ok) return interaction.reply({ content: '⛔ ' + gate.reason, ephemeral: true });
        return actionReply({ reply: (p) => interaction.reply(p) }, String(interaction.options.getString('acao') || 'interface').toLowerCase());
    },
    async handleComponent(interaction) {
        const gate = allowed({ user: interaction.user, author: interaction.user, member: interaction.member, guild: interaction.guild, channel: interaction.channel });
        if (!gate.ok) return interaction.reply({ content: '⛔ ' + gate.reason, ephemeral: true });
        const action = String(interaction.customId || '').split(':')[1] || 'interface';
        if (action === 'interface') return interaction.update({ embeds: [embed()], components: rows() });
        if (action === 'codigo') { const item = latestCode(); if (!item) return interaction.reply({ content: 'Não encontrei arquivo associado ao último erro.', ephemeral: true }); return interaction.reply({ content: 'Arquivo: ' + item.name + '.js\n```js\n' + item.code.replace(/```/g, "'''") + '\n```', ephemeral: true }); }
        if (action === 'testar' || action === 'novamente') return interaction.reply({ content: 'Execute novamente o comando que falhou. O próximo erro será registrado na central. Evite testes com efeitos irreversíveis.', ephemeral: true });
        if (['aprovar', 'aceitar', 'recusar', 'cancelar', 'enviar'].includes(action)) return interaction.reply({ content: 'Nenhuma proposta de correção está vinculada a esta interface neste momento. A ação não foi executada e nada foi publicado.', ephemeral: true });
        return interaction.reply({ content: 'Ação desconhecida.', ephemeral: true });
    }
};
