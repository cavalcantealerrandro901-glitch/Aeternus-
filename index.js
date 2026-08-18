/**
 * Aeternus — único ponto de entrada
 * Só carrega módulos e sobe bot + painel.
 *
 * npm start  →  node index.js
 */
require('dotenv').config();

const { Client, GatewayIntentBits, Partials, Collection, MessageFlags } = require('discord.js');
const { loadCommands, loadSlash, loadEvents, loadSystems } = require('./bot/loaders');
const { startServer } = require('./web/server');

const TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN;
if (!TOKEN) {
    console.error('Falta DISCORD_TOKEN');
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildModeration
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.afk = new Map();
client.commands = new Collection();
client.slashCommands = new Collection();

// Carrega tudo automaticamente das pastas
loadCommands(client);
loadSlash(client);
loadEvents(client);
loadSystems(client);

// Slash runtime
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const command = client.slashCommands.get(interaction.commandName);
    if (!command) return;
    try {
        await command.execute(interaction);
    } catch (error) {
        console.error('Slash error:', error);
        const payload = {
            content: 'Erro ao executar este comando.',
            flags: [MessageFlags.Ephemeral]
        };
        try {
            if (interaction.replied || interaction.deferred) await interaction.followUp(payload);
            else await interaction.reply(payload);
        } catch (_) {}
    }
});

client.once('clientReady', () => {
    console.log(`🤖 Bot online: ${client.user.tag}`);
});

// Painel + bot no mesmo processo
startServer(client);
client.login(TOKEN);
