module.exports = (guild) => {
    const config = guild.updatesConfig || {};
    const textChannels = guild.textChannels || [];
    const roles = guild.roles || [];

    const channelOptions = textChannels.map(c => 
        `<option value="${c.id}" ${config.updatesChannel === c.id ? 'selected' : ''}>#${c.name}</option>`
    ).join('');

    const roleOptions = roles.map(r => 
        `<option value="${r.id}" ${config.mentionRoleId === r.id ? 'selected' : ''}>@${r.name}</option>`
    ).join('');

    return `
<section class="config-card" id="bot-updates" style="margin-top: 30px;">
    <div class="config-card-header">
        <span style="font-size: 1.8rem;">🚀</span>
        <h2>Configurar Canal de Atualizações do Bot</h2>
    </div>

    <p style="font-size: 0.9rem; color: #94a3b8; margin-bottom: 20px; line-height: 1.5;">
        Defina onde o seu servidor receberá os anúncios de novidades e atualizações transmitidos pelo comando <b>/botupdate</b>.
    </p>

    <form onsubmit="saveUpdatesConfig(event, '${guild.id}')" style="background: rgba(0, 0, 0, 0.2); padding: 20px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.06);">
        <div class="form-grid">
            
            <div class="form-group">
                <label>📢 Canal de Transmissão</label>
                <select class="form-control" name="updatesChannel" id="updatesChannel">
                    <option value="">Desativado (Não receber anúncios)</option>
                    ${channelOptions}
                </select>
            </div>

            <div class="form-group">
                <label>🔔 Tipo de Menção ao Anunciar</label>
                <select class="form-control" name="mentionType" id="mentionType" onchange="toggleRoleSelect()">
                    <option value="none" ${config.mentionType === 'none' || !config.mentionType ? 'selected' : ''}>Nenhuma Menção</option>
                    <option value="here" ${config.mentionType === 'here' ? 'selected' : ''}>@here</option>
                    <option value="everyone" ${config.mentionType === 'everyone' ? 'selected' : ''}>@everyone</option>
                    <option value="role" ${config.mentionType === 'role' ? 'selected' : ''}>Cargo Específico</option>
                </select>
            </div>

            <div class="form-group" id="roleGroup" style="display: ${config.mentionType === 'role' ? 'block' : 'none'};">
                <label>🏷️ Cargo a ser Mencionado</label>
                <select class="form-control" name="mentionRoleId">
                    <option value="">Selecione um Cargo</option>
                    ${roleOptions}
                </select>
            </div>

        </div>

        <button type="submit" class="btn-save" id="saveUpdatesBtn" style="margin-top: 15px; background: linear-gradient(135deg, #38bdf8, #2563eb);">
            💾 Salvar Configurações de Transmissão
        </button>
    </form>
</section>

<script>
    function toggleRoleSelect() {
        const type = document.getElementById('mentionType').value;
        const roleGroup = document.getElementById('roleGroup');
        roleGroup.style.display = type === 'role' ? 'block' : 'none';
    }

    async function saveUpdatesConfig(event, guildId) {
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
                alert('✅ Configuração de atualizações do bot salva com sucesso!');
            } else {
                alert('❌ Erro: ' + (result.error || 'Falha ao salvar.'));
            }
        } catch (err) {
            alert('❌ Erro de conexão com o servidor.');
        } finally {
            btn.disabled = false;
            btn.innerText = '💾 Salvar Configurações de Transmissão';
        }
    }
</script>
    `;
};
