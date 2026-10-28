const store = require('./store');

const counters = store.load('game_numbers.json', {
    minas: 1,
    ppt: 1,
    cara: 1
});

async function nextGameNumber(type) {
    const number = Math.max(1, Number(counters[type]) || 1);
    counters[type] = number + 1;
    store.save('game_numbers.json', counters);
    try {
        await store.flush();
    } catch (error) {
        console.error('[gameNumbers] Falha ao salvar contador:', error.message);
    }
    return number;
}

module.exports = { nextGameNumber };
