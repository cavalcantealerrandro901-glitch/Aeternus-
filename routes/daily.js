const db = require('../utils/database');
const cristais = require('../utils/cristais');
const xp = require('../utils/xp');
const fs = require('fs');
const path = require('path');

function dayKey(d = new Date()) {
    return d.toISOString().slice(0, 10);
}

function readDailyFile() {
    const file = path.join(__dirname, '..', 'data', 'daily.json');
    if (!fs.existsSync(file)) return {};
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8') || '{}');
    } catch {
        return {};
    }
}

function writeDailyFile(data) {
    const file = path.join(__dirname, '..', 'data', 'daily.json');
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function register(app) {
    /** Info do multi / streak (logado) */
    app.get('/api/daily-info', (req, res) => {
        if (!req.session?.isAuthenticated || !req.session?.user?.id) {
            return res.status(401).json({ ok: false });
        }
        const userId = String(req.session.user.id);
        const today = dayKey();
        const data = readDailyFile()[userId] || {};
        const lastDay = data.lastDay || null;
        const mult = cristais.dailyMultiplier(userId);
        const level = cristais.levelFromTotal(cristais.get(userId));

        res.json({
            ok: true,
            multiplier: mult,
            cristalLevel: level,
            streak: data.streak || 0,
            alreadyClaimed: lastDay === today,
            balance: db.getBal(userId)
        });
    });

    app.post('/api/daily-claim', (req, res) => {
        if (!req.session?.isAuthenticated || !req.session?.user?.id) {
            return res.status(401).json({ error: 'Faça login para resgatar.' });
        }

        const userId = String(req.session.user.id);
        const today = dayKey();
        const all = readDailyFile();
        const daily = all[userId] || { streak: 0, lastClaimed: 0, lastDay: null };

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
        const xpGain = 25 + Math.floor(Math.random() * 26);
        const cristalGain = 5 + Math.floor(Math.random() * 11);
        xp.add(userId, xpGain);
        const cResult = cristais.add(userId, cristalGain);

        const streak =
            lastDay && dayKey(new Date(Date.now() - 86400000)) === lastDay
                ? (daily.streak || 0) + 1
                : 1;

        all[userId] = {
            streak,
            lastClaimed: Date.now(),
            lastDay: today,
            lastAmount: amount,
            base,
            mult,
            notify: daily.notify !== false
        };
        writeDailyFile(all);
        db.setDaily(userId, streak, Date.now());

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
