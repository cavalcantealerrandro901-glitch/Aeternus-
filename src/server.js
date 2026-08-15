const express = require('express');
const path = require('path');
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

function startDashboard(client) {
    app.get('/', (req, res) => {
        const uptime = process.uptime();
        const dias = Math.floor(uptime / 86400);
        const horas = Math.floor((uptime % 86400) / 3600);
        const mins = Math.floor((uptime % 3600) / 60);
        
        res.render('index', {
            guildCount: client.guilds.cache.size,
            uptime: `${dias}d ${horas}h ${mins}m`,
            memory: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)
        });
    });

    const port = process.env.PORT || 10000;
    app.listen(port, () => {
        console.log(`Painel rodando na porta ${port}`);
    });
}

module.exports = startDashboard;
