module.exports = ({ user, userAvatarUrl }) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Editor — Aeternus</title>
    <link rel="stylesheet" href="/style.css">
    <style>
        .editor-wrap { max-width: 720px; margin: 40px auto; padding: 0 20px; }
        .editor-card {
            background: #14141f;
            border: 1px solid #252536;
            border-radius: 16px;
            padding: 28px;
        }
        .editor-card h1 { font-size: 1.4rem; margin-bottom: 8px; }
        .editor-card p { color: #888; margin-bottom: 20px; line-height: 1.5; }
        .owner-badge {
            display: inline-block;
            background: linear-gradient(90deg,#7c3aed,#a78bfa);
            color: #fff;
            font-size: 0.75rem;
            font-weight: 700;
            padding: 4px 10px;
            border-radius: 8px;
            margin-bottom: 16px;
        }
        .nav-right { margin-left: auto; }
        .navbar .container { display: flex; align-items: center; width: 100%; }
    </style>
</head>
<body>
    <nav class="navbar">
        <div class="container">
            <div class="logo">Aeternus</div>
            <div class="nav-right" style="display:flex;gap:10px;">
                <a href="/dashboard" class="btn btn-outline">Servidores</a>
                <a href="/logout" class="btn btn-outline">Deslogar</a>
            </div>
        </div>
    </nav>

    <div class="editor-wrap">
        <div class="editor-card">
            <div class="owner-badge">ACESSO DONO</div>
            <h1>🛠️ Sistema de Editor</h1>
            <p>
                Área restrita do <strong>Aeternus</strong>. Apenas o dono do bot pode acessar esta página.
                Use este espaço para ferramentas administrativas globais (manutenção, anúncios do bot, etc.).
            </p>
            <p style="color:#c4b5fd;margin-bottom:8px;">Logado como</p>
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
                <img src="${userAvatarUrl}" alt="" style="width:40px;height:40px;border-radius:50%;">
                <div>
                    <div style="font-weight:600;">${user.global_name || user.username}</div>
                    <div style="color:#888;font-size:0.9rem;">@${user.username}</div>
                </div>
            </div>
            <p style="font-size:0.9rem;color:#666;">
                Em breve: ferramentas avançadas de edição global do bot.
            </p>
            <a href="/dashboard" class="btn btn-primary" style="margin-top:16px;display:inline-block;">Voltar aos servidores</a>
        </div>
    </div>
</body>
</html>
`;
