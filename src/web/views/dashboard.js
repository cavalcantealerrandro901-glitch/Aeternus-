module.exports = (user, manageableGuilds, botUser) => {
    const botAvatarUrl = botUser ? botUser.displayAvatarURL({ extension: 'png', size: 128 }) : 'https://cdn.discordapp.com/embed/avatars/0.png';
    const userAvatarUrl = user?.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png';
    const botName = botUser ? botUser.username : 'Aeternus';

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Selecione um Servidor - ${botName}</title>
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
            position: sticky;
            top: 0;
            z-index: 100;
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
        main {
            flex: 1;
            max-width: 1100px;
            width: 100%;
            margin: 0 auto;
            padding: 40px 20px;
        }
        .page-header {
            text-align: center;
            margin-bottom: 40px;
        }
        .page-header h1 {
            font-size: 2.2rem;
            font-weight: 800;
            margin-bottom: 10px;
            background: linear-gradient(135deg, #ffffff 30%, #38bdf8 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .page-header p {
            color: #94a3b8;
            font-size: 1.1rem;
        }
        .servers-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 24px;
        }
        .card-server {
            background: rgba(15, 23, 42, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 18px;
            padding: 24px;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
            backdrop-filter: blur(8px);
        }
        .card-server:hover {
            transform: translateY(-5px);
            border-color: #38bdf8;
            box-shadow: 0 12px 30px rgba(56, 189, 248, 0.25);
            background: rgba(15, 23, 42, 0.9);
        }
        .server-icon-large {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: #1e293b;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            font-weight: 800;
            color: #38bdf8;
            margin-bottom: 16px;
            border: 3px solid rgba(56, 189, 248, 0.3);
            object-fit: cover;
            box-shadow: 0 4px 14px rgba(0,0,0,0.4);
        }
        .server-name {
            font-size: 1.2rem;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 6px;
            word-break: break-word;
        }
        .server-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(34, 197, 94, 0.15);
            color: #4ade80;
            border: 1px solid rgba(34, 197, 94, 0.3);
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
            margin-bottom: 20px;
        }
        .btn-select {
            width: 100%;
            background: linear-gradient(135deg, #38bdf8, #2563eb);
            color: #ffffff;
            padding: 12px;
            border-radius: 12px;
            text-decoration: none;
            font-weight: 700;
            font-size: 0.95rem;
            transition: all 0.2s;
            display: inline-block;
            box-shadow: 0 4px 12px rgba(56, 189, 248, 0.3);
        }
        .btn-select:hover {
            opacity: 0.95;
            box-shadow: 0 6px 18px rgba(56, 189, 248, 0.45);
        }
        .no-servers {
            grid-column: 1 / -1;
            background: rgba(15, 23, 42, 0.6);
            border: 1px dashed rgba(255, 255, 255, 0.15);
            border-radius: 18px;
            padding: 48px 24px;
            text-align: center;
        }
        .no-servers h3 {
            font-size: 1.4rem;
            margin-bottom: 12px;
            color: #f1f5f9;
        }
        .no-servers p {
            color: #94a3b8;
            max-width: 500px;
            margin: 0 auto 24px auto;
            line-height: 1.6;
        }
        .back-home {
            display: inline-block;
            margin-top: 36px;
            color: #64748b;
            text-decoration: none;
            font-weight: 600;
            transition: color 0.2s;
        }
        .back-home:hover { color: #38bdf8; }
        @media (max-width: 640px) {
            main { padding: 24px 16px; }
            .page-header h1 { font-size: 1.75rem; }
            .servers-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <header>
        <a href="/" class="brand">
            <img src="${botAvatarUrl}" alt="${botName}">
            <span>${botName}</span>
        </a>
        <div class="user-profile">
            <img src="${userAvatarUrl}" alt="${user.username}">
            <span>${user.username}</span>
        </div>
    </header>

    <main>
        <div class="page-header">
            <h1>Selecione um Servidor</h1>
            <p>Escolha o servidor que deseja configurar agora no painel do ${botName}</p>
        </div>

        <div class="servers-grid">
            ${manageableGuilds.length > 0 ? manageableGuilds.map(g => {
                const iconUrl = g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null;
                return `
                    <div class="card-server">
                        ${iconUrl 
                            ? `<img src="${iconUrl}" class="server-icon-large" alt="${g.name}">` 
                            : `<div class="server-icon-large">${g.name.charAt(0)}</div>`}
                        <div class="server-name">${g.name}</div>
                        <div class="server-badge">🟢 Bot Online & Presente</div>
                        <a href="/dashboard/${g.id}" class="btn-select">⚙️ Configurar Servidor</a>
                    </div>
                `;
            }).join('') : `
                <div class="no-servers">
                    <h3>Nenhum servidor encontrado</h3>
                    <p>Não encontramos nenhum servidor onde você seja <strong>Administrador</strong> e que o bot <strong>${botName}</strong> já esteja adicionado.</p>
                    <a href="/" class="btn-select" style="max-width: 250px; display: inline-block;">➕ Adicionar Bot a um Servidor</a>
                </div>
            `}
        </div>

        <div style="text-align: center;">
            <a href="/" class="back-home">← Voltar para a Página Inicial</a>
        </div>
    </main>
</body>
</html>
    `;
};
