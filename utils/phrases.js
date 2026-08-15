const subjects = [
    "As sombras do abismo", 
    "Os ecos esquecidos", 
    "As almas perdidas", 
    "O vento macabro", 
    "O véu sombrio", 
    "A escuridão eterna",
    "Os espíritos errantes"
];

const actions = [
    "revelam segredos sobre", 
    "sussurram verdades acerca de", 
    "profetizam o destino de", 
    "consomem a essência de", 
    "iluminam o caminho rumo a",
    "guardam os mistérios de"
];

const objects = [
    "um futuro incerto.", 
    "uma riqueza esquecida.", 
    "uma maldição antiga.", 
    "um poder oculto.", 
    "a própria eternidade.",
    "um tesouro sepultado."
];

// Sistema de Emojis e Paquera Sombria
const emojis = ['🖤', '🦇', '🥀', '🕸️', '🔮', '🌙', '💀', '😏', '✨', '🍷'];
const flirts = [
    "Sua alma tem um brilho fascinante...",
    "Até as sombras ficam com inveja da sua presença...",
    "Você traz uma luz perigosa para o meu abismo...",
    "Minhas trevas ficam mais interessantes quando você está por perto...",
    "Que aura encantadora você tem hoje...",
    "É impossível ignorar a sua essência neste servidor..."
];

function getRandomPhrase() {
    const sub = subjects[Math.floor(Math.random() * subjects.length)];
    const act = actions[Math.floor(Math.random() * actions.length)];
    const obj = objects[Math.floor(Math.random() * objects.length)];
    return `${sub} ${act} ${obj}`;
}

module.exports = {
    getRandomPhrase,
    generatePhrase(repliedText = null) {
        if (repliedText && repliedText.trim().length > 0) {
            const act = actions[Math.floor(Math.random() * actions.length)];
            const obj = objects[Math.floor(Math.random() * objects.length)];
            return `Analisando "${repliedText}", as forças do submundo declaram que isso ${act} ${obj}`;
        } else {
            return getRandomPhrase();
        }
    },
    getRandomEmoji() {
        return emojis[Math.floor(Math.random() * emojis.length)];
    },
    getFlirt() {
        return flirts[Math.floor(Math.random() * flirts.length)];
    }
};
