const { EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

function ownerId() { return String(process.env.OWNER_ID || process.env.EDITOR_OWNER_ID || '').trim(); }
function isOwner(userId) { const id = ownerId(); return Boolean(id && String(userId) === id); }
function panelBase() { return (process.env.PANEL_URL || process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/$/, ''); }
function serverUrl(guildId) { const base = panelBase(); return (base ? base : '') + '/admin/' + encodeURIComponent(guildId); }

function listEmbed(client) {
    const guilds = [...client.guilds.cache.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    const lines = guilds.length ? guilds.map((g, i) => '**' + (i + 1) + '. ' + g.name + '**\n└ ID: `' + g.id + '` · ' + serverUrl(g.id)) : ['_O Aeternus não está em nenhum servidor._'];
    return new EmbedBuilder().setColor(0x8b5cf6).setTitle('✦ AETERNUS • GERENCIAMENTO DO BOT').setDescription(['Servidores conectados: **' + guilds.length + '**', '', ...lines].join('\n')).setFooter({ text: 'Acesso restrito ao proprietário do bot.' }).setTimestamp();
}

function oneEmbed(client, guildId) {
    const guild = client.guilds.cache.get(String(guildId));
    if (!guild) return new EmbedBuilder().setColor(0xef4444).setTitle('Servidor não encontrado').setDescription('O Aeternus não está conectado a esse servidor.');
    return new EmbedBuilder().setColor(0x22c55e).setTitle('✦ AETERNUS • SERVIDOR').setDescription(['**' + guild.name + '**', 'ID: `' + guild.id + '`', '', '🔗 **Painel:** ' + serverUrl(guild.id)].join('\n')).setThumbnail(guild.iconURL({ size: 128 }) || null).setTimestamp();
}

function parseAction(raw) {
    const v = String(raw || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (['servidores', 'servers', 'lista', 'listar'].includes(v)) return 'list';
    if (['servidor', 'server', 'link', 'painel'].includes(v)) return 'server';
    return null;
}

module.exports = {
    name: 'gerenciar',
    aliases: ['gerenciabot', 'botadmin'],
    description: 'Gerenciamento global do Aeternus',
    data: new SlashCommandBuilder().setName('gerenciar').setDescription('Gerencia globalmente o Aeternus').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addStringOption(o => o.setName('acao').setDescription('O que deseja consultar').setRequired(true).addChoices({ name: 'Listar servidores', value: 'list' }, { name: 'Link de um servidor', value: 'server' })).addStringOption(o => o.setName('servidor').setDescription('ID do servidor para gerar o link').setRequired(false)),
    async execute(message, args, client) {
        if (!isOwner(message.author.id)) return message.reply('❌ Você não tem acesso ao gerenciamento global do Aeternus.');
        const action = parseAction(args && args[0]) || (args && args[0] ? 'server' : 'list');
        const guildId = args && args[1] ? args[1] : (args && args[0]);
        return message.reply({ embeds: [action === 'server' ? oneEmbed(client, guildId) : listEmbed(client)] });
    },
    async executeSlash(i) {
        if (!isOwner(i.user.id)) return i.reply({ content: '❌ Você não tem acesso ao gerenciamento global do Aeternus.', ephemeral: true });
        const action = i.options.getString('acao', true);
        const guildId = i.options.getString('servidor');
        if (action === 'server' && !guildId) return i.reply({ content: '❌ Informe o ID do servidor.', ephemeral: true });
        return i.reply({ embeds: [action === 'server' ? oneEmbed(i.client, guildId) : listEmbed(i.client)] });
    },
    async handleMention(message, client) {
        if (!isOwner(message.author.id)) return false;
        const stripped = message.content.replace(new RegExp('<@!?' + client.user.id + '>', 'g'), '').trim();
        const parts = stripped.split(/\s+/).filter(Boolean);
        if (!parts.length) return false;
        const action = parseAction(parts[0]);
        if (!action) return false;
        if (action === 'list') { await message.reply({ embeds: [listEmbed(client)] }); return true; }
        const guildId = parts[1];
        if (!guildId) { await message.reply('❌ Informe o ID do servidor. Ex.: `@Aeternus servidor 123456789012345678`'); return true; }
        await message.reply({ embeds: [oneEmbed(client, guildId)] });
        return true;
    }
};