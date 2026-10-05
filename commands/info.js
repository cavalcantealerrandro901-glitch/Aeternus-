const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

function userEmbed(user, member, guild) {
    return new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle('✦ AETERNUS • USUÁRIO')
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .setDescription([
            '👤 **' + user.tag + '**',
            '',
            '**ID:** `' + user.id + '`',
            '**Conta criada:** <t:' + Math.floor(user.createdTimestamp / 1000) + ':F>',
            '**Entrou no servidor:** ' + (member?.joinedTimestamp ? '<t:' + Math.floor(member.joinedTimestamp / 1000) + ':F>' : '—'),
            '',
            '**Cargos:**',
            member?.roles.cache.filter(r => r.id !== guild?.id).map(r => r.toString()).slice(0, 15).join(' ') || 'Nenhum'
        ].join('\n'))
        .setFooter({ text: 'Aeternus • Informações' });
}

function serverEmbed(guild) {
    return new EmbedBuilder()
        .setColor(0x6366f1)
        .setTitle('✦ AETERNUS • SERVIDOR')
        .setThumbnail(guild.iconURL({ size: 256 }) || null)
        .setDescription([
            '🏠 **' + guild.name + '**',
            '',
            '**Dono:** <@' + guild.ownerId + '>',
            '**Membros:** ' + guild.memberCount,
            '**Canais:** ' + guild.channels.cache.size,
            '**Cargos:** ' + guild.roles.cache.size,
            '**ID:** `' + guild.id + '`',
            '**Criado:** <t:' + Math.floor(guild.createdTimestamp / 1000) + ':F>'
        ].join('\n'))
        .setFooter({ text: 'Aeternus • Informações' });
}

function roleEmbed(role) {
    return new EmbedBuilder()
        .setColor(role.color || 0x8b5cf6)
        .setTitle('✦ AETERNUS • CARGO')
        .setDescription([
            '🏷️ **' + role.name + '**',
            '',
            '**ID:** `' + role.id + '`',
            '**Membros:** ' + role.members.size,
            '**Posição:** ' + role.position,
            '**Menção:** ' + role.toString(),
            '**Gerenciável:** ' + (role.managed ? 'Sim' : 'Não'),
            '**Criado:** <t:' + Math.floor(role.createdTimestamp / 1000) + ':F>'
        ].join('\n'))
        .setFooter({ text: 'Aeternus • Informações' });
}

function botEmbed(client) {
    const user = client.user;
    return new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle('✦ AETERNUS • BOT')
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .setDescription([
            '🤖 **' + user.tag + '**',
            '',
            '**ID:** `' + user.id + '`',
            '**Servidores:** ' + client.guilds.cache.size,
            '**Usuários em cache:** ' + client.users.cache.size,
            '**Discord.js:** ' + require('discord.js').version,
            '**Node.js:** ' + process.version,
            '**Uptime:** <t:' + Math.floor((Date.now() - client.uptime) / 1000) + ':R>'
        ].join('\n'))
        .setFooter({ text: '✧ Aeternus • Informações do bot' });
}

module.exports = {
    name: 'info',
    aliases: ['informacao', 'informações', 'infos', 'usuario', 'usuário', 'servidor', 'server', 'cargo-info', 'cargoinfo', 'roleinfo'],
    description: 'Informações do Aeternus',
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Consultar informações')
        .addSubcommand(s => s.setName('usuario').setDescription('Informações de um usuário').addUserOption(o => o.setName('usuario').setDescription('Usuário').setRequired(false)))
        .addSubcommand(s => s.setName('servidor').setDescription('Informações do servidor'))
        .addSubcommand(s => s.setName('cargo').setDescription('Informações de um cargo').addRoleOption(o => o.setName('cargo').setDescription('Cargo').setRequired(true)))
        .addSubcommand(s => s.setName('bot').setDescription('Informações do Aeternus')),

    async execute(message, args) {
        if (!message.guild) return message.reply('❌ Este comando só funciona em servidor.');
        const sub = String(args?.[0] || '').toLowerCase();
        if (['bot', 'aeternus'].includes(sub)) return message.reply({ embeds: [botEmbed(message.client)] });
        if (['cargo', 'role'].includes(sub)) {
            const role = message.mentions.roles.first() || message.guild.roles.cache.get(args?.[1]);
            if (!role) return message.reply('❌ Informe ou mencione um cargo.');
            return message.reply({ embeds: [roleEmbed(role)] });
        }
        if (['usuario', 'user', 'usuário'].includes(sub)) {
            const user = message.mentions.users.first() || message.author;
            const member = await message.guild.members.fetch(user.id).catch(() => null);
            return message.reply({ embeds: [userEmbed(user, member, message.guild)] });
        }
        return message.reply({ embeds: [serverEmbed(message.guild)] });
    },

    async executeSlash(i) {
        const sub = i.options.getSubcommand();
        if (sub === 'bot') return i.reply({ embeds: [botEmbed(i.client)] });
        if (sub === 'servidor') return i.reply({ embeds: [serverEmbed(i.guild)] });
        if (sub === 'cargo') return i.reply({ embeds: [roleEmbed(i.options.getRole('cargo', true))] });
        const user = i.options.getUser('usuario') || i.user;
        const member = await i.guild.members.fetch(user.id).catch(() => null);
        return i.reply({ embeds: [userEmbed(user, member, i.guild)] });
    }
};
