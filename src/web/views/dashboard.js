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
            <div class="bg-slate-800 p-4 rounded-xl flex items-center justify-between border border-slate-700 hover:border-sky-500 transition">
                <div class="flex items-center gap-3">
                    <img src="${iconUrl}" class="w-12 h-12 rounded-full object-cover">
                    <span class="font-semibold text-lg">${g.name}</span>
                </div>
                <a href="/dashboard/${g.id}" class="bg-sky-500 hover:bg-sky-600 px-4 py-2 rounded-lg text-sm font-medium">Gerenciar</a>
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
    </head>
    <body class="bg-slate-900 text-white min-h-screen p-6">
        <div class="max-w-4xl mx-auto">
            <header class="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
                <div class="flex items-center gap-3">
                    <img src="${userAvatarUrl}" class="w-10 h-10 rounded-full">
                    <span class="font-bold text-lg">${user.username || 'Utilizador'}</span>
                </div>
                <a href="/" class="text-slate-400 hover:text-white text-sm">Voltar ao Início</a>
            </header>

            <h1 class="text-2xl font-bold mb-6">Seus Servidores</h1>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${manageableGuilds.length > 0 ? guildsList : '<p class="text-slate-400">Nenhum servidor disponível para gerenciar.</p>'}
            </div>
        </div>
    </body>
    </html>
    `;
};
