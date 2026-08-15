const express = require('express');
const path = require('path');
const { logs } = require('./logger');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

function startDashboard(client) {
    app.get('/', (req, res) => {
        res.render('index', {
            memory: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
            guildCount: client.guilds.cache.size,
            logs: logs,
            error: null
        });
    });

    app.post('/restart', (req, res) => {
        if (req.body.password === process.env.ADMIN_PASSWORD) {
            res.send("<h1>Reiniciando o bot...</h1>");
            setTimeout(() => process.exit(0), 1000);
        } else {
            res.render('index', {
                memory: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
                guildCount: client.guilds.cache.size,
                logs: logs,
                error: "Senha incorreta!"
            });
        }
    });

    const port = process.env.PORT || 10000;
    app.listen(port, () => {
        console.log(`Painel rodando na porta ${port}`);
    });
}

module.exports = startDashboard;
