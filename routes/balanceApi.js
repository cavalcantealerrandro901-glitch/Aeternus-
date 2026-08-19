const fs = require('fs');
const path = require('path');

const dbFile = path.join(__dirname, '..', '..', 'database.json');

function register(app, client) {
    app.get('/api/user/balance', (req, res) => {
        try {
            const sessionUser = req.session?.user || req.user;

            if (!sessionUser || !sessionUser.id) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Usuário não autenticado.' 
                });
            }

            let balance = 0;
            if (fs.existsSync(dbFile)) {
                const data = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
                balance = data[`user_${sessionUser.id}`]?.balance || 0;
            }

            return res.json({ 
                success: true, 
                balance: balance 
            });
        } catch (error) {
            console.error('Erro na API /api/user/balance:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro interno no servidor.' 
            });
        }
    });
}

module.exports = { register };
