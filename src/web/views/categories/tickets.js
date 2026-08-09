module.exports = (guild) => {
    const config = guild.ticketsConfig || {};
    const textChannels = guild.textChannels || [];
    const roles = guild.roles || [];

    const channelOptions = textChannels.map(c => 
        `<option value="${c.id}" ${config.ticketChannel === c.id ? 'selected' : ''}>#${c.name}</option>`
    ).join('');

    const roleOptions = roles.map(r => 
        `<option value="${r.id}" ${config.supportRoleId === r.id ? 'selected' : ''}>@${r.name}</option>`
    ).join('');

    return `
<section class="config-card" id="tickets-config" style="margin-top: 30px;">
    <div class="config-card-header">
        <span style="font-size: 1.8rem;">🎫</span>
        <h2>Sistema de Tickets e Suporte</h2>
    </div>

    <p style="font-size: 0.9rem; color: #94a3b8; margin-bottom: 20px; line-height: 1.5;">
        Configure o canal onde os membros poderão abrir chamados de suporte privados com a equipe do seu servidor.
    </p>

    <form onsubmit="saveTicketsConfig(event, '${guild.id}')" style="background: rgba(0, 0, 0, 0.2); padding: 20px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.06);">
        <div class="form-grid">
            
            <div class="form-group">
                <label>📌 Canal do Painel de Tickets</label>
                <select class="form-control" name="ticketChannel" required>
                    <option value="">Selecione o canal onde ficará o botão</option>
                    ${channelOptions}
                </select>
            </div>

            <div class="form-group">
                <label>🛠️ Cargo de Suporte (Atendentes)</label>
                <select class="form-control" name="supportRoleId" required>
                    <option value="">Selecione quem atende os tickets</option>
                    ${roleOptions}
                </select>
            </div>

            <div class="form-group">
                <label>🎨 Título da Embed</label>
                <input type="text" class="form-control" name="embedTitle" value="${config.embedTitle || '🎫 Central de Atendimento'}" placeholder="Ex: Suporte e Dúvidas" required>
            </div>

            <div class="form-group">
                <label>💬 Descrição da Embed</label>
                <input type="text" class="form-control" name="embedDescription" value="${config.embedDescription || 'Clique no botão abaixo para abrir um ticket privado com a nossa equipe.'}" placeholder="Mensagem de instrução..." required>
            </div>

            <div class="form-group">
                <label>🔘 Texto do Botão de Abrir</label>
                <input type="text" class="form-control" name="buttonText" value="${config.buttonText || 'Abrir Ticket'}" placeholder="Ex: Criar Chamado" required>
            </div>

        </div>

        <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 15px;">
            <button type="submit" class="btn-save" id="saveTicketsBtn" style="background: linear-gradient(135deg, #10b981, #059669);">
                💾 Salvar Configurações
            </button>
            <button type="button" onclick="sendTicketPanel('${guild.id}')" class="btn-save" style="background: linear-gradient(135deg, #38bdf8, #2563eb);">
                📩 Enviar Painel ao Canal do Discord
            </button>
        </div>
    </form>
</section>

<script>
    async function saveTicketsConfig(event, guildId) {
        event.preventDefault();
        const btn = document.getElementById('saveTicketsBtn');
        btn.disabled = true;
        btn.innerText = '⏳ Salvando...';

        const formData = new FormData(event.target);
        const data = Object.fromEntries(formData.entries());

        try {
            const res = await fetch(\`/api/guilds/\${guildId}/tickets\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await res.json();
            if (result.success) {
                alert('✅ Configurações de tickets salvas!');
            } else {
                alert('❌ Erro: ' + (result.error || 'Falha ao salvar.'));
            }
        } catch (err) {
            alert('❌ Erro de conexão com o servidor.');
        } finally {
            btn.disabled = false;
            btn.innerText = '💾 Salvar Configurações';
        }
    }

    async function sendTicketPanel(guildId) {
        if (!confirm('Deseja enviar o painel de tickets para o canal selecionado?')) return;

        try {
            const res = await fetch(\`/api/guilds/\${guildId}/tickets/send-panel\`, {
                method: 'POST'
            });

            const result = await res.json();
            if (result.success) {
                alert('✅ Painel de tickets enviado com sucesso para o canal no Discord!');
            } else {
                alert('❌ Erro: ' + (result.error || 'Falha ao enviar painel. Verifique as configurações.'));
            }
        } catch (err) {
            alert('❌ Erro de conexão com o servidor.');
        }
    }
</script>
    `;
};
