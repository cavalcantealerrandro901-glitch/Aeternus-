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
// Importe a fonte do Google Fonts no HTML para letras charmosas e modernas
app.get('/welcome', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Bem-vindo ao Aeternus</title>
            <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=Inter:wght@300;400;600&display=swap" rel="stylesheet">
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    font-family: 'Inter', sans-serif;
                    background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
                    color: #f8fafc;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    overflow: hidden;
                }
                .welcome-card {
                    background: rgba(30, 41, 59, 0.7);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    padding: 40px;
                    border-radius: 20px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                    text-align: center;
                    max-width: 500px;
                    width: 90%;
                }
                h1 {
                    font-family: 'Playfair Display', serif;
                    font-size: 2.8rem;
                    font-style: italic;
                    background: linear-gradient(90deg, #38bdf8, #c084fc);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    margin-bottom: 20px;
                }
                p {
                    color: #cbd5e1;
                    font-size: 1rem;
                    line-height: 1.6;
                    margin-bottom: 30px;
                }
                .btn {
                    display: inline-block;
                    background: #5865F2;
                    color: white;
                    padding: 12px 25px;
                    border-radius: 8px;
                    text-decoration: none;
                    font-weight: 600;
                    transition: background 0.3s ease;
                }
                .btn:hover {
                    background: #4752c4;
                }
            </style>
        </head>
        <body>
            <div class="welcome-card">
                <h1>Bem-vindo ao Aeternus</h1>
                <p>
                    Este é o seu painel de controle centralizado. Aqui você gerencia comandos, 
                    monitora o status do bot em tempo real, acompanha o sistema de economia 
                    e configura todas as preferências da sua aplicação com facilidade e segurança.
                </p>
                <a href="/" class="btn">Voltar ao Início</a>
            </div>
        </body>
        </html>
    `);
});

// Rota de login simulada ou redirecionamento do Discord OAuth2
app.get('/login', (req, res) => {
    // Aqui você redirecionaria para o Discord OAuth2 se configurado, 
    // ou redireciona direto para a página de boas-vindas após o login bem-sucedido:
    res.redirect('/welcome');
});

const token = config.token || process.env.DISCORD_TOKEN;
if (token) {
    client.login(token).catch(err => console.error('Erro ao fazer login no Discord:', err));
} else {
    console.error('❌ DISCORD_TOKEN não fornecido!');
}
