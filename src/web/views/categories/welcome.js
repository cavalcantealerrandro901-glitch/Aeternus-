module.exports = (guild, textChannels) => {
    const savedWelcome = guild.welcomeConfig || {};

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
<section class="config-card" id="welcome" style="margin-top: 30px;">
    <div class="config-card-header">
        <span style="font-size: 1.8rem;">👋</span>
        <h2>Sistema de Boas-Vindas</h2>
    </div>

    <form onsubmit="saveWelcome(event, '${guild.id}')">
        <div class="form-grid">
            <div class="form-group" style="grid-column: 1 / -1;">
                <label>📌 Canal de Boas-Vindas</label>
                <select class="form-control" name="welcomeChannel">
                    ${buildOptions(savedWelcome.welcomeChannel)}
                </select>
            </div>

            <div class="form-group">
                <label>🎨 Cor do Embed (Hexadecimal ou Nome)</label>
                <input type="text" class="form-control" name="embedColor" 
                    placeholder="Ex: #38bdf8, vermelho, azul claro, verde..." 
                    value="${savedWelcome.embedColor || '#38bdf8'}">
            </div>

            <div class="form-group">
                <label>🏷️ Título do Embed</label>
                <input type="text" class="form-control" name="embedTitle" 
                    placeholder="Ex: Bem-vindo(a) ao servidor!" 
                    value="${savedWelcome.embedTitle || '👋 Seja bem-vindo(a)!'}" required>
            </div>

            <div class="form-group" style="grid-column: 1 / -1;">
                <label>💬 Mensagem / Descrição</label>
                <textarea class="form-control" name="embedMessage" rows="4" 
                    placeholder="Escreva sua mensagem aqui... Use {user}, {server}, {memberCount}" required>${savedWelcome.embedMessage || 'Olá {user}, seja muito bem-vindo(a) ao **{server}**!\nAtualmente estamos com **{memberCount}** membros.'}</textarea>
                <small style="color: #64748b; font-size: 0.8rem; margin-top: 4px;">
                    Variáveis disponíveis: <code>{user}</code> (mencionador), <code>{username}</code> (nome), <code>{server}</code> (nome do servidor), <code>{memberCount}</code> (total de membros).
                </small>
            </div>

            <div class="form-group">
                <label>🔗 Texto do Botão (Opcional)</label>
                <input type="text" class="form-control" name="buttonText" 
                    placeholder="Ex: Clique aqui para ler as Regras" 
                    value="${savedWelcome.buttonText || ''}">
            </div>

            <div class="form-group">
                <label>🌐 Link do Botão (URL)</label>
                <input type="url" class="form-control" name="buttonUrl" 
                    placeholder="Ex: https://discord.gg/seulink" 
                    value="${savedWelcome.buttonUrl || ''}">
            </div>
        </div>

        <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 10px;">
            <button type="submit" class="btn-save" id="saveWelcomeBtn">💾 Salvar Boas-Vindas</button>
            <button type="button" class="btn-save" id="testWelcomeBtn" onclick="testWelcome('${guild.id}')" style="background: linear-gradient(135deg, #10b981, #059669);">🧪 Testar Mensagem</button>
        </div>
    </form>
</section>

<script>
    async function saveWelcome(event, guildId) {
        event.preventDefault();
        const btn = document.getElementById('saveWelcomeBtn');
        btn.disabled = true;
        btn.innerText = '⏳ Salvando...';

        const formData = new FormData(event.target);
        const data = Object.fromEntries(formData.entries());

        try {
            const res = await fetch(\`/api/guilds/\${guildId}/welcome\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await res.json();
            if (result.success) {
                alert('✅ Configurações de Boas-Vindas salvas!');
            } else {
                alert('❌ Erro: ' + (result.error || 'Falha ao salvar'));
            }
        } catch (err) {
            alert('❌ Erro de conexão com o servidor.');
        } finally {
            btn.disabled = false;
            btn.innerText = '💾 Salvar Boas-Vindas';
        }
    }

    async function testWelcome(guildId) {
        const btn = document.getElementById('testWelcomeBtn');
        btn.disabled = true;
        btn.innerText = '⏳ Enviando Teste...';

        try {
            const res = await fetch(\`/api/guilds/\${guildId}/welcome/test\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const result = await res.json();
            if (result.success) {
                alert('🧪 Teste enviado com sucesso no canal configurado!');
            } else {
                alert('❌ Erro no Teste: ' + (result.error || 'Verifique se selecionou um canal válido'));
            }
        } catch (err) {
            alert('❌ Erro ao solicitar o teste.');
        } finally {
            btn.disabled = false;
            btn.innerText = '🧪 Testar Mensagem';
        }
    }
</script>
    `;
};
