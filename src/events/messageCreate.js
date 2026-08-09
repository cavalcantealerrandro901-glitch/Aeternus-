const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { sendMessage } = require('../utils/messageSender');

const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://aeternus-q7gt.onrender.com';

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        if (!message.content.startsWith('!') && !message.content.startsWith('/')) return;

        const args = message.content.slice(1).trim().split(/ +/);
        const commandName = args.shift()?.toLowerCase();

        if (!commandName) return;

        // 🌐 Comando Nativo de Prefixo: !painel / !dashboard
        if (commandName === 'painel' || commandName === 'dashboard') {
            try {
                const guildDashboardUrl = `${DASHBOARD_URL}/dashboard/${message.guild.id}`;

                const embed = new EmbedBuilder()
                    .setTitle('🌐 Painel de Controle - Aeternus')
                    .setDescription(`Olá **${message.author.username}**! Clique no botão abaixo para gerenciar as configurações do servidor **${message.guild.name}**.`)
                    .setColor('#38bdf8')
                    .setThumbnail(message.client.user.displayAvatarURL())
                    .setFooter({ text: 'Aeternus Manager', iconURL: message.client.user.displayAvatarURL() })
                    .setTimestamp();

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setLabel('Acessar Painel do Servidor')
                        .setStyle(ButtonStyle.Link)
                        .setURL(guildDashboardUrl)
                        .setEmoji('🔗')
                );

                return await message.channel.send({
                    embeds: [embed],
                    components: [row]
                });
            } catch (err) {
                console.error('❌ Erro ao enviar comando !painel:', err);
                return;
            }
        }

        // 🛠️ Busca comandos customizados salvos no banco
        const guildConfig = db.getGuildConfig(message.guild.id);
        const customCommands = guildConfig.customCommands || [];

        const foundCmd = customCommands.find(c => c.name.toLowerCase() === commandName);
        if (!foundCmd) return;

        try {
            if (foundCmd.isEmbed) {
                await sendMessage(message.channel, {
                    embed: {
                        description: foundCmd.response
                    },
                    guild: message.guild,
                    user: message.author
                });
            } else {
                await sendMessage(message.channel, {
                    content: foundCmd.response,
                    guild: message.guild,
                    user: message.author
                });
            }
        } catch (err) {
            console.error(`❌ Erro ao enviar comando !${commandName}:`, err.message);
        }
    }
};
