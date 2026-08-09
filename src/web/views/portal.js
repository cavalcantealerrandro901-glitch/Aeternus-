module.exports = (guild, manageableGuilds, user, botUser) => {
    const botAvatarUrl = botUser ? botUser.displayAvatarURL({ extension: 'png', size: 128 }) : 'https://cdn.discordapp.com/embed/avatars/0.png';
    const userAvatarUrl = user?.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png';
    const guildIconUrl = guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null;

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gerenciar ${guild.name} - Aeternus</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background: #090d16;
            color: #f1f5f9;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }
        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 5%;
            background: rgba(15, 23, 42, 0.8);
            backdrop-filter: blur(12px);
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .brand {
            display: flex;
            align-items: center;
            gap: 12px;
            text-decoration: none;
            color: #fff;
            font-weight: 800;
            font-size: 1.2rem;
        }
        .brand img {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border: 2px solid #38bdf8;
        }
        .user-profile {
            display: flex;
            align-items: center;
            gap: 10px;
            background: rgba(255, 255, 255, 0.05);
            padding: 6px 14px;
            border-radius: 30px;
            border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .user-profile img {
            width: 28px;
            height: 28px;
            border-radius: 50%;
        }
        .layout {
            display: flex;
            flex: 1;
        }
        aside {
            width: 280px;
            background: rgba(15, 23, 42, 0.5);
            border-right: 1px solid rgba(255, 255, 255, 0.06);
            padding: 24px 16px;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }
        .sidebar-title {
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #64748b;
            margin-bottom: 8px;
            padding-left: 8px;
        }
        .server-list {
            list-style: none;
            display: flex;
            flex-direction: column;
            gap: 8px;
            overflow-y: auto;
        }
        .server-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 14px;
            border-radius: 10px;
            text-decoration: none;
            color: #cbd5e1;
            font-weight: 500;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid transparent;
            transition: all 0.2s;
        }
        .server-item:hover, .server-item.active {
            background: rgba(56, 189, 248, 0.15);
            color: #38bdf8;
            border-color: rgba(56, 189, 248, 0.4);
        }
        .server-icon {
            width: 34px;
            height: 34px;
            border-radius: 50%;
            background: #334155;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: #fff;
            object-fit: cover;
        }
        main {
            flex: 1;
            padding: 36px 5%;
            overflow-y: auto;
        }
        .guild-header {
            display: flex;
            align-items: center;
            gap: 20px;
            margin-bottom: 30px;
            background: rgba(15, 23, 42, 0.6);
            padding: 24px;
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .guild-header-icon {
            width: 70px;
            height: 70px;
            border-radius: 16px;
            object-fit: cover;
            background: #334155;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.8rem;
            font-weight: bold;
        }
        .guild-header h1 {
            font-size: 1.8rem;
            margin-bottom: 6px;
            background: linear-gradient(90deg, #38bdf8, #c084fc);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .guild-header p {
            color: #94a3b8;
            font-size: 0.95rem;
        }
        .portal-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
        }
        .card {
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.08);
            padding: 24px;
            border-radius: 14px;
            transition: all 0.25s;
        }
        .card:hover {
            border-color: rgba(56, 189, 248, 0.4);
            transform: translateY(-2px);
        }
        .card h3 {
            color: #38bdf8;
            font-size: 1.15rem;
            margin-bottom: 8px;
        }
        .card p {
            color: #94a3b8;
            font-size: 0.92rem;
            line-height: 1.5;
            margin-bottom: 20px;
        }
        .btn-action {
            display: inline-block;
            background: #38bdf8;
            color: #090d16;
            padding: 10px 20px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 700;
            font-size: 0.9rem;
            transition: background 0.2s;
        }
        .btn-action:hover {
            background: #7dd3fc;
        }
        .back-link {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 20px;
            color: #94a3b8;
            text-decoration: none;
            font-weight: 500;
        }
        .back-link:hover { color: #f1f5f9; }
        @media (max-width: 768px) {
            .layout { flex-direction: column; }
            aside { width: 100%; border-right: none; border-bottom: 1px solid rgba(255,255,255,0.06); }
            main { padding: 24px 16px; }
            .guild-header { flex-direction: column; text-align: center; }
        }
    </style>
</head>
<body>
    <header>
        <a href="/" class="brand">
            <img src="${botAvatarUrl}" alt="Bot">
            <span>Aeternus</span>
        </a>
        <div class="user-profile">
            <img src="${userAvatarUrl}" alt="${user.username}">
            <span>${user.username}</span>
        </div>
    </header>

    <div class="layout">
        <aside>
            <div class="sidebar-title">Servidores</div>
            <ul class="server-list">
                ${manageableGuilds.map(g => {
                    const iconUrl = g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null;
                    const isActive = g.id === guild.id;
                    return `
                        <a href="/dashboard/${g.id}" class="server-item ${isActive ? 'active' : ''}">
                            ${iconUrl ? `<img src="${iconUrl}" class="server-icon" alt="Icon">` : `<div class="server-icon">${g.name.charAt(0)}</div>`}
                            <span>${g.name}</span>
                        </a>
                    `;
                }).join('')}
            </ul>
        </aside>

        <main>
            <a href="/dashboard" class="back-link">← Voltar para Visão Geral</a>

            <div class="guild-header">
                ${guildIconUrl ? `<img src="${guildIconUrl}" class="guild-header-icon" alt="Guild Icon">` : `<div class="guild-header-icon">${guild.name.charAt(0)}</div>`}
                <div>
                    <h1>${guild.name}</h1>
                    <p>Painel de gerenciamento exclusivo para este servidor.</p>
                </div>
            </div>

            <div class="portal-grid">
                <div class="card">
                    <h3>💬 Comandos & Respostas</h3>
                    <p>Configure respostas automáticas, prefixos e comandos personalizados.</p>
                    <a href="#" class="btn-action">Configurar</a>
                </div>
                <div class="card">
                    <h3>👋 Mensagens de Boas-Vindas</h3>
                    <p>Personalize canal, imagem de fundo e textos de recepção para novos membros.</p>
                    <a href="#" class="btn-action">Configurar</a>
                </div>
                <div class="card">
                    <h3>🛡️ Sistema de Moderação</h3>
                    <p>Defina filtros anti-spam, logs de auditoria e cargos com privilégio de acesso.</p>
                    <a href="#" class="btn-action">Configurar</a>
                </div>
            </div>
        </main>
    </div>
</body>
</html>
    `;
};
