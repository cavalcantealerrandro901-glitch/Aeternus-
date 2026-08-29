const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const store = require('../utils/store');

module.exports = {
    name: 'warn',
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
            return message.reply('❌ Sem permissão.');
        const user = message.mentions.users.first();
        if (!user) return message.reply('Mencione um usuário.');
        const reason = args.slice(1).join(' ') || 'Sem motivo';
        const all = store.load('warns.json', {});
        const key = `${message.guild.id}:${user.id}`;
        if (!all[key]) all[key] = [];
        all[key].push({ reason, mod: message.author.id, at: Date.now() });
        store.save('warns.json', all);
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xeab308)
                    .setTitle('⚠️ Aviso')
                    .setDescription(`${user} recebeu um aviso.\n**Motivo:** ${reason}\n**Total:** ${all[key].length}`)
            ]
        });
    }
};
