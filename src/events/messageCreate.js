const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../database/db');

const DEFAULT_FLIRT_EMOJIS = ['💖', '❤️', '😍', '🥰', '😘', '😏', '🏻', '🙈', '🔥', '✨', '💐', '💘'];
const GIF_CATEGORIES = ['hug', 'kiss', 'blush', 'wink', 'pat', 'smile']; 
const PUNISH_CATEGORIES = ['slap', 'baka', 'poke', 'hug'];

const FALLBACK_GIFS = [
    'https://nekos.best/api/v2/slap/slap_001.gif',
    'https://nekos.best/api/v2/baka/baka_001.gif',
    'https://nekos.best/api/v2/poke/poke_001.gif',
    'https://nekos.best/api/v2/hug/hug_001.gif'
];

const FLIRT_MESSAGES = [
    "Você chamou a minha atenção! 💖",
    "Alguém está esbanjando charme por aqui... ✨",
    "Piscou, eu notei! 😏",
    "Muito fofo(a)! Toma aqui uma figurinha. 🥰",
    "Passando só para deixar isso aqui pra você... 💘",
    "Não resisti e tive que mandar isso! 😳",
    "Você tem uma energia muito boa! 🌸"
];

const PUNISH_TEXTS = [
    "recebeu um castigo merecido! 💢",
    "foi colocado(a) de castigo! 😈",
    "levou uma bronca e tanto! 💥",
    "precisa prestar mais atenção! ⚡"
];

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot || !message.guild) return;

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

            await db.setGuildConfig(message.guild.id, { prefix: newPrefix });
            return await message.reply(`✅ Prefixo alterado com sucesso para \`${newPrefix}\`!`);
        }

        // ⚔️ COMANDO DE PREFIXO: CASTIGAR
        if (commandName === 'castigar') {
            const target = message.mentions.users.first();
            const author = message.author;

            if (!target) {
                return await message.reply(`❌ Você precisa marcar alguém para castigar! Exemplo: \`${prefix}castigar @usuario\``);
            }

            if (target.id === author.id) {
                return await message.reply('❌ Você não pode castigar a si mesmo!');
            }

            const isBotTarget = target.id === message.client.user.id;

            try {
                let gifUrl = '';
                try {
                    const category = PUNISH_CATEGORIES[Math.floor(Math.random() * PUNISH_CATEGORIES.length)];
                    const response = await fetch(`https://nekos.best/api/v2/${category}`);
                    const contentType = response.headers.get('content-type');
                    if (response.ok && contentType && contentType.includes('application/json')) {
                        const data = await response.json();
                        if (data && data.results && data.results.length > 0) {
                            gifUrl = data.results[0].url;
                        }
                    }
                } catch (apiErr) {}

                if (!gifUrl) {
                    gifUrl = FALLBACK_GIFS[Math.floor(Math.random() * FALLBACK_GIFS.length)];
                }

                const randomText = PUNISH_TEXTS[Math.floor(Math.random() * PUNISH_TEXTS.length)];

                const embed = new EmbedBuilder()
                    .setDescription(`⚠️ **${target}** ${randomText} *(Enviado por ${author})*`)
                    .setImage(gifUrl)
                    .setColor('#ec4899');

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('return_punish')
                            .setLabel(isBotTarget ? '🔄 Bot Revidando...' : '🔄 Devolver Castigo')
                            .setStyle(ButtonStyle.Danger)
                            .setDisabled(isBotTarget)
                    );

                const sentMessage = await message.reply({ embeds: [embed], components: [row] });

                // Se o bot for o alvo, ele revida automaticamente respondendo à mensagem original
                if (isBotTarget) {
                    setTimeout(async () => {
                        try {
                            const returnEmbed = new EmbedBuilder()
                                .setDescription(`🔄 O jogo virou! **${target}** (Aeternus) devolveu o castigo em **${author}**! 🚀`)
                                .setImage(gifUrl)
                                .setColor('#38bdf8');

                            await sentMessage.reply({ embeds: [returnEmbed] });
                        } catch (e) {
                            console.error('Erro ao revidar automaticamente:', e);
                        }
                    }, 1500);
                    return;
                }

                const collector = sentMessage.createMessageComponentCollector({ time: 60000 });

                collector.on('collect', async i => {
                    if (i.user.id !== target.id) {
                        return await i.reply({ content: '❌ Apenas a pessoa que recebeu o castigo pode devolvê-lo!', flags: [MessageFlags.Ephemeral] });
                    }

                    const returnEmbed = new EmbedBuilder()
                        .setDescription(`🔄 O jogo virou! **${target}** devolveu o castigo em **${author}**! 🚀`)
                        .setImage(gifUrl)
                        .setColor('#38bdf8');

                    const disabledRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('return_punish')
                                .setLabel('🔄 Castigo Devolvido')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(true)
                        );

                    await i.update({ embeds: [returnEmbed], components: [disabledRow] });
                    collector.stop();
                });

                collector.on('end', async collected => {
                    if (collected.size === 0) {
                        try {
                            const expiredRow = new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId('return_punish')
                                        .setLabel('🔄 Tempo Esgotado')
                                        .setStyle(ButtonStyle.Secondary)
                                        .setDisabled(true)
                                );
                            await sentMessage.edit({ components: [expiredRow] });
                        } catch (e) {}
                    }
                });

            } catch (err) {
                console.error('Erro no comando castigar:', err);
                await message.reply('❌ Ocorreu um erro ao executar o comando.');
            }
            return;
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
                .addFields(
                    { name: '⚔️ Divertidos', value: `\`${prefix}castigar @usuario\` (Pode castigar membros ou o próprio bot!)` },
                    { name: '⚙️ Prefixo', value: `\`${prefix}prefixo <novo>\`` }
                )
                .setColor('#38bdf8');
            return await message.channel.send({ embeds: [embed] });
        }
    }
};
