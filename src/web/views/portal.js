const renderLogsCategory = require('./categories/logs');
const renderWelcomeCategory = require('./categories/welcome');
const renderUpdatesCategory = require('./categories/updates');

module.exports = (guild, manageableGuilds, user, botUser) => {
    const botAvatarUrl = botUser ? botUser.displayAvatarURL({ extension: 'png', size: 128 }) : 'https://cdn.discordapp.com/embed/avatars/0.png';
    const userAvatarUrl = user?.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png';
    const guildIconUrl = guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null;
    const botName = botUser ? botUser.username : 'Aeternus';

    const logsSection = renderLogsCategory(guild, guild.textChannels);
    const welcomeSection = renderWelcomeCategory(guild, guild.textChannels);
    const updatesSection = renderUpdatesCategory(guild, guild.textChannels, guild.roles);

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Configurar ${guild.name} - ${botName}</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body {
            max-width: 100vw;
            overflow-x: hidden;
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
            padding: 14px 20px;
            background: rgba(15, 23, 42, 0.95);
            backdrop-filter: blur(12px);
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            position: sticky;
            top: 0;
            z-index: 90;
            width: 100%;
        }
        .header-left { display: flex; align-items: center; gap: 14px; }
        .menu-toggle-btn {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #38bdf8;
            font-size: 1.4rem;
            width: 42px;
            height: 42px;
            border-radius: 10px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }
        .menu-toggle-btn:hover { background: rgba(56, 189, 248, 0.2); border-color: #38bdf8; }
        .brand {
            display: flex;
            align-items: center;
            gap: 10px;
            text-decoration: none;
            color: #fff;
            font-weight: 800;
            font-size: 1.1rem;
        }
        .brand img { width: 32px; height: 32px; border-radius: 50%; border: 2px solid #38bdf8; }
        .user-profile {
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(255, 255, 255, 0.05);
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.88rem;
            font-weight: 600;
        }
        .user-profile img { width: 26px; height: 26px; border-radius: 50%; }

        .drawer-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(4px);
            z-index: 100;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        }
        .drawer-overlay.active { opacity: 1; visibility: visible; }
        .sidebar-drawer {
            position: fixed;
            top: 0;
            left: 0;
            width: 300px;
            max-width: 85vw;
            height: 100vh;
            background: #0f172a;
            border-right: 1px solid rgba(255, 255, 255, 0.1);
            z-index: 101;
            transform: translateX(-100%);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            flex-direction: column;
            padding: 20px 16px;
            overflow-y: auto;
        }
        .sidebar-drawer.active { transform: translateX(0); }
        .drawer-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .drawer-title { font-weight: 800; font-size: 0.9rem; color: #94a3b8; text-transform: uppercase; }
        .close-drawer-btn { background: transparent; border: none; color: #94a3b8; font-size: 1.5rem; cursor: pointer; }

        .drawer-server-card {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 14px;
            padding: 16px;
            margin-bottom: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
        }
        .drawer-server-icon {
            width: 54px;
            height: 54px;
            border-radius: 50%;
            background: #1e293b;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.4rem;
            font-weight: 800;
            color: #38bdf8;
            margin-bottom: 10px;
            border: 2px solid #38bdf8;
            object-fit: cover;
        }
        .drawer-server-name { font-weight: 700; font-size: 1rem; margin-bottom: 12px; word-break: break-word; }
        .drawer-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; width: 100%; }
        .stat-item { background: rgba(0, 0, 0, 0.3); padding: 8px 4px; border-radius: 8px; text-align: center; }
        .stat-val { font-weight: 800; font-size: 0.9rem; color: #38bdf8; }
        .stat-lbl { font-size: 0.65rem; color: #64748b; margin-top: 2px; }

        .nav-category-title { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 10px; padding-left: 8px; }
        .nav-menu-list { list-style: none; display: flex; flex-direction: column; gap: 6px; }
        .nav-menu-item button {
            width: 100%;
            text-align: left;
            background: transparent;
            border: none;
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 14px;
            border-radius: 10px;
            color: #94a3b8;
            font-weight: 600;
            font-size: 0.95rem;
            cursor: pointer;
            transition: all 0.2s;
        }
        .nav-menu-item button:hover, .nav-menu-item.active button { background: rgba(56, 189, 248, 0.15); color: #38bdf8; }

        main { flex: 1; max-width: 1000px; width: 100%; margin: 0 auto; padding: 24px 16px; box-sizing: border-box; }

        .server-hero-card {
            background: linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.7));
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 24px;
            display: flex;
            align-items: center;
            gap: 20px;
            margin-bottom: 24px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(10px);
        }
        .hero-server-icon {
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
            border: 3px solid #38bdf8;
            object-fit: cover;
            box-shadow: 0 0 20px rgba(56, 189, 248, 0.3);
            flex-shrink: 0;
        }
        .hero-server-details h1 { font-size: 1.6rem; font-weight: 800; margin-bottom: 8px; color: #fff; word-break: break-word; }
        .hero-stats-pills { display: flex; flex-wrap: wrap; gap: 8px; }
        .pill { background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.1); padding: 5px 12px; border-radius: 20px; font-size: 0.8rem; color: #cbd5e1; font-weight: 600; }
        .pill span { color: #38bdf8; font-weight: 700; }

        .config-card {
            background: rgba(15, 23, 42, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 18px;
            padding: 24px;
            backdrop-filter: blur(8px);
            width: 100%;
            box-sizing: border-box;
        }
        .config-card-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
            padding-bottom: 14px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .config-card-header h2 { font-size: 1.3rem; color: #fff; }

        .form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
            width: 100%;
        }
        .form-group { display: flex; flex-direction: column; gap: 6px; width: 100%; }
        .form-group label { font-size: 0.85rem; font-weight: 600; color: #cbd5e1; }
        .form-control {
            width: 100%;
            box-sizing: border-box;
            background: rgba(0, 0, 0, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: #f1f5f9;
            padding: 12px 14px;
            border-radius: 10px;
            font-size: 0.9rem;
            outline: none;
            transition: border-color 0.2s;
        }
        .form-control:focus { border-color: #38bdf8; box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2); }

        .btn-save {
            background: linear-gradient(135deg, #38bdf8, #2563eb);
            color: #fff;
            border: none;
            padding: 12px 24px;
            border-radius: 12px;
            font-weight: 700;
            font-size: 0.95rem;
            cursor: pointer;
            box-shadow: 0 4px 14px rgba(56, 189, 248, 0.3);
            transition: all 0.2s;
        }
        .btn-save:hover { opacity: 0.92; transform: translateY(-2px); }

        .category-section { display: none; }
        .category-section.active { display: block; }

        @media (max-width: 640px) {
            main { padding: 16px 12px; }
            .server-hero-card { flex-direction: column; text-align: center; padding: 18px; }
            .hero-server-icon { width: 70px; height: 70px; font-size: 1.6rem; }
            .hero-stats-pills { justify-content: center; }
            .form-grid { grid-template-columns: 1fr !important; }
        }
    </style>
</head>
<body>

    <div class="drawer-overlay" id="drawerOverlay" onclick="closeSidebar()"></div>
    
    <aside class="sidebar-drawer" id="sidebarDrawer">
        <div class="drawer-header">
            <span class="drawer-title">Menu do Servidor</span>
            <button class="close-drawer-btn" onclick="closeSidebar()">✕</button>
        </div>

        <div class="drawer-server-card">
            ${guildIconUrl 
                ? `<img src="${guildIconUrl}" class="drawer-server-icon" alt="${guild.name}">`
                : `<div class="drawer-server-icon">${guild.name.charAt(0)}</div>`}
            <div class="drawer-server-name">${guild.name}</div>
            
            <div class="drawer-stats">
                <div class="stat-item">
                    <div class="stat-val">${guild.memberCount}</div>
                    <div class="stat-lbl">Membros</div>
                </div>
                <div class="stat-item">
                    <div class="stat-val">${guild.channelCount}</div>
                    <div class="stat-lbl">Canais</div>
                </div>
                <div class="stat-item">
                    <div class="stat-val">${guild.roleCount}</div>
                    <div class="stat-lbl">Cargos</div>
                </div>
            </div>
        </div>

        <div class="nav-category-title">Categorias de Módulos</div>
        <ul class="nav-menu-list">
            <li class="nav-menu-item active" id="nav-logs">
                <button onclick="switchCategory('logs')">📜 Sistema de Logs</button>
            </li>
            <li class="nav-menu-item" id="nav-welcome">
                <button onclick="switchCategory('welcome')">👋 Boas-Vindas</button>
            </li>
            <li class="nav-menu-item" id="nav-updates">
                <button onclick="switchCategory('updates')">📢 Notificações do Bot</button>
            </li>
        </ul>

        <div style="margin-top: auto; padding-top: 20px;">
            <a href="/dashboard" style="display: block; text-align: center; color: #64748b; text-decoration: none; font-size: 0.88rem; font-weight: 600;">
                ← Trocar de Servidor
            </a>
        </div>
    </aside>

    <header>
        <div class="header-left">
            <button class="menu-toggle-btn" id="openMenuBtn" onclick="openSidebar()" title="Abrir Menu">
                ☰
            </button>
            <a href="/" class="brand">
                <img src="${botAvatarUrl}" alt="${botName}">
                <span>${botName}</span>
            </a>
        </div>
        <div class="user-profile">
            <img src="${userAvatarUrl}" alt="${user.username}">
            <span>${user.username}</span>
        </div>
    </header>

    <main>
        <div class="server-hero-card">
            ${guildIconUrl 
                ? `<img src="${guildIconUrl}" class="hero-server-icon" alt="${guild.name}">`
                : `<div class="hero-server-icon">${guild.name.charAt(0)}</div>`}
            
            <div class="hero-server-details">
                <h1>${guild.name}</h1>
                <div class="hero-stats-pills">
                    <div class="pill">👥 Membros: <span>${guild.memberCount}</span></div>
                    <div class="pill">💬 Canais: <span>${guild.channelCount}</span></div>
                    <div class="pill">🏷️ Cargos: <span>${guild.roleCount}</span></div>
                    <div class="pill">🟢 Bot: <span>Ativo</span></div>
                </div>
            </div>
        </div>

        <div id="sec-logs" class="category-section active">
            ${logsSection}
        </div>

        <div id="sec-welcome" class="category-section">
            ${welcomeSection}
        </div>

        <div id="sec-updates" class="category-section">
            ${updatesSection}
        </div>
    </main>

    <script>
        const sidebar = document.getElementById('sidebarDrawer');
        const overlay = document.getElementById('drawerOverlay');

        function openSidebar() {
            sidebar.classList.add('active');
            overlay.classList.add('active');
        }

        function closeSidebar() {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        }

        function switchCategory(catId) {
            document.querySelectorAll('.category-section').forEach(sec => sec.classList.remove('active'));
            document.querySelectorAll('.nav-menu-item').forEach(item => item.classList.remove('active'));

            const selectedSec = document.getElementById('sec-' + catId);
            const selectedNav = document.getElementById('nav-' + catId);

            if (selectedSec) selectedSec.classList.add('active');
            if (selectedNav) selectedNav.classList.add('active');

            closeSidebar();
        }
    </script>
</body>
</html>
    `;
};
