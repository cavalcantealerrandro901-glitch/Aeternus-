const { flavor } = require('./ai');

const DAILY_READY = [
    'Seu bônus diário já está disponível.',
    'O daily de hoje está pronto para coletar.',
    'Hora do daily — toque no botão para receber.',
    'Recompensa diária liberada. Não esqueça de coletar.'
];

const DAILY_CLAIMED = [
    'Daily coletado com sucesso.',
    'Recompensa creditada na sua conta.',
    'Pronto! Almas adicionadas ao saldo.',
    'Daily ok. Volte amanhã após a meia-noite.'
];

const WORK_START = [
    'Pronto para trabalhar e ganhar Almas?',
    'Inicie o trabalho pelo botão abaixo.',
    'Quanto maior o cargo, maior a faixa de pagamento.',
    'Trabalho disponível. Clique para começar.'
];

const WORK_DONE = [
    'Trabalho concluído. Pagamento liberado.',
    'Bom serviço — Almas creditadas.',
    'Turno finalizado. XP e saldo atualizados.',
    'Você terminou o expediente.'
];

const GAME_WIN = [
    'Boa! Você ganhou esta rodada.',
    'Vitória — saldo atualizado.',
    'Acertou. Lucro na conta.'
];

const GAME_LOSE = [
    'Não foi dessa vez.',
    'Aposta perdida. Tente de novo com cuidado.',
    'Resultado contra você nesta rodada.'
];

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function dailyReadyPhrase() {
    return pick(DAILY_READY);
}

function dailyClaimedPhrase(streak, amount) {
    let base = pick(DAILY_CLAIMED);
    if (streak >= 7) base += ` Sequência de ${streak} dias.`;
    else if (streak >= 2) base += ` Sequência: ${streak} dias.`;
    return base;
}

function workStartPhrase(rankName) {
    return `${pick(WORK_START)} Cargo: ${rankName}.`;
}

function workDonePhrase(rankName, amount) {
    return `${pick(WORK_DONE)} Cargo: ${rankName}.`;
}

async function aiDailyReady() {
    return flavor(
        'Frase curta avisando que o bônus diário (daily) de um bot de economia Discord está disponível.',
        dailyReadyPhrase()
    );
}

async function aiDailyClaimed(streak, amount) {
    const fb = dailyClaimedPhrase(streak, amount);
    return flavor(
        `Usuário coletou daily. Sequência ${streak} dias. Valor ${amount} Almas. Uma frase curta de confirmação.`,
        fb
    );
}

async function aiWorkStart(rankName) {
    return flavor(
        `Frase curta convidando a trabalhar no bot. Cargo atual: ${rankName}.`,
        workStartPhrase(rankName)
    );
}

async function aiWorkDone(rankName, amount) {
    return flavor(
        `Trabalho concluído. Cargo ${rankName}. Ganhou ${amount} Almas. Frase curta.`,
        workDonePhrase(rankName, amount)
    );
}

async function aiGameResult(win, gameName, amount) {
    const fb = win ? pick(GAME_WIN) : pick(GAME_LOSE);
    return flavor(
        `${gameName}: usuário ${win ? 'ganhou' : 'perdeu'} ${amount} Almas. Uma frase curta.`,
        fb
    );
}

async function aiPayNote(amount) {
    return flavor(
        `Transferência de ${amount} Almas entre usuários. Frase curta de confirmação.`,
        'Transferência concluída.'
    );
}

async function aiModNote(action, reason) {
    return flavor(
        `Ação de moderação ${action}. Motivo: ${reason || 'não informado'}. Frase curta neutra para o log.`,
        reason || `Ação: ${action}`
    );
}

module.exports = {
    pick,
    dailyReadyPhrase,
    dailyClaimedPhrase,
    workStartPhrase,
    workDonePhrase,
    aiDailyReady,
    aiDailyClaimed,
    aiWorkStart,
    aiWorkDone,
    aiGameResult,
    aiPayNote,
    aiModNote,
    GAME_WIN,
    GAME_LOSE
};
