module.exports = (data) => {
    const user = data?.user || {};
    const manageableGuilds = data?.manageableGuilds || [];
    const botName = data?.botName || 'Aeternus';
    const userAvatarUrl = data?.userAvatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png';

    const guildsList = manageableGuilds.map(g => {
        const iconUrl = g.icon 
            ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` 
            : 'https://cdn.discordapp.com/embed/avatars/0.png';
        return `
            <div class="bg-black/20 p-4 rounded-xl flex items-center justify-between border border-white/5 hover:border-sky-500/50 transition-all transform hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(56,189,248,0.2)]">
                <div class="flex items-center gap-3">
                    <img src="${iconUrl}" class="w-12 h-12 rounded-full object-cover border border-white/10">
                    <div>
                        <span class="block font-semibold text-base text-white">${g.name}</span>
                        <span class="text-xs text-slate-400 font-light">Dono / Administrador</span>
                    </div>
                </div>
                <a href="/dashboard/${g.id}" class="bg-sky-500 hover:bg-sky-400 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-[0_0_10px_rgba(56,189,248,0.2)] text-white">Configurar</a>
            </div>
        `;
    }).join('');

    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dashboard - ${botName}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Poppins', sans-serif; }
        </style>
    </head>
    <body class="bg-gradient-to-br from-[#090714] via-[#0d0a20] to-[#121139] text-white min-h-screen p-6 flex flex-col">
        <div class="max-w-4xl mx-auto w-full flex-grow">
            <header class="flex justify-between items-center mb-10 border-b border-white/10 pb-4">
                <div class="flex items-center gap-3">
                    <img src="${userAvatarUrl}" class="w-10 h-10 rounded-full border-2 border-sky-500 shadow-[0_0_10px_rgba(56,189,248,0.3)]">
                    <div>
                        <span class="block text-[10px] text-slate-400 font-light">Logado como</span>
                        <span class="font-bold text-sm tracking-wide">${user.username || 'Utilizador'}</span>
                    </div>
                </div>
                <a href="/" class="bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 transition-all backdrop-blur-md">Voltar ao Início</a>
            </header>

            <div class="mb-8">
                <h1 class="text-3xl font-extrabold mb-2 tracking-tight text-white">Selecione um Servidor</h1>
                <p class="text-slate-300 font-light text-sm">Escolha abaixo o servidor que você deseja gerenciar. Apenas servidores onde você possui permissão de administrador ou gerenciar servidor aparecerão aqui.</p>
            </div>

            <div class="bg-white/5 rounded-2xl p-6 md:p-8 border border-white/10 backdrop-blur-md shadow-2xl">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${manageableGuilds.length > 0 ? guildsList : '<div class="col-span-2 text-center py-10"><p class="text-slate-400 font-light text-sm">Nenhum servidor encontrado. Adicione o bot a um servidor primeiro!</p></div>'}
                </div>
            </div>
        </div>
        
        <footer class="text-center text-slate-500 text-xs mt-12 border-t border-white/10 pt-4 max-w-4xl mx-auto w-full font-light">
            &copy; ${new Date().getFullYear()} ${botName}. Todos os direitos reservados.
        </footer>
    </body>
    </html>
    `;
};
