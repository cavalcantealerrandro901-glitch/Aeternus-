module.exports = (guild, user, userAvatarUrl, config, channels) => `
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

        .sidebar.open { transform: translateX(0); }

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

        .sidebar-header h3 { font-size: 1.1rem; font-weight: 600; }

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
            border: none;
            background: none;
            width: 100%;
            text-align: left;
            font-size: 0.95rem;
        }

        .menu-item:hover,
        .menu-item.active {
            background: rgba(124, 58, 237, 0.15);
            color: #a78bfa;
        }

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
            margin-bottom: 20px;
        }

        .content-card h2 {
            font-size: 1.25rem;
            margin-bottom: 6px;
        }

        .content-card .desc {
            color: var(--text-muted);
            font-size: 0.9rem;
            margin-bottom: 24px;
        }

        .form-group {
            margin-bottom: 22px;
        }

        .form-group label {
            display: block;
            font-weight: 500;
            margin-bottom: 8px;
            font-size: 0.95rem;
        }

        .form-group input,
        .form-group select {
            width: 100%;
            max-width: 320px;
            background: var(--bg);
            border: 1px solid var(--border);
            color: var(--text);
            padding: 12px 14px;
            border-radius: 10px;
            font-size: 1rem;
            outline: none;
            transition: border-color 0.2s;
        }

        .form-group input:focus,
        .form-group select:focus {
            border-color: var(--primary);
        }

        .form-group .hint {
            font-size: 0.8rem;
            color: var(--text-muted);
            margin-top: 6px;
        }

        .checkbox-group {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-top: 8px;
        }

        .checkbox-item {
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
        }

        .checkbox-item input {
            width: 18px;
            height: 18px;
            accent-color: var(--primary);
        }

        .save-btn {
            background: var(--primary);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 10px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
        }

        .save-btn:hover { background: var(--primary-hover); }
        .save-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .toast {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: var(--success);
            color: white;
            padding: 14px 22px;
            border-radius: 12px;
            font-weight: 500;
            opacity: 0;
            transform: translateY(20px);
            transition: all 0.3s ease;
            z-index: 200;
        }

        .toast.show {
            opacity: 1;
            transform: translateY(0);
        }

        .section { display: none; }
        .section.active { display: block; }

        @media (min-width: 900px) {
            .sidebar {
                position: relative;
                top: 0;
                transform: translateX(0);
            }
            .sidebar-overlay { display: none !important; }
            .menu-toggle { display: none; }
            .close-btn { display: none; }
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
        <div class="sidebar-overlay" id="overlay"></div>

        <aside class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <h3>Menu</h3>
                <button class="close-btn" id="closeSidebar">✕</button>
            </div>

            <button class="menu-item active" data-section="geral"><span>⚙️</span> Geral</button>
            <button class="menu-item" data-section="moderacao"><span>🛡️</span> Moderação</button>
            <button class="menu-item" data-section="economia"><span>💰</span> Economia</button>
            <button class="menu-item" data-section="utilidades"><span>🔧</span> Utilidades</button>
            <button class="menu-item" data-section="logs"><span>📋</span> Logs</button>
        </aside>

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

            <!-- GERAL -->
            <div class="section active" id="section-geral">
                <div class="content-card">
                    <h2>Prefixo do Bot</h2>
                    <p class="desc">Altere o prefixo usado nos comandos de texto deste servidor.</p>

                    <div class="form-group">
                        <label for="prefix">Prefixo atual</label>
                        <input type="text" id="prefix" value="${config.prefix || '!'}" maxlength="5">
                        <div class="hint">Máximo 5 caracteres. Exemplo: !, ., >, a!</div>
                    </div>

                    <button class="save-btn" id="savePrefix">Salvar Prefixo</button>
                </div>
            </div>

            <!-- MODERAÇÃO -->
            <div class="section" id="section-moderacao">
                <div class="content-card">
                    <h2>Moderação</h2>
                    <p class="desc">Em breve você poderá configurar punições automáticas, avisos e mais.</p>
                </div>
            </div>

            <!-- ECONOMIA -->
            <div class="section" id="section-economia">
                <div class="content-card">
                    <h2>Economia</h2>
                    <p class="desc">Configurações de economia e apostas chegarão em breve.</p>
                </div>
            </div>

            <!-- UTILIDADES -->
            <div class="section" id="section-utilidades">
                <div class="content-card">
                    <h2>Utilidades</h2>
                    <p class="desc">Comandos utilitários e personalizações.</p>
                </div>
            </div>

            <!-- LOGS -->
            <div class="section" id="section-logs">
                <div class="content-card">
                    <h2>Logs de Auditoria</h2>
                    <p class="desc">Escolha o canal onde o bot enviará os registros de ações do servidor.</p>

                    <div class="form-group">
                        <label for="logChannel">Canal de Logs</label>
                        <select id="logChannel">
                            <option value="">Nenhum (desativado)</option>
                            ${channels.map(c => `
                                <option value="${c.id}" ${config.logs?.channel === c.id ? 'selected' : ''}>
                                    #${c.name}
                                </option>
                            `).join('')}
                        </select>
                        <div class="hint">O bot precisa ter permissão de Enviar Mensagens e Incorporar Links neste canal.</div>
                    </div>

                    <div class="form-group">
                        <label>Eventos que serão registrados</label>
                        <div class="checkbox-group">
                            <label class="checkbox-item">
                                <input type="checkbox" id="logBan" ${config.logs?.ban !== false ? 'checked' : ''}>
                                Banimentos e desbanimentos
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" id="logKick" ${config.logs?.kick !== false ? 'checked' : ''}>
                                Expulsões
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" id="logTimeout" ${config.logs?.timeout !== false ? 'checked' : ''}>
                                Castigos (timeout)
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" id="logMessage" ${config.logs?.message !== false ? 'checked' : ''}>
                                Mensagens apagadas / editadas
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" id="logMember" ${config.logs?.member !== false ? 'checked' : ''}>
                                Entrada e saída de membros
                            </label>
                        </div>
                    </div>

                    <button class="save-btn" id="saveLogs">Salvar Configurações de Logs</button>
                </div>
            </div>
        </main>
    </div>

    <div class="toast" id="toast">Salvo com sucesso!</div>

    <script>
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        const openBtn = document.getElementById('openSidebar');
        const closeBtn = document.getElementById('closeSidebar');
        const guildId = "${guild.id}";

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

        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
                document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
                item.classList.add('active');
                document.getElementById('section-' + item.dataset.section).classList.add('active');
                closeSidebar();
            });
        });

        let touchStartX = 0;
        document.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        document.addEventListener('touchend', e => {
            const diff = e.changedTouches[0].screenX - touchStartX;
            if (diff > 80 && touchStartX < 40) openSidebar();
            if (diff < -80 && sidebar.classList.contains('open')) closeSidebar();
        }, { passive: true });

        // Salvar Prefixo
        document.getElementById('savePrefix').addEventListener('click', async () => {
            const btn = document.getElementById('savePrefix');
            const prefix = document.getElementById('prefix').value.trim();
            if (!prefix || prefix.length > 5) return alert('Prefixo inválido');

            btn.disabled = true;
            btn.textContent = 'Salvando...';

            try {
                const res = await fetch('/api/guilds/' + guildId + '/prefix', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prefix })
                });
                if (res.ok) showToast('Prefixo salvo com sucesso!');
                else alert('Erro ao salvar');
            } catch {
                alert('Erro de conexão');
            }

            btn.disabled = false;
            btn.textContent = 'Salvar Prefixo';
        });

        // Salvar Logs
        document.getElementById('saveLogs').addEventListener('click', async () => {
            const btn = document.getElementById('saveLogs');
            btn.disabled = true;
            btn.textContent = 'Salvando...';

            const logs = {
                channel: document.getElementById('logChannel').value || null,
                ban: document.getElementById('logBan').checked,
                kick: document.getElementById('logKick').checked,
                timeout: document.getElementById('logTimeout').checked,
                message: document.getElementById('logMessage').checked,
                member: document.getElementById('logMember').checked
            };

            try {
                const res = await fetch('/api/guilds/' + guildId + '/logs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ logs })
                });
                if (res.ok) showToast('Configurações de logs salvas!');
                else alert('Erro ao salvar');
            } catch {
                alert('Erro de conexão');
            }

            btn.disabled = false;
            btn.textContent = 'Salvar Configurações de Logs';
        });

        function showToast(msg) {
            const toast = document.getElementById('toast');
            toast.textContent = msg;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3000);
        }
    </script>
</body>
</html>
`;
