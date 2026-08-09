module.exports = (user, manageableGuilds, botUser) => {
    const botAvatarUrl = botUser ? botUser.displayAvatarURL({ extension: 'png', size: 128 }) : 'https://cdn.discordapp.com/embed/avatars/0.png';
    const userAvatarUrl = user?.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png';

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Painel de Controle - Aeternus</title>
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
        .user-profile span {
            font-size: 0.9rem;
            font-weight: 600;
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
        .server-item:hover {
            background: rgba(56, 189, 248, 0.1);
            color: #38bdf8;
            border-color: rgba(56, 189, 248, 0.3);
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
        .welcome-card {
            background: linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8));
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            padding: 32px;
            margin-bottom: 30px;
        }
        .welcome-card h1 {
            font-size: 2rem;
            margin-bottom: 12px;
            background: linear-gradient(90deg, #38bdf8, #c084fc);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .welcome-card p {
            color: #94a3b8;
            line-height: 1.6;
            font-size: 1.05rem;
        }
        .servers-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .card-server {
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 14px;
            padding: 20px;
            display: flex;
            align-items: center;
            gap: 16px;
            text-decoration: none;
            color: #fff;
            transition: all 0.25s;
        }
        .card-server:hover {
            transform: translateY(-3px);
            border-color: #38bdf8;
            box-shadow: 0 6px 20px rgba(56, 189, 248, 0.2);
        }
        .card-server-info h3 {
            font-size: 1.05rem;
            margin-bottom: 4px;
        }
        .card-server-info span {
            font-size: 0.85rem;
            color: #38bdf8;
        }
        .back-home {
            display: inline-block;
            margin-top: 24px;
            color: #94a3b8;
            text-decoration: none;
            font-weight: 500;
        }
        .back-home:hover { color: #f1f5f9; }
        @media (max-width: 768px) {
            .layout { flex-direction: column; }
            aside { width: 100%; border-right: none; border-bottom: 1px solid rgba(255,255,255,0.06); }
            main { padding: 24px 16px; }
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
            <div class="sidebar-title">Seus Servidores</div>
            <ul class="server-list">
                ${manageableGuilds.length > 0 ? manageableGuilds.map(g => {
                    const iconUrl = g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null;
                    return `
                        <a href="/dashboard/${g.id}" class="server-item">
                            ${iconUrl ? `<img src="${iconUrl}" class="server-icon" alt="Icon">` : `<div class="server-icon">${g.name.charAt(0)}</div>`}
                            <span>${g.name}</span>
                        </a>
                    `;
                }).join('') : `<p style="color: #64748b; font-size: 0.9rem; padding: 8px;">Nenhum servidor gerenciável encontrado.</p>`}
            </ul>
        </aside>

        <main>
            <div class="welcome-card">
                <h1>Olá, ${user.username}! 👋</h1>
                <p>Seja bem-vindo ao seu painel principal. Selecione um servidor ao lado para personalizar módulos, permissões e mensagens do bot.</p>
            </div>

            <h2 style="font-size: 1.3rem; margin-bottom: 16px;">Servidores Disponíveis</h2>
            <div class="servers-grid">
                ${manageableGuilds.length > 0 ? manageableGuilds.map(g => {
                    const iconUrl = g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null;
                    return `
                        <a href="/dashboard/${g.id}" class="card-server">
                            ${iconUrl ? `<img src="${iconUrl}" class="server-icon" style="width: 48px; height: 48px;" alt="Icon">` : `<div class="server-icon" style="width: 48px; height: 48px; font-size: 1.2rem;">${g.name.charAt(0)}</div>`}
                            <div class="card-server-info">
                                <h3>${g.name}</h3>
                                <span>⚙️ Gerenciar →</span>
                            </div>
                        </a>
                    `;
                }).join('') : `<p style="color: #94a3b8;">Nenhum servidor com permissão e com o bot presente foi encontrado.</p>`}
            </div>

            <a href="/" class="back-home">← Voltar para a Página Inicial</a>
        </main>
    </div>
</body>
</html>
    `;
};
