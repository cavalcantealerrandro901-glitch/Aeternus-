const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const express = require('express');
require('dotenv').config();

let config;
try {
    config = require('./config.json');
} catch (e) {
    config = {
        token: process.env.DISCORD_TOKEN,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        mongoUri: process.env.MONGO_URI
    };
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.commands = new Collection();

// Carregar Comandos
const commandsPath = path.join(__dirname, 'src', 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        }
    }
}

// Conectar ao MongoDB com segurança
const mongoUri = config.mongoUri || process.env.MONGO_URI;
if (mongoUri) {
    mongoose.connect(mongoUri)
        .then(() => console.log('📦 Conectado ao MongoDB com sucesso!'))
        .catch(err => console.error('Erro ao conectar ao MongoDB:', err));
} else {
    console.warn('⚠️ MONGO_URI não definida!');
}

// Painel Web com Express (HTML Moderno)
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Aeternus - Painel Web</title>
            <style>
                body { font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .card { background-color: #1e293b; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); text-align: center; max-width: 400px; width: 100%; }
                h1 { color: #38bdf8; margin-bottom: 10px; }
                .status { display: inline-block; padding: 6px 12px; border-radius: 20px; font-weight: bold; font-size: 14px; margin-top: 15px; }
                .online { background-color: #22c55e; color: white; }
                p { color: #94a3b8; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>Aeternus Bot</h1>
                <p>Painel de Controle e Status do Web Service</p>
                <div class="status online">● Bot Online & Ativo</div>
            </div>
        </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`🌐 Painel Web rodando na porta ${PORT}`);
});

// Evento ready do Bot
client.once('ready', async () => {
    console.log(`🤖 Aeternus conectado com sucesso como ${client.user.tag}!`);

    const commands = [];
    client.commands.forEach(command => commands.push(command.data.toJSON()));

    const token = config.token || process.env.DISCORD_TOKEN;
    const clientId = config.clientId || process.env.CLIENT_ID;

    if (token && clientId) {
        const rest = new REST({ version: '10' }).setToken(token);
        try {
            await rest.put(Routes.applicationCommands(clientId), { body: commands });
            console.log('✨ Comandos de barra registrados com sucesso!');
        } catch (error) {
            console.error(error);
        }
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
    }
});

const token = config.token || process.env.DISCORD_TOKEN;
if (token) {
    client.login(token).catch(err => console.error('Erro ao fazer login no Discord:', err));
} else {
    console.error('❌ DISCORD_TOKEN não fornecido!');
}
