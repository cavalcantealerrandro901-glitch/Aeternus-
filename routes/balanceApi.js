const db = require('../utils/database');
const flocos = require('../utils/flocos');

function register(app) {
    /** Saldo do usuário logado no painel (mesma economia do bot) */
    app.get('/api/user/balance', (req, res) => {
        try {
            const sessionUser = req.session?.user;
            if (!sessionUser?.id) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuário não autenticado.'
                });
            }

            const balance = flocos.get(sessionUser.id);
            res.json({
                success: true,
                balance,
                formatted: flocos.formatPlain(balance),
                emoji: flocos.EMOJI,
                currency: flocos.NAME
            });
        } catch (error) {
            console.error('Erro /api/user/balance:', error);
            res.status(500).json({ success: false, message: 'Erro interno.' });
        }
    });

    /** Consulta saldo de um userId (admin logado) */
    app.get('/api/user/balance/:userId', (req, res) => {
        try {
            if (!req.session?.isAuthenticated) {
                return res.status(401).json({ success: false, message: 'Não autenticado.' });
            }
            const userId = req.params.userId;
            const balance = flocos.get(userId);
            res.json({
                success: true,
                userId,
                balance,
                formatted: flocos.formatPlain(balance)
            });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Erro interno.' });
        }
    });

    /** Admin: adicionar flocos pelo painel */
    app.post('/api/admin/addmoney', (req, res) => {
        try {
            if (!req.session?.isAuthenticated) {
                return res.status(401).json({ success: false, message: 'Não autenticado.' });
            }
            const { userId, amount } = req.body || {};
            if (!userId || amount == null) {
                return res.status(400).json({ success: false, message: 'userId e amount obrigatórios.' });
            }
            const parsed = flocos.parseBet(String(amount), Number.MAX_SAFE_INTEGER);
            if (parsed == null || parsed <= 0) {
                return res.status(400).json({ success: false, message: 'Valor inválido.' });
            }
            const before = flocos.get(userId);
            const after = flocos.add(userId, parsed);
            res.json({
                success: true,
                userId,
                added: parsed,
                before,
                balance: after,
                formatted: flocos.formatPlain(after)
            });
        } catch (error) {
            console.error('addmoney api:', error);
            res.status(500).json({ success: false, message: 'Erro interno.' });
        }
    });
}

module.exports = register;
module.exports.register = register;
