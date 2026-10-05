const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

function build(role) {
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

module.exports = {
    name: 'cargo-info',
    aliases: ['roleinfo', 'cargoinfo'],
    description: 'Informações de um cargo',
    data: new SlashCommandBuilder()
        .setName('cargo-info')
        .setDescription('Informações de um cargo')
        .addRoleOption(o => o.setName('cargo').setDescription('Cargo').setRequired(true))
        .setDMPermission(false),

    async execute(message) {
        if (!message.guild) return;
        const role = message.mentions.roles.first() ||
            message.guild.roles.cache.get(message.content.trim().split(/\s+/)[1]);
        if (!role) return message.reply('❌ Mencione um cargo ou informe o ID.');
        return message.reply({ embeds: [build(role)] });
    },

    async executeSlash(i) {
        return i.reply({ embeds: [build(i.options.getRole('cargo', true))] });
    }
};
