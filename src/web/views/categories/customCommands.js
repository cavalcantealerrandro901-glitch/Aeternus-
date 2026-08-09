module.exports = (guild) => {
    const commands = guild.customCommandsConfig || [];

    const buildCommandsList = () => {
        if (!commands || commands.length === 0) {
            return `
            <div style="text-align: center; padding: 30px 10px; color: #64748b; background: rgba(0,0,0,0.2); border-radius: 12px; border: 1px dashed rgba(255,255,255,0.1);">
                <p style="font-size: 0.95rem;">Nenhum comando personalizado criado ainda.</p>
            </div>`;
        }

        return commands.map((cmd) => {
            const encodedResponse = encodeURIComponent(cmd.response);

            return `
            <div style="background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.08); padding: 16px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 200px;">
                    <div style="font-weight: 700; color: #38bdf8; font-size: 1.05rem; display: flex; align-items: center; gap: 8px;">
                        ⚡ <span>!${cmd.name}</span>
                        ${cmd.isEmbed ? '<span style="font-size: 0.7rem; background: rgba(56, 189, 248, 0.2); border: 1px solid #38bdf8; color: #38bdf8; padding: 2px 8px; border-radius: 10px;">Embed</span>' : '<span style="font-size: 0.7rem; background: rgba(255,255,255,0.1); color: #cbd5e1; padding: 2px 8px; border-radius: 10px;">Texto</span>'}
                    </div>
                    <div style="font-size: 0.85rem; color: #94a3b8; margin-top: 6px; word-break: break-word;">
                        ${cmd.response.length > 90 ? cmd.response.substring(0, 90) + '...' : cmd.response}
                    </div>
                </div>
                
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button type="button" 
                        data-name="${cmd.name}"
                        data-embed="${cmd.isEmbed}"
                        data-response="${encodedResponse}"
                        onclick="prepareEditFromBtn(this)"
                        style="background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.4); color: #38bdf8; padding: 8px 14px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 4px;">
                        ✏️ Editar
                    </button>
                    
                    <button type="button" onclick="deleteCommand('${guild.id}', '${cmd.name}')" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #f87171; padding: 8px 14px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                        🗑️ Excluir
                    </button>
                </div>
            </div>
            `;
        }).join('');
    };

    return `
<section class="config-card" id="custom-commands" style="margin-top: 30px;">
    <div class="config-card-header">
        <span style="font-size: 1.8rem;">🛠️</span>
        <h2 id="formTitle">Criar / Editar Comando Personalizado</h2>
    </div>

    <p style="font-size: 0.9rem; color: #94a3b8; margin-bottom: 20px; line-height: 1.5;">
        Crie e edite comandos customizados para o seu servidor. Quando um membro digitar o comando (ex: <b>!regras</b> ou <b>!loja</b>), o bot responderá automaticamente.
    </p>

    <form id="cmdForm" onsubmit="saveCommand(event, '${guild.id}')" style="background: rgba(0, 0, 0, 0.2); padding: 20px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.06); margin-bottom: 28px;">
        <input type="hidden" name="oldCmdName" id="oldCmdName" value="">

        <div class="form-grid">
            <div class="form-group">
                <label>📌 Nome do Comando (Sem espaço ou acento)</label>
                <div style="display: flex; align-items: center; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; padding-left: 12px;">
                    <span style="color: #38bdf8; font-weight: 800;">!</span>
                    <input type="text" class="form-control" name="cmdName" id="cmdName" placeholder="regras" style="border: none; background: transparent;" required pattern="^[a-zA-Z0-9_-]+$" title="Use apenas letras, números, traços e underline.">
                </div>
            </div>

            <div class="form-group">
                <label>🎨 Estilo da Resposta</label>
                <select class="form-control" name="isEmbed" id="isEmbed">
                    <option value="false">Mensagem de Texto Simples</option>
                    <option value="true">Caixa Embed Destacada</option>
                </select>
            </div>

            <div class="form-group" style="grid-column: 1 / -1;">
                <label>💬 Mensagem de Resposta</label>
                <textarea class="form-control" name="cmdResponse" id="cmdResponse" rows="4" placeholder="Digite a resposta que o bot enviará quando o comando for usado..." required style="resize: vertical;"></textarea>
            </div>
        </div>

        <div style="display: flex; gap: 12px; align-items: center;">
            <button type="submit" class="btn-save" id="addCmdBtn" style="background: linear-gradient(135deg, #10b981, #059669);">
                ➕ Salvar Novo Comando
            </button>
            <button type="button" id="cancelEditBtn" onclick="resetCmdForm()" style="display: none; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #cbd5e1; padding: 12px 20px; border-radius: 12px; font-weight: 700; cursor: pointer;">
                ✕ Cancelar Edição
            </button>
        </div>
    </form>

    <h3 style="font-size: 1.05rem; color: #fff; margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
        📋 Comandos Ativos no Servidor (${commands.length})
    </h3>

    <div style="display: flex; flex-direction: column; gap: 12px;">
        ${buildCommandsList()}
    </div>
</section>

<script>
    function prepareEditFromBtn(btn) {
        const name = btn.getAttribute('data-name');
        const isEmbed = btn.getAttribute('data-embed');
        const response = decodeURIComponent(btn.getAttribute('data-response'));

        document.getElementById('oldCmdName').value = name;
        document.getElementById('cmdName').value = name;
        document.getElementById('isEmbed').value = isEmbed;
        document.getElementById('cmdResponse').value = response;

        const saveBtn = document.getElementById('addCmdBtn');
        saveBtn.innerText = '✏️ Salvar Alterações';
        saveBtn.style.background = 'linear-gradient(135deg, #38bdf8, #2563eb)';

        document.getElementById('cancelEditBtn').style.display = 'inline-block';
        document.getElementById('cmdForm').scrollIntoView({ behavior: 'smooth' });
    }

    function resetCmdForm() {
        document.getElementById('oldCmdName').value = '';
        document.getElementById('cmdName').value = '';
        document.getElementById('isEmbed').value = 'false';
        document.getElementById('cmdResponse').value = '';

        const saveBtn = document.getElementById('addCmdBtn');
        saveBtn.innerText = '➕ Salvar Novo Comando';
        saveBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';

        document.getElementById('cancelEditBtn').style.display = 'none';
    }

    async function saveCommand(event, guildId) {
        event.preventDefault();
        const btn = document.getElementById('addCmdBtn');
        btn.disabled = true;
        btn.innerText = '⏳ Salvando...';

        const formData = new FormData(event.target);
        const data = Object.fromEntries(formData.entries());

        try {
            const res = await fetch(\`/api/guilds/\${guildId}/custom-commands\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await res.json();
            if (result.success) {
                alert('✅ Comando salvos com sucesso!');
                window.location.reload();
            } else {
                alert('❌ Erro: ' + (result.error || 'Falha ao salvar comando'));
            }
        } catch (err) {
            alert('❌ Erro de conexão com o servidor.');
        } finally {
            btn.disabled = false;
        }
    }

    async function deleteCommand(guildId, cmdName) {
        if (!confirm('Tem certeza que deseja excluir o comando !' + cmdName + '?')) return;

        try {
            const res = await fetch(\`/api/guilds/\${guildId}/custom-commands/\${cmdName}\`, {
                method: 'DELETE'
            });

            const result = await res.json();
            if (result.success) {
                alert('🗑️ Comando excluído!');
                window.location.reload();
            } else {
                alert('❌ Erro: ' + (result.error || 'Falha ao excluir comando'));
            }
        } catch (err) {
            alert('❌ Erro ao excluir comando.');
        }
    }
</script>
    `;
};
