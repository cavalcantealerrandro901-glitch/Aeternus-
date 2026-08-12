module.exports = (user, bot, inviteUrl, supportUrl, botAvatarUrl) => {
  const fav = botAvatarUrl || (bot ? bot.displayAvatarURL({ size: 128, extension: 'png' }) : '');
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aeternus</title>
    ${fav ? `<link rel="icon" href="${fav}">` : ''}
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <nav class="navbar">
        <div class="container">
            <div class="logo" style="display:flex;align-items:center;gap:10px;">
                ${fav ? `<img src="${fav}" alt="Aeternus" style="width:32px;height:32px;border-radius:50%;">` : ''}
                Aeternus
            </div>
            <div class="nav-links">
                ${user 
                    ? `<a href="/dashboard" class="btn btn-primary">Dashboard</a>
                       <a href="/logout" class="btn btn-outline">Sair</a>`
                    : `<a href="/login" class="btn btn-primary">Entrar com Discord</a>`
                }
            </div>
        </div>
    </nav>

    <section class="hero">
        <div class="container">
            ${fav ? `<img src="${fav}" alt="bot" style="width:96px;height:96px;border-radius:50%;margin-bottom:16px;box-shadow:0 0 40px rgba(124,58,237,.4);">` : ''}
            <h1>Aeternus</h1>
            <p>O bot completo para o seu servidor. Moderação, economia, utilidades e muito mais em um só lugar.</p>
            <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
                <a href="${inviteUrl}" class="btn btn-primary" target="_blank">Adicionar ao Servidor</a>
                <a href="${supportUrl}" class="btn btn-outline" target="_blank">Servidor de Suporte</a>
            </div>
        </div>
    </section>

    <footer>
        <div class="container">
            © ${new Date().getFullYear()} Aeternus — Todos os direitos reservados
        </div>
    </footer>
</body>
</html>
`;
};
