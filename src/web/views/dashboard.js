module.exports = ({ user, manageableGuilds, botName, botAvatarUrl, userAvatarUrl, isOwner, canEditor }) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard — Aeternus</title>
    ${botAvatarUrl ? `<link rel="icon" href="${botAvatarUrl}">` : ''}
    <link rel="stylesheet" href="/style.css">
    <style>
        .nav-right { margin-left: auto; display: flex; align-items: center; gap: 12px; position: relative; }
        .user-menu-btn {
            display: flex; align-items: center; gap: 10px;
            background: rgba(255,255,255,0.04); border: 1px solid var(--border, #252536);
            border-radius: 999px; padding: 6px 12px 6px 6px; cursor: pointer; color: var(--text, #eee); font: inherit;
        }
        .user-menu-btn:hover { border-color: #7c3aed; background: rgba(124,58,237,0.12); }
        .user-menu-btn img { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }
        .user-menu-btn .chev { font-size: 0.7rem; opacity: 0.7; }
        .user-dropdown {
            position: absolute; top: calc(100% + 10px); right: 0; min-width: 220px;
            background: #14141f; border: 1px solid #252536; border-radius: 14px; padding: 8px;
            box-shadow: 0 16px 40px rgba(0,0,0,.45); display: none; z-index: 200;
        }
        .user-dropdown.show { display: block; }
        .user-dropdown a {
            display: flex; align-items: center; gap: 10px; width: 100%; padding: 11px 12px;
            color: #e5e5e5; text-decoration: none; border-radius: 10px; font: inherit;
        }
        .user-dropdown a:hover { background: rgba(124,58,237,0.15); color: #c4b5fd; }
        .user-dropdown .sep { height: 1px; background: #252536; margin: 6px 4px; }
        .user-dropdown .muted { padding: 8px 12px 4px; font-size: 0.75rem; color: #888; text-transform: uppercase; }
        .badge-owner { font-size: 0.65rem; background: linear-gradient(90deg,#7c3aed,#a78bfa); color: #fff; padding: 2px 6px; border-radius: 6px; margin-left: auto; }
        .navbar .container { display: flex; align-items: center; width: 100%; }
        .bot-chip { display: flex; align-items: center; gap: 8px; color: #aaa; font-size: 0.85rem; }
        .bot-chip img { width: 28px; height: 28px; border-radius: 50%; }
    </style>
</head>
<body>
    <nav class="navbar">
        <div class="container">
            <div class="logo" style="display:flex;align-items:center;gap:10px;">
                ${botAvatarUrl ? `<img src="${botAvatarUrl}" alt="bot" style="width:32px;height:32px;border-radius:50%;">` : ''}
                Aeternus
            </div>
            <div class="nav-right">
                <div class="bot-chip">
                    ${botAvatarUrl ? `<img src="${botAvatarUrl}" alt="">` : ''}
                    <span>${botName || 'Aeternus'}</span>
                </div>
                <button type="button" class="user-menu-btn" id="userMenuBtn">
                    <img src="${userAvatarUrl}" alt="Avatar">
                    <span style="font-size:0.9rem;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${user.global_name || user.username}</span>
                    <span class="chev">▾</span>
                </button>
                <div class="user-dropdown" id="userDropdown">
                    <div class="muted">Conta</div>
                    <div style="padding:6px 12px 10px;font-size:0.9rem;color:#aaa;">
                        @${user.username}
                        ${isOwner ? '<span class="badge-owner">DONO</span>' : canEditor ? '<span class="badge-owner">EDITOR</span>' : ''}
                    </div>
                    <div class="sep"></div>
                    ${canEditor || isOwner ? `
                    <a href="/editor"><span>🛠️</span><span>Editor</span></a>
                    <div class="sep"></div>
                    ` : ''}
                    <a href="/logout" style="color:#f87171;"><span>🚪</span><span>Deslogar</span></a>
                </div>
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
                Servidores em que você é administrador e o bot está presente.
            </p>
        </div>

        ${manageableGuilds.length === 0 ? `
            <div class="card" style="text-align:center;padding:50px 30px;">
                <div style="font-size:2.5rem;margin-bottom:16px;">📭</div>
                <h3 style="margin-bottom:10px;">Nenhum servidor encontrado</h3>
                <a href="https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&scope=bot%20applications.commands&permissions=8"
                   class="btn btn-primary" target="_blank">Adicionar Aeternus</a>
            </div>
        ` : `
            <div class="grid">
                ${manageableGuilds.map(g => `
                    <a href="/dashboard/${g.id}" class="card guild-card">
                        <div class="guild-icon">
                            ${g.icon
                                ? `<img src="https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png" style="width:100%;height:100%;border-radius:14px;object-fit:cover;">`
                                : g.name.charAt(0).toUpperCase()}
                        </div>
                        <div style="font-weight:600;font-size:1.05rem;margin-bottom:4px;">${g.name}</div>
                        <div style="color:var(--text-muted);font-size:0.85rem;">Configurar</div>
                    </a>
                `).join('')}
            </div>
        `}
    </div>

    <footer><div class="container">© ${new Date().getFullYear()} Aeternus</div></footer>

    <script>
        (function () {
            const btn = document.getElementById('userMenuBtn');
            const menu = document.getElementById('userDropdown');
            if (!btn || !menu) return;
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                menu.classList.toggle('show');
            });
            document.addEventListener('click', function () { menu.classList.remove('show'); });
            menu.addEventListener('click', function (e) { e.stopPropagation(); });
        })();
    </script>
</body>
</html>
`;
