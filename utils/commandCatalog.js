/** Catálogo central de comandos por categoria */

const CATEGORIES = {
    economia: {
        id: 'economia',
        label: 'Economia',
        emoji: '✨',
        description: 'Éter e XP — progresso e carteira',
        commands: [
            { name: 'saldo', desc: 'Ver éter e XP', slash: true },
            { name: 'daily', desc: 'Recompensa diária em éter', slash: true },
            { name: 'banco', desc: 'Conta bancária', slash: true },
            { name: 'depositar', desc: 'Depositar éter', slash: true },
            { name: 'sacar', desc: 'Sacar éter', slash: true },
            { name: 'pay', desc: 'Transferir éter', slash: true },
            { name: 'transacoes', desc: 'Extrato', slash: true },
            { name: 'xp', desc: 'Nível e experiência', slash: true },
            { name: 'perfil', desc: 'Card de perfil', slash: true },
            { name: 'work', desc: 'Trabalhar por éter', slash: true },
            { name: 'addmoney', desc: 'Adicionar éter (admin)', slash: true },
            { name: 'removemoney', desc: 'Remover éter (admin)', slash: true }
        ]
    },
    jogos: {
        id: 'jogos',
        label: 'Jogos',
        emoji: '🎮',
        description: 'Apostas em éter',
        commands: [
            { name: 'cara', desc: 'Cara ou coroa', slash: true },
            { name: 'dado', desc: 'Aposta no dado', slash: true },
            { name: 'roleta', desc: 'Roleta', slash: true },
            { name: 'slots', desc: 'Caça-níqueis', slash: true },
            { name: 'ppt', desc: 'Pedra papel tesoura', slash: true },
            { name: 'minas', desc: 'Mines', slash: true },
            { name: 'blackjack', desc: 'Blackjack 21', slash: true },
            { name: 'quiz', desc: 'Quiz', slash: true }
        ]
    },
    musica: {
        id: 'musica',
        label: 'Música',
        emoji: '🎵',
        description: 'Player YouTube com fila e controles',
        commands: [
            { name: 'play', desc: 'Tocar música / adicionar à fila', slash: true },
            { name: 'skip', desc: 'Pular faixa', slash: true },
            { name: 'stop', desc: 'Parar e sair do canal', slash: true },
            { name: 'queue', desc: 'Ver fila', slash: true },
            { name: 'np', desc: 'Tocando agora', slash: true },
            { name: 'pause', desc: 'Pausar', slash: true },
            { name: 'resume', desc: 'Retomar', slash: true },
            { name: 'loop', desc: 'Loop faixa/fila', slash: true },
            { name: 'volume', desc: 'Volume 0–150', slash: true }
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
            { name: 'painel', desc: 'Link do painel web', slash: true }
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
