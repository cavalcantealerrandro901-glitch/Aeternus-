require('dotenv').config();

const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { loadCommands, loadSlash, loadEvents, loadSystems } = require('./bot/loaders');
const { startServer } = require('./web/server');
const { getPrefix } = require('./utils/prefixManager');

const TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN;
if (!TOKEN) {
    console.error('Falta DISCORD_TOKEN');
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildModeration
    ],
    partials: [Partials.Message, Partials.Reaction]
});

client.afk = new Map();
client.commands = new Collection();
client.slashCommands = new Collection();

loadCommands(client);
loadSlash(client);
loadEvents(client);
loadSystems(client);

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // 🟢 LÓGICA AFK 1: Se o usuário que enviou a mensagem estava AFK, remove o status
    if (client.afk.has(message.author.id)) {
        client.afk.delete(message.author.id);
        message.reply(`👋 Bem-vindo de volta, **${message.author.username}**! Removi seu status de AFK.`).then(msg => {
            setTimeout(() => msg.delete().catch(() => {}), 5000);
        });
    }

    // 🟢 LÓGICA AFK 2: Avisa se alguém marcou um usuário que está AFK
    if (message.mentions.users.size > 0) {
        message.mentions.users.forEach(user => {
            if (client.afk.has(user.id)) {
                const data = client.afk.get(user.id);
                const timeAgo = Math.floor((Date.now() - data.timestamp) / 1000 / 60);
                message.reply(`💤 **${user.username}** está AFK há ${timeAgo} minuto(s): \`${data.reason}\``);
            }
        });
    }

    const prefix = getPrefix(message.guild.id);

    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName) || 
                    client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

    if (!command) return;

    try {
        await command.execute(message, args, client);
    } catch (error) {
        console.error(`Erro ao executar o comando ${commandName}:`, error);
        message.reply('❌ Ocorreu um erro ao executar este comando.');
    }
});

client.once('clientReady', () => {
    console.log(`🤖 Bot online: ${client.user.tag}`);
});

startServer(client);
client.login(TOKEN);
