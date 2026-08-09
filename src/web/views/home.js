module.exports = (user) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aeternus - Início</title>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=Inter:wght@300;400;600&display=swap" rel="stylesheet">
    <style>
        body { margin: 0; font-family: 'Inter', sans-serif; background: #0f172a; color: #f8fafc; height: 100vh; display: flex; flex-direction: column; }
        header { display: flex; justify-content: space-between; align-items: center; padding: 20px 40px; background: rgba(30, 41, 59, 0.5); border-bottom: 1px solid rgba(255,255,255,0.1); }
        .logo { font-size: 1.5rem; font-weight: bold; color: #38bdf8; }
        .login-btn { background: #5865F2; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; transition: 0.3s; }
        .login-btn:hover { background: #4752c4; }
        .hero { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 20px; }
        h1 { font-family: 'Playfair Display', serif; font-size: 3rem; font-style: italic; background: linear-gradient(90deg, #38bdf8, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 10px; }
        p { color: #94a3b8; font-size: 1.1rem; max-width: 600px; line-height: 1.6; }
    </style>
</head>
<body>
    <header>
        <div class="logo">Aeternus</div>
        <div>${user ? \`<a href="/dashboard" class="login-btn">Painel</a>\` : \`<a href="/login" class="login-btn">Login 🔚</a>\`}</div>
    </header>
    <div class="hero">
        <h1>Gerencie seu Bot com Elegância</h1>
        <p>O painel de controle definitivo para acompanhar estatísticas, gerenciar servidores e configurar seu ecossistema no Discord com facilidade.</p>
    </div>
</body>
</html>
`;
