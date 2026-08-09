module.exports = (guild) => {
    const config = guild.flirtConfig || {};
    const textChannels = guild.textChannels || [];
    const isEnabled = config.enabled === true;

    const channelOptions = textChannels.map(c => {
        const isSelected = Array.isArray(config.channels) && config.channels.includes(c.id);
        return `<option value="${c.id}" ${isSelected ? 'selected' : ''}>#${c.name}</option>`;
    }).join('');

    return `
<section class="config-card" id="flirt-config">
    <div class="config-card-header">
        <span style="font-size: 1.8rem;">💖</span>
        <div>
            <h2>Modo Paquerar (Interação Automática)</h2>
            <span style="font-size: 0.8rem; color: ${isEnabled ? '#10b981' : '#ef4444'}; font-weight: 700;">
                ● Status: ${isEnabled ? 'Ativo' : 'Desativado'}
            </span>
        </div>
    </div>

    <p style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 20px; line-height: 1.5;">
        Quando os membros conversarem nos canais selecionados, o bot reagirá de forma surpresa com emojis/figurinhas divertidas de paquera!
    </p>

    <form id="flirtForm" onsubmit="saveFlirtConfig(event, '${guild.id}')" style="background: rgba(0, 0, 0, 0.2); padding: 20px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.06);">
        
        <div style="margin-bottom: 16px; display: flex; align-items: center; gap: 10px;">
            <input type="checkbox" id="flirtEnabled" name="enabled" value="true" ${isEnabled ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
            <label for="flirtEnabled" style="font-weight: 700; color: #f8fafc; cursor: pointer;">
                Ativar Reações Automáticas de Paquera
            </label>
        </div>

        <div class="form-grid">
            <div class="form-group">
                <label>📌 Canais Permitidos (Mantenha CTRL/Cmd pressionado para selecionar vários)</label>
                <select class="form-control" name="channels" multiple style="height: 120px;">
                    ${channelOptions}
                </select>
                <span style="font-size: 0.75rem; color: #64748b;">Se nenhum for selecionado, funcionará em todos os canais de texto.</span>
            </div>

            <div class="form-group">
                <label>🎲 Chance de Reagir em cada mensagem (%)</label>
                <input type="number" class="form-control" name="chance" value="${config.chance || 10}" min="1" max="100" placeholder="Ex: 10 para 10% de chance">
                <span style="font-size: 0.75rem; color: #64748b;">Recomendado: entre 5% e 15% para não poluir o chat.</span>
            </div>
        </div>

        <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 15px;">
            <button type="submit" class="btn-save" id="saveFlirtBtn" style="background: linear-gradient(135deg, #ec4899, #be185d);">
                💾 Salvar Configurações
            </button>
        </div>
    </form>
</section>

<script>
    async function saveFlirtConfig(event, guildId) {
        event.preventDefault();
        const btn = document.getElementById('saveFlirtBtn');
        btn.disabled = true;
        btn.innerText = '⏳ Salvando...';

        const form = document.getElementById('flirtForm');
        const formData = new FormData(form);
        const channels = Array.from(form.querySelector('[name="channels"]').selectedOptions).map(opt => opt.value);
        
        const data = {
            enabled: form.querySelector('[name="enabled"]').checked,
            chance: parseInt(formData.get('chance')) || 10,
            channels: channels
        };

        try {
            const res = await fetch(\`/api/guilds/\${guildId}/flirt\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await res.json();
            if (result.success) {
                alert('✅ Configurações de paquera salvas!');
                location.reload();
            } else {
                alert('❌ Erro ao salvar.');
            }
        } catch (err) {
            alert('❌ Erro de conexão com o servidor.');
        } finally {
            btn.disabled = false;
            btn.innerText = '💾 Salvar Configurações';
        }
    }
</script>
    `;
};
