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
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Poppins', sans-serif; }
        </style>
    </head>
    <body class="bg-gradient-to-br from-[#090714] via-[#0d0a20] to-[#121139] text-white min-h-screen flex flex-col justify-between p-6">
        <header class="flex justify-between items-center max-w-5xl mx-auto w-full pb-4 border-b border-white/10">
            <div class="flex items-center gap-3">
                <img src="${botAvatar}" alt="Avatar do Bot" class="w-10 h-10 rounded-full border border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.4)]">
                <span class="text-xl font-bold text-sky-400 tracking-wide">${botName}</span>
            </div>
            ${user 
                ? `<a href="/dashboard" class="bg-sky-500 hover:bg-sky-400 px-5 py-2 rounded-lg font-semibold transition-all shadow-[0_0_15px_rgba(56,189,248,0.2)]">Dashboard</a>` 
                : `<a href="/login" class="bg-sky-500 hover:bg-sky-400 px-5 py-2 rounded-lg font-semibold transition-all shadow-[0_0_15px_rgba(56,189,248,0.2)]">Login com Discord</a>`
            }
        </header>

        <main class="max-w-4xl mx-auto my-10 flex-grow flex flex-col items-center justify-center">
            
            <div class="text-center mb-12">
                <img src="${botAvatar}" alt="${botName}" class="w-32 h-32 rounded-full mx-auto mb-6 border-4 border-sky-500/30 shadow-[0_0_30px_rgba(56,189,248,0.3)]">
                <h1 class="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
                    Seja bem-vindo ao <span class="text-sky-400">${botName}</span>! 👋
                </h1>
                <p class="text-slate-300 text-lg max-w-2xl mx-auto leading-relaxed font-light">
                    A solução completa para organizar e gerenciar o seu servidor do Discord com praticidade, automação de tickets e controle em tempo real através do nosso painel web.
                </p>
                
                <div class="flex flex-wrap justify-center gap-4 mt-8">
                    <a href="${inviteUrl}" target="_blank" class="bg-sky-500 hover:bg-sky-400 text-white px-8 py-3 rounded-xl font-semibold shadow-[0_0_20px_rgba(56,189,248,0.3)] transition-all transform hover:-translate-y-1">Adicionar ao Discord</a>
                    <a href="${supportUrl}" target="_blank" class="bg-white/5 hover:bg-white/10 backdrop-blur-md px-8 py-3 rounded-xl font-semibold border border-white/10 transition-all transform hover:-translate-y-1">Servidor de Suporte</a>
                </div>
            </div>

            <div class="w-full bg-white/5 rounded-2xl p-8 border border-white/10 backdrop-blur-md shadow-2xl">
                <h2 class="text-2xl font-bold text-center mb-8 text-sky-400 tracking-wide">⚡ Como o Bot Funciona?</h2>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="bg-black/20 p-6 rounded-xl border border-white/5 hover:border-sky-500/30 transition-all">
                        <div class="text-3xl mb-4">1️⃣</div>
                        <h3 class="font-bold text-lg mb-2 text-white">Adicione o Bot</h3>
                        <p class="text-slate-400 text-sm font-light">Clique em "Adicionar ao Discord" e escolha o servidor onde você tem permissão de administração.</p>
                    </div>

                    <div class="bg-black/20 p-6 rounded-xl border border-white/5 hover:border-sky-500/30 transition-all">
                        <div class="text-3xl mb-4">2️⃣</div>
                        <h3 class="font-bold text-lg mb-2 text-white">Acesse o Painel</h3>
                        <p class="text-slate-400 text-sm font-light">Faça login com sua conta do Discord aqui no site para carregar e gerenciar seus servidores.</p>
                    </div>

                    <div class="bg-black/20 p-6 rounded-xl border border-white/5 hover:border-sky-500/30 transition-all">
                        <div class="text-3xl mb-4">3️⃣</div>
                        <h3 class="font-bold text-lg mb-2 text-white">Configure Tudo</h3>
                        <p class="text-slate-400 text-sm font-light">Crie painéis de atendimento, altere prefixos e ajuste os sistemas instantaneamente.</p>
                    </div>
                </div>
            </div>
        </main>

        <footer class="text-center text-slate-500 text-sm mt-8 border-t border-white/10 pt-6 max-w-5xl mx-auto w-full font-light">
            &copy; ${new Date().getFullYear()} ${botName}. Todos os direitos reservados.
        </footer>
    </body>
    </html>
    `;
};
