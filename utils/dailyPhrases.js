/** Frases normais para o comando daily */
const openers = [
    'Sua recompensa diária já está disponível.',
    'Hora de resgatar o daily de hoje.',
    'Mais um dia, mais uma recompensa.',
    'O daily de hoje está pronto para você.',
    'Você ainda não pegou a recompensa de hoje.',
    'Que bom que lembrou do daily.',
    'Recompensa diária liberada.',
    'É só um clique para resgatar.'
];

const middles = [
    'Você pode receber entre 5.000 e 50.000 almas.',
    'O valor é aleatório, uma vez por dia.',
    'Abra o link do painel para coletar.',
    'Funciona no site do bot, na página do daily.',
    'Lembre de estar logado no painel.',
    'Depois de resgatar, só amanhã de novo.',
    'Rápido e simples — sem complicação.'
];

const closers = [
    'Boa sorte no valor de hoje.',
    'Até amanhã!',
    'Aproveite.',
    'Qualquer coisa, é só chamar.',
    'Bom resgate.',
    'Volte amanhã para pegar de novo.'
];

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getDailyCharmPhrase() {
    return `${pick(openers)}\n\n*${pick(middles)}*\n\n${pick(closers)}`;
}

function getDailyTitle() {
    const titles = [
        '🎁 Recompensa diária',
        '✨ Daily disponível',
        '💰 Coletar daily',
        '📅 Recompensa de hoje',
        '🔔 Daily pronto'
    ];
    return pick(titles);
}

module.exports = { getDailyCharmPhrase, getDailyTitle };
