module.exports = (guild) => {
    const currentPrefix = guild.prefix || '!';

    return `
<section class="config-card" id="prefix-config">
    <div class="config-card-header">
        <span style="font-size: 1.8rem;">⚙️</span>
        <div>
            <h2>Prefixo de Comandos</h2>
            <span style="font-size: 0.8rem; color: #38bdf8; font-weight: 700;">
                ● Prefixo Atual: <code style="background: rgba(56,189,248,0.2); padding: 2px 6px; border-radius: 4px;">${currentPrefix}</code>
            </span>
        </div>
    </div>

    <p style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 20px; line-height: 1.5;">
        Defina o caractere de prefixo usado para chamar os comandos de texto do bot neste servidor.
    </p>

    <form onsubmit="savePrefixConfig(event, '${guild.id}')" style="background: rgba(0, 0, 0, 0.2); padding: 20px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.06);">
        <div class="form-grid">
            <div class="form-group">
                <label>🔤 Novo Prefixo</label>
                <input type="text" class="form-control" name="prefix" value="${currentPrefix}" maxlength="5" required placeholder="Ex: !, ., ?, a!">
            </div>
        </div>

        <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 15px;">
            <button type="submit" class="btn-save" id="savePrefixBtn" style="background: linear-gradient(135deg, #10b981, #059669);">
                💾 Salvar Prefixo
            </button>
        </div>
    </form>
</section>

<script>
    async function savePrefixConfig(event, guildId) {
        event.preventDefault();
        const btn = document.getElementById('savePrefixBtn');
        btn.disabled = true;
        btn.innerText = '⏳ Salvando...';

        const formData = new FormData(event.target);
        const data = Object.fromEntries(formData.entries());

        try {
            const res = await fetch(\`/api/guilds/\${guildId}/prefix\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await res.json();
            if (result.success) {
                alert('✅ Prefixo alterado com sucesso!');
                location.reload();
            } else {
                alert('❌ Erro: ' + (result.error || 'Falha ao salvar prefixo.'));
            }
        } catch (err) {
            alert('❌ Erro de conexão com o servidor.');
        } finally {
            btn.disabled = false;
            btn.innerText = '💾 Salvar Prefixo';
        }
    }
</script>
    `;
};
