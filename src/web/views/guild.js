module.exports = (guild, user, userAvatarUrl) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${guild.name} — Aeternus</title>
    <link rel="stylesheet" href="/style.css">
    <style>
        .layout {
            display: flex;
            min-height: calc(100vh - 70px);
            position: relative;
            overflow-x: hidden;
        }

        /* Sidebar */
        .sidebar {
            width: 280px;
            background: var(--card);
            border-right: 1px solid var(--border);
            padding: 24px 16px;
            position: fixed;
            top: 70px;
            left: 0;
            bottom: 0;
            z-index: 90;
            transform: translateX(-100%);
            transition: transform 0.3s ease;
            overflow-y: auto;
        }

        .sidebar.open {
            transform: translateX(0);
        }

        .sidebar-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            z-index: 80;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        }

        .sidebar-overlay.show {
            opacity: 1;
            visibility: visible;
        }

        .sidebar-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 28px;
            padding: 0 8px;
        }

        .sidebar-header h3 {
            font-size: 1.1rem;
            font-weight: 600;
        }

        .close-btn {
            background: none;
            border: none;
            color: var(--text-muted);
            font-size: 1.4rem;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 6px;
        }

        .close-btn:hover {
            color: var(--text);
            background: var(--border);
        }

        .menu-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 14px;
            border-radius: 10px;
            color: var(--text-muted);
            font-weight: 500;
            margin-bottom: 4px;
            transition: all 0.2s;
            cursor: pointer;
        }

        .menu-item:hover,
        .menu-item.active {
            background: rgba(124, 58, 237, 0.15);
            color: #a78bfa;
        }

        /* Conteúdo principal */
        .main-content {
            flex: 1;
            padding: 30px 20px;
            width: 100%;
        }

        .menu-toggle {
            background: var(--card);
            border: 1px solid var(--border);
            color: var(--text);
            font-size: 1.3rem;
            width: 42px;
            height: 42px;
            border-radius: 10px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .menu-toggle:hover {
            border-color: var(--primary);
            color: var(--primary);
        }

        .page-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
        }

        .guild-title {
            display: flex;
            align-items: center;
            gap: 14px;
        }

        .guild-title img,
        .guild-title .fallback {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            object-fit: cover;
        }

        .fallback {
            background: var(--border);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 1.2rem;
        }

        .content-card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 28px;
        }

        /* Desktop: sidebar sempre visível */
        @media (min-width: 900px) {
            .sidebar {
                position: relative;
                top: 0;
                transform: translateX(0);
            }
            .sidebar-overlay {
                display: none !important;
            }
            .menu-toggle {
                display: none;
            }
            .close-btn {
                display: none;
            }
            .layout {
                padding-left: 0;
            }
        }
    </style>
</head>
<body>
    <nav class="navbar">
        <div class="container">
            <div class="logo">Aeternus</div>
            <div class="nav-links">
                <a href="/dashboard" class="btn btn-outline">Voltar</a>
                <a href="/logout" class="btn btn-outline">Sair</a>
            </div>
        </div>
    </nav>

    <div class="layout">
        <!-- Overlay -->
        <div class="sidebar-overlay" id="overlay"></div>

        <!-- Sidebar -->
        <aside class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <h3>Menu</h3>
                <button class="close-btn" id="closeSidebar">✕</button>
            </div>

            <div class="menu-item active" data-section="geral">
                <span>⚙️</span> Geral
            </div>
            <div class="menu-item" data-section="moderacao">
                <span>🛡️</span> Moderação
            </div>
            <div class="menu-item" data-section="economia">
                <span>💰</span> Economia
            </div>
            <div class="menu-item" data-section="utilidades">
                <span>🔧</span> Utilidades
            </div>
            <div class="menu-item" data-section="logs">
                <span>📋</span> Logs
            </div>
        </aside>

        <!-- Conteúdo -->
        <main class="main-content">
            <div class="page-header">
                <div class="guild-title">
                    ${guild.icon 
                        ? `<img src="https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png" alt="">`
                        : `<div class="fallback">${guild.name.charAt(0)}</div>`
                    }
                    <div>
                        <div style="font-weight:600;font-size:1.2rem;">${guild.name}</div>
                        <div style="color:var(--text-muted);font-size:0.85rem;">Configurações do servidor</div>
                    </div>
                </div>
                <button class="menu-toggle" id="openSidebar">☰</button>
            </div>

            <div class="content-card" id="content">
                <h2 style="margin-bottom:10px;">Configurações Gerais</h2>
                <p style="color:var(--text-muted);">
                    Em breve você poderá alterar o prefixo, canais de log, mensagens de boas-vindas e muito mais por aqui.
                </p>
            </div>
        </main>
    </div>

    <script>
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        const openBtn = document.getElementById('openSidebar');
        const closeBtn = document.getElementById('closeSidebar');

        function openSidebar() {
            sidebar.classList.add('open');
            overlay.classList.add('show');
        }

        function closeSidebar() {
            sidebar.classList.remove('open');
            overlay.classList.remove('show');
        }

        openBtn.addEventListener('click', openSidebar);
        closeBtn.addEventListener('click', closeSidebar);
        overlay.addEventListener('click', closeSidebar);

        // Swipe para abrir/fechar
        let touchStartX = 0;
        let touchEndX = 0;

        document.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        document.addEventListener('touchend', e => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, { passive: true });

        function handleSwipe() {
            const diff = touchEndX - touchStartX;

            // Arrastar da esquerda para a direita → abrir
            if (diff > 80 && touchStartX < 40) {
                openSidebar();
            }
            // Arrastar da direita para a esquerda → fechar
            if (diff < -80 && sidebar.classList.contains('open')) {
                closeSidebar();
            }
        }
    </script>
</body>
</html>
`;
