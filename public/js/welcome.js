async function testWelcome() {
    const guildId = window.selectedGuildId;
    if (!guildId) return alert('Nenhum servidor selecionado!');

    const btn = document.querySelector('.btn-test');
    const oldText = btn.innerHTML;
    btn.innerText = '⏳ Enviando teste...';
    btn.disabled = true;

    try {
        const response = await fetch('/api/test-welcome', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guildId })
        });

        const data = await response.json();
        if (response.ok && data.success) {
            alert('✅ ' + data.message);
        } else {
            alert('❌ Erro: ' + (data.error || 'Falha ao enviar mensagem de teste.'));
        }
    } catch (err) {
        alert('❌ Erro de conexão com o servidor.');
    } finally {
        btn.innerHTML = oldText;
        btn.disabled = false;
    }
}
