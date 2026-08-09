module.exports = (guild, channelOptionsHtml) => {
    return `
<section class="config-card" id="logs">
    <div class="config-card-header">
        <span style="font-size: 1.8rem;">📜</span>
        <h2>Sistema de Logs e Registros</h2>
    </div>

    <form onsubmit="saveLogs(event)">
        <div class="form-grid">
            <div class="form-group">
                <label>🗑️ Mensagens Apagadas</label>
                <select class="form-control" name="logDeleted">
                    <option value="">Selecione um canal...</option>
                    ${channelOptionsHtml}
                </select>
            </div>

            <div class="form-group">
                <label>✏️ Mensagens Editadas</label>
                <select class="form-control" name="logEdited">
                    <option value="">Selecione um canal...</option>
                    ${channelOptionsHtml}
                </select>
            </div>

            <div class="form-group">
                <label>📥 Entradas e Saídas de Membros</label>
                <select class="form-control" name="logMembers">
                    <option value="">Selecione um canal...</option>
                    ${channelOptionsHtml}
                </select>
            </div>

            <div class="form-group">
                <label>🎙️ Alterações e Atividades de Voz</label>
                <select class="form-control" name="logVoice">
                    <option value="">Selecione um canal...</option>
                    ${channelOptionsHtml}
                </select>
            </div>

            <div class="form-group">
                <label>🛡️ Punições e Moderação (Bans / Mutes)</label>
                <select class="form-control" name="logMod">
                    <option value="">Selecione um canal...</option>
                    ${channelOptionsHtml}
                </select>
            </div>
        </div>

        <button type="submit" class="btn-save">💾 Salvar Configurações de Logs</button>
    </form>
</section>
    `;
};
