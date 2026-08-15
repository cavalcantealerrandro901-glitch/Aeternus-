const { REST, Routes } = require('discord.js');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`✨ Bot online! Logado como ${client.user.tag}`);

        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        const commandsData = client.slashCommands.map(cmd => cmd.data.toJSON());

        try {
            console.log('🔄 Registrando comandos Slash...');
            await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: commandsData },
            );
            console.log('✅ Comandos Slash registrados com sucesso!');
        } catch (error) {
            console.error(error);
        }
    },
};
