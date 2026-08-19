const { claimDaily } = require('../src/systems/dailySystem');

function register(app, client) {
    app.post('/api/daily/claim', async (req, res) => {
        try {
            const sessionUser = req.session?.user || req.user;

            if (!sessionUser || !sessionUser.id) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Você precisa estar logado com o Discord para resgatar sua recompensa!' 
                });
            }

            const userId = sessionUser.id;
            const result = await claimDaily(userId);

            return res.json(result);
        } catch (error) {
            console.error('Erro na API /api/daily/claim:', error);
            return res.status(500).json({ 
                success: false, 
                message: error.message || 'Erro interno no servidor.' 
            });
        }
    });
}

module.exports = { register };
