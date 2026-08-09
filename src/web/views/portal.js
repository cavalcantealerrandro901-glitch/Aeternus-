const renderLogsCategory = require('./categories/logs');

module.exports = (guild, manageableGuilds, user, botUser) => {
    const botAvatarUrl = botUser ? botUser.displayAvatarURL({ extension: 'png', size: 128 }) : 'https://cdn.discordapp.com/embed/avatars/0.png';
    const userAvatarUrl = user?.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png';
    const guildIconUrl = guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null;
    const botName = botUser ? botUser.username : 'Aeternus';

    const channelOptionsHtml = guild.textChannels && guild.textChannels.length > 0
        ? guild.textChannels.map(c => `<option value="${c.id}"># ${c.name}</option>`).join('')
        : `<option value="">Nenhum canal encontrado</option>`;

    // Renderizando o componente isolado da categoria de Logs
    const logsSection = renderLogsCategory(guild, channelOptionsHtml);

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Configurar ${guild.name} - ${botName}</title>
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
            overflow-x: hidden;
        }

        /* Top Bar */
        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 14px 20px;
            background: rgba(15, 23, 42, 0.85);
            backdrop-filter: blur(12px);
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            position: sticky;
            top: 0;
            z-index: 90;
        }
        .header-left { display: flex; align-items: center; gap: 16px; }
        .menu-toggle-btn {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #38bdf8;
            font-size: 1.5rem;
            width: 42px;
            height: 42px;
            border-radius: 10px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }
        .menu-toggle-btn:hover {
            background: rgba(56, 189, 248, 0.2);
            border-color: #38bdf8;
        }
        .brand {
            display: flex;
            align-items: center;
            gap: 10px;
            text-decoration: none;
            color: #fff;
            font-weight: 800;
            font-size: 1.1rem;
        }
        .brand img {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 2px solid #38bdf8;
        }
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

        /* Drawer Sidebar */
        .drawer-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.6);
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
            width: 320px;
            max-width: 85vw;
            height: 100vh;
            background: #0f172a;
            border-right: 1px solid rgba(255, 255, 255, 0.1);
            z-index: 101;
            transform: translateX(-100%);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            flex-direction: column;
            padding: 24px 18px;
            overflow-y: auto;
        }
        .sidebar-drawer.active { transform: translateX(0); }
        .drawer-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
            padding-bottom: 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .drawer-title {
            font-weight: 800;
            font-size: 1rem;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .close-drawer-btn {
            background: transparent;
            border: none;
            color: #94a3b8;
            font-size: 1.5rem;
            cursor: pointer;
        }
        .close-drawer-btn:hover { color: #fff; }

        .drawer-server-card {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 14px;
            padding: 16px;
            margin-bottom: 24px;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
        }
        .drawer-server-icon {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: #1e293b;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            font-weight: 800;
            color: #38bdf8;
            margin-bottom: 10px;
            border: 2px solid #38bdf8;
            object-fit: cover;
        }
        .drawer-server-name {
            font-weight: 700;
            font-size: 1.1rem;
            margin-bottom: 12px;
            word-break: break-word;
        }
        .drawer-stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            width: 100%;
        }
        .stat-item {
            background: rgba(0, 0, 0, 0.3);
            padding: 8px 4px;
            border-radius: 8px;
            text-align: center;
        }
        .stat-val { font-weight: 800; font-size: 0.95rem; color: #38bdf8; }
        .stat-lbl { font-size: 0.7rem; color: #64748b; margin-top: 2px; }

        .nav-category-title {
            font-size: 0.75rem;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 10px;
            padding-left: 8px;
        }
        .nav-menu-list {
            list-style: none;
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .nav-menu-item a {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 14px;
            border-radius: 10px;
            color: #94a3b8;
            text-decoration: none;
            font-weight: 600;
            font-size: 0.95rem;
            transition: all 0.2s;
        }
        .nav-menu-item a:hover, .nav-menu-item.active a {
            background: rgba(56, 189, 248, 0.15);
            color: #38bdf8;
        }

        main {
            flex: 1;
            max-width: 1100px;
            width: 100%;
            margin: 0 auto;
            padding: 30px 20px;
        }

        .server-hero-card {
            background: linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.7));
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 28px;
            display: flex;
            align-items: center;
            gap: 24px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(10px);
        }
        .hero-server-icon {
            width: 90px;
            height: 90px;
            border-radius: 50%;
            background: #1e293b;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2.2rem;
            font-weight: 800;
            color: #38bdf8;
            border: 3px solid #38bdf8;
            object-fit: cover;
            box-shadow: 0 0 20px rgba(56, 189, 248, 0.3);
            flex-shrink: 0;
        }
        .hero-server-details h1 {
            font-size: 1.8rem;
            font-weight: 800;
            margin-bottom: 8px;
            color: #fff;
        }
        .hero-stats-pills {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }
        .pill {
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 0.85rem;
            color: #cbd5e1;
            font-weight: 600;
        }
        .pill span { color: #38bdf8; font-weight: 700; }

        .info-box {
            background: rgba(56, 189, 248, 0.08);
            border: 1px solid rgba(56, 189, 248, 0.25);
            border-radius: 16px;
            padding: 20px 24px;
            margin-bottom: 30px;
            display: flex;
            gap: 16px;
            align-items: flex-start;
        }
        .info-icon { font-size: 1.6rem; line-height: 1; }
        .info-content h3 { font-size: 1.1rem; color: #38bdf8; margin-bottom: 6px; }
        .info-content p { color: #94a3b8; font-size: 0.95rem; line-height: 1.6; }

        .config-card {
            background: rgba(15, 23, 42, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 18px;
            padding: 28px;
            backdrop-filter: blur(8px);
        }
        .config-card-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .config-card-header h2 { font-size: 1.4rem; color: #fff; }

        .form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-bottom: 28px;
        }
        .form-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .form-group label {
            font-size: 0.9rem;
            font-weight: 600;
            color: #cbd5e1;
        }
        .form-control {
            background: rgba(0, 0, 0, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: #f1f5f9;
            padding: 12px 14px;
            border-radius: 10px;
            font-size: 0.95rem;
            outline: none;
            transition: border-color 0.2s;
        }
        .form-control:focus {
            border-color: #38bdf8;
            box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2);
        }

        .btn-save {
            background: linear-gradient(135deg, #38bdf8, #2563eb);
            color: #fff;
            border: none;
            padding: 14px 28px;
            border-radius: 12px;
            font-weight: 700;
            font-size: 1rem;
            cursor: pointer;
            box-shadow: 0 4px 14px rgba(56, 189, 248, 0.3);
            transition: all 0.2s;
        }
        .btn-save:hover { opacity: 0.92; transform: translateY(-2px); }

        @media (max-width: 640px) {
            main { padding: 20px 14px; }
            .server-hero-card { flex-direction: column; text-align: center; }
            .hero-server-icon { width: 75px; height: 75px; font-size: 1.8rem; }
            .hero-stats-pills { justify-content: center; }
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
            <li class="nav-menu-item active">
                <a href="#logs" onclick="closeSidebar()">📜 Sistema de Logs</a>
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
            <button class="menu-toggle-btn" id="openMenuBtn" onclick="openSidebar()" title="Abrir Menu (☰)">
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

        <div class="info-box">
            <div class="info-icon">💡</div>
            <div class="info-content">
                <h3>Como Funciona a Configuração?</h3>
                <p>
                    Escolha abaixo os canais onde o bot enviará as notificações automáticas do seu servidor.
                    Clique no botão de menu <strong>☰ (no canto superior esquerdo)</strong> ou <strong>deslize a tela para a direita</strong> no celular para navegar pelas diferentes categorias do painel!
                </p>
            </div>
        </div>

        ${logsSection}
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

        let touchStartX = 0;
        let touchEndX = 0;

        document.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].screenX;
        }, false);

        document.addEventListener('touchend', e => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, false);

        function handleSwipe() {
            if (touchEndX - touchStartX > 70 && touchStartX < 60) {
                openSidebar();
            }
            if (touchStartX - touchEndX > 70 && sidebar.classList.contains('active')) {
                closeSidebar();
            }
        }

        function saveLogs(e) {
            e.preventDefault();
            alert('Configurações salvas com sucesso!');
        }
    </script>
</body>
</html>
    `;
};
