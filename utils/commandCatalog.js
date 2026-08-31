/** Catálogo central de comandos por categoria */

const CATEGORIES = {
    economia: {
        id: 'economia',
        label: 'Economia',
        emoji: '💰',
        description: 'Flocos, cristais, banco e progresso',
        commands: [
            { name: 'saldo', desc: 'Ver flocos e cristais', slash: true },
            { name: 'saldo-bloqueado', desc: 'Valores em liquidação', slash: true },
            { name: 'daily', desc: 'Recompensa diária', slash: true },
            { name: 'banco', desc: 'Conta bancária', slash: true },
            { name: 'depositar', desc: 'Depositar no banco', slash: true },
            { name: 'sacar', desc: 'Sacar do banco', slash: true },
            { name: 'pay', desc: 'Transferir flocos', slash: true },
            { name: 'converter', desc: 'Câmbio flocos ↔ cristais', slash: true },
            { name: 'transacoes', desc: 'Extrato da carteira', slash: true },
            { name: 'xp', desc: 'Nível e experiência', slash: true },
            { name: 'perfil', desc: 'Perfil econômico', slash: true },
            { name: 'addmoney', desc: 'Adicionar moeda (admin)', slash: true },
            { name: 'removemoney', desc: 'Remover moeda (admin)', slash: true }
        ]
    },
    jogos: {
        id: 'jogos',
        label: 'Jogos',
        emoji: '🎮',
        description: 'Apostas e diversão em flocos',
        commands: [
            { name: 'cara', desc: 'Cara ou coroa', slash: true },
            { name: 'dado', desc: 'Aposta no dado', slash: true },
            { name: 'roleta', desc: 'Roleta', slash: true },
            { name: 'slots', desc: 'Caça-níqueis', slash: true },
            { name: 'ppt', desc: 'Pedra papel tesoura', slash: true },
            { name: 'minas', desc: 'Mines', slash: true },
            { name: 'blackjack', desc: 'Blackjack 21', slash: true },
            { name: 'duplicar', desc: 'Dobrar ou perder', slash: true },
            { name: 'quiz', desc: 'Quiz em grupo', slash: true },
            { name: 'conta', desc: 'Contas matemáticas', slash: true },
            { name: 'aura', desc: 'Scanner de aura', slash: true }
        ]
    },
    moderacao: {
        id: 'moderacao',
        label: 'Moderação',
        emoji: '🛡️',
        description: 'Ferramentas da equipe',
        commands: [
            { name: 'ban', desc: 'Banir membro', slash: true },
            { name: 'kick', desc: 'Expulsar membro', slash: true },
            { name: 'warn', desc: 'Advertir', slash: true },
            { name: 'warns', desc: 'Ver advertências', slash: true },
            { name: 'limpar', desc: 'Limpar mensagens', slash: true },
            { name: 'lock', desc: 'Trancar canal', slash: true },
            { name: 'unlock', desc: 'Destrancar canal', slash: true },
            { name: 'slowmode', desc: 'Modo lento', slash: true },
            { name: 'cargo', desc: 'Dar/remover cargo', slash: true }
        ]
    },
    interacoes: {
        id: 'interacoes',
        label: 'Interações',
        emoji: '💞',
        description: 'GIFs e ações entre membros',
        commands: [
            { name: 'abraco', desc: 'Abraçar', slash: true },
            { name: 'beijo', desc: 'Beijar', slash: true },
            { name: 'tapa', desc: 'Dar um tapa', slash: true },
            { name: 'carinho', desc: 'Fazer carinho', slash: true },
            { name: 'cutucar', desc: 'Cutucar', slash: true },
            { name: 'bonk', desc: 'Bonk', slash: true },
            { name: 'morder', desc: 'Morder', slash: true },
            { name: 'dancar', desc: 'Dançar', slash: true },
            { name: 'highfive', desc: 'High five', slash: true }
        ]
    },
    utilidade: {
        id: 'utilidade',
        label: 'Utilidade',
        emoji: '🛠️',
        description: 'Ferramentas do dia a dia',
        commands: [
            { name: 'help', desc: 'Central de ajuda', slash: true },
            { name: 'ping', desc: 'Latência do bot', slash: true },
            { name: 'afk', desc: 'Modo AFK', slash: true },
            { name: 'painel', desc: 'Link do painel web', slash: true },
            { name: 'invites', desc: 'Convites do membro', slash: true },
            { name: 'noticias', desc: 'Notícias por tema', slash: true },
            { name: 'play', desc: 'Tocar música', slash: true }
        ]
    }
};

function listCategories() {
    return Object.values(CATEGORIES);
}

function getCategory(id) {
    const key = String(id || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    if (CATEGORIES[key]) return CATEGORIES[key];
    return (
        listCategories().find(
            (c) =>
                c.id === key ||
                c.label.toLowerCase() === key ||
                c.label
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '') === key
        ) || null
    );
}

module.exports = { CATEGORIES, listCategories, getCategory };
