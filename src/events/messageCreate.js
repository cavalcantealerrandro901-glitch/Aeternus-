const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');

const DEFAULT_FLIRT_EMOJIS = ['💖', '❤️', '😍', '🥰', '😘', '😏', '🏻', '🙈', '🔥', '✨', '💐', '💘'];
// Categorias de gifs fofos da API
const GIF_CATEGORIES = ['hug', 'kiss', 'blush', 'wink', 'pat', 'smile']; 

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        const guildConfig = db.getGuildConfig(message.guild.id);
        const prefix = guildConfig.prefix || '!';

        // --- SISTEMA AUTOMÁTICO DE PAQUERA (EMOJIS E FIGURINHAS) ---
        const flirtConfig = guildConfig.flirt || {};
        if (flirtConfig.enabled === true) {
            const isAllowedChannel = !flirtConfig.channels || flirtConfig.channels.length === 0 || flirtConfig.channels.includes(message.channel.id);

            if (isAllowedChannel) {
                const chance = flirtConfig.chance || 10;
                const randomNumber = Math.floor(Math.random() * 100) + 1;

                if (randomNumber <= chance) {
                    try {
                        const mode = flirtConfig.mode || 'emoji';
                        // Se for "both", sorteia 50/50 entre emoji e gif
                        const useGif = mode === 'gif' || (mode === 'both' && Math.random() > 0.5);

                        if (useGif) {
                            // 📸 BUSCA UMA FIGURINHA ANIMADA (GIF) AUTOMATICAMENTE
                            const randomCategory = GIF_CATEGORIES[Math.floor(Math.random() * GIF_CATEGORIES.length)];
                            const response = await fetch(`https://nekos.best/api/v2/${randomCategory}`);
                            const data = await response.json();
                            
                            if (data && data.results && data.results.length > 0) {
                                const gifUrl = data.results[0].url;
                                await message.reply({ content: gifUrl });
                            }
                        } else {
                            // 💖 REAÇÃO COM EMOJIS
                            const customGuildEmojis = message.guild.emojis.cache.filter(e => e.available).map(e => e.id);
                            const globalClientEmojis = message.client.emojis.cache.filter(e => e.available).map(e => e.id);
                            const allCustomEmojis = [...new Set([...customGuildEmojis, ...globalClientEmojis])];

                            let chosenEmoji;
                            if (allCustomEmojis.length > 0 && Math.random() > 0.4) {
                                chosenEmoji = allCustomEmojis[Math.floor(Math.random() * allCustomEmojis.length)];
                            } else {
                                chosenEmoji = DEFAULT_FLIRT_EMOJIS[Math.floor(Math.random() * DEFAULT_FLIRT_EMOJIS.length)];
                            }

                            await message.react(chosenEmoji).catch(() => message.react('❤️').catch(() => null));
                        }
                    } catch (err) {
                        console.error('Erro ao processar paquera automática:', err);
                    }
                }
            }
        }

        // --- RESPOSTA AO MENCIONAR O BOT ---
        const botMention = `<@${message.client.user.id}>`;
        const botMentionNick = `<@!${message.client.user.id}>`;
        if (message.content.trim() === botMention || message.content.trim() === botMentionNick) {
            return await message.reply({
                content: `👋 Olá ${message.author}! Meu prefixo neste servidor é \`${prefix}\`. Use \`${prefix}help\` para ver a lista de comandos.`
            });
        }

        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        if (!commandName) return;

        // Comando do Prefixo
        if (commandName === 'prefixo' || commandName === 'prefix') {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return await message.reply('❌ Você precisa da permissão de **Administrador** para alterar o prefixo.');
            }

            const newPrefix = args[0];
            if (!newPrefix) {
                return await message.reply(`📌 O prefixo atual é \`${prefix}\`. Para alterar use: \`${prefix}prefixo <novo_prefixo>\``);
            }

            if (newPrefix.length > 5) {
                return await message.reply('❌ O prefixo não pode ter mais de 5 caracteres.');
            }

            db.setGuildConfig(message.guild.id, { prefix: newPrefix });
            return await message.reply(`✅ Prefixo alterado com sucesso para \`${newPrefix}\`!`);
        }

        // Comandos Personalizados do Painel Web
        const customCommands = guildConfig.customCommands || [];
        const customCmd = customCommands.find(c => c.name.toLowerCase() === commandName);

        if (customCmd) {
            if (customCmd.isEmbed) {
                const embed = new EmbedBuilder()
                    .setDescription(customCmd.response)
                    .setColor('#38bdf8');
                return await message.channel.send({ embeds: [embed] });
            } else {
                return await message.channel.send(customCmd.response);
            }
        }

        // Comando de Ajuda
        if (commandName === 'help' || commandName === 'ajuda') {
            const embed = new EmbedBuilder()
                .setTitle('📜 Central de Comandos')
                .setDescription(`O prefixo atual neste servidor é \`${prefix}\``)
                .addFields(
                    { 
                        name: '⚙️ Prefixo', 
                        value: `Use \`${prefix}prefixo <novo>\`, o comando \`/prefixo\` ou o Painel Web para alterar.` 
                    },
                    { 
                        name: '⚡ Comandos Customizados', 
                        value: customCommands.length > 0 
                            ? customCommands.map(c => `\`${prefix}${c.name}\``).join(', ') 
                            : 'Nenhum comando customizado cadastrado.' 
                    }
                )
                .setColor('#38bdf8')
                .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL() })
                .setTimestamp();

            return await message.channel.send({ embeds: [embed] });
        }
    }
};
