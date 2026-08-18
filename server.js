const express = require('express');
const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const DATA_FILE = path.join(__dirname, 'onboarding_config.json');

function loadConfig() {
    if (!fs.existsSync(DATA_FILE)) {
        return {
            title: "Bem-vindo ao servidor, {user}!",
            image: "https://cdn.discordapp.com/embed/avatars/0.png",
            channelId: "",
            rules: "1. Respeite todos os membros.\n2. Sem spam ou flood.",
            steps: [],
            missions: ["Leia as regras"]
        };
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveConfig(config) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(config, null, 2));
}

function parseVariables(text, member) {
    if (!text) return "";
    return text
        .replace(/{user}/g, `<@${member.id}>`)
        .replace(/{username}/g, member.user.username)
        .replace(/{server}/g, member.guild.name)
        .replace(/{membercount}/g, member.guild.memberCount);
}

async function sendOnboardingMessage(channel, config, targetMember) {
    const embed = new EmbedBuilder()
        .setTitle(parseVariables(config.title, targetMember))
        .setDescription("Clique nos botões e menus abaixo para personalizar sua experiência e liberar o acesso completo ao servidor!")
        .setColor("#38bdf8")
        .setThumbnail(config.image || targetMember.user.displayAvatarURL());

    const rows = [];

    if (config.steps && Array.isArray(config.steps)) {
        config.steps.slice(0, 5).forEach((step, idx) => {
            if (step.options && step.options.length > 0) {
                const select = new StringSelectMenuBuilder()
                    .setCustomId(`onboarding_step_${idx}`)
                    .setPlaceholder(step.placeholder || step.title || "Selecione...")
                    .setMinValues(0)
                    .setMaxValues(step.options.length);

                step.options.forEach(opt => {
                    select.addOptions({
                        label: opt.label,
                        value: opt.roleId || opt.value || `opt_${idx}`
                    });
                });

                rows.push(new ActionRowBuilder().addComponents(select));
            }
        });
    }

    const btnAccept = new ButtonBuilder()
        .setCustomId('onboarding_accept')
        .setLabel('Concordar com os Termos & Entrar')
        .setStyle(ButtonStyle.Success);

    rows.push(new ActionRowBuilder().addComponents(btnAccept));

    await channel.send({ embeds: [embed], components: rows });
}

function startServer(client) {
    let discordClient = client;

    app.get('/api/onboarding', (req, res) => res.json(loadConfig()));

    app.post('/api/onboarding', (req, res) => {
        saveConfig(req.body);
        res.json({ success: true, message: "Configurações salvas com sucesso!" });
    });

    app.get('/auth/discord', (req, res) => {
        const CLIENT_ID = process.env.CLIENT_ID || 'SEU_CLIENT_ID_AQUI';
        const REDIRECT_URI = encodeURIComponent('http://localhost:3000/auth/discord/callback');
        const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=identify%20guilds`;
        res.redirect(discordAuthUrl);
    });

    app.get('/auth/discord/callback', async (req, res) => {
        const code = req.query.code;
        if (!code) return res.status(400).send('Nenhum código de autorização foi fornecido.');

        try {
            const CLIENT_ID = process.env.CLIENT_ID;
            const CLIENT_SECRET = process.env.CLIENT_SECRET;
            const REDIRECT_URI = 'http://localhost:3000/auth/discord/callback';

            const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
                method: 'POST',
                body: new URLSearchParams({
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET,
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: REDIRECT_URI,
                }),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });

            const tokenData = await tokenResponse.json();
            if (!tokenData.access_token) {
                return res.status(400).send('Falha ao autenticar com o Discord. Verifique suas credenciais CLIENT_ID e CLIENT_SECRET no .env.');
            }

            const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
                headers: {
                    authorization: `Bearer ${tokenData.access_token}`,
                },
            });

            const guilds = await guildsResponse.json();

            const adminGuilds = Array.isArray(guilds) ? guilds.filter(guild => {
                const permissions = BigInt(guild.permissions || 0);
                const ADMIN_FLAG = 0x8n;
                return guild.owner || (permissions & ADMIN_FLAG) === ADMIN_FLAG;
            }) : [];

            const serverListHtml = adminGuilds.length > 0 ? adminGuilds.map(guild => {
                const iconUrl = guild.icon 
                    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128` 
                    : 'https://cdn.discordapp.com/embed/avatars/0.png';

                return `
                    <div style="background: #1e293b; padding: 15px 20px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #334155; width: 100%; max-width: 700px; box-sizing: border-box; gap: 15px;">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <img src="${iconUrl}" alt="${guild.name}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid #38bdf8;">
                            <div style="display: flex; flex-direction: column; gap: 4px;">
                                <span style="font-weight: bold; font-size: 18px; color: #f8fafc;">${guild.name}</span>
                                <span style="font-size: 12px; color: #94a3b8; font-family: monospace;">ID: ${guild.id}</span>
                            </div>
                        </div>
                        <a href="/?guildId=${guild.id}" style="background: #38bdf8; color: #0f172a; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; white-space: nowrap;">Configurar</a>
                    </div>
                `;
            }).join('') : '<p style="color: #94a3b8; font-size: 16px;">Nenhum servidor encontrado onde você seja Administrador.</p>';

            res.send(`
                <!DOCTYPE html>
                <html lang="pt-BR">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Selecionar Servidor - Aeternus</title>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; font-family: Arial, sans-serif; }
                        body { background: #0f172a; color: white; min-height: 100vh; display: flex; flex-direction: column; justify-content: space-between; padding: 30px; position: relative; overflow-x: hidden; }
                        .container { width: 100%; max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; flex: 1; z-index: 2; }
                        h2 { color: #38bdf8; margin-bottom: 25px; font-size: 24px; text-align: center; }
                        .server-list { width: 100%; display: flex; flex-direction: column; gap: 15px; align-items: center; overflow-y: auto; max-height: 70vh; padding-right: 5px; }
                        .footer { text-align: center; margin-top: 20px; }
                        .footer a { color: #94a3b8; text-decoration: none; font-size: 15px; font-weight: bold; }
                        .footer a:hover { color: #38bdf8; }
                        
                        /* Efeito de Neve */
                        .snowflake {
                            position: fixed;
                            top: -10px;
                            background: #ffffff;
                            border-radius: 50%;
                            pointer-events: none;
                            animation: fall linear infinite;
                            z-index: 1;
                            opacity: 0.8;
                        }
                        @keyframes fall {
                            to {
                                transform: translateY(105vh);
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h2>🌐 Selecione um Servidor para Configurar</h2>
                        <div class="server-list">
                            ${serverListHtml}
                        </div>
                        <div class="footer">
                            <a href="/">← Voltar ao Início</a>
                        </div>
                    </div>

                    <script>
                        function createSnowflake() {
                            const snow = document.createElement('div');
                            snow.classList.add('snowflake');
                            snow.style.left = Math.random() * window.innerWidth + 'px';
                            const size = Math.random() * 6 + 3 + 'px';
                            snow.style.width = size;
                            snow.style.height = size;
                            snow.style.animationDuration = Math.random() * 3 + 2 + 's';
                            snow.style.opacity = Math.random();
                            document.body.appendChild(snow);

                            setTimeout(() => {
                                snow.remove();
                            }, 5000);
                        }
                        setInterval(createSnowflake, 150);
                    </script>
                </body>
                </html>
            `);
        } catch (err) {
            console.error('Erro no fluxo OAuth2:', err);
            res.status(500).send('Erro interno ao processar a autenticação.');
        }
    });

    app.get('/api/commands', (req, res) => {
        try {
            if (!discordClient) {
                return res.status(500).json({ success: false, error: "Bot não inicializado." });
            }

            const prefixCommands = discordClient.commands && typeof discordClient.commands.values === 'function'
                ? Array.from(discordClient.commands.values()).map(cmd => ({
                    name: cmd.name || "Desconhecido",
                    description: cmd.description || "Comando por prefixo",
                    type: "Prefixo"
                  }))
                : [];

            const slashCommands = discordClient.slashCommands && typeof discordClient.slashCommands.values === 'function'
                ? Array.from(discordClient.slashCommands.values()).map(cmd => ({
                    name: cmd.data?.name || cmd.name || "Desconhecido",
                    description: cmd.data?.description || cmd.description || "Comando Slash",
                    type: "Slash (/)"
                  }))
                : [];

            res.json({
                success: true,
                commands: [...prefixCommands, ...slashCommands]
            });
        } catch (err) {
            console.error("Erro na API de comandos:", err);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    app.post('/api/onboarding/test', async (req, res) => {
        const { guildId, channelId } = req.body;
        try {
            const guild = await discordClient.guilds.fetch(guildId);
            const channel = await guild.channels.fetch(channelId);
            const config = loadConfig();

            await sendOnboardingMessage(channel, config, guild.members.me);
            res.json({ success: true, message: "Mensagem de teste enviada com sucesso!" });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    app.get('/api/bot-info', (req, res) => {
        if (!discordClient || !discordClient.user) {
            return res.json({
                name: "Aeternus",
                avatar: "https://cdn.discordapp.com/embed/avatars/0.png"
            });
        }
        res.json({
            name: discordClient.user.username,
            avatar: discordClient.user.displayAvatarURL({ dynamic: true, size: 256 })
        });
    });

    client.on('guildMemberAdd', async (member) => {
        const config = loadConfig();
        if (!config.channelId) return;
        try {
            const channel = await member.guild.channels.fetch(config.channelId);
            if (channel) {
                await sendOnboardingMessage(channel, config, member);
            }
        } catch (err) {
            console.error("Erro ao enviar boas-vindas:", err);
        }
    });

    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isStringSelectMenu() && !interaction.isButton()) return;

        const { customId } = interaction;
        const config = loadConfig();

        if (customId.startsWith('onboarding_step_')) {
            const selectedRoleIds = interaction.values;
            const member = interaction.member;

            for (const roleId of selectedRoleIds) {
                if (roleId && member.guild.roles.cache.has(roleId)) {
                    await member.roles.add(roleId).catch(() => {});
                }
            }

            await interaction.reply({ content: '✅ Suas preferências de cargos foram atualizadas!', ephemeral: true });
        }

        if (customId === 'onboarding_accept') {
            const rulesEmbed = new EmbedBuilder()
                .setTitle("📜 Regras do Servidor")
                .setDescription(parseVariables(config.rules, interaction.member))
                .setColor("#22c55e");

            let missionsText = (config.missions || []).map((m, i) => `**${i + 1}.** ${m}`).join('\n');

            const missionsEmbed = new EmbedBuilder()
                .setTitle("🎯 Suas Primeiras Missões")
                .setDescription(missionsText || "Aproveite a sua estadia!")
                .setColor("#f59e0b");

            await interaction.reply({
                content: "🎉 **Acesso Liberado!** Seja bem-vindo ao servidor.",
                embeds: [rulesEmbed, missionsEmbed],
                ephemeral: true
            });
        }
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🌐 [PAINEL] Servidor web rodando na porta ${PORT}`));
}

module.exports = { startServer };
