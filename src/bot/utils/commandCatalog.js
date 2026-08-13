/** Lista estática dos comandos do bot para a IA (slash + prefixo). */

const COMMANDS = [
    { name: 'ai / ia', desc: 'Conversar com a IA (clima, servidor, saldo, comandos, etc.)' },
    { name: 'balance / bal / saldo / atm', desc: 'Ver saldo de Almas (próprio ou de outro usuário)' },
    { name: 'pay / pagar', desc: 'Transferir Almas para outro usuário' },
    { name: 'daily / diario', desc: 'Coletar bônus diário de Almas (reseta à meia-noite)' },
    { name: 'work / trabalhar', desc: 'Trabalhar para ganhar Almas e XP de cargo' },
    { name: 'leaderboard / ranking', desc: 'Top jogadores em Almas' },
    { name: 'coinflip / cf', desc: 'Apostar cara ou coroa' },
    { name: 'dice / dado', desc: 'Apostar em número do dado 1–6' },
    { name: 'slots', desc: 'Caça-níqueis de Almas' },
    { name: 'roulette / roleta', desc: 'Apostar vermelho, preto ou verde' },
    { name: 'ban', desc: 'Banir membro (moderação)' },
    { name: 'kick', desc: 'Expulsar membro' },
    { name: 'timeout', desc: 'Silenciar membro por tempo' },
    { name: 'ticket', desc: 'Fechar ou reivindicar ticket de suporte' },
    { name: 'serverinfo', desc: 'Informações do servidor' },
    { name: 'userinfo', desc: 'Informações de um usuário' },
    { name: 'ping', desc: 'Latência do bot' },
    { name: 'help', desc: 'Lista de ajuda' },
    { name: 'painel', desc: 'Link do painel web' },
    { name: 'daracesso / tiraracesso / acessoeditor', desc: 'Gerenciar quem acessa o Editor (só dono)' }
];

function listCommandsText(prefix = '!') {
    return COMMANDS.map((c) => `• ${c.name} — ${c.desc}`).join('\n') +
        `\nPrefixo padrão do servidor: ${prefix} (também há slash commands).`;
}

function listCommandsFromClient(client, prefix = '!') {
    if (!client?.commands?.size) return listCommandsText(prefix);
    const lines = [];
    for (const [, cmd] of client.commands) {
        const name = cmd.data?.name || 'comando';
        const desc = cmd.data?.description || '';
        const aliases = Array.isArray(cmd.aliases) && cmd.aliases.length
            ? ` (aliases: ${cmd.aliases.join(', ')})`
            : '';
        lines.push(`• /${name}${aliases} — ${desc}`);
    }
    lines.push(`Prefixo do servidor: ${prefix}`);
    return lines.join('\n');
}

module.exports = {
    COMMANDS,
    listCommandsText,
    listCommandsFromClient
};
