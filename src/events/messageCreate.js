const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../database/db');

const DEFAULT_FLIRT_EMOJIS = ['💖', '❤️', '😍', '🥰', '😘', '😏', '🏻', '🙈', '🔥', '✨', '💐', '💘'];
const GIF_CATEGORIES = ['hug', 'kiss', 'blush', 'wink', 'pat', 'smile']; 
const PUNISH_CATEGORIES = ['slap', 'baka', 'poke', 'hug'];
const CARINHO_CATEGORIES = ['hug', 'kiss', 'pat', 'cuddle'];

// 🎌 Lista de GIFs de anime otimizados
const FALLBACK_GIFS = [
    'https://media1.giphy.com/media/Gf3AUz3eBNbTW/giphy.gif',
    'https://media1.giphy.com/media/10rsLtGrOGx0sE/giphy.gif',
    'https://media1.giphy.com/media/3oKIPnmiqNhZIleLPW/giphy.gif',
    'https://media1.giphy.com/media/l0HlHFRbmaZtBRhXG/giphy.gif',
    'https://media1.giphy.com/media/26u6dTP6p4y0iyBIQ/giphy.gif',
    'https://media1.giphy.com/media/3ohzdIuqJoo8QdKlnW/giphy.gif',
    'https://media1.giphy.com/media/12xwMUaxUETLgc/giphy.gif',
    'https://media1.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif',
    'https://media1.giphy.com/media/8dYmJ6Buo3lYY/giphy.gif',
    'https://media1.giphy.com/media/l4FGpPki5v2Bcd6Ss/giphy.gif'
];

const FLIRT_MESSAGES = [
    "Você chamou a minha atenção! 💖",
    "Alguém está esbanjando charme por aqui... ✨",
    "Piscou, eu notei! 😏",
    "Muito fofo(a)! Toma aqui uma figurinha. 🥰",
    "Passando só para deixar isso aqui pra você... 💘",
    "Não resisti e tive que mandar isso! 😳",
    "Você tem uma energia muito boa! 🌸",
    "Você é o tipo de pessoa que ilumina o chat! ✨",
    "Cuidado para não roubar todos os corações daqui! 💖",
    "Tem espaço para mais alguém incrível por perto? 🥰",
    "Sua presença deixa o servidor muito mais legal! 🌟",
    "Achei alguém especial por aqui... 👀",
    "Um toque de carinho para alegrar o seu dia! 🌸"
];

const PUNISH_TEXTS = [
    "recebeu um castigo merecido! 💢",
    "foi colocado(a) de castigo! 😈",
    "levou uma bronca e tanto! 💥",
    "precisa prestar mais atenção! ⚡",
    "foi pego(a) no flagra e levou castigo! 🚨",
    "recebeu uma chuva de cosquinhas! 🤭",
    "levou um puxão de orelha virtual! 🐾",
    "precisa ficar de castigo no cantinho da disciplina! 🛑",
    "foi atingido(a) por uma onda de fofura e confusão! 🌀",
    "merece ficar sem doces por uma semana! 🍬"
];

const CARINHO_TEXTS = [
    "envolveu em um abraço super aconchegante! 💖",
    "deu um abraço bem forte e carinhoso! 🥰",
    "espalhou muito amor e carinho por aqui! ✨",
    "compartilhou um momento super fofo! 🌸",
    "encheu de mimos e carinho! 💝",
    "recebeu um abraço quentinho e acolhedor! 🧸",
    "ganhou um carinho muito especial! 💕",
    "teve o dia iluminado por tanto carinho! 🌟"
];

// 💤 Armazenamento temporário de usuários AFK (userId -> { reason, timestamp })
const afkMap = new Map();

// Função auxiliar para formatar tempo decorrido
function formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `há ${seconds} segundo(s)`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `há ${minutes} minuto(s)`;
    const hours = Math.floor(minutes / 60);
    return `há ${hours} hora(s)`;
}

// Função recursiva para gerenciar o ciclo de castigos
async function sendPunishMessage(client, channel, sender, recipient, messageToReply = null) {
    let gifUrl = '';
    try {
        const category = PUNISH_CATEGORIES[Math.floor(Math.random() * PUNISH_CATEGORIES.length)];
        const response = await fetch(`https://nekos.best/api/v2/${category}`, { timeout: 3000 });
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
    const isBotRecipient = recipient.id === client.user.id;

    const embed = new EmbedBuilder()
        .setDescription(`🔄 O jogo virou entre ${recipient} e ${sender}!\n\n**${recipient}** ${randomText}`)
        .setImage(gifUrl)
        .setColor('#38bdf8');

    const uniqueId = `punish_${Date.now()}_${Math.random()}`;
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(uniqueId)
                .setLabel('🔄 Devolver Castigo')
                .setStyle(ButtonStyle.Danger)
        );

    let sentMessage;
    if (messageToReply) {
        sentMessage = await messageToReply.reply({ content: `${recipient} ${sender}`, embeds: [embed], components: [row] });
    } else {
        sentMessage = await channel.send({ content: `${recipient} ${sender}`, embeds: [embed], components: [row] });
    }

    if (isBotRecipient) {
        setTimeout(async () => {
            try {
                const disabledRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(uniqueId)
                            .setLabel('🔄 Castigo Devolvido pelo Aeternus')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true)
                    );
                await sentMessage.edit({ components: [disabledRow] }).catch(() => {});

                await sendPunishMessage(client, channel, recipient, sender, sentMessage);
            } catch (e) {
                console.error('Erro no revide automático do bot:', e);
            }
        }, 1500);
        return;
    }

    const collector = sentMessage.createMessageComponentCollector({ time: 300000 });

    collector.on('collect', async i => {
        if (i.user.id !== recipient.id) {
            return await i.reply({ content: '❌ Apenas a pessoa que recebeu o castigo pode devolvê-lo!', flags: [MessageFlags.Ephemeral] });
        }

        collector.stop();

        const disabledRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(uniqueId)
                    .setLabel('🔄 Castigo Devolvido')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            );
        await i.update({ components: [disabledRow] }).catch(() => {});

        await sendPunishMessage(client, channel, recipient, sender, sentMessage);
    });

    collector.on('end', async collected => {
        if (collected.size === 0) {
            try {
                const expiredRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(uniqueId)
                            .setLabel('🔄 Tempo Esgotado')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true)
                    );
                await sentMessage.edit({ components: [expiredRow] }).catch(() => {});
            } catch (e) {}
        }
    });
}

// Função recursiva rápida para o sistema de Carinho
async function sendCarinhoMessage(client, channel, sender, recipient, messageToReply = null) {
    let gifUrl = '';
    try {
        const category = CARINHO_CATEGORIES[Math.floor(Math.random() * CARINHO_CATEGORIES.length)];
        const response = await fetch(`https://nekos.best/api/v2/${category}`, { timeout: 2000 });
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

    const randomText = CARINHO_TEXTS[Math.floor(Math.random() * CARINHO_TEXTS.length)];
    const isBotRecipient = recipient.id === client.user.id;

    const embed = new EmbedBuilder()
        .setDescription(`💖 **${recipient}** ${randomText}\n\n*(Carinho retribuído por ${sender})*`)
        .setImage(gifUrl)
        .setColor('#ec4899');

    const uniqueId = `carinho_${Date.now()}_${Math.random()}`;
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(uniqueId)
                .setLabel('💖 Retribuir Carinho')
                .setStyle(ButtonStyle.Success)
        );

    let sentMessage;
    if (messageToReply) {
        sentMessage = await messageToReply.reply({ content: `${recipient} ${sender}`, embeds: [embed], components: [row] });
    } else {
        sentMessage = await channel.send({ content: `${recipient} ${sender}`, embeds: [embed], components: [row] });
    }

    if (isBotRecipient) {
        setTimeout(async () => {
            try {
                const disabledRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(uniqueId)
                            .setLabel('💖 Carinho Retribuído pelo Aeternus')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true)
                    );
                await sentMessage.edit({ components: [disabledRow] }).catch(() => {});

                await sendCarinhoMessage(client, channel, recipient, sender, sentMessage);
            } catch (e) {
                console.error('Erro no revide rápido de carinho do bot:', e);
            }
        }, 1000);
        return;
    }

    const collector = sentMessage.createMessageComponentCollector({ time: 300000 });

    collector.on('collect', async i => {
        if (i.user.id !== recipient.id) {
            return await i.reply({ content: '❌ Apenas quem recebeu o carinho pode retribuí-lo!', flags: [MessageFlags.Ephemeral] });
        }

        collector.stop();

        const disabledRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(uniqueId)
                    .setLabel('💖 Carinho Retribuído')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            );
        await i.update({ components: [disabledRow] }).catch(() => {});

        await sendCarinhoMessage(client, channel, recipient, sender, sentMessage);
    });

    collector.on('end', async collected => {
        if (collected.size === 0) {
            try {
                const expiredRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(uniqueId)
                            .setLabel('💖 Tempo Esgotado')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true)
                    );
                await sentMessage.edit({ components: [expiredRow] }).catch(() => {});
            } catch (e) {}
        }
    });
}

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        // --- SISTEMA DE AFK: VERIFICAÇÕES DE MENSAGEM ---
        const authorId = message.author.id;

        // 1. Se o autor estava AFK, remove o status ao falar e deleta após 7 segundos
        if (afkMap.has(authorId)) {
            afkMap.delete(authorId);
            await message.reply({ content: `👋 Bem-vindo(a) de volta, ${message.author}! Retirei seu status de AFK.` }).then(msg => {
                setTimeout(() => msg.delete().catch(() => {}), 7000);
            }).catch(() => {});
        }

        // 2. Se alguém mencionou um usuário que está AFK (a mensagem some após 7 segundos)
        if (message.mentions.users.size > 0) {
            message.mentions.users.forEach(async (mentionedUser) => {
                if (afkMap.has(mentionedUser.id)) {
                    const afkData = afkMap.get(mentionedUser.id);
                    const timeAgo = formatTimeAgo(afkData.timestamp);

                    const afkEmbed = new EmbedBuilder()
                        .setTitle('💤 Usuário Ausente (AFK)')
                        .setDescription(`**${mentionedUser.tag}** está AFK no momento.`)
                        .addFields(
                            { name: '📝 Motivo', value: `\`${afkData.reason}\``, inline: false },
                            { name: '⏰ Ausente', value: `${timeAgo}`, inline: false }
                        )
                        .setColor('#facc15')
                        .setTimestamp();

                    await message.reply({ embeds: [afkEmbed] }).then(msg => {
                        setTimeout(() => msg.delete().catch(() => {}), 7000);
                    }).catch(() => {});
                }
            });
        }

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

        // --- COMANDO AFK ---
        if (commandName === 'afk') {
            const reason = args.join(' ') || 'Ausente';
            afkMap.set(authorId, {
                reason: reason,
                timestamp: Date.now()
            });

            const afkSuccessEmbed = new EmbedBuilder()
                .setDescription(`💤 ${message.author}, você agora está **AFK**!\n📝 **Motivo:** \`${reason}\``)
                .setColor('#facc15');

            return await message.reply({ embeds: [afkSuccessEmbed] });
        }

        // --- COMANDO AVATAR / AV ---
        if (commandName === 'avatar' || commandName === 'av') {
            const target = message.mentions.users.first() || message.author;
            const avatarUrl = target.displayAvatarURL({ dynamic: true, size: 4096 });

            const embed = new EmbedBuilder()
                .setTitle(`🖼️ Avatar de ${target.username}`)
                .setImage(avatarUrl)
                .setColor('#38bdf8')
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('🔗 Link Direto')
                        .setStyle(ButtonStyle.Link)
                        .setURL(avatarUrl)
                );

            return await message.reply({ embeds: [embed], components: [row] });
        }

        // --- COMANDO USERINFO / USUARIO ---
        if (commandName === 'userinfo' || commandName === 'usuario' || commandName === 'user') {
            const member = message.mentions.members.first() || message.member;
            const targetUser = member.user;

            const roles = member.roles.cache
                .filter(r => r.id !== message.guild.id)
                .sort((a, b) => b.position - a.position)
                .map(r => r)
                .slice(0, 10);

            const rolesDisplay = roles.length > 0 ? roles.join(', ') : 'Nenhum cargo';

            const embed = new EmbedBuilder()
                .setTitle(`👤 Informações de ${targetUser.username}`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 1024 }))
                .setColor('#38bdf8')
                .addFields(
                    { name: '🏷️ Tag / Nome', value: `${targetUser.tag}`, inline: true },
                    { name: '🆔 ID do Usuário', value: `\`${targetUser.id}\``, inline: true },
                    { name: '🤖 É Bot?', value: targetUser.bot ? 'Sim 🤖' : 'Não 👤', inline: true },
                    { name: '📅 Conta Criada', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`, inline: true },
                    { name: '📥 Entrou no Servidor', value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Desconhecido', inline: true },
                    { name: `🛡️ Cargos [${member.roles.cache.size - 1}]`, value: rolesDisplay, inline: false }
                )
                .setTimestamp();

            return await message.reply({ embeds: [embed] });
        }

        // --- COMANDO SERVERINFO / SERVIDOR ---
        if (commandName === 'serverinfo' || commandName === 'servidor' || commandName === 'server') {
            const guild = message.guild;
            const owner = await guild.fetchOwner();

            const embed = new EmbedBuilder()
                .setTitle(`🏠 Informações do Servidor: ${guild.name}`)
                .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }))
                .setColor('#ec4899')
                .addFields(
                    { name: '👑 Dono(a)', value: `${owner.user.tag}`, inline: true },
                    { name: '🆔 ID do Servidor', value: `\`${guild.id}\``, inline: true },
                    { name: '📅 Criação', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                    { name: '👥 Membros', value: `${guild.memberCount} membros`, inline: true },
                    { name: '💬 Canais', value: `${guild.channels.cache.size} canais`, inline: true },
                    { name: '🚀 Nível de Boost', value: `Nível ${guild.premiumTier} (${guild.premiumSubscriptionCount} boosts)`, inline: true }
                )
                .setTimestamp();

            if (guild.bannerURL()) {
                embed.setImage(guild.bannerURL({ size: 1024 }));
            }

            return await message.reply({ embeds: [embed] });
        }

        // 💕 COMANDO DE PREFIXO: CARINHO (RESPOSTA RÁPIDA & CICLO DE AFETO)
        if (commandName === 'carinho' || commandName === 'abraco' || commandName === 'hug') {
            const target = message.mentions.users.first();
            const author = message.author;

            if (!target) {
                return await message.reply(`❌ Você precisa marcar alguém para dar carinho! Exemplo: \`${prefix}carinho @usuario\``);
            }

            if (target.id === author.id) {
                return await message.reply('❌ Você não pode dar carinho em si mesmo, mas tome um abraço virtual! 🫂');
            }

            try {
                let gifUrl = '';
                try {
                    const category = CARINHO_CATEGORIES[Math.floor(Math.random() * CARINHO_CATEGORIES.length)];
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

                const randomText = CARINHO_TEXTS[Math.floor(Math.random() * CARINHO_TEXTS.length)];
                const isBotTarget = target.id === message.client.user.id;

                const embed = new EmbedBuilder()
                    .setDescription(`💖 **${target}** ${randomText}\n\n*(Carinho enviado por ${author})*`)
                    .setImage(gifUrl)
                    .setColor('#ec4899');

                const uniqueId = `carinho_initial_${Date.now()}`;
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(uniqueId)
                            .setLabel('💖 Retribuir Carinho')
                            .setStyle(ButtonStyle.Success)
                    );

                const sentMessage = await message.reply({ content: `${target} ${author}`, embeds: [embed], components: [row] });

                if (isBotTarget) {
                    setTimeout(async () => {
                        try {
                            const disabledRow = new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId(uniqueId)
                                        .setLabel('💖 Carinho Retribuído pelo Aeternus')
                                        .setStyle(ButtonStyle.Secondary)
                                        .setDisabled(true)
                                );
                            await sentMessage.edit({ components: [disabledRow] }).catch(() => {});

                            await sendCarinhoMessage(message.client, message.channel, target, author, sentMessage);
                        } catch (e) {
                            console.error('Erro no revide rápido de carinho do bot:', e);
                        }
                    }, 1000);
                    return;
                }

                const collector = sentMessage.createMessageComponentCollector({ time: 300000 });

                collector.on('collect', async i => {
                    if (i.user.id !== target.id) {
                        return await i.reply({ content: '❌ Apenas quem recebeu o carinho pode retribuí-lo!', flags: [MessageFlags.Ephemeral] });
                    }

                    collector.stop();

                    const disabledRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(uniqueId)
                                .setLabel('💖 Carinho Retribuído')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(true)
                        );
                    await i.update({ components: [disabledRow] }).catch(() => {});

                    await sendCarinhoMessage(message.client, message.channel, target, author, sentMessage);
                });

                collector.on('end', async collected => {
                    if (collected.size === 0) {
                        try {
                            const expiredRow = new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId(uniqueId)
                                        .setLabel('💖 Tempo Esgotado')
                                        .setStyle(ButtonStyle.Secondary)
                                        .setDisabled(true)
                                );
                            await sentMessage.edit({ components: [expiredRow] }).catch(() => {});
                        } catch (e) {}
                    }
                });

            } catch (err) {
                console.error('Erro no comando carinho:', err);
                await message.reply('❌ Ocorreu um erro ao executar o comando.');
            }
            return;
        }

        // ⚔️ COMANDO DE PREFIXO: CASTIGAR (CICLO INFINITO & MARCAÇÃO DUPLA)
        if (commandName === 'castigar') {
            const target = message.mentions.users.first();
            const author = message.author;

            if (!target) {
                return await message.reply(`❌ Você precisa marcar alguém para castigar! Exemplo: \`${prefix}castigar @usuario\``);
            }

            if (target.id === author.id) {
                return await message.reply('❌ Você não pode castigar a si mesmo!');
            }

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
                const isBotTarget = target.id === message.client.user.id;

                const embed = new EmbedBuilder()
                    .setDescription(`⚠️ **${target}** ${randomText}\n\n*(Castigo enviado por ${author})*`)
                    .setImage(gifUrl)
                    .setColor('#ec4899');

                const uniqueId = `punish_initial_${Date.now()}`;
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(uniqueId)
                            .setLabel('🔄 Devolver Castigo')
                            .setStyle(ButtonStyle.Danger)
                    );

                const sentMessage = await message.reply({ content: `${target} ${author}`, embeds: [embed], components: [row] });

                if (isBotTarget) {
                    setTimeout(async () => {
                        try {
                            const disabledRow = new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId(uniqueId)
                                        .setLabel('🔄 Castigo Devolvido pelo Aeternus')
                                        .setStyle(ButtonStyle.Secondary)
                                        .setDisabled(true)
                                );
                            await sentMessage.edit({ components: [disabledRow] }).catch(() => {});

                            await sendPunishMessage(message.client, message.channel, target, author, sentMessage);
                        } catch (e) {
                            console.error('Erro no revide inicial do bot:', e);
                        }
                    }, 1500);
                    return;
                }

                const collector = sentMessage.createMessageComponentCollector({ time: 300000 });

                collector.on('collect', async i => {
                    if (i.user.id !== target.id) {
                        return await i.reply({ content: '❌ Apenas a pessoa que recebeu o castigo pode devolvê-lo!', flags: [MessageFlags.Ephemeral] });
                    }

                    collector.stop();

                    const disabledRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(uniqueId)
                                .setLabel('🔄 Castigo Devolvido')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(true)
                        );
                    await i.update({ components: [disabledRow] }).catch(() => {});

                    await sendPunishMessage(message.client, message.channel, target, author, sentMessage);
                });

                collector.on('end', async collected => {
                    if (collected.size === 0) {
                        try {
                            const expiredRow = new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId(uniqueId)
                                        .setLabel('🔄 Tempo Esgotado')
                                        .setStyle(ButtonStyle.Secondary)
                                        .setDisabled(true)
                                );
                            await sentMessage.edit({ components: [expiredRow] }).catch(() => {});
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
                    { name: '💤 Sistema', value: `\`${prefix}afk [motivo]\` (Fica ausente e avisa quem te marcar - mensagens somem em 7s)` },
                    { name: '🖼️ Utilidades', value: `\`${prefix}avatar\` / \`${prefix}av\` [@usuario]\n\`${prefix}usuario\` / \`${prefix}userinfo\` [@usuario]\n\`${prefix}servidor\` / \`${prefix}serverinfo\`` },
                    { name: '💖 Interações', value: `\`${prefix}carinho @usuario\` (Ciclo rápido e fofo de carinho mutuo!)` },
                    { name: '⚔️ Divertidos', value: `\`${prefix}castigar @usuario\` (Ciclo infinito marcando ambos os envolvidos!)` },
                    { name: '⚙️ Prefixo', value: `\`${prefix}prefixo <novo>\`` }
                )
                .setColor('#38bdf8');
            return await message.channel.send({ embeds: [embed] });
        }
    }
};
