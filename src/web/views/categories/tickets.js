module.exports = (guild) => {
    const config = guild.ticketConfig || {};

    return `
<section class="config-card" id="ticket-panel">
    <div class="config-card-header" style="display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 1.8rem;">🎫</span>
            <div>
                <h2>Sistema de Tickets & Atendimento</h2>
                <span style="font-size: 0.8rem; color: #38bdf8; font-weight: 700;">
                    ● Central de Suporte Profissional
                </span>
            </div>
        </div>
        <button type="button" class="btn-action-save" onclick="openTicketEditor()" style="padding: 8px 16px; font-size: 0.85rem;">
            ✏️ Editar Configurações
        </button>
    </div>

    <p style="font-size: 0.85rem; color: #94a3b8; margin: 15px 0; line-height: 1.5;">
        Gerencie canais de atendimento automatizados. Permite que membros abram tickets privados com suporte a botões interativos, menus de seleção e tópicos dedicados.
    </p>

    <div style="width: 100%; max-height: 200px; overflow: hidden; border-radius: 12px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.06);">
        <img src="https://media.giphy.com/media/3oKIPnmiqNhZIleLPW/giphy.gif" alt="Tickets Preview" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.85;">
    </div>

    <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 14px; padding: 20px; position: relative;">
        <div style="position: absolute; top: 15px; right: 15px; background: rgba(56,189,248,0.1); color: #38bdf8; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700;">
            Prévia ao Vivo
        </div>
        <h4 style="color: #fff; margin-bottom: 10px; font-size: 1rem;">📢 Painel Exemplo no Discord</h4>
        <div style="background: #1e293b; padding: 15px; border-radius: 10px; border-left: 4px solid #38bdf8; font-size: 0.9rem; color: #cbd5e1;">
            <strong>[Painel de Atendimento]</strong><br>
            Clique no botão abaixo para abrir um ticket de suporte com nossa equipe.
        </div>
        <div style="display: flex; gap: 10px; margin-top: 12px;">
            <button disabled style="background: #38bdf8; color: #0f172a; border: none; padding: 6px 14px; border-radius: 6px; font-weight: 700; font-size: 0.8rem;">🎫 Abrir Ticket</button>
        </div>
    </div>
</section>

<div id="ticketEditorModal" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15,23,42,0.85); backdrop-filter: blur(6px); z-index: 1500; align-items: center; justify-content: center; padding: 20px;">
    <div style="background: #1e293b; border: 1px solid rgba(255,255,255,0.1); width: 100%; max-width: 800px; border-radius: 20px; overflow: hidden; display: flex; flex-direction: column; max-height: 90vh; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
        
        <div style="padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: center;">
            <h3 style="color: #fff; font-size: 1.2rem;">🛠️ Editor do Sistema de Tickets</h3>
            <button onclick="closeTicketEditor()" style="background: none; border: none; color: #94a3b8; font-size: 1.5rem; cursor: pointer;">&times;</button>
        </div>

        <div style="display: flex; background: #0f172a; padding: 0 20px; border-bottom: 1px solid rgba(255,255,255,0.06); gap: 10px;">
            <button type="button" class="ticket-tab-btn active" onclick="switchTicketTab(event, 'tab-interface')" style="padding: 12px 16px; background: none; border: none; color: #38bdf8; font-weight: 700; border-bottom: 2px solid #38bdf8; cursor: pointer;">1. Interface do Painel</button>
            <button type="button" class="ticket-tab-btn" onclick="switchTicketTab(event, 'tab-message')" style="padding: 12px 16px; background: none; border: none; color: #94a3b8; font-weight: 600; cursor: pointer;">2. Mensagem de Abertura</button>
            <button type="button" class="ticket-tab-btn" onclick="switchTicketTab(event, 'tab-destination')" style="padding: 12px 16px; background: none; border: none; color: #94a3b8; font-weight: 600; cursor: pointer;">3. Destino & Comportamento</button>
        </div>

        <form id="ticketConfigForm" onsubmit="saveTicketConfig(event, '${guild.id}')" style="padding: 24px; overflow-y: auto; flex: 1;">
            
            <div id="tab-interface" class="ticket-tab-content">
                <h4 style="color: #38bdf8; margin-bottom: 10px; font-size: 1rem;">📢 Configuração da Mensagem Principal</h4>
                <p style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 15px;">Edite o texto que aparecerá no embed fixado onde os membros irão interagir.</p>
                
                <div class="form-group" style="margin-bottom: 15px;">
                    <label style="font-size: 0.85rem; color: #cbd5e1; display: block; margin-bottom: 6px;">Texto / Embed do Painel</label>
                    <textarea class="form-control" name="panelMessage" rows="4" style="width: 100%; background: #0f172a; border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 10px; border-radius: 8px;">${config.panelMessage || 'Clique no botão abaixo para abrir um atendimento com nossa equipe.'}</textarea>
                </div>

                <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div class="form-group">
                        <label style="font-size: 0.85rem; color: #cbd5e1; display: block; margin-bottom: 6px;">Estilo de Exibição</label>
                        <select class="form-control" name="panelStyle" style="width: 100%; background: #0f172a; border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 10px; border-radius: 8px;">
                            <option value="buttons" ${config.panelStyle === 'buttons' ? 'selected' : ''}>Botões Individuais</option>
                            <option value="dropdown" ${config.panelStyle === 'dropdown' ? 'selected' : ''}>Menu de Seleção (Dropdown)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label style="font-size: 0.85rem; color: #cbd5e1; display: block; margin-bottom: 6px;">Nome do Botão / Opção</label>
                        <input type="text" class="form-control" name="buttonName" value="${config.buttonName || 'Abrir Ticket'}" style="width: 100%; background: #0f172a; border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 10px; border-radius: 8px;">
                    </div>
                </div>
            </div>

            <div id="tab-message" class="ticket-tab-content" style="display: none;">
                <h4 style="color: #38bdf8; margin-bottom: 10px; font-size: 1rem;">💬 Mensagem Enviada ao Abrir o Ticket</h4>
                <p style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 15px;">Escolha como o bot recepcionará o usuário dentro do canal privado criado.</p>
                
                <div class="form-group" style="margin-bottom: 15px;">
                    <label style="font-size: 0.85rem; color: #cbd5e1; display: block; margin-bottom: 6px;">Formato da Mensagem</label>
                    <select class="form-control" name="openFormat" style="width: 100%; background: #0f172a; border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 10px; border-radius: 8px;">
                        <option value="embed" ${config.openFormat === 'embed' ? 'selected' : ''}>Embed Estilizado</option>
                        <option value="text" ${config.openFormat === 'text' ? 'selected' : ''}>Texto Simples</option>
                        <option value="both" ${config.openFormat === 'both' ? 'selected' : ''}>Ambos (Texto + Embed)</option>
                    </select>
                </div>

                <div class="form-group" style="margin-bottom: 15px;">
                    <label style="font-size: 0.85rem; color: #cbd5e1; display: block; margin-bottom: 6px;">Conteúdo Inicial</label>
                    <textarea class="form-control" name="openMessage" rows="3" style="width: 100%; background: #0f172a; border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 10px; border-radius: 8px;">Olá {user}, a equipe de suporte atenderá você em breve. Descreva seu problema.</textarea>
                    <span style="font-size: 0.75rem; color: #64748b;">Variáveis disponíveis: <code>{user}</code> (Nome), <code>{userId}</code> (ID), <code>{guild}</code> (Servidor)</span>
                </div>
            </div>

            <div id="tab-destination" class="ticket-tab-content" style="display: none;">
                <h4 style="color: #38bdf8; margin-bottom: 10px; font-size: 1rem;">⚙️ Comportamento de Criação</h4>
                <p style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 15px;">Defina onde e de que forma o canal de ticket será gerado na estrutura do servidor.</p>

                <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div class="form-group">
                        <label style="font-size: 0.85rem; color: #cbd5e1; display: block; margin-bottom: 6px;">Tipo de Canal</label>
                        <select class="form-control" name="channelType" style="width: 100%; background: #0f172a; border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 10px; border-radius: 8px;">
                            <option value="text" ${config.channelType === 'text' ? 'selected' : ''}>Canal de Texto Privado</option>
                            <option value="thread" ${config.channelType === 'thread' ? 'selected' : ''}>Tópico Privado</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label style="font-size: 0.85rem; color: #cbd5e1; display: block; margin-bottom: 6px;">Posicionamento</label>
                        <select class="form-control" name="position" style="width: 100%; background: #0f172a; border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 10px; border-radius: 8px;">
                            <option value="top" ${config.position === 'top' ? 'selected' : ''}>No Topo da Lista</option>
                            <option value="bottom" ${config.position === 'bottom' ? 'selected' : ''}>No Final do Servidor</option>
                            <option value="category" ${config.position === 'category' ? 'selected' : ''}>Em Categoria Específica</option>
                        </select>
                    </div>
                </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 15px;">
                <button type="button" onclick="closeTicketEditor()" style="background: rgba(239,68,68,0.2); color: #ef4444; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer;">Cancelar</button>
                <button type="submit" class="btn-action-save" id="saveTicketBtn" style="padding: 10px 24px;">🚀 Criar / Salvar Configuração</button>
            </div>
        </form>
    </div>
</div>

<script>
    function openTicketEditor() {
        document.getElementById('ticketEditorModal').style.display = 'flex';
    }

    function closeTicketEditor() {
        document.getElementById('ticketEditorModal').style.display = 'none';
    }

    function switchTicketTab(event, tabId) {
        document.querySelectorAll('.ticket-tab-content').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.ticket-tab-btn').forEach(btn => {
            btn.style.color = '#94a3b8';
            btn.style.fontWeight = '600';
            btn.style.borderBottom = 'none';
        });

        document.getElementById(tabId).style.display = 'block';
        event.currentTarget.style.color = '#38bdf8';
        event.currentTarget.style.fontWeight = '700';
        event.currentTarget.style.borderBottom = '2px solid #38bdf8';
    }

    async function saveTicketConfig(event, guildId) {
        event.preventDefault();
        const btn = document.getElementById('saveTicketBtn');
        btn.disabled = true;
        btn.innerText = '⏳ Salvando...';

        const form = document.getElementById('ticketConfigForm');
        const formData = new FormData(form);

        const data = {
            panelMessage: formData.get('panelMessage'),
            panelStyle: formData.get('panelStyle'),
            buttonName: formData.get('buttonName'),
            openFormat: formData.get('openFormat'),
            openMessage: formData.get('openMessage'),
            channelType: formData.get('channelType'),
            position: formData.get('position')
        };

        try {
            const res = await fetch(\`/api/guilds/\${guildId}/tickets\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await res.json();
            if (result.success) {
                closeTicketEditor();
                location.reload();
            } else {
                alert('❌ Erro ao salvar sistema de tickets.');
            }
        } catch (err) {
            alert('❌ Erro de conexão com o servidor.');
        } finally {
            btn.disabled = false;
            btn.innerText = '🚀 Criar / Salvar Configuração';
        }
    }
</script>
    `;
};
