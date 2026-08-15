const { Client, GatewayIntentBits, Collection } = require('discord.js');
const startDashboard = require('./server');
const { addLog } = require('./logger');
const { analyzeAndFix } = require('./healer');

let globalClient = null;

process.on('uncaughtException', (error) => {
    console.error('Erro crítico:', error);
    addLog('ERRO', error.message);
    analyzeAndFix(error, globalClient);
});

process.on('unhandledRejection', (reason) => {
    console.error('Rejeição não tratada:', reason);
    const msg = reason?.message || String(reason);
    addLog('ERRO', msg);
    analyzeAndFix(reason, globalClient);
});

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.once('ready', () => {
    globalClient = client; // Salva a referência para os alertas de erro
    console.log(`Bot logado como ${client.user.tag}!`);
    addLog('INFO', `Bot conectado com sucesso como ${client.user.tag}`);
    startDashboard(client);
});

client.login(process.env.DISCORD_TOKEN);
