const db = require('../utils/database');

function dayKey(d = new Date()) {
    return d.toISOString().slice(0, 10); // YYYY-MM-DD UTC
}

/**
 * POST /api/daily-claim — recompensa web 5.000 a 50.000 almas (1x/dia)
 * Requer login (sessão Discord)
 */
function register(app) {
    app.post('/api/daily-claim', (req, res) => {
        if (!req.session?.isAuthenticated || !req.session?.user?.id) {
            return res.status(401).json({ error: 'Faça login para resgatar.' });
        }

        const userId = String(req.session.user.id);
        const today = dayKey();
        const daily = db.getDaily(userId) || { streak: 0, lastClaimed: 0, lastDay: null };

        // lastDay (string) ou lastClaimed (timestamp)
        let lastDay = daily.lastDay || null;
        if (!lastDay && daily.lastClaimed) {
            lastDay = dayKey(new Date(Number(daily.lastClaimed)));
        }

        if (lastDay === today) {
            return res.status(429).json({
                error: 'Você já resgatou a recompensa diária hoje. Volte amanhã!'
            });
        }

        // 5.000 a 50.000 inclusive
        const amount = Math.floor(Math.random() * (50000 - 5000 + 1)) + 5000;

        const balance = db.addBal(userId, amount);
        const streak =
            lastDay &&
            dayKey(new Date(Date.now() - 86400000)) === lastDay
                ? (daily.streak || 0) + 1
                : 1;

        db.setDaily(userId, streak, Date.now());
        // grava lastDay se o helper permitir só streak/time — reforço em daily.json via setDaily

        try {
            const fs = require('fs');
            const path = require('path');
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
                lastAmount: amount
            };
            fs.writeFileSync(file, JSON.stringify(data, null, 2));
        } catch (e) {
            console.error('daily save:', e.message);
        }

        res.json({
            success: true,
            amount,
            balance,
            streak
        });
    });
}

module.exports = register;
module.exports.register = register;
