const express = require('express');
const path = require('path');
const { registerPanelRoutes } = require('./routes/panel');

function startServer(client) {
    const app = express();
    app.use(express.json());
    app.use(express.static(path.join(__dirname, 'public')));

    // Rotas do painel (sistemas / configurações)
    registerPanelRoutes(app, client);

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🌐 Painel Web rodando na porta ${PORT}`);
    });
}

module.exports = startServer;
module.exports.startServer = startServer;
