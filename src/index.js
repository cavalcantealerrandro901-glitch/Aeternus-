const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const startDashboard = require('./server'); // Importa a função

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]
});

// ... (seus comandos aqui) ...

client.once('ready', () => {
    console.log(`Bot logado como ${client.user.tag}!`);
    startDashboard(client); // Inicia o painel APÓS o bot logar
});

client.login(process.env.DISCORD_TOKEN);
