module.exports = (user, manageableGuilds) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - Aeternus</title>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=Inter:wght@300;400;600&display=swap" rel="stylesheet">
    <style>
        body { margin: 0; font-family: 'Inter', sans-serif; background: #0f172a; color: #f8fafc; display: flex; height: 100vh; }
        sidebar { width: 260px; background: #1e293b; border-right: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; padding: 20px; box-sizing: border-box; }
        .menu-header { font-size: 1.2rem; font-weight: bold; color: #38bdf8; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
        .server-list { list-style: none; padding: 0; margin: 0; overflow-y: auto; flex: 1; }
        .server-item { padding: 12px; margin-bottom: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; cursor: pointer; transition: 0.2s; text-decoration: none; color: #cbd5e1; display: block; }
        .server-item:hover { background: #38bdf8; color: #0f172a; font-weight: 600; }
        main { flex: 1; padding: 40px; overflow-y: auto; }
        h1 { font-family: 'Playfair Display', serif; font-size: 2.5rem; font-style: italic; background: linear-gradient(90deg, #38bdf8, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .welcome-card { background: #1e293b; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); margin-top: 20px; }
        p { color: #94a3b8; line-height: 1.6; }
        .back-home { display: inline-block; margin-top: 20px; color: #38bdf8; text-decoration: none; font-size: 0.9rem; }
        .back-home:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <sidebar>
        <div class="menu-header">☰ Menu de Servidores</div>
        <p style="font-size: 0.85rem; color: #64748b; margin-bottom: 10px;">SELECIONE UM PARA GERENCIAR</p>
        <ul class="server-list">
            ${manageableGuilds.length > 0 ? manageableGuilds.map(g => '<a href="/dashboard/' + g.id + '" class="server-item">🛡️ ' + g.name + '</a>').join('') : '<p style="font-size: 0.9rem; color: #f87171;">Nenhum servidor encontrado.</p>'}
        </ul>
    </sidebar>
    <main>
        <h1>Bem-vindo, ${user.username}!</h1>
        <div class="welcome-card">
            <p>Este é o seu painel de controle centralizado no Aeternus. Utilize o menu lateral esquerdo para selecionar o servidor que deseja gerenciar, configurar comandos, visualizar registros e ajustar permissões da sua comunidade.</p>
        </div>
        <a href="/" class="back-home">← Voltar à Página Inicial</a>
    </main>
</body>
</html>
`;
