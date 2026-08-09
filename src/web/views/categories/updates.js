module.exports = (guild, textChannels, roles) => {
    const savedUpdates = guild.updatesConfig || {};

    const buildChannelOptions = (selectedId) => {
        let html = `<option value="">Desativado / Nenhum canal</option>`;
        if (textChannels && textChannels.length > 0) {
            html += textChannels.map(c => 
                `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}># ${c.name}</option>`
            ).join('');
        }
        return html;
    };

    const buildRoleOptions = (selectedId) => {
        let html = `<option value="">Selecione um cargo...</option>`;
        if (roles && roles.length > 0) {
            html += roles.map(r => 
                `<option value="${r.id}" ${r.id === selectedId ? 'selected' : ''}>@ ${r.name}</option>`
            ).join('');
        }
        return html;
    };

    const isRoleSelected = savedUpdates.mentionType === 'role';

    return `
<section class="config-card" id="updates" style="margin-top: 30px;">
    <div class="config-card-header">
        <span style="font-size: 1.8rem;">📢</span>
        <h2>Notificações de Atualização do Bot</h2>
    </div>

    <p style="font-size: 0.9rem; color: #94a3b8; margin-bottom: 20px; line-height: 1.5;">
        Escolha o canal e a forma de menção para receber anúncios automáticos de <b>novas atualizações, comandos e correções do bot</b>.
    </p>

    <form onsubmit="saveUpdates(event, '${guild.id}')">
        <div class="form-grid">
            <div class="form-group" style="grid-column: 1 / -1;">
                <label>📌 Canal de Notificações de Atualizações</label>
                <select class="form-control" name="updatesChannel">
                    ${buildChannelOptions(savedUpdates.updatesChannel)}
                </select>
            </div>

            <div class="form-group">
                <label>🔔 Tipo de Menção</label>
                <select class="form-control" name="mentionType" id="mentionTypeSelect" onchange="toggleRoleSelect()">
                    <option value="none" ${savedUpdates.mentionType === 'none' || !savedUpdates.mentionType ? 'selected' : ''}>Nenhuma menção (Silencioso)</option>
                    <option value="here" ${savedUpdates.mentionType === 'here' ? 'selected' : ''}>@here</option>
                    <option value="everyone" ${savedUpdates.mentionType === 'everyone' ? 'selected' : ''}>@everyone</option>
                    <option value="role" ${isRoleSelected ? 'selected' : ''}>Cargo Específico</option>
                </select>
            </div>

            <div class="form-group" id="roleSelectGroup" style="display: ${isRoleSelected ? 'flex' : 'none'};">
                <label>🏷️ Selecione o Cargo</label>
                <select class="form-control" name="mentionRoleId">
                    ${buildRoleOptions(savedUpdates.mentionRoleId)}
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
            Quando novas funcionalidades forem lançadas, um anúncio formatado será enviado no canal escolhido marcando o cargo selecionado ou tipo de menção configurado.
        </p>
    </div>
</section>

<script>
    function toggleRoleSelect() {
        const mentionType = document.getElementById('mentionTypeSelect').value;
        const roleGroup = document.getElementById('roleSelectGroup');
        if (mentionType === 'role') {
            roleGroup.style.display = 'flex';
        } else {
            roleGroup.style.display = 'none';
        }
    }

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
                alert('✅ Configurações de Notificações salvas!');
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
                alert('❌ Erro no Teste: ' + (result.error || 'Verifique se selecionou um canal e cargo válidos'));
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
