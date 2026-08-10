module.exports = (user, botUser, inviteUrl, supportUrl) => {
    const botAvatar = botUser?.displayAvatarURL 
        ? botUser.displayAvatarURL({ extension: 'png', size: 256 }) 
        : (botUser?.avatar 
            ? `https://cdn.discordapp.com/avatars/${botUser.id}/${botUser.avatar}.png` 
            : 'https://cdn.discordapp.com/embed/avatars/0.png');
    
    const botName = botUser?.username || 'Aeternus';

    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${botName} - Bot do Discord</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-slate-900 text-white min-h-screen flex flex-col justify-between p-6">
        <header class="flex justify-between items-center max-w-5xl mx-auto w-full pb-4 border-b border-slate-800">
            <div class="flex items-center gap-3">
                <img src="${botAvatar}" alt="Avatar do Bot" class="w-10 h-10 rounded-full border border-sky-400">
                <span class="text-xl font-bold text-sky-400">${botName}</span>
            </div>
            ${user 
                ? `<a href="/dashboard" class="bg-sky-500 hover:bg-sky-600 px-4 py-2 rounded-lg font-medium transition">Dashboard</a>` 
                : `<a href="/login" class="bg-sky-500 hover:bg-sky-600 px-4 py-2 rounded-lg font-medium transition">Login com Discord</a>`
            }
        </header>

        <main class="max-w-4xl mx-auto my-10 flex-grow flex flex-col items-center justify-center">
            
            <div class="text-center mb-12">
                <img src="${botAvatar}" alt="${botName}" class="w-32 h-32 rounded-full mx-auto mb-6 border-4 border-sky-500/30 shadow-lg shadow-sky-500/20">
                <h1 class="text-4xl md:text-5xl font-extrabold mb-4">
                    Seja bem-vindo ao <span class="text-sky-400">${botName}</span>! 👋
                </h1>
                <p class="text-slate-300 text-lg max-w-2xl mx-auto leading-relaxed">
                    A solução completa para organizar e gerenciar o seu servidor do Discord com praticidade, automação de tickets e controle em tempo real através do nosso painel web.
                </p>
                
                <div class="flex flex-wrap justify-center gap-4 mt-8">
                    <a href="${inviteUrl}" target="_blank" class="bg-sky-500 hover:bg-sky-600 px-6 py-3 rounded-lg font-semibold shadow-lg shadow-sky-500/20 transition">Adicionar ao Discord</a>
                    <a href="${supportUrl}" target="_blank" class="bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-lg font-semibold border border-slate-700 transition">Servidor de Suporte</a>
                </div>
            </div>

            <div class="w-full bg-slate-800/60 rounded-2xl p-8 border border-slate-800 backdrop-blur-sm">
                <h2 class="text-2xl font-bold text-center mb-8 text-sky-400">⚡ Como o Bot Funciona?</h2>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="bg-slate-800 p-6 rounded-xl border border-slate-700/50">
                        <div class="text-3xl mb-3">1️⃣</div>
                        <h3 class="font-bold text-lg mb-2">Adicione o Bot</h3>
                        <p class="text-slate-400 text-sm">Clique em "Adicionar ao Discord" e escolha o servidor onde você tem permissão de administração.</p>
                    </div>

                    <div class="bg-slate-800 p-6 rounded-xl border border-slate-700/50">
                        <div class="text-3xl mb-3">2️⃣</div>
                        <h3 class="font-bold text-lg mb-2">Acesse o Painel</h3>
                        <p class="text-slate-400 text-sm">Faça login com sua conta do Discord aqui no site para carregar e gerenciar seus servidores.</p>
                    </div>

                    <div class="bg-slate-800 p-6 rounded-xl border border-slate-700/50">
                        <div class="text-3xl mb-3">3️⃣</div>
                        <h3 class="font-bold text-lg mb-2">Configure Tudo</h3>
                        <p class="text-slate-400 text-sm">Crie painéis de atendimento (tickets), altere prefixos e ajuste os sistemas instantaneamente.</p>
                    </div>
                </div>
            </div>
        </main>

        <footer class="text-center text-slate-500 text-sm mt-8 border-t border-slate-800/80 pt-4 max-w-5xl mx-auto w-full">
            &copy; ${new Date().getFullYear()} ${botName}. Todos os direitos reservados.
        </footer>
    </body>
    </html>
    `;
};
