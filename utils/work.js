const store = require('./store');
const flocos = require('./flocos');

const COOLDOWN_MS = 45 * 60 * 1000; // 45 min

/** 10 cargos — recompensa em flocos sobe com o cargo */
const RANKS = [
    { id: 0, name: 'Iniciante', emoji: '🌱', minJobs: 0, min: 5000, max: 10000 },
    { id: 1, name: 'Aprendiz', emoji: '📘', minJobs: 5, min: 7000, max: 13000 },
    { id: 2, name: 'Assistente', emoji: '🛠️', minJobs: 15, min: 9000, max: 16000 },
    { id: 3, name: 'Profissional', emoji: '💼', minJobs: 30, min: 12000, max: 20000 },
    { id: 4, name: 'Especialista', emoji: '🎯', minJobs: 50, min: 15000, max: 25000 },
    { id: 5, name: 'Veterano', emoji: '⚔️', minJobs: 80, min: 18000, max: 30000 },
    { id: 6, name: 'Mestre', emoji: '🏆', minJobs: 120, min: 22000, max: 36000 },
    { id: 7, name: 'Elite', emoji: '💎', minJobs: 180, min: 28000, max: 45000 },
    { id: 8, name: 'Lenda', emoji: '👑', minJobs: 260, min: 35000, max: 55000 },
    { id: 9, name: 'Soberano', emoji: '🌌', minJobs: 400, min: 45000, max: 70000 }
];

const PHRASES = [
    'Você fechou um contrato rápido e recebeu o pagamento na hora.',
    'Um cliente satisfeito deixou uma gorjeta generosa.',
    'Turno longo, mas o salário compensou.',
    'Você resolveu um problema difícil e ganhou bônus.',
    'Trabalho remoto concluído — pagamento liberado.',
    'Entrega no prazo. O chefe aprovou o valor extra.',
    'Você ajudou a equipe e dividiram a comissão.',
    'Dia produtivo no mercado. Lucro limpo.',
    'Consultoria de uma hora. Cliente pagou bem.',
    'Missão concluída. Conta creditada.',
    'Você vendeu como nunca. Comissão alta.',
    'Projeto finalizado antes do prazo. Bônus liberado.',
    'Freela de última hora — valor premium.',
    'Você cobriu o turno de alguém e recebeu dobrado na hora.',
    'Negócio fechado no aperto de mão. Pagamento na conta.'
];

function all() {
    return store.load('work.json', {});
}

function get(userId) {
    const d = all()[userId] || {};
    return {
        jobs: Math.max(0, Number(d.jobs || 0)),
        totalEarned: Math.max(0, Number(d.totalEarned || 0)),
        lastWork: Number(d.lastWork || 0),
        rankId: Math.max(0, Number(d.rankId || 0))
    };
}

function save(userId, data) {
    const a = all();
    a[userId] = data;
    store.save('work.json', a);
}

function rankFor(jobs) {
    let r = RANKS[0];
    for (const rank of RANKS) {
        if (jobs >= rank.minJobs) r = rank;
    }
    return r;
}

function nextRank(jobs) {
    const cur = rankFor(jobs);
    return RANKS.find((r) => r.id === cur.id + 1) || null;
}

function cooldownLeft(userId) {
    const w = get(userId);
    const left = COOLDOWN_MS - (Date.now() - w.lastWork);
    return left > 0 ? left : 0;
}

function fmtTime(ms) {
    const s = Math.ceil(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    if (m <= 0) return `${sec}s`;
    return `${m}m ${sec}s`;
}

function rollPay(rank) {
    const min = rank.min;
    const max = rank.max;
    return min + Math.floor(Math.random() * (max - min + 1));
}

function phrase() {
    return PHRASES[Math.floor(Math.random() * PHRASES.length)];
}

function work(userId) {
    const left = cooldownLeft(userId);
    if (left > 0) {
        return { ok: false, error: 'cooldown', left, leftText: fmtTime(left) };
    }

    const data = get(userId);
    const rankBefore = rankFor(data.jobs);
    const pay = rollPay(rankBefore);
    const text = phrase();

    data.jobs += 1;
    data.totalEarned += pay;
    data.lastWork = Date.now();
    const rankAfter = rankFor(data.jobs);
    data.rankId = rankAfter.id;
    save(userId, data);

    flocos.add(userId, pay, { reason: `work:${rankBefore.name}` });

    const promoted = rankAfter.id > rankBefore.id;
    const next = nextRank(data.jobs);

    return {
        ok: true,
        pay,
        phrase: text,
        rank: rankAfter,
        rankBefore,
        promoted,
        jobs: data.jobs,
        totalEarned: data.totalEarned,
        next,
        jobsToNext: next ? Math.max(0, next.minJobs - data.jobs) : 0,
        balance: flocos.get(userId),
        cooldownMs: COOLDOWN_MS
    };
}

function status(userId) {
    const data = get(userId);
    const rank = rankFor(data.jobs);
    const next = nextRank(data.jobs);
    const left = cooldownLeft(userId);
    return {
        ...data,
        rank,
        next,
        jobsToNext: next ? Math.max(0, next.minJobs - data.jobs) : 0,
        cooldownLeft: left,
        cooldownText: left > 0 ? fmtTime(left) : 'disponível',
        balance: flocos.get(userId)
    };
}

module.exports = {
    RANKS,
    COOLDOWN_MS,
    work,
    status,
    rankFor,
    get,
    fmtTime
};
