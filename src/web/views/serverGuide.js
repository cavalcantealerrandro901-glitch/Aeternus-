module.exports = (serverData, user) => {
    const iconUrl = serverData.icon 
        ? `https://cdn.discordapp.com/icons/${serverData.id}/${serverData.icon}.png` 
        : 'https://cdn.discordapp.com/embed/avatars/0.png';

    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Guia - ${serverData.name}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Poppins', sans-serif; }
        </style>
    </head>
    <body class="bg-gradient-to-br from-[#090714] via-[#0d0a20] to-[#121139] text-white min-h-screen p-6 flex flex-col justify-between">
        <div class="max-w-3xl mx-auto w-full">
            <header class="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                <div class="flex items-center gap-3">
                    <img src="${iconUrl}" class="w-12 h-12 rounded-full border-2 border-sky-500 shadow-[0_0_10px_rgba(56,189,248,0.3)] object-cover">
                    <div>
                        <span class="block text-[10px] text-slate-400 font-light">Servidor Selecionado</span>
                        <span class="font-bold text-sm tracking-wide">${serverData.name}</span>
                    </div>
                </div>
                <a href="/dashboard" class="bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 transition-all backdrop-blur-md">← Voltar</a>
            </header>

            <div class="bg-white/5 rounded-2xl p-6 md:p-8 border border-white/10 backdrop-blur-md shadow-2xl space-y-6">
                <div>
                    <h1 class="text-2xl font-extrabold mb-2 tracking-tight text-white flex items-center gap-2">
                        📖 Guia de Configuração
                    </h1>
                    <p class="text-slate-300 font-light text-sm">
                        Bem-vindo ao painel de controlo do servidor <strong class="text-sky-400">${serverData.name}</strong>. Siga as instruções abaixo para configurar o bot corretamente.
                    </p>
                </div>

                <div class="space-y-4">
                    <div class="bg-black/20 p-4 rounded-xl border border-white/5 flex items-start gap-4">
                        <div class="text-xl">1️⃣</div>
                        <div>
                            <h2 class="font-semibold text-sm text-white mb-1">Escolha o Canal de Atendimento</h2>
                            <p class="text-slate-400 text-xs font-light">No painel de configurações, selecione em qual canal de texto do seu servidor o painel de tickets será enviado.</p>
                        </div>
                    </div>

                    <div class="bg-black/20 p-4 rounded-xl border border-white/5 flex items-start gap-4">
                        <div class="text-xl">2️⃣</div>
                        <div>
                            <h2 class="font-semibold text-sm text-white mb-1">Personalize as Mensagens</h2>
                            <p class="text-slate-400 text-xs font-light">Pode alterar o título do embed, a descrição e o nome do botão que aparecerá para os membros clicarem.</p>
                        </div>
                    </div>

                    <div class="bg-black/20 p-4 rounded-xl border border-white/5 flex items-start gap-4">
                        <div class="text-xl">3️⃣</div>
                        <div>
                            <h2 class="font-semibold text-sm text-white mb-1">Guarde e Envie</h2>
                            <p class="text-slate-400 text-xs font-light">Clique em "Salvar e Enviar Painel" para que o bot publique a mensagem interativa diretamente no Discord automaticamente.</p>
                        </div>
                    </div>
                </div>

                <div class="pt-4 flex justify-end gap-3 border-t border-white/10">
                    <a href="/dashboard" class="bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg text-xs font-semibold border border-white/10 transition-all">Cancelar</a>
                    <a href="/dashboard/${serverData.id}/settings" class="bg-sky-500 hover:bg-sky-400 px-5 py-2 rounded-lg text-xs font-semibold shadow-[0_0_10px_rgba(56,189,248,0.2)] text-white transition-all">Entrar nas Configurações →</a>
                </div>
            </div>
        </div>

        <footer class="text-center text-slate-500 text-xs mt-12 border-t border-white/10 pt-4 max-w-3xl mx-auto w-full font-light">
            &copy; ${new Date().getFullYear()} Aeternus. Todos os direitos reservados.
        </footer>
    </body>
    </html>
    `;
};
