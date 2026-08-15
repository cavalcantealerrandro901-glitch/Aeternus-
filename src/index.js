const { Client, GatewayIntentBits } = require('discord.js');
const startDashboard = require('./server');
const { addLog } = require('./logger');
const { analyzeAndFix } = require('./healer');
const { initAutoDeploy } = require('./deployer');
const { getMaintenance } = require('./state');

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

// Exemplo de bloqueio por Modo de Manutenção ao receber mensagens
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (getMaintenance()) {
        await message.reply('⚠️ O bot está atualmente em **Modo de Manutenção** pelo painel. Tente novamente mais tarde!');
        return;
    }
    
    // Seus comandos normais viriam aqui...
});

client.once('ready', () => {
    globalClient = client;
    console.log(`Bot logado como ${client.user.tag}!`);
    addLog('INFO', `Bot conectado como ${client.user.tag}`);
    
    startDashboard(client);
    initAutoDeploy();
});

client.login(process.env.DISCORD_TOKEN);
