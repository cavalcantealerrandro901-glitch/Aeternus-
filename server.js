const express = require('express');
const path = require('path');
const fs = require('fs');
const { ChannelType, EmbedBuilder } = require('discord.js');

function startServer(client) {
    const app = express();
    app.use(express.json());
    app.use(express.static(path.join(__dirname, 'public')));

    // Rota para entregar a interface web do painel
    app.get(['/dashboard', '/dashboard/*splat'], (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
    });

    // Rota para salvar configurações enviadas pelo painel
    app.post('/api/set-setting', (req, res) => {
        try {
            const { guildId, key, value } = req.body;
            if (!guildId || !key) {
                return res.status(400).json({ error: 'guildId e key são obrigatórios.' });
            }

            const filePath = path.join(__dirname, 'settings.json');
            let allSettings = {};

            if (fs.existsSync(filePath)) {
                try {
                    allSettings = JSON.parse(fs.readFileSync(filePath, 'utf8') || '{}');
                } catch (e) {
                    allSettings = {};
                }
            }

            if (!allSettings[guildId]) allSettings[guildId] = {};
            allSettings[guildId][key] = value;

            fs.writeFileSync(filePath, JSON.stringify(allSettings, null, 2), 'utf8');
            return res.json({ success: true, settings: allSettings[guildId] });
        } catch (error) {
            console.error('Erro ao salvar configuração:', error);
            return res.status(500).json({ error: 'Erro ao salvar configurações.' });
        }
    });

    // Rota para buscar configurações já salvas
    app.get('/api/settings/:guildId', (req, res) => {
        try {
            const { guildId } = req.params;
            const filePath = path.join(__dirname, 'settings.json');
            if (!fs.existsSync(filePath)) return res.json({});

            const allSettings = JSON.parse(fs.readFileSync(filePath, 'utf8') || '{}');
            return res.json(allSettings[guildId] || {});
        } catch (error) {
            console.error('Erro ao ler configurações:', error);
            return res.status(500).json({ error: 'Erro ao ler configurações.' });
        }
    });

    // --- ROTA DO BOTÃO DE TESTE DE BOAS-VINDAS ---
    app.post('/api/test-welcome', async (req, res) => {
        try {
            const { guildId } = req.body;
            if (!guildId) return res.status(400).json({ error: 'guildId é obrigatório.' });

            const guild = client.guilds.cache.get(guildId);
            if (!guild) return res.status(404).json({ error: 'Servidor não encontrado no bot.' });

            const filePath = path.join(__dirname, 'settings.json');
            if (!fs.existsSync(filePath)) {
                return res.status(400).json({ error: 'Nenhuma configuração encontrada. Salve o canal primeiro.' });
            }

            const allSettings = JSON.parse(fs.readFileSync(filePath, 'utf8') || '{}');
            const settings = allSettings[guildId] || {};

            if (!settings.welcomeChannel) {
                return res.status(400).json({ error: 'Selecione e salve um canal de boas-vindas antes de testar!' });
            }

            const channel = guild.channels.cache.get(settings.welcomeChannel);
            if (!channel) {
                return res.status(404).json({ error: 'O canal de boas-vindas configurado não existe no servidor.' });
            }

            const testUser = client.user;
            const replaceVars = (str) => {
                if (!str) return '';
                return str
                    .replace(/{user}/g, `<@${testUser.id}>`)
                    .replace(/{username}/g, testUser.username)
                    .replace(/{userTag}/g, testUser.tag || testUser.username)
                    .replace(/{userId}/g, testUser.id)
                    .replace(/{server}/g, guild.name)
                    .replace(/{memberCount}/g, guild.memberCount.toString());
            };

            const title = replaceVars(settings.welcomeTitle || '👋 Seja muito bem-vindo(a)!') + ' 🧪 [TESTE]';
            const description = replaceVars(
                settings.welcomeMessage || 
                'Olá {user}, seja bem-vindo(a) ao **{server}**!\nAtualmente somos **{memberCount}** membros.'
            );
            const color = settings.welcomeColor || '#5865F2';
            const footerText = replaceVars(settings.welcomeFooter || 'Membro #{memberCount}') + ' • Teste do Painel';

            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(description)
                .setColor(color)
                .setThumbnail(testUser.displayAvatarURL({ dynamic: true, size: 512 }))
                .setFooter({ text: footerText, iconURL: guild.iconURL({ dynamic: true }) })
                .setTimestamp();

            if (settings.welcomeImage) {
                embed.setImage(settings.welcomeImage);
            } else if (settings.welcomeCardEnabled) {
                const avatarUrl = encodeURIComponent(testUser.displayAvatarURL({ extension: 'png', size: 512 }));
                const username = encodeURIComponent(testUser.username);
                const guildName = encodeURIComponent(guild.name);
                const memberCount = guild.memberCount;
                const cardUrl = `https://api.popcat.xyz/welcomecard?background=https://i.imgur.com/3Z4M0yG.png&text1=${username}&text2=Bem-vindo+ao+${guildName}&text3=Membro+%23${memberCount}&avatar=${avatarUrl}`;
                embed.setImage(cardUrl);
            }

            await channel.send({
                content: settings.welcomePing ? `🧪 **[MENSAGEM DE TESTE]** ${testUser}` : '🧪 **[MENSAGEM DE TESTE]**',
                embeds: [embed]
            });

            return res.json({ success: true, message: ' Mensagem de teste enviada com sucesso no canal!' });

        } catch (error) {
            console.error('Erro ao enviar teste de boas-vindas:', error);
            return res.status(500).json({ error: 'Falha ao enviar mensagem: ' + error.message });
        }
    });

    // Rota da API com busca completa no Discord
    app.get('/api/guild-data/:guildId', async (req, res) => {
        try {
            const guild = client.guilds.cache.get(req.params.guildId);
            if (!guild) {
                return res.status(404).json({ error: 'Servidor não encontrado no bot.' });
            }

            await Promise.all([
                guild.channels.fetch().catch(() => {}),
                guild.roles.fetch().catch(() => {}),
                guild.emojis.fetch().catch(() => {}),
                guild.stickers.fetch().catch(() => {})
            ]);

            const categoriesMap = new Map();
            categoriesMap.set('uncategorized', {
                id: 'uncategorized',
                name: 'Sem Categoria',
                channels: []
            });

            guild.channels.cache.forEach(ch => {
                if (ch.type === ChannelType.GuildCategory) {
                    categoriesMap.set(ch.id, {
                        id: ch.id,
                        name: ch.name,
                        position: ch.position,
                        channels: []
                    });
                }
            });

            const allChannels = [];
            guild.channels.cache.forEach(ch => {
                if (ch.type === ChannelType.GuildCategory) return;

                const channelInfo = {
                    id: ch.id,
                    name: ch.name,
                    type: ch.type,
                    typeLabel: ChannelType[ch.type] || 'Outro',
                    parentId: ch.parentId || null,
                    position: ch.position
                };

                allChannels.push(channelInfo);

                const parentId = ch.parentId || 'uncategorized';
                if (categoriesMap.has(parentId)) {
                    categoriesMap.get(parentId).channels.push(channelInfo);
                } else {
                    categoriesMap.get('uncategorized').channels.push(channelInfo);
                }
            });

            const roles = guild.roles.cache
                .map(r => ({
                    id: r.id,
                    name: r.name,
                    color: r.hexColor,
                    position: r.position,
                    hoist: r.hoist,
                    managed: r.managed
                }))
                .sort((a, b) => b.position - a.position);

            const emojis = guild.emojis.cache.map(e => ({ id: e.id, name: e.name, animated: e.animated }));
            const stickers = guild.stickers.cache.map(s => ({ id: s.id, name: s.name }));

            res.json({
                id: guild.id,
                name: guild.name,
                icon: guild.iconURL({ dynamic: true, size: 512 }),
                banner: guild.bannerURL({ size: 1024 }),
                splash: guild.splashURL({ size: 1024 }),
                description: guild.description || 'Sem descrição',
                ownerId: guild.ownerId,
                createdAt: guild.createdAt,
                memberCount: guild.memberCount,
                roleCount: guild.roles.cache.size,
                channelCount: guild.channels.cache.size,
                boostCount: guild.premiumSubscriptionCount || 0,
                boostTier: guild.premiumTier,
                features: guild.features,
                categories: Array.from(categoriesMap.values()).filter(cat => cat.channels.length > 0),
                allChannels,
                roles,
                emojis,
                stickers
            });

        } catch (error) {
            console.error('Erro ao coletar dados do servidor:', error);
            res.status(500).json({ error: 'Erro ao consultar a API do Discord.' });
        }
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🌐 Painel Web rodando na porta ${PORT}`);
    });
}

module.exports = startServer;
module.exports.startServer = startServer;
