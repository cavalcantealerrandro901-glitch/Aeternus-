module.exports = (guild) => {
    const config = guild.prefix || '!';

    return `
<section class="config-card" id="prefix-config" style="margin-bottom: 25px;">
    <div class="config-card-header">
        <span style="font-size: 1.8rem;">⚙️</span>
        <div>
            <h2>Prefixo do Bot</h2>
            <span style="font-size: 0.8rem; color: #38bdf8; font-weight: 700;">
                Prefixo Atual: "<span id="currentPrefixDisplay">${config}</span>"
            </span>
        </div>
    </div>

    <p style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 20px; line-height: 1.5;">
        Altere o símbolo utilizado para executar os comandos de texto no servidor.
    </p>

    <form id="prefixForm" onsubmit="savePrefixConfig(event, '${guild.id}')" style="background: rgba(0, 0, 0, 0.2); padding: 20px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.06);">
        <div class="form-group" style="max-width: 250px; margin-bottom: 15px;">
            <label>Novo Prefixo (Máx. 5 caracteres)</label>
            <input type="text" class="form-control" name="prefix" value="${config}" maxlength="5" required placeholder="Ex: !, ?, b!">
        </div>

        <button type="submit" class="btn-save" id="savePrefixBtn" style="background: linear-gradient(135deg, #38bdf8, #0284c7);">
            💾 Salvar Prefixo
        </button>
    </form>
</section>

<script>
    async function savePrefixConfig(event, guildId) {
        event.preventDefault();
        const btn = document.getElementById('savePrefixBtn');
        btn.disabled = true;
        btn.innerText = '⏳ Salvando...';

        const form = document.getElementById('prefixForm');
        const formData = new FormData(form);
        const prefix = formData.get('prefix');

        try {
            const res = await fetch(\`/api/guilds/\${guildId}/prefix\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prefix })
            });

            const result = await res.json();
            if (result.success) {
                alert('✅ Prefixo alterado com sucesso para: ' + result.prefix);
                document.getElementById('currentPrefixDisplay').innerText = result.prefix;
                location.reload();
            } else {
                alert('❌ ' + (result.message || 'Erro ao salvar prefixo.'));
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
