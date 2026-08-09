const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');

const DEFAULT_FLIRT_EMOJIS = ['💖', '❤️', '😍', '🥰', '😘', '😏', '🏻', '🙈', '🔥', '✨', '💐', '💘'];
const GIF_CATEGORIES = ['hug', 'kiss', 'blush', 'wink', 'pat', 'smile']; 

const FLIRT_MESSAGES = [
    "Você chamou a minha atenção! 💖",
    "Alguém está esbanjando charme por aqui... ✨",
    "Piscou, eu notei! 😏",
    "Muito fofo(a)! Toma aqui uma figurinha. 🥰",
    "Passando só para deixar isso aqui pra você... 💘",
    "Não resisti e tive que mandar isso! 😳",
    "Você tem uma energia muito boa! 🌸"
];

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        // ADICIONADO AWAIT AQUI
        const guildConfig = await db.getGuildConfig(message.guild.id);
        const prefix = guildConfig.prefix || '!';

        // --- SISTEMA AUTOMÁTICO DE PAQUERA (GLOBAL) ---
        const flirtConfig = guildConfig.flirt || {};
        
        if (flirtConfig.chance && flirtConfig.chance > 0) {
            const chance = flirtConfig.chance;
            const randomNumber = Math.floor(Math.random() * 100) + 1;

            if (randomNumber <= chance) {
                try {
                    const mode = flirtConfig.mode || 'emoji';
                    const useGif = mode === 'gif' || (mode === 'both' && Math.random() > 0.5);

                    if (useGif) {
                        const randomCategory = GIF_CATEGORIES[Math.floor(Math.random() * GIF_CATEGORIES.length)];
                        const response = await fetch(`https://nekos.best/api/v2/${randomCategory}`);
                        const data = await response.json();
                        
                        if (data && data.results && data.results.length > 0) {
                            const gifUrl = data.results[0].url;
                            const randomMessage = FLIRT_MESSAGES[Math.floor(Math.random() * FLIRT_MESSAGES.length)];
                            
                            const flirtEmbed = new EmbedBuilder()
                                .setDescription(`Oi **${message.author.username}**! ${randomMessage}`)
                                .setImage(gifUrl)
                                .setColor('#ec4899');

                            await message.reply({ embeds: [flirtEmbed] });
                        }
                    } else {
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

        // --- RESPOSTA AO MENCIONAR O BOT ---
        const botMention = `<@${message.client.user.id}>`;
        const botMentionNick = `<@!${message.client.user.id}>`;
        if (message.content.trim() === botMention || message.content.trim() === botMentionNick) {
            return await message.reply({
                content: `👋 Olá ${message.author}! Meu prefixo neste servidor é \`${prefix}\`. Use \`${prefix}help\``
            });
        }

        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        if (!commandName) return;

        // Comando do Prefixo
        if (commandName === 'prefixo' || commandName === 'prefix') {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return await message.reply('❌ Você precisa da permissão de **Administrador**.');
            }

            const newPrefix = args[0];
            if (!newPrefix) {
                return await message.reply(`📌 O prefixo atual é \`${prefix}\`. Use: \`${prefix}prefixo <novo>\``);
            }

            if (newPrefix.length > 5) {
                return await message.reply('❌ O prefixo não pode ter mais de 5 caracteres.');
            }

            // ADICIONADO AWAIT AQUI
            await db.setGuildConfig(message.guild.id, { prefix: newPrefix });
            return await message.reply(`✅ Prefixo alterado com sucesso para \`${newPrefix}\`!`);
        }

        // Comandos Personalizados
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

        // Ajuda
        if (commandName === 'help' || commandName === 'ajuda') {
            const embed = new EmbedBuilder()
                .setTitle('📜 Central de Comandos')
                .setDescription(`O prefixo atual é \`${prefix}\``)
                .setColor('#38bdf8');
            return await message.channel.send({ embeds: [embed] });
        }
    }
};
