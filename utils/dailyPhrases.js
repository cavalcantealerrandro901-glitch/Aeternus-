/** Frases charmosas para o comando /daily e prefixo */
const openers = [
    'As estrelas inclinaram-se só para você hoje…',
    'O baú das almas reconheceu a sua presença.',
    'Há um brilho raro no ar — é o seu momento.',
    'As sombras abriram caminho para a sua recompensa.',
    'O abismo sussurra o seu nome com carinho perigoso…',
    'Hoje o destino decidiu ser generoso consigo.',
    'Uma faísca dourada atravessou o véu do mundo.',
    'As almas dançam quando você chega para resgatar.',
    'O universo guardou um presente com o seu nome.',
    'Até a noite parece mais doce neste instante.'
];

const middles = [
    'Entre 5 mil e 50 mil almas esperam pelo seu toque.',
    'O portal web guarda o ritual completo do daily.',
    'Um clique no link e o baú se abre só para você.',
    'Não é só uma recompensa — é um pequeno milagre diário.',
    'A fortuna gosta de quem aparece com elegância.',
    'Seu saldo de almas pode sorrir daqui a poucos segundos.',
    'O painel está iluminado, pronto para a sua visita.',
    'Traga coragem leve e saia com os bolsos brilhantes.'
];

const closers = [
    'Vá… o baú não gosta de esperar.',
    'Toque o botão e deixe a magia acontecer.',
    'Até já, caçador de almas. ✨',
    'Que a sorte beije a sua sombra.',
    'Volte amanhã — o ritual se renova ao nascer do dia.',
    'Almas bem-vindas à sua coleção.',
    'O Aeternus inclina a coroa em sua direção.'
];

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getDailyCharmPhrase() {
    return `${pick(openers)}\n\n*${pick(middles)}*\n\n${pick(closers)}`;
}

function getDailyTitle() {
    const titles = [
        '🎁 Ritual das Almas Diárias',
        '✨ Baú Dourado do Destino',
        '🌙 Presente das Estrelas',
        '💎 Tesouro do Aeternus',
        '🔥 Chamado da Fortuna'
    ];
    return pick(titles);
}

module.exports = { getDailyCharmPhrase, getDailyTitle };
