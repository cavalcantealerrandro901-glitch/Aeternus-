const phrases = [
    "As sombras sussurram segredos de riqueza antiga...",
    "As almas dos perdidos alimentam o seu cofre sombrio...",
    "O submundo sorri para a sua constância nesta jornada...",
    "Uma colheita macabra traz recompensas valiosas...",
    "O véu entre os mundos se abre para premiar sua dedicação..."
];

module.exports = {
    getRandomPhrase() {
        return phrases[Math.floor(Math.random() * phrases.length)];
    }
};
