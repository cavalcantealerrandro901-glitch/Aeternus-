module.exports = (user, botUser, inviteUrl, supportUrl) => {
    const avatarUrl = botUser ? botUser.displayAvatarURL({ extension: 'png', size: 256 }) : 'https://cdn.discordapp.com/embed/avatars/0.png';
    const botName = botUser ? botUser.username : 'Aeternus';

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${botName} - Painel Oficial</title>
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
        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 18px 5%;
            background: rgba(15, 23, 42, 0.75);
            backdrop-filter: blur(12px);
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            position: sticky;
            top: 0;
            z-index: 100;
        }
        .brand {
            display: flex;
            align-items: center;
            gap: 12px;
            text-decoration: none;
            color: #fff;
            font-weight: 800;
            font-size: 1.3rem;
            letter-spacing: -0.5px;
        }
        .brand-avatar {
            width: 38px;
            height: 38px;
            border-radius: 50%;
            border: 2px solid #38bdf8;
            box-shadow: 0 0 10px rgba(56, 189, 248, 0.4);
        }
        .nav-actions {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 10px 20px;
            border-radius: 10px;
            font-weight: 600;
            font-size: 0.95rem;
            text-decoration: none;
            transition: all 0.25s ease;
            cursor: pointer;
        }
        .btn-header {
            background: #5865F2;
            color: #ffffff;
            box-shadow: 0 4px 14px rgba(88, 101, 242, 0.35);
        }
        .btn-header:hover {
            background: #4752c4;
            transform: translateY(-1px);
        }
        .hero {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 60px 20px;
            max-width: 900px;
            margin: 0 auto;
            width: 100%;
        }
        .bot-avatar-container {
            position: relative;
            margin-bottom: 28px;
        }
        .bot-avatar-hero {
            width: 140px;
            height: 140px;
            border-radius: 50%;
            border: 4px solid #38bdf8;
            box-shadow: 0 0 35px rgba(56, 189, 248, 0.45);
            object-fit: cover;
            transition: transform 0.3s ease;
        }
        .bot-avatar-hero:hover {
            transform: scale(1.05);
        }
        .status-badge {
            position: absolute;
            bottom: 8px;
            right: 8px;
            width: 22px;
            height: 22px;
            background: #22c55e;
            border: 3.5px solid #090d16;
            border-radius: 50%;
            box-shadow: 0 0 8px #22c55e;
        }
        .hero h1 {
            font-size: 2.8rem;
            font-weight: 800;
            line-height: 1.2;
            margin-bottom: 18px;
            background: linear-gradient(135deg, #ffffff 30%, #38bdf8 70%, #c084fc 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .hero p {
            color: #94a3b8;
            font-size: 1.2rem;
            line-height: 1.7;
            margin-bottom: 36px;
            max-width: 750px;
        }
        .cta-group {
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
            justify-content: center;
            width: 100%;
        }
        .btn-add {
            background: linear-gradient(135deg, #38bdf8, #2563eb);
            color: #ffffff;
            padding: 14px 28px;
            font-size: 1.05rem;
            box-shadow: 0 6px 20px rgba(56, 189, 248, 0.35);
        }
        .btn-add:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(56, 189, 248, 0.5);
        }
        .btn-support {
            background: rgba(88, 101, 242, 0.15);
            color: #818cf8;
            border: 1px solid rgba(88, 101, 242, 0.4);
            padding: 14px 28px;
            font-size: 1.05rem;
        }
        .btn-support:hover {
            background: rgba(88, 101, 242, 0.3);
            color: #ffffff;
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(88, 101, 242, 0.25);
        }
        .btn-secondary {
            background: rgba(255, 255, 255, 0.06);
            color: #f1f5f9;
            border: 1px solid rgba(255, 255, 255, 0.12);
            padding: 14px 28px;
            font-size: 1.05rem;
        }
        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.12);
            transform: translateY(-2px);
        }
        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            width: 100%;
            margin-top: 50px;
            text-align: left;
        }
        .feature-card {
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.06);
            padding: 24px;
            border-radius: 14px;
            backdrop-filter: blur(8px);
        }
        .feature-card h3 {
            color: #38bdf8;
            font-size: 1.1rem;
            margin-bottom: 8px;
        }
        .feature-card p {
            font-size: 0.95rem;
            color: #64748b;
            margin-bottom: 0;
            line-height: 1.5;
        }
        footer {
            text-align: center;
            padding: 24px;
            color: #64748b;
            font-size: 0.88rem;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            margin-top: auto;
        }
        @media (max-width: 640px) {
            header { padding: 14px 16px; }
            .hero h1 { font-size: 2rem; }
            .hero p { font-size: 1.05rem; }
            .cta-group { flex-direction: column; width: 100%; }
            .btn { width: 100%; }
            .bot-avatar-hero { width: 110px; height: 110px; }
        }
    </style>
</head>
<body>
    <header>
        <a href="/" class="brand">
            <img src="${avatarUrl}" alt="Avatar" class="brand-avatar">
            <span>${botName}</span>
        </a>
        <div class="nav-actions">
            ${user ? `<a href="/dashboard" class="btn btn-header">⚙️ Painel de Controle</a>` : `<a href="/login" class="btn btn-header">🔑 Entrar com Discord</a>`}
        </div>
    </header>

    <main class="hero">
        <div class="bot-avatar-container">
            <img src="${avatarUrl}" alt="${botName}" class="bot-avatar-hero">
            <div class="status-badge" title="Online no Discord"></div>
        </div>
        
        <h1>Seja Bem-vindo ao ${botName}</h1>
        
        <p>
            O bot definitivo projetado para transformar a gestão do seu servidor Discord em uma experiência completa, simples e moderna. 
            Acompanhe métricas em tempo real, gerencie cargos, configure comandos automatizados e personalize seus sistemas com total facilidade — 
            seja navegando pelo computador ou pelo seu dispositivo móvel!
        </p>

        <div class="cta-group">
            <a href="${inviteUrl}" target="_blank" class="btn btn-add">🤖 Adicionar ao Seu Servidor</a>
            <a href="${supportUrl}" target="_blank" class="btn btn-support">💬 Servidor de Suporte</a>
            ${user ? `<a href="/dashboard" class="btn btn-secondary">⚡ Ir para o Painel</a>` : `<a href="/login" class="btn btn-secondary">🌐 Fazer Login com Discord</a>`}
        </div>

        <div class="features-grid">
            <div class="feature-card">
                <h3>📱 100% Responsivo</h3>
                <p>Acesse e configure tudo diretamente do seu celular ou computador com uma interface fluida.</p>
            </div>
            <div class="feature-card">
                <h3>⚡ Painel em Tempo Real</h3>
                <p>Ajustes aplicados instantaneamente no seu servidor sem necessidade de reiniciar o bot.</p>
            </div>
            <div class="feature-card">
                <h3>🛡️ Controle e Segurança</h3>
                <p>Apenas administradores e membros autorizados têm acesso às configurações do servidor.</p>
            </div>
        </div>
    </main>

    <footer>
        <p>© 2026 ${botName} • Todos os direitos reservados.</p>
    </footer>
</body>
</html>
    `;
};
