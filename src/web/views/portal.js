module.exports = (guild, manageableGuilds) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gerenciar ${guild.name} - Aeternus</title>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=Inter:wght@300;400;600&display=swap" rel="stylesheet">
    <style>
        body { margin: 0; font-family: 'Inter', sans-serif; background: #0f172a; color: #f8fafc; display: flex; height: 100vh; }
        sidebar { width: 260px; background: #1e293b; border-right: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; padding: 20px; box-sizing: border-box; }
        .menu-header { font-size: 1.2rem; font-weight: bold; color: #38bdf8; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
        .server-list { list-style: none; padding: 0; margin: 0; overflow-y: auto; flex: 1; }
        .server-item { padding: 12px; margin-bottom: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; cursor: pointer; transition: 0.2s; text-decoration: none; color: #cbd5e1; display: block; }
        .server-item:hover, .server-item.active { background: #38bdf8; color: #0f172a; font-weight: 600; }
        main { flex: 1; padding: 40px; overflow-y: auto; }
        h1 { font-family: 'Playfair Display', serif; font-size: 2.2rem; font-style: italic; background: linear-gradient(90deg, #38bdf8, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .portal-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 20px; }
        .card { background: #1e293b; padding: 25px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); }
        .card h3 { color: #38bdf8; margin-top: 0; }
        p { color: #94a3b8; font-size: 0.95rem; line-height: 1.5; }
        .btn-action { display: inline-block; background: #38bdf8; color: #0f172a; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 15px; transition: 0.2s; }
        .btn-action:hover { background: #7dd3fc; }
        .back-link { display: inline-block; margin-bottom: 20px; color: #94a3b8; text-decoration: none; }
        .back-link:hover { color: #f8fafc; }
    </style>
</head>
<body>
    <sidebar>
        <div class="menu-header">☰ Servidores</div>
        <ul class="server-list">
            ${manageableGuilds.map(g => '<a href="/dashboard/' + g.id + '" class="server-item ' + (g.id === guild.id ? 'active' : '') + '">🛡️ ' + g.name + '</a>').join('')}
        </ul>
    </sidebar>
    <main>
        <a href="/dashboard" class="back-link">← Voltar à Visão Geral</a>
        <h1>Portal: ${guild.name}</h1>
        <p>Configure as opções avançadas do bot para este servidor em tempo real.</p>
        <div class="portal-grid">
            <div class="card"><h3>💬 Comandos & Integrações</h3><p>Ative ou desative módulos personalizados.</p><a href="#" class="btn-action">Configurar</a></div>
            <div class="card"><h3>👋 Mensagem de Boas-Vindas</h3><p>Personalize o texto, imagem e canal.</p><a href="#" class="btn-action">Configurar</a></div>
            <div class="card"><h3>🔒 Permissões & Cargos</h3><p>Defina quais cargos terão acesso ao painel.</p><a href="#" class="btn-action">Configurar</a></div>
        </div>
    </main>
</body>
</html>
`;
