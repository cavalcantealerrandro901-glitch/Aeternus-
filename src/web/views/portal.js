module.exports = (serverData, manageableGuilds, user, botUser) => {
    const iconUrl = serverData.icon 
        ? `https://cdn.discordapp.com/icons/${serverData.id}/${serverData.icon}.png` 
        : 'https://cdn.discordapp.com/embed/avatars/0.png';

    const textChannelsOptions = (serverData.textChannels || []).map(c => 
        `<option value="${c.id}" ${serverData.ticketsConfig?.ticketChannel === c.id ? 'selected' : ''}># ${c.name}</option>`
    ).join('');

    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Gerenciar ${serverData.name}</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-slate-900 text-white min-h-screen p-6">
        <div class="max-w-4xl mx-auto">
            <div class="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
                <div class="flex items-center gap-4">
                    <img src="${iconUrl}" class="w-14 h-14 rounded-full border-2 border-sky-500">
                    <div>
                        <h1 class="text-2xl font-bold">${serverData.name}</h1>
                        <p class="text-slate-400 text-sm">Membros: ${serverData.memberCount}</p>
                    </div>
                </div>
                <a href="/dashboard" class="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm border border-slate-700">← Servidores</a>
            </div>

            <div class="bg-slate-800 p-6 rounded-xl mb-6 border border-slate-700">
                <h2 class="text-xl font-bold mb-4">⚙️ Configuração Geral</h2>
                <div class="mb-4">
                    <label class="block text-slate-400 text-sm mb-2">Prefixo do Bot</label>
                    <input type="text" id="prefixInput" value="${serverData.prefix || '!'}" class="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white w-full max-w-xs focus:outline-none focus:border-sky-500">
                </div>
                <button onclick="savePrefix()" class="bg-sky-500 hover:bg-sky-600 px-4 py-2 rounded-lg font-medium text-sm">Salvar Prefixo</button>
            </div>

            <div class="bg-slate-800 p-6 rounded-xl border border-slate-700">
                <h2 class="text-xl font-bold mb-4">🎫 Sistema de Tickets</h2>
                
                <div class="space-y-4">
                    <div>
                        <label class="block text-slate-400 text-sm mb-2">Canal do Painel de Tickets</label>
                        <select id="ticketChannel" class="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white w-full focus:outline-none focus:border-sky-500">
                            <option value="">Selecione um canal...</option>
                            ${textChannelsOptions}
                        </select>
                    </div>

                    <div>
                        <label class="block text-slate-400 text-sm mb-2">Título do Embed</label>
                        <input type="text" id="embedTitle" value="${serverData.ticketsConfig?.embedTitle || '🎫 Central de Atendimento'}" class="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white w-full focus:outline-none focus:border-sky-500">
                    </div>

                    <div>
                        <label class="block text-slate-400 text-sm mb-2">Descrição do Embed</label>
                        <textarea id="embedDescription" rows="3" class="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white w-full focus:outline-none focus:border-sky-500">${serverData.ticketsConfig?.embedDescription || 'Clique abaixo para abrir um ticket.'}</textarea>
                    </div>

                    <div>
                        <label class="block text-slate-400 text-sm mb-2">Texto do Botão</label>
                        <input type="text" id="buttonText" value="${serverData.ticketsConfig?.buttonText || 'Abrir Ticket'}" class="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white w-full focus:outline-none focus:border-sky-500">
                    </div>

                    <button onclick="saveTickets()" class="bg-sky-500 hover:bg-sky-600 px-6 py-2 rounded-lg font-medium text-sm">Salvar e Enviar Painel</button>
                </div>
            </div>
        </div>

        <script>
            async function savePrefix() {
                const prefix = document.getElementById('prefixInput').value;
                try {
                    const res = await fetch('/api/guilds/${serverData.id}/prefix', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prefix })
                    });
                    const data = await res.json();
                    if (data.success) alert('Prefixo salvo com sucesso!');
                    else alert('Erro: ' + (data.error || 'Falha ao salvar'));
                } catch (e) {
                    alert('Erro de conexão ao salvar prefixo.');
                }
            }

            async function saveTickets() {
                const ticketChannel = document.getElementById('ticketChannel').value;
                const embedTitle = document.getElementById('embedTitle').value;
                const embedDescription = document.getElementById('embedDescription').value;
                const buttonText = document.getElementById('buttonText').value;

                if (!ticketChannel) {
                    alert('Por favor, selecione um canal!');
                    return;
                }

                try {
                    const res = await fetch('/api/guilds/${serverData.id}/tickets/save-and-send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ticketChannel, embedTitle, embedDescription, buttonText })
                    });
                    const data = await res.json();
                    if (data.success) alert('Painel de tickets salvo e enviado com sucesso!');
                    else alert('Erro: ' + (data.error || 'Falha ao salvar tickets'));
                } catch (e) {
                    alert('Erro de conexão com o servidor.');
                }
            }
        </script>
    </body>
    </html>
    `;
};
