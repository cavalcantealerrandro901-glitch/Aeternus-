// Exemplo de como ajustar a rota que retorna a lista de comandos (/api/commands):

app.get('/api/commands', (req, res) => {
    // Certifique-se de que está mapeando o array de comandos do seu bot
    const commandsList = client.commands ? Array.from(client.commands.values()).map(cmd => ({
        name: cmd.data?.name || cmd.name || 'desconhecido',
        description: cmd.data?.description || cmd.description || 'Nenhuma descrição fornecida.'
    })) : [];

    res.json(commandsList);
});
