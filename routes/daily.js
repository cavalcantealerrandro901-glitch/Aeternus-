const db = require('../utils/database');
const cristais = require('../utils/cristais');
const xp = require('../utils/xp');
const fs = require('fs');
const path = require('path');

function dayKey(d = new Date()) {
    return d.toISOString().slice(0, 10);
}

/** POST /api/daily-claim — ❄️ flocos (5k–50k) × multiplicador dos cristais de gelo */
function register(app) {
    app.post('/api/daily-claim', (req, res) => {
        if (!req.session?.isAuthenticated || !req.session?.user?.id) {
            return res.status(401).json({ error: 'Faça login para resgatar.' });
        }

        const userId = String(req.session.user.id);
        const today = dayKey();
        const daily = db.getDaily(userId) || { streak: 0, lastClaimed: 0, lastDay: null };

        let lastDay = daily.lastDay || null;
        if (!lastDay && daily.lastClaimed) {
            lastDay = dayKey(new Date(Number(daily.lastClaimed)));
        }

        if (lastDay === today) {
            return res.status(429).json({
                error: 'Você já resgatou a recompensa diária hoje. Volte amanhã!'
            });
        }

        const base = Math.floor(Math.random() * (50000 - 5000 + 1)) + 5000;
        const mult = cristais.dailyMultiplier(userId);
        const amount = Math.floor(base * mult);

        const balance = db.addBal(userId, amount);

        // Recompensas de progresso
        const xpGain = 25 + Math.floor(Math.random() * 26);
        const cristalGain = 5 + Math.floor(Math.random() * 11);
        xp.add(userId, xpGain);
        const cResult = cristais.add(userId, cristalGain);

        const streak =
            lastDay && dayKey(new Date(Date.now() - 86400000)) === lastDay
                ? (daily.streak || 0) + 1
                : 1;

        db.setDaily(userId, streak, Date.now());

        try {
            const file = path.join(__dirname, '..', 'data', 'daily.json');
            let data = {};
            if (fs.existsSync(file)) {
                try {
                    data = JSON.parse(fs.readFileSync(file, 'utf8') || '{}');
                } catch {
                    data = {};
                }
            }
            data[userId] = {
                streak,
                lastClaimed: Date.now(),
                lastDay: today,
                lastAmount: amount,
                base,
                mult
            };
            fs.writeFileSync(file, JSON.stringify(data, null, 2));
        } catch (e) {
            console.error('daily save:', e.message);
        }

        res.json({
            success: true,
            amount,
            base,
            multiplier: mult,
            balance,
            streak,
            currency: 'flocos',
            emoji: '❄️',
            xpGain,
            cristalGain,
            cristalLevel: cResult.levelAfter,
            leveledUp: cResult.leveledUp
        });
    });
}

module.exports = register;
module.exports.register = register;
