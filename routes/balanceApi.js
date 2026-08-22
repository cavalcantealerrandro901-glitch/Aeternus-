const cristais = require('../utils/cristais');
const flocos = require('../utils/flocos');
const xp = require('../utils/xp');

function register(app) {
    app.get('/api/user/balance', (req, res) => {
        try {
            const sessionUser = req.session?.user;
            if (!sessionUser?.id) {
                return res.status(401).json({ success: false, message: 'Não autenticado.' });
            }
            const id = sessionUser.id;
            const p = xp.progress(xp.get(id));
            res.json({
                success: true,
                cristais: cristais.get(id),
                flocos: flocos.get(id),
                xp: p.total,
                level: p.level,
                dailyMultiplier: xp.dailyMultiplier(id),
                formatted: {
                    cristais: cristais.formatPlain(cristais.get(id)),
                    flocos: flocos.formatPlain(flocos.get(id)),
                    xp: xp.formatPlain(p.total)
                }
            });
        } catch (error) {
            console.error('/api/user/balance', error);
            res.status(500).json({ success: false, message: 'Erro interno.' });
        }
    });

    app.post('/api/admin/addmoney', (req, res) => {
        try {
            if (!req.session?.isAuthenticated) {
                return res.status(401).json({ success: false, message: 'Não autenticado.' });
            }
            const { userId, amount, currency } = req.body || {};
            if (!userId || amount == null) {
                return res.status(400).json({ success: false, message: 'userId e amount obrigatórios.' });
            }
            const lib = currency === 'flocos' ? flocos : cristais;
            const parsed = lib.parseBet(String(amount), Number.MAX_SAFE_INTEGER);
            if (parsed == null || parsed <= 0) {
                return res.status(400).json({ success: false, message: 'Valor inválido.' });
            }
            const after = lib.add(userId, parsed);
            res.json({ success: true, currency: currency || 'cristais', balance: after });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Erro interno.' });
        }
    });
}

module.exports = register;
module.exports.register = register;
