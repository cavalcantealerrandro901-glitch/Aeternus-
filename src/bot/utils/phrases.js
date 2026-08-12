const DAILY_READY = [
    'O abismo sussurra seu nome... as Almas aguardam quem ousar coletá-las.',
    'A meia-noite rasgou o véu. Seu tributo diário está pronto.',
    'As sombras depositaram um presente em sua essência. Reclame-o antes que o vazio o engula.',
    'O destino inclinou a balança a seu favor. Colete antes que os deuses menores invejem.',
    'Fragmentos de eternidade giram à sua espera. Toque o selo e absorva o poder.',
    'Uma corrente de poder pulsante espera ser absorvida. O abismo não espera os tíbios.',
    'O grãozinho do abismo estremeceu: suas Almas diárias despertaram do sono eterno.',
    'Entre a vida e o esquecimento, há um tributo com o seu nome gravado em osso negro.',
    'Os ecos do além-mundo cantam: *hoje, o pacto está aberto.*',
    'Uma fenda na realidade se abriu só para você. Atravesse-a e tome o que é seu.'
];

const DAILY_CLAIMED = [
    'As Almas se fundiram à sua essência. O abismo reconhece seu poder.',
    'Você devorou o tributo do dia. Que a escuridão te fortaleça.',
    'O ritual está completo. Mais um dia sob o domínio das Almas eternas.',
    'O véu se fechou novamente... até a próxima meia-noite.',
    'Seu nome foi gravado no livro das sombras. Volte quando o sol morrer de novo.',
    'A sequência continua. O abismo sorri para os persistentes e esquece os fracos.',
    'Poder absorvido. O próximo ciclo já começa a se formar nas profundezas.',
    'As estrelas negras brilharam por um instante em sua direção.',
    'Você selou o pacto. As Almas agora correm em suas veias como sangue divino.',
    'O abismo sussurrou: *bom... muito bom. Continue.*'
];

const WORK_START = [
    'Você adentrou as minas do submundo em busca de Almas...',
    'O contrato foi assinado com sangue. Hora de trabalhar.',
    'As correntes do abismo puxam você para mais uma jornada.',
    'Um chamado ecoa nas profundezas. Você responde sem hesitar.',
    'Ferramentas em mãos, alma preparada. O trabalho começa.',
    'Os mestres do abismo observam seu desempenho de perto.',
    'Nas galerias onde a luz morre, você labuta por poder.',
    'Cada golpe, cada passo, cada suspiro... tudo rende Almas.'
];

const WORK_DONE = [
    'O suor da escuridão valeu a pena. Almas conquistadas.',
    'Você retornou das profundezas carregando poder puro.',
    'Mais um ciclo de labuta. O abismo recompensa os fiéis.',
    'Seu cargo ecoa nas galerias. Respeito e Almas adquiridos.',
    'A jornada terminou... por enquanto. Descanse, guerreiro.',
    'Fragmentos coletados. Sua posição no ranking treme.',
    'As sombras aplaudem em silêncio. Você mereceu este tributo.',
    'O abismo não esquece quem trabalha. Nem quem desiste.'
];

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function dailyReadyPhrase() {
    return pick(DAILY_READY);
}

function dailyClaimedPhrase(streak, amount) {
    const base = pick(DAILY_CLAIMED);
    if (streak >= 7) {
        return `${base}\n\n🌑 **Sequência lendária de ${streak} dias.** O abismo te observa com respeito.`;
    }
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
