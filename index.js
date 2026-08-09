const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const express = require('express');
require('dotenv').config();

// Carrega o config.json se existir (local), senão usa o Render (Variáveis de Ambiente)
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
            console.log(`📂 Comando carregado: ${command.data.name}`);
        }
    }
}

// Conectar ao MongoDB
mongoose.connect(config.mongoUri || process.env.MONGO_URI)
    .then(() => console.log('📦 Conectado ao MongoDB com sucesso!'))
    .catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// Painel Web com Express
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Aeternus Web Panel is running!');
});

app.listen(PORT, () => {
    console.log(`🌐 Painel Web rodando em: http://localhost:${PORT}`);
});

// Evento quando o bot estiver pronto
client.once('ready', async () => {
    console.log(`🤖 Aeternus conectado com sucesso como ${client.user.tag}!`);

    // Registrar Slash Commands
    const commands = [];
    client.commands.forEach(command => commands.push(command.data.toJSON()));

    const rest = new REST({ version: '10' }).setToken(config.token || process.env.DISCORD_TOKEN);

    try {
        console.log('🔄 Atualizando comandos de barra (Slash Commands)...');
        await rest.put(
            Routes.applicationCommands(config.clientId || process.env.CLIENT_ID),
            { body: commands },
        );
        console.log('✨ Comandos de barra registrados com sucesso!');
    } catch (error) {
        console.error(error);
    }
});

// Manipulador de Interações
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`❌ Erro na execução do comando:`, error);
        const errorPayload = { content: 'Houve um erro ao executar este comando!', flags: 6 };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorPayload).catch(() => {});
        } else {
            await interaction.reply(errorPayload).catch(() => {});
        }
    }
});

client.login(config.token || process.env.DISCORD_TOKEN);
