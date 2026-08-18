const { Events } = require('discord.js');
const fs = require('fs');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        // Carrega as configurações
        let settings = {};
        try {
            if (fs.existsSync('./settings.json')) {
                settings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));
            }
        } catch (e) { return; }

        const guildSettings = settings[member.guild.id];
        if (!guildSettings) return;

        // Verifica se há configurações de boas-vindas
        const channelId = guildSettings.welcomeChannel;
        const welcomeMessage = guildSettings.welcomeMessage || 'Bem-vindo(a) ao servidor, {user}!';

        if (channelId) {
            const channel = member.guild.channels.cache.get(channelId);
            if (channel) {
                // Substitui {user} pelo usuário
                const finalMessage = welcomeMessage.replace('{user}', `<@${member.id}>`);
                channel.send(finalMessage);
            }
        }
    },
};
