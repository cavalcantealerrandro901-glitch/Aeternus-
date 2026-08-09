module.exports = (guild) => {
    const config = guild.ticketsConfig || {};
    const textChannels = guild.textChannels || [];
    const roles = guild.roles || [];
    const isEnabled = config.enabled !== false;

    const channelOptions = textChannels.map(c => 
        `<option value="${c.id}" ${config.ticketChannel === c.id ? 'selected' : ''}>#${c.name}</option>`
    ).join('');

    const roleOptions = roles.map(r => 
        `<option value="${r.id}" ${config.supportRoleId === r.id ? 'selected' : ''}>@${r.name}</option>`
    ).join('');

    return `
<section class="config-card" id="tickets-config">
    <div class="config-card-header">
        <span style="font-size: 1.8rem;">🎫</span>
        <div>
            <h2>Sistema de Tickets e Suporte</h2>
            <span style="font-size: 0.8rem; color: ${isEnabled ? '#10b981' : '#ef4444'}; font-weight: 700;">
                ● Status: ${isEnabled ? 'Ativo' : 'Desativado'}
            </span>
        </div>
    </div>

    <p style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 20px; line-height: 1.5;">
        Configure ou desative o canal de chamados de suporte privados do servidor.
    </p>

    <form id="ticketForm" onsubmit="saveTicketsConfig(event, '${guild.id}')" style="background: rgba(0, 0, 0, 0.2); padding: 20px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.06);">
        
        <div style="margin-bottom: 16px; display: flex; align-items: center; gap: 10px;">
            <input type="checkbox" id="ticketEnabled" name="enabled" value="true" ${isEnabled ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
            <label for="ticketEnabled" style="font-weight: 700; color: #f8fafc; cursor: pointer;">
                Ativar Sistema de Tickets
            </label>
        </div>

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
                <select class="form-control" name="supportRoleId">
                    <option value="">Selecione quem atende os tickets</option>
                    ${roleOptions}
                </select>
            </div>

            <div class="form-group">
                <label>🎨 Título da Embed</label>
                <input type="text" class="form-control" name="embedTitle" value="${config.embedTitle || '🎫 Central de Atendimento'}" placeholder="Ex: Suporte e Dúvidas">
            </div>

            <div class="form-group">
                <label>💬 Descrição da Embed</label>
                <input type="text" class="form-control" name="embedDescription" value="${config.embedDescription || 'Clique no botão abaixo para abrir um ticket privado com a nossa equipe.'}" placeholder="Mensagem de instrução...">
            </div>

            <div class="form-group">
                <label>🔘 Texto do Botão de Abrir</label>
                <input type="text" class="form-control" name="buttonText" value="${config.buttonText || 'Abrir Ticket'}" placeholder="Ex: Criar Chamado">
            </div>
        </div>

        <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 15px;">
            <button type="submit" class="btn-save" id="saveTicketsBtn" style="background: linear-gradient(135deg, #10b981, #059669);">
                💾 Salvar Configurações
            </button>
            <button type="button" onclick="sendTicketPanel('${guild.id}')" class="btn-save" style="background: linear-gradient(135deg, #38bdf8, #2563eb);">
                📩 Enviar Painel ao Discord
            </button>
            <button type="button" onclick="disableTicketSystem('${guild.id}')" class="btn-save" style="background: linear-gradient(135deg, #ef4444, #dc2626);">
                🚫 Desativar Sistema
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

        const form = document.getElementById('ticketForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        data.enabled = form.querySelector('[name="enabled"]').checked;

        try {
            const res = await fetch(\`/api/guilds/\${guildId}/tickets\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await res.json();
            if (result.success) {
                alert('✅ Configurações salvas!');
                location.reload();
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
        const form = document.getElementById('ticketForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        data.enabled = form.querySelector('[name="enabled"]').checked;

        if (!data.ticketChannel) {
            alert('⚠️ Por favor, selecione um canal no formulário antes de enviar!');
            return;
        }

        if (!confirm('Deseja enviar o painel de tickets para o canal selecionado?')) return;

        try {
            const res = await fetch(\`/api/guilds/\${guildId}/tickets/send-panel\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await res.json();
            if (result.success) {
                alert('✅ Painel de tickets enviado com sucesso para o Discord!');
                location.reload();
            } else {
                alert('❌ Erro: ' + (result.error || 'Verifique as permissões do bot no canal.'));
            }
        } catch (err) {
            alert('❌ Erro de conexão ao enviar o painel.');
        }
    }

    async function disableTicketSystem(guildId) {
        if (!confirm('Tem certeza de que deseja desativar o sistema de tickets neste servidor?')) return;

        try {
            const res = await fetch(\`/api/guilds/\${guildId}/tickets/disable\`, {
                method: 'POST'
            });

            const result = await res.json();
            if (result.success) {
                alert('🚫 Sistema de tickets desativado!');
                location.reload();
            } else {
                alert('❌ Erro ao desativar.');
            }
        } catch (err) {
            alert('❌ Erro de conexão.');
        }
    }
</script>
    `;
};
