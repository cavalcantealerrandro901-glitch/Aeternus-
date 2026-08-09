module.exports = (guild) => {
    const config = guild.flirtConfig || {};

    return `
<section class="config-card" id="flirt-config">
    <div class="config-card-header">
        <span style="font-size: 1.8rem;">💖</span>
        <div>
            <h2>Modo Paquerar (Interação Automática)</h2>
            <span style="font-size: 0.8rem; color: #10b981; font-weight: 700;">
                ● Sempre Ativo em Todos os Canais
            </span>
        </div>
    </div>

    <p style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 20px; line-height: 1.5;">
        O bot interagirá de forma surpresa em <b>todos os canais</b> de texto! Basta escolher como ele deve reagir e definir a chance.
    </p>

    <form id="flirtForm" onsubmit="saveFlirtConfig(event, '${guild.id}')" style="background: rgba(0, 0, 0, 0.2); padding: 20px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.06);">
        
        <div class="form-grid">
            <div class="form-group">
                <label>🎭 Modo de Interação</label>
                <select class="form-control" name="mode">
                    <option value="emoji" ${config.mode === 'emoji' ? 'selected' : ''}>Apenas Reagir com Emojis</option>
                    <option value="gif" ${config.mode === 'gif' ? 'selected' : ''}>Enviar Figurinhas Animadas (GIFs)</option>
                    <option value="both" ${config.mode === 'both' ? 'selected' : ''}>Ambos (Sorteio entre Emoji e Figurinha)</option>
                </select>
            </div>

            <div class="form-group">
                <label>🎲 Chance de Interagir (%)</label>
                <input type="number" class="form-control" name="chance" value="${config.chance || 10}" min="1" max="100">
                <span style="font-size: 0.75rem; color: #64748b;">Coloque 100% para testar e depois diminua (Ex: 10).</span>
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
        
        // Salvamos apenas os dados essenciais (sem checar checkbox ou canal)
        const data = {
            chance: parseInt(formData.get('chance')) || 10,
            mode: formData.get('mode') || 'emoji'
        };

        try {
            const res = await fetch(\`/api/guilds/\${guildId}/flirt\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await res.json();
            if (result.success) {
                alert('✅ Sistema de paquera global salvo!');
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
