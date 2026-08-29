const { REST, Routes } = require('discord.js');

module.exports = {
    name: 'clientReady',
    once: true,
    async execute(client) {
        console.log(`🤖 Bot online: ${client.user.tag}`);
        const body = [];
        const seen = new Set();
        for (const cmd of client.commands.values()) {
            if (cmd.data && !seen.has(cmd.data.name)) {
                seen.add(cmd.data.name);
                body.push(cmd.data.toJSON());
            }
        }
        if (!process.env.CLIENT_ID || !process.env.TOKEN || !body.length) return;
        try {
            const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
            await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body });
            console.log(`✨ ${body.length} slash registrados`);
        } catch (e) {
            console.error('Slash:', e.message);
        }
    }
};
