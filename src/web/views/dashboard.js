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
                    <div style="font-weight:600;font-size:1.15rem;">${user.global_name || user.username}</div>
                    <div style="color:var(--text-muted);font-size:0.9rem;">@${user.username}</div>
                </div>
            </div>
        </div>

        <div style="margin-bottom: 28px;">
            <h2 style="font-size:1.4rem;margin-bottom:6px;">Seus Servidores</h2>
            <p style="color:var(--text-muted);font-size:0.95rem;">
                Aqui aparecem apenas os servidores em que você tem permissão de Administrador e o bot Aeternus está presente.
            </p>
        </div>

        ${manageableGuilds.length === 0 ? `
            <div class="card" style="text-align:center;padding:50px 30px;">
                <div style="font-size:2.5rem;margin-bottom:16px;">📭</div>
                <h3 style="margin-bottom:10px;">Nenhum servidor encontrado</h3>
                <p style="color:var(--text-muted);margin-bottom:24px;max-width:400px;margin-left:auto;margin-right:auto;">
                    Você não possui nenhum servidor onde seja administrador e o bot esteja adicionado.
                </p>
                <a href="https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&scope=bot%20applications.commands&permissions=8" 
                   class="btn btn-primary" target="_blank">
                    Adicionar Aeternus a um Servidor
                </a>
            </div>
        ` : `
            <div class="grid">
                ${manageableGuilds.map(g => `
                    <a href="/dashboard/${g.id}" class="card guild-card">
                        <div class="guild-icon">
                            ${g.icon 
                                ? `<img src="https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png" style="width:100%;height:100%;border-radius:14px;object-fit:cover;">`
                                : g.name.charAt(0).toUpperCase()
                            }
                        </div>
                        <div style="font-weight:600;font-size:1.05rem;margin-bottom:4px;">${g.name}</div>
                        <div style="color:var(--text-muted);font-size:0.85rem;">Clique para configurar</div>
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
