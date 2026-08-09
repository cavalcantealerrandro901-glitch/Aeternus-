module.exports = (guild, textChannels) => {
    const savedLogs = guild.logsConfig || {};

    const buildOptions = (selectedId) => {
        let html = `<option value="">Nenhum canal selecionado</option>`;
        if (textChannels && textChannels.length > 0) {
            html += textChannels.map(c => 
                `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}># ${c.name}</option>`
            ).join('');
        }
        return html;
    };

    return `
<section class="config-card" id="logs">
    <div class="config-card-header">
        <span style="font-size: 1.8rem;">📜</span>
        <h2>Sistema de Logs e Registros</h2>
    </div>

    <form onsubmit="saveLogs(event, '${guild.id}')">
        <div class="form-grid">
            <div class="form-group">
                <label>🗑️ Mensagens Apagadas</label>
                <select class="form-control" name="logDeleted">
                    ${buildOptions(savedLogs.logDeleted)}
                </select>
            </div>

            <div class="form-group">
                <label>✏️ Mensagens Editadas</label>
                <select class="form-control" name="logEdited">
                    ${buildOptions(savedLogs.logEdited)}
                </select>
            </div>

            <div class="form-group">
                <label>📥 Entradas e Saídas de Membros</label>
                <select class="form-control" name="logMembers">
                    ${buildOptions(savedLogs.logMembers)}
                </select>
            </div>

            <div class="form-group">
                <label>🎙️ Alterações de Voz</label>
                <select class="form-control" name="logVoice">
                    ${buildOptions(savedLogs.logVoice)}
                </select>
            </div>

            <div class="form-group">
                <label>🛡️ Punições e Moderação</label>
                <select class="form-control" name="logMod">
                    ${buildOptions(savedLogs.logMod)}
                </select>
            </div>
        </div>

        <button type="submit" class="btn-save" id="saveLogsBtn">💾 Salvar Configurações de Logs</button>
    </form>
</section>

<script>
    async function saveLogs(event, guildId) {
        event.preventDefault();
        const btn = document.getElementById('saveLogsBtn');
        btn.disabled = true;
        btn.innerText = '⏳ Salvando...';

        const formData = new FormData(event.target);
        const data = Object.fromEntries(formData.entries());

        try {
            const res = await fetch(\`/api/guilds/\${guildId}/logs\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await res.json();
            if (result.success) {
                alert('✅ Configurações de Logs salvas com sucesso!');
            } else {
                alert('❌ Erro: ' + (result.error || 'Falha ao salvar'));
            }
        } catch (err) {
            alert('❌ Erro de conexão com o servidor.');
        } finally {
            btn.disabled = false;
            btn.innerText = '💾 Salvar Configurações de Logs';
        }
    }
</script>
    `;
};
