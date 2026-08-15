const { Client, GatewayIntentBits, Collection } = require('discord.js');
const startDashboard = require('./server');
const { addLog } = require('./logger');
const { analyzeAndFix } = require('./healer');

process.on('uncaughtException', (error) => {
    console.error('Erro crítico:', error);
    addLog('ERRO', error.message);
    
    // Tenta autocorreção
    const fixed = analyzeAndFix(error);
    if (fixed) {
        addLog('HEALER', 'O sistema tentou aplicar uma correção automática.');
    }
});

process.on('unhandledRejection', (reason) => {
    console.error('Rejeição não tratada:', reason);
    const msg = reason?.message || String(reason);
    addLog('ERRO', msg);
    analyzeAndFix(reason);
});

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.once('ready', () => {
    console.log(`Bot logado como ${client.user.tag}!`);
    addLog('INFO', `Bot conectado com sucesso como ${client.user.tag}`);
    startDashboard(client);
});

client.login(process.env.DISCORD_TOKEN);
