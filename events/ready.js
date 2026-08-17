const { Events, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`🤖 Bot conectado com sucesso como ${client.user.tag}!`);

        const commands = [];
        const slashPath = path.join(__dirname, '..', 'slash');

        if (fs.existsSync(slashPath)) {
            const slashFiles = fs.readdirSync(slashPath).filter(file => file.endsWith('.js'));
            for (const file of slashFiles) {
                const command = require(`../slash/${file}`);
                if ('data' in command && 'execute' in command) {
                    commands.push(command.data.toJSON());
                }
            }
        }

        const rest = new REST().setToken(process.env.DISCORD_TOKEN);

        try {
            console.log(`⏳ Registrando automaticamente ${commands.length} comandos slash...`);
            await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: commands },
            );
            console.log(`✨ Comandos slash (/) registrados com sucesso automaticamente!`);
        } catch (error) {
            console.error('Erro ao registrar comandos automaticamente:', error);
        }
    },
};
