/** Catálogo central de comandos por categoria */

const CATEGORIES = {
    economia: {
        id: 'economia',
        label: 'Economia',
        emoji: '✨',
        description: 'Éter e XP — progresso e carteira',
        commands: [
            { name: 'saldo', desc: 'Ver éter e XP', usage: 'saldo [@user]', example: 'O.saldo @user', about: 'Mostra a carteira de éter, nível e progresso de XP.' },
            { name: 'daily', desc: 'Recompensa diária', usage: 'daily', example: 'O.daily', about: 'Abre o painel da recompensa diária de éter.' },
            { name: 'banco', desc: 'Ver banco', usage: 'banco [@user]', example: 'O.banco', about: 'Mostra carteira, cofre e total de éter.' },
            { name: 'depositar', desc: 'Depositar no banco', usage: 'depositar <valor|all|half>', example: 'O.dep 1k', about: 'Guarda éter no cofre (protegido de roubos).' },
            { name: 'sacar', desc: 'Sacar do banco', usage: 'sacar <valor|all|half>', example: 'O.sacar 500', about: 'Retira éter do cofre para a carteira.' },
            { name: 'pay', desc: 'Transferir éter', usage: 'pay @user <valor>', example: 'O.pay @user 2k', about: 'Envia éter da sua carteira para outro membro.' },
            { name: 'transacoes', desc: 'Extrato', usage: 'transacoes', example: 'O.transacoes', about: 'Lista as últimas movimentações de éter.' },
            { name: 'work', desc: 'Trabalhar por éter', usage: 'work', example: 'O.work', about: 'Ganha éter trabalhando (com ranking de cargos).' },
            { name: 'beg', desc: 'Pedir éter', usage: 'beg', example: 'O.beg', about: 'Pede uma quantia aleatória de éter (cooldown).' },
            { name: 'crime', desc: 'Crime por éter', usage: 'crime', example: 'O.crime', about: 'Tenta um crime: ganha ou perde éter.' },
            { name: 'rob', desc: 'Roubar éter', usage: 'rob @user', example: 'O.rob @user', about: 'Tenta roubar éter de outro membro.' },
            { name: 'addmoney', desc: 'Adicionar éter (admin)', usage: 'addmoney @user <valor>', example: 'O.addmoney @user 10k', about: 'Adiciona éter a um membro (administradores).' },
            { name: 'removemoney', desc: 'Remover éter (admin)', usage: 'removemoney @user <valor>', example: 'O.removemoney @user 1k', about: 'Remove éter de um membro (administradores).' }
        ]
    },
    jogos: {
        id: 'jogos',
        label: 'Jogos',
        emoji: '🎮',
        description: 'Apostas e diversão em éter',
        commands: [
            { name: 'cara', desc: 'Cara ou coroa', usage: 'cara <cara|coroa> <valor>', example: 'O.cara cara 100', about: 'Aposta em cara ou coroa (2x se ganhar).' },
            { name: 'dado', desc: 'Aposta no dado', usage: 'dado <1-6> <valor>', example: 'O.dado 4 200', about: 'Aposta em um número do dado (6x se acertar).' },
            { name: 'slots', desc: 'Caça-níqueis', usage: 'slots <valor>', example: 'O.slots 150', about: 'Gira os rolos e multiplica o prêmio conforme o resultado.' },
            { name: 'ppt', desc: 'Pedra papel tesoura', usage: 'ppt <pedra|papel|tesoura> <valor>', example: 'O.ppt pedra 50', about: 'Joga jokenpô contra o bot.' },
            { name: 'roleta', desc: 'Roleta', usage: 'roleta <valor>', example: 'O.roleta 100', about: 'Gira a roleta e tenta multiplicar o éter.' },
            { name: 'minas', desc: 'Mines', usage: 'minas <valor>', example: 'O.minas 500', about: 'Jogo de minas: escolha casas e saque antes de explodir.' },
            { name: 'blackjack', desc: 'Blackjack 21', usage: 'blackjack <valor>', example: 'O.bj 1000', about: 'Clássico 21 contra o dealer.' },
            { name: 'quiz', desc: 'Quiz', usage: 'quiz [tema]', example: 'O.quiz matemática', about: 'Perguntas no canal até o tempo acabar; ranking de acertos.' },
            { name: 'pvp', desc: 'Duelo PVP', usage: 'pvp @user', example: 'O.pvp @user', about: 'Duelo por turnos entre jogadores.' }
        ]
    },
    moderacao: {
        id: 'moderacao',
        label: 'Moderação',
        emoji: '🛡️',
        description: 'Ferramentas da equipe',
        commands: [
            { name: 'ban', desc: 'Banir membro', usage: 'ban @user [motivo]', example: 'O.ban @user spam', about: 'Bane o membro do servidor.' },
            { name: 'kick', desc: 'Expulsar membro', usage: 'kick @user [motivo]', example: 'O.kick @user', about: 'Expulsa o membro sem banir.' },
            { name: 'mute', desc: 'Silenciar', usage: 'mute @user <minutos> [motivo]', example: 'O.mute @user 10', about: 'Aplica timeout no membro.' },
            { name: 'unmute', desc: 'Remover silêncio', usage: 'unmute @user', example: 'O.unmute @user', about: 'Remove o timeout.' },
            { name: 'warn', desc: 'Advertir', usage: 'warn @user [motivo]', example: 'O.warn @user', about: 'Registra uma advertência.' },
            { name: 'warns', desc: 'Ver advertências', usage: 'warns [@user]', example: 'O.warns @user', about: 'Lista as advertências do membro.' },
            { name: 'limpar', desc: 'Limpar mensagens', usage: 'limpar <1-100>', example: 'O.limpar 20', about: 'Apaga mensagens recentes do canal.' },
            { name: 'lock', desc: 'Trancar canal', usage: 'lock', example: 'O.lock', about: 'Impede @everyone de enviar mensagens.' },
            { name: 'unlock', desc: 'Destrancar canal', usage: 'unlock', example: 'O.unlock', about: 'Libera o envio de mensagens novamente.' },
            { name: 'slowmode', desc: 'Modo lento', usage: 'slowmode <segundos>', example: 'O.slowmode 5', about: 'Define o intervalo entre mensagens (0 desativa).' },
            { name: 'cargo', desc: 'Alternar cargo', usage: 'cargo @user @cargo', example: 'O.cargo @user @VIP', about: 'Dá o cargo se não tiver; remove se já tiver.' }
        ]
    },
    interacoes: {
        id: 'interacoes',
        label: 'Interações',
        emoji: '💞',
        description: 'GIFs e ações entre membros',
        commands: [
            { name: 'abraco', desc: 'Abraçar', usage: 'abraco @user', example: 'O.abraco @user', about: 'Envia um GIF de abraço e botão para devolver.' },
            { name: 'beijo', desc: 'Beijar', usage: 'beijo @user', example: 'O.beijo @user', about: 'Envia um GIF de beijo anime.' },
            { name: 'tapa', desc: 'Tapa', usage: 'tapa @user', example: 'O.tapa @user', about: 'Dá um tapa (GIF) no membro.' },
            { name: 'carinho', desc: 'Carinho', usage: 'carinho @user', example: 'O.carinho @user', about: 'Faz carinho com GIF anime.' },
            { name: 'cutucar', desc: 'Cutucar', usage: 'cutucar @user', example: 'O.cutucar @user', about: 'Cutuca o membro.' },
            { name: 'bonk', desc: 'Bonk', usage: 'bonk @user', example: 'O.bonk @user', about: 'Bonk clássico.' },
            { name: 'morder', desc: 'Morder', usage: 'morder @user', example: 'O.morder @user', about: 'Morde o membro (GIF).' },
            { name: 'dancar', desc: 'Dançar', usage: 'dancar [@user]', example: 'O.dancar', about: 'Dança solo ou com alguém.' },
            { name: 'highfive', desc: 'High five', usage: 'highfive @user', example: 'O.highfive @user', about: 'Toca as mãos com o membro.' }
        ]
    },
    utilidade: {
        id: 'utilidade',
        label: 'Utilidade',
        emoji: '🛠️',
        description: 'Ferramentas do dia a dia',
        commands: [
            { name: 'help', desc: 'Central de ajuda', usage: 'help [categoria|comando]', example: 'O.ajuda saldo', about: 'Lista categorias ou detalhes de um comando.' },
            { name: 'ping', desc: 'Latência', usage: 'ping', example: 'O.ping', about: 'Mostra latência da API e do round-trip.' },
            { name: 'afk', desc: 'Modo AFK', usage: 'afk [motivo]', example: 'O.afk almoço', about: 'Marca você como AFK; remove ao falar de novo.' },
            { name: 'painel', desc: 'Painel web', usage: 'painel', example: 'O.painel', about: 'Link do painel de configuração do servidor.' },
            { name: 'avatar', desc: 'Ver avatar', usage: 'avatar [@user]', example: 'O.avatar @user', about: 'Mostra o avatar em alta resolução.' },
            { name: 'userinfo', desc: 'Info do usuário', usage: 'userinfo [@user]', example: 'O.userinfo @user', about: 'ID, data da conta, entrada e cargos.' },
            { name: 'serverinfo', desc: 'Info do servidor', usage: 'serverinfo', example: 'O.serverinfo', about: 'Resumo do servidor (membros, canais, etc.).' },
            { name: 'rank', desc: 'Ranking', usage: 'rank [global|local|xp]', example: 'O.rank xp', about: 'Ranking de éter global/local ou XP do servidor.' },
            { name: 'msg', desc: 'Contagem de mensagens', usage: 'msg [@user]', example: 'O.msg', about: 'Mensagens de hoje, semana, mês e total.' },
            { name: 'contagem', desc: 'Definir contagem', usage: 'contagem [número]', example: 'O.contagem 10', about: 'Define o próximo número do canal de contagem (staff).' }
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

function findCommand(query) {
    const q = String(query || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/^\//, '')
        .trim();
    if (!q) return null;

    const aliases = {
        bal: 'saldo',
        atm: 'saldo',
        balance: 'saldo',
        dep: 'depositar',
        deposit: 'depositar',
        with: 'sacar',
        withdraw: 'sacar',
        pagar: 'pay',
        pix: 'pay',
        diario: 'daily',
        bj: 'blackjack',
        jokenpo: 'ppt',
        rps: 'ppt',
        dice: 'dado',
        coinflip: 'cara',
        cf: 'cara',
        ajuda: 'help',
        comandos: 'help',
        cmds: 'help',
        clear: 'limpar',
        purge: 'limpar',
        convites: 'invites',
        whois: 'userinfo',
        ui: 'userinfo',
        si: 'serverinfo',
        top: 'rank',
        lb: 'rank',
        roubar: 'rob',
        steal: 'rob'
    };

    const name = aliases[q] || q;

    for (const cat of listCategories()) {
        const cmd = cat.commands.find((c) => c.name === name || c.name === q);
        if (cmd) return { ...cmd, category: cat };
    }
    return null;
}

module.exports = { CATEGORIES, listCategories, getCategory, findCommand };
