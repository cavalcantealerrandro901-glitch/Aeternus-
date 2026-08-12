const DAILY_READY = [
    'O abismo sussurra seu nome... as Almas aguardam quem ousar coletá-las.',
    'A meia-noite rasgou o véu. Seu tributo diário está pronto.',
    'As sombras depositaram um presente em sua alma. Reclame-o.',
    'O destino inclinou a balança a seu favor. Colete antes que mude.',
    'Fragmentos de eternidade giram à sua espera. Toque o selo.',
    'Os deuses menores invejam o que está reservado a você hoje.',
    'Uma corrente de poder pulsante espera ser absorvida.',
    'O grãozinho do abismo estremeceu: suas Almas diárias despertaram.'
];

const DAILY_CLAIMED = [
    'As Almas se fundiram à sua essência. O abismo reconhece seu poder.',
    'Você devorou o tributo do dia. Que a escuridão te fortaleça.',
    'O ritual está completo. Mais um dia sob o domínio das Almas.',
    'O véu se fechou novamente... até a próxima meia-noite.',
    'Seu nome foi gravado no livro das sombras. Volte amanhã.',
    'A sequência continua. O abismo sorri para os persistentes.',
    'Poder absorvido. O próximo ciclo já começa a se formar.',
    'As estrelas negras brilharam por um instante em sua direção.'
];

const WORK_START = [
    'Você adentrou as minas do submundo em busca de Almas...',
    'O contrato foi assinado com sangue. Hora de trabalhar.',
    'As correntes do abismo puxam você para mais uma jornada.',
    'Um chamado ecoa nas profundezas. Você responde.',
    'Ferramentas em mãos, alma preparada. O trabalho começa.',
    'Os mestres do abismo observam seu desempenho de perto.'
];

const WORK_DONE = [
    'O suor da escuridão valeu a pena. Almas conquistadas.',
    'Você retornou das profundezas carregando poder puro.',
    'Mais um ciclo de labuta. O abismo recompensa os fiéis.',
    'Seu cargo ecoa nas galerias. Respeito e Almas adquiridos.',
    'A jornada terminou... por enquanto. Descanse, guerreiro.',
    'Fragmentos coletados. Sua posição no ranking treme.'
];

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function dailyReadyPhrase() {
    return pick(DAILY_READY);
}

function dailyClaimedPhrase(streak, amount) {
    const base = pick(DAILY_CLAIMED);
    if (streak >= 2) {
        return `${base}\n\n🔥 Sequência de **${streak} dias** — o abismo intensifica sua recompensa.`;
    }
    return base;
}

function workStartPhrase(rankName) {
    return `${pick(WORK_START)}\n**Cargo:** ${rankName}`;
}

function workDonePhrase(rankName, amount) {
    return `${pick(WORK_DONE)}\n**Cargo:** ${rankName}`;
}

module.exports = {
    dailyReadyPhrase,
    dailyClaimedPhrase,
    workStartPhrase,
    workDonePhrase,
    pick
};
