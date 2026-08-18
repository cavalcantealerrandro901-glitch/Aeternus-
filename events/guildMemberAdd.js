const { Events } = require('discord.js');

/**
 * Boas-vindas são tratadas em welcomeHandler.js
 * Logs de entrada em logsHandler.js
 * Este arquivo existe só para o loader de eventos não quebrar.
 */
module.exports = {
    name: Events.GuildMemberAdd,
    async execute() {
        // no-op
    }
};
