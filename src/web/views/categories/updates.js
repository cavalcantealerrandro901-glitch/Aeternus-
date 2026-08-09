module.exports = (guild, textChannels) => {
    const savedUpdates = guild.updatesConfig || {};

    const buildOptions = (selectedId) => {
        let html = `<option value="">Desativado / Nenhum canal</option>`;
        if (textChannels && textChannels.length > 0) {
            html += textChannels.map(c => 
                `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}># ${c.name}</option>`
            ).join('');
        }
        return html;
    };

    return `
<section class="config-card" id="updates" style="margin-top: 30px;">
    <div class="config-card-header">
        <span style="font-size: 1.8rem;">📢</span>
        <h2>Notificações de Atualização do Bot</h2>
    </div>

    <p style="font-size: 0.9rem; color: #94a3b8; margin-bottom: 20px; line-height: 1.5;">
        Escolha o canal onde o bot irá enviar anúncios automáticos de <b>novas atualizações, novos comandos, melhorias no painel web e correções de bugs</b>.
    </p>

    <form onsubmit="saveUpdates(event, '${guild.id}')">
        <div class="form-grid">
            <div class="form-group" style="grid-column: 1 / -1;">
                <label>📌 Canal de Notificações de Atualizações</label>
                <select class="form-control" name="updatesChannel">
                    ${buildOptions(savedUpdates.updatesChannel)}
                </select>
            </div>

            <div class="form-group" style="grid-column: 1 / -1;">
                <label>🔔 Mencionar ao Notificar</label>
                <select class="form-control" name="mentionType">
                    <option value="none" ${savedUpdates.mentionType === 'none' || !savedUpdates.mentionType ? 'selected' : ''}>Nenhuma menção (Silencioso)</option>
                    <option value="here" ${savedUpdates.mentionType === 'here' ? 'selected' : ''}>@here</option>
                    <option value="everyone" ${savedUpdates.mentionType === 'everyone' ? 'selected' : ''}>@everyone</option>
                </select>
            </div>
        </div>

        <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 24px;">
            <button type="submit" class="btn-save" id="saveUpdatesBtn">💾 Salvar Notificações</button>
            <button type="button" class="btn-save" id="testUpdatesBtn" onclick="testUpdates('${guild.id}')" style="background: linear-gradient(135deg, #10b981, #059669);">🧪 Enviar Anúncio de Teste</button>
        </div>
    </form>

    <div style="background: rgba(0, 0, 0, 0.25); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 18px; margin-top: 20px;">
        <h3 style="font-size: 1rem; color: #38bdf8; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            ℹ️ Como funcionam as Notificações de Atualizações?
        </h3>
        <p style="font-size: 0.85rem; color: #cbd5e1; line-height: 1.6; margin-bottom: 10px;">
            Quando novas funcionalidades forem lançadas, um anúncio formatado será enviado neste canal com todos os detalhes:
        </p>
        <ul style="list-style: none; display: flex; flex-direction: column; gap: 6px; font-size: 0.85rem; color: #94a3b8;">
            <li>🚀 <b>Novos Sistemas e Comandos:</b> Lançamentos de novos recursos do bot.</li>
            <li>🌐 <b>Painel Web:</b> Atualizações e novidades na interface web.</li>
            <li>🛠️ <b>Manutenções & Correções:</b> Informações sobre estabilidade e melhorias.</li>
        </ul>
    </div>
</section>

<script>
    async function saveUpdates(event, guildId) {
        event.preventDefault();
        const btn = document.getElementById('saveUpdatesBtn');
        btn.disabled = true;
        btn.innerText = '⏳ Salvando...';

        const formData = new FormData(event.target);
        const data = Object.fromEntries(formData.entries());

        try {
            const res = await fetch(\`/api/guilds/\${guildId}/updates\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await res.json();
            if (result.success) {
                alert('✅ Canal de Notificações de Atualização salvo!');
            } else {
                alert('❌ Erro: ' + (result.error || 'Falha ao salvar'));
            }
        } catch (err) {
            alert('❌ Erro de conexão com o servidor.');
        } finally {
            btn.disabled = false;
            btn.innerText = '💾 Salvar Notificações';
        }
    }

    async function testUpdates(guildId) {
        const btn = document.getElementById('testUpdatesBtn');
        btn.disabled = true;
        btn.innerText = '⏳ Enviando Teste...';

        try {
            const res = await fetch(\`/api/guilds/\${guildId}/updates/test\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const result = await res.json();
            if (result.success) {
                alert('🧪 Anúncio de teste enviado no canal configurado!');
            } else {
                alert('❌ Erro no Teste: ' + (result.error || 'Verifique se selecionou um canal válido'));
            }
        } catch (err) {
            alert('❌ Erro ao solicitar o teste.');
        } finally {
            btn.disabled = false;
            btn.innerText = '🧪 Enviar Anúncio de Teste';
        }
    }
</script>
    `;
};
