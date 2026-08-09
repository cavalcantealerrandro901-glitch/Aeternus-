require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Events, REST, Routes, MessageFlags } = require('discord.js');
const config = require('./config.json');
const connectDatabase = require('./src/database/connect');
const loadCommands = require('./src/handlers/commandHandler');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.commands = new Collection();

// 1. Conecta ao Banco de Dados
connectDatabase();

// 2. Carrega os Comandos Locais
loadCommands(client);

// 3. Inicializa o Painel Web
const initWebServer = require('./src/web/server');
initWebServer(client);

// 4. Evento Ready do Bot
client.once(Events.ClientReady, async (c) => {
    console.log(`🤖 Aeternus conectado com sucesso como ${c.user.tag}!`);

    // Registra os Slash Commands globalmente no Discord
    const commandsArray = client.commands.map(cmd => cmd.data.toJSON());
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN || config.token);

    try {
        console.log('🔄 Atualizando comandos de barra (Slash Commands)...');
        await rest.put(
            Routes.applicationCommands(c.user.id),
            { body: commandsArray },
        );
        console.log('✨ Comandos de barra registrados com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao registrar comandos:', error);
    }
});

// 5. Tratador de Interações Seguro
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error('❌ Erro na execução do comando:', error);
        
        const errorPayload = { 
            content: 'Ocorreu um erro ao executar este comando!', 
            flags: MessageFlags.Ephemeral 
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorPayload).catch(() => {});
        } else {
            await interaction.reply(errorPayload).catch(() => {});
        }
    }
});

// 6. Login do Bot
const botToken = process.env.DISCORD_TOKEN || config.token;
if (botToken && botToken !== 'SEU_TOKEN_AQUI') {
    client.login(botToken);
} else {
    console.log("⚠️ Token do Discord não encontrado.");
}
