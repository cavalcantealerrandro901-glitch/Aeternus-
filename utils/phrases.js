const phrases = [
    "As sombras sussurram segredos de riqueza antiga...",
    "As almas dos perdidos alimentam o seu cofre sombrio...",
    "O submundo sorri para a sua constância nesta jornada...",
    "Uma colheita macabra traz recompensas valiosas...",
    "O véu entre os mundos se abre para premiar sua dedicação...",
    "O destino teceu fios escuros para esta ocasião...",
    "Até mesmo no abismo mais profundo, ecos de sabedoria ressoam..."
];

module.exports = {
    getRandomPhrase() {
        return phrases[Math.floor(Math.random() * phrases.length)];
    },
    generatePhrase(repliedText = null) {
        if (repliedText && repliedText.trim().length > 0) {
            const words = repliedText.split(' ');
            const sampleWord = words[Math.floor(Math.random() * words.length)] || 'eco';
            return `Das profundezas do abismo, sobre a palavra "${sampleWord}", os ecos do destino dizem: "${repliedText}" ressoa na eternidade...`;
        } else {
            return phrases[Math.floor(Math.random() * phrases.length)];
        }
    }
};
