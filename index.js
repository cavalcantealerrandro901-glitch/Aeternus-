require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const db = require('./src/database/db');
// O webServer será criado no próximo passo
const webServer = require('./src/web/server'); 

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.commands = new Collection();

async function init() {
    try {
        await db.connect(); 
        
        if (webServer && typeof webServer === 'function') {
            webServer(client, {
                clientId: process.env.CLIENT_ID,
                clientSecret: process.env.CLIENT_SECRET
            });
        }

        await client.login(process.env.DISCORD_TOKEN);
        console.log(`🤖 Aeternus online como ${client.user.tag}!`);
    } catch (error) {
        console.error('❌ Erro fatal ao iniciar:', error);
    }
}

init();
