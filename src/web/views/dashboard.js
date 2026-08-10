module.exports = ({ user, manageableGuilds, botName, botAvatarUrl, userAvatarUrl }) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard — Aeternus</title>
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <nav class="navbar">
        <div class="container">
            <div class="logo">Aeternus</div>
            <div class="nav-links">
                <a href="/" class="btn btn-outline">Início</a>
                <a href="/logout" class="btn btn-outline">Sair</a>
            </div>
        </div>
    </nav>

    <div class="container">
        <div class="dashboard-header">
            <div class="user-info">
                <img src="${userAvatarUrl}" alt="Avatar" class="avatar">
                <div>
                    <div style="font-weight:600;font-size:1.1rem;">${user.global_name || user.username}</div>
                    <div style="color:var(--text-muted);font-size:0.9rem;">@${user.username}</div>
                </div>
            </div>
        </div>

        <h2 style="margin-bottom:20px;font-size:1.4rem;">Seus Servidores</h2>

        ${manageableGuilds.length === 0 ? `
            <div class="card" style="text-align:center;padding:40px;">
                <p style="color:var(--text-muted);margin-bottom:16px;">Você não tem nenhum servidor gerenciável com o bot.</p>
                <a href="https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&scope=bot%20applications.commands&permissions=8" class="btn btn-primary" target="_blank">Adicionar Bot</a>
            </div>
        ` : `
            <div class="grid">
                ${manageableGuilds.map(g => `
                    <a href="/dashboard/${g.id}" class="card guild-card">
                        <div class="guild-icon">
                            ${g.icon 
                                ? `<img src="https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png" style="width:100%;height:100%;border-radius:14px;">`
                                : g.name.charAt(0)
                            }
                        </div>
                        <div style="font-weight:600;font-size:1.05rem;">${g.name}</div>
                        <div style="color:var(--text-muted);font-size:0.85rem;margin-top:4px;">Clique para configurar</div>
                    </a>
                `).join('')}
            </div>
        `}
    </div>

    <footer>
        <div class="container">© ${new Date().getFullYear()} Aeternus</div>
    </footer>
</body>
</html>
`;
