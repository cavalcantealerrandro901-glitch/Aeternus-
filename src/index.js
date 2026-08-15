const { Client, GatewayIntentBits, Collection } = require('discord.js');
const startDashboard = require('./server');
const { addLog } = require('./logger');

// Captura erros globais para evitar queda silenciosa
process.on('uncaughtException', (error) => {
    console.error('Erro crítico:', error);
    addLog('ERRO', error.message);
});

process.on('unhandledRejection', (reason) => {
    console.error('Rejeição não tratada:', reason);
    addLog('ERRO', reason?.message || String(reason));
});

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.once('ready', () => {
    console.log(`Bot logado como ${client.user.tag}!`);
    addLog('INFO', `Bot conectado como ${client.user.tag}`);
    startDashboard(client);
});

client.login(process.env.DISCORD_TOKEN);
