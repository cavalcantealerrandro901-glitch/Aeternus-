const phrases = [
    'Bom te ver por aqui.',
    'Mais um dia, mais uma chance de evoluir.',
    'Tudo certo por aí?',
    'Que bom que você apareceu.',
    'O servidor fica melhor com você online.',
    'Pronto para mais um round?',
    'Bem-vindo de volta.',
    'Hora de cuidar do que importa.',
    'Pequenos passos também contam.',
    'Hoje pode ser um bom dia.',
    'Sem pressa — no seu ritmo.',
    'Você está no lugar certo.',
    'Vamos com calma e foco.',
    'Aproveita o momento.',
    'Simples, direto e eficiente.'
];

const emojis = ['✨', '👋', '🙂', '💙', '🌟', '👍', '🎯', '☕', '🌈', '💬'];

const flirts = [
    'Você tem um jeito bacana de aparecer por aqui.',
    'Sua presença deixa o chat mais leve.',
    'É sempre bom te ver online.',
    'Você chega e o clima melhora um pouco.',
    'Que bom te encontrar por aqui hoje.',
    'O servidor fica mais animado com você.'
];

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomPhrase() {
    return pick(phrases);
}

module.exports = {
    getRandomPhrase,
    generatePhrase(repliedText = null) {
        if (repliedText && repliedText.trim().length > 0) {
            const reactions = [
                `Sobre "${repliedText}": faz sentido pensar nisso com calma.`,
                `Interessante o que você disse: "${repliedText}".`,
                `Anotei: "${repliedText}". Vale refletir um pouco.`,
                `"${repliedText}" — ponto válido.`
            ];
            return pick(reactions);
        }
        return getRandomPhrase();
    },
    getRandomEmoji() {
        return pick(emojis);
    },
    getFlirt() {
        return pick(flirts);
    }
};
