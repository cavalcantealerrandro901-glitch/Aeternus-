const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
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

// Conectar ao MongoDB
const mongoUri = config.mongoUri || process.env.MONGO_URI;
if (mongoUri) {
    mongoose.connect(mongoUri)
        .then(() => console.log('📦 Conectado ao MongoDB com sucesso!'))
        .catch(err => console.error('Erro ao conectar ao MongoDB:', err));
}

// Configurar Servidor Web Express
const app = express();
const PORT = process.env.PORT || 3000;
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

const sessions = {};

// Página Inicial com Botão de Login no Canto Superior Direito
app.get('/', (req, res) => {
    const sessionId = req.cookies.sessionId;
    const user = sessions[sessionId];

    res.send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Aeternus - Início</title>
            <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=Inter:wght@300;400;600&display=swap" rel="stylesheet">
            <style>
                body { margin: 0; font-family: 'Inter', sans-serif; background: #0f172a; color: #f8fafc; height: 100vh; display: flex; flex-direction: column; }
                header { display: flex; justify-content: space-between; align-items: center; padding: 20px 40px; background: rgba(30, 41, 59, 0.5); border-bottom: 1px solid rgba(255,255,255,0.1); }
                .logo { font-size: 1.5rem; font-weight: bold; color: #38bdf8; }
                .login-btn { background: #5865F2; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; transition: 0.3s; }
                .login-btn:hover { background: #4752c4; }
                .hero { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 20px; }
                h1 { font-family: 'Playfair Display', serif; font-size: 3rem; font-style: italic; background: linear-gradient(90deg, #38bdf8, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 10px; }
                p { color: #94a3b8; font-size: 1.1rem; max-width: 600px; line-height: 1.6; }
            </style>
        </head>
        <body>
            <header>
                <div class="logo">Aeternus</div>
                <div>
                    ${user ? `<a href="/dashboard" class="login-btn">Painel</a>` : `<a href="/login" class="login-btn">Login 🔚</a>`}
                </div>
            </header>
            <div class="hero">
                <h1>Gerencie seu Bot com Elegância</h1>
                <p>O painel de controle definitivo para acompanhar estatísticas, gerenciar servidores e configurar seu ecossistema no Discord com facilidade.</p>
            </div>
        </body>
        </html>
    `);
});

// Redirecionamento para o Discord OAuth2
app.get('/login', (req, res) => {
    const clientId = config.clientId || process.env.CLIENT_ID;
    const redirectUri = `${req.protocol}://${req.get('host')}/auth/discord/callback`;
    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify%20guilds`;
    res.redirect(discordAuthUrl);
});

// Callback do Discord OAuth2
app.get('/auth/discord/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.redirect('/');

    const clientId = config.clientId || process.env.CLIENT_ID;
    const clientSecret = config.clientSecret || process.env.CLIENT_SECRET;
    const redirectUri = `${req.protocol}://${req.get('host')}/auth/discord/callback`;

    try {
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: redirectUri,
            }),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        const tokenData = await tokenResponse.json();
        if (!tokenData.access_token) return res.redirect('/');

        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: { authorization: `${tokenData.token_type} ${tokenData.access_token}` },
        });
        const userData = await userResponse.json();

        const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
            headers: { authorization: `${tokenData.token_type} ${tokenData.access_token}` },
        });
        const guildsData = await guildsResponse.json();

        const sessionId = Math.random().toString(36).substring(2);
        sessions[sessionId] = { user: userData, guilds: guildsData };

        res.cookie('sessionId', sessionId, { httpOnly: true });
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Erro no OAuth2:', error);
        res.redirect('/');
    }
});

// Painel Principal / Dashboard
app.get('/dashboard', (req, res) => {
    const sessionId = req.cookies.sessionId;
    const sessionData = sessions[sessionId];

    if (!sessionData) return res.redirect('/');

    const user = sessionData.user;
    const userGuilds = sessionData.guilds;

    const botGuilds = client.guilds.cache;
    const manageableGuilds = userGuilds.filter(g => {
        const isAdmin = (BigInt(g.permissions) & 0x8n) === 0x8n || g.owner;
        const botIsInGuild = botGuilds.has(g.id);
        return isAdmin && botIsInGuild;
    });

    res.send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Dashboard - Aeternus</title>
            <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=Inter:wght@300;400;600&display=swap" rel="stylesheet">
            <style>
                body { margin: 0; font-family: 'Inter', sans-serif; background: #0f172a; color: #f8fafc; display: flex; height: 100vh; }
                sidebar { width: 260px; background: #1e293b; border-right: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; padding: 20px; box-sizing: border-box; }
                .menu-header { font-size: 1.2rem; font-weight: bold; color: #38bdf8; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
                .server-list { list-style: none; padding: 0; margin: 0; overflow-y: auto; flex: 1; }
                .server-item { padding: 12px; margin-bottom: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; cursor: pointer; transition: 0.2s; text-decoration: none; color: #cbd5e1; display: block; }
                .server-item:hover { background: #38bdf8; color: #0f172a; font-weight: 600; }
                main { flex: 1; padding: 40px; overflow-y: auto; }
                h1 { font-family: 'Playfair Display', serif; font-size: 2.5rem; font-style: italic; background: linear-gradient(90deg, #38bdf8, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .welcome-card { background: #1e293b; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); margin-top: 20px; }
                p { color: #94a3b8; line-height: 1.6; }
                .back-home { display: inline-block; margin-top: 20px; color: #38bdf8; text-decoration: none; font-size: 0.9rem; }
                .back-home:hover { text-decoration: underline; }
            </style>
        </head>
        <body>
            <sidebar>
                <div class="menu-header">☰ Menu de Servidores</div>
                <p style="font-size: 0.85rem; color: #64748b; margin-bottom: 10px;">SELECIONE UM PARA GERENCIAR</p>
                <ul class="server-list">
                    ${manageableGuilds.length > 0 ? manageableGuilds.map(g => `
                        <a href="/dashboard/${g.id}" class="server-item">🛡️ ${g.name}</a>
                    `).join('') : '<p style="font-size: 0.9rem; color: #f87171;">Nenhum servidor encontrado onde você seja administrador e o bot esteja.</p>'}
                </ul>
            </sidebar>
            <main>
                <h1>Bem-vindo, ${user.username}!</h1>
                <div class="welcome-card">
                    <p>Este é o seu painel de controle centralizado no Aeternus. Utilize o menu lateral esquerdo com o ícone <strong>☰</strong> para selecionar o servidor que deseja gerenciar, configurar comandos, visualizar registros e ajustar permissões da sua comunidade com total autonomia e elegância.</p>
                </div>
                <a href="/" class="back-home">← Voltar à Página Inicial</a>
            </main>
        </body>
        </html>
    `);
});

// Portal de Gerenciamento do Servidor Específico (/dashboard/:guildId)
app.get('/dashboard/:guildId', (req, res) => {
    const sessionId = req.cookies.sessionId;
    const sessionData = sessions[sessionId];

    if (!sessionData) return res.redirect('/');

    const guildId = req.params.guildId;
    const userGuilds = sessionData.guilds;

    const guild = userGuilds.find(g => g.id === guildId);
    if (!guild) return res.redirect('/dashboard');

    const isAdmin = (BigInt(guild.permissions) & 0x8n) === 0x8n || guild.owner;
    const botGuild = client.guilds.cache.get(guildId);

    if (!isAdmin || !botGuild) {
        return res.redirect('/dashboard');
    }

    res.send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Gerenciar ${guild.name} - Aeternus</title>
            <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=Inter:wght@300;400;600&display=swap" rel="stylesheet">
            <style>
                body { margin: 0; font-family: 'Inter', sans-serif; background: #0f172a; color: #f8fafc; display: flex; height: 100vh; }
                sidebar { width: 260px; background: #1e293b; border-right: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; padding: 20px; box-sizing: border-box; }
                .menu-header { font-size: 1.2rem; font-weight: bold; color: #38bdf8; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
                .server-list { list-style: none; padding: 0; margin: 0; overflow-y: auto; flex: 1; }
                .server-item { padding: 12px; margin-bottom: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; cursor: pointer; transition: 0.2s; text-decoration: none; color: #cbd5e1; display: block; }
                .server-item:hover, .server-item.active { background: #38bdf8; color: #0f172a; font-weight: 600; }
                main { flex: 1; padding: 40px; overflow-y: auto; }
                h1 { font-family: 'Playfair Display', serif; font-size: 2.2rem; font-style: italic; background: linear-gradient(90deg, #38bdf8, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .portal-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 20px; }
                .card { background: #1e293b; padding: 25px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); }
                .card h3 { color: #38bdf8; margin-top: 0; }
                p { color: #94a3b8; font-size: 0.95rem; line-height: 1.5; }
                .btn-action { display: inline-block; background: #38bdf8; color: #0f172a; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 15px; transition: 0.2s; }
                .btn-action:hover { background: #7dd3fc; }
                .back-link { display: inline-block; margin-bottom: 20px; color: #94a3b8; text-decoration: none; }
                .back-link:hover { color: #f8fafc; }
            </style>
        </head>
        <body>
            <sidebar>
                <div class="menu-header">☰ Servidores</div>
                <ul class="server-list">
                    ${userGuilds.filter(g => (BigInt(g.permissions) & 0x8n) === 0x8n || g.owner).filter(g => client.guilds.cache.has(g.id)).map(g => `
                        <a href="/dashboard/${g.id}" class="server-item ${g.id === guildId ? 'active' : ''}">🛡️ ${g.name}</a>
                    `).join('')}
                </ul>
            </sidebar>
            <main>
                <a href="/dashboard" class="back-link">← Voltar à Visão Geral</a>
                <h1>Portal de Gerenciamento: ${guild.name}</h1>
                <p>Configure as opções avançadas do bot para este servidor em tempo real.</p>
                
                <div class="portal-grid">
                    <div class="card">
                        <h3>💬 Comandos & Integrações</h3>
                        <p>Ative ou desative módulos de comandos personalizados e configure canais permitidos.</p>
                        <a href="#" class="btn-action">Configurar</a>
                    </div>
                    <div class="card">
                        <h3>👋 Mensagem de Boas-Vindas</h3>
                        <p>Personalize o texto, imagem e canal onde o bot dará boas-vindas aos novos membros.</p>
                        <a href="#" class="btn-action">Configurar</a>
                    </div>
                    <div class="card">
                        <h3>🔒 Permissões & Cargos</h3>
                        <p>Defina quais cargos administrativos do Discord terão acesso a este painel web.</p>
                        <a href="#" class="btn-action">Configurar</a>
                    </div>
                </div>
            </main>
        </body>
        </html>
    `);
});

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
}
