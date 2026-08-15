const express = require('express');
const path = require('path');
const simpleGit = require('simple-git');
const { logs } = require('./logger');
const app = express();
const git = simpleGit();

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

    // Rota para configurar o repositório dinamicamente pelo painel
    app.post('/update-repo', async (req, res) => {
        const { repoUser, repoUrl } = req.body;
        try {
            const remotes = await git.getRemotes(true);
            const hasOrigin = remotes.some(r => r.name === 'origin');

            if (hasOrigin) {
                await git.remote(['set-url', 'origin', repoUrl]);
            } else {
                await git.addRemote('origin', repoUrl);
            }

            logs.unshift({ 
                type: 'CONFIG', 
                message: `Repositório configurado para: ${repoUrl} (${repoUser})`, 
                timestamp: new Date().toLocaleTimeString() 
            });
            
            res.redirect('/');
        } catch (error) {
            console.error('Erro ao configurar repositório:', error);
            res.render('index', {
                memory: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
                guildCount: client.guilds.cache.size,
                logs: logs,
                error: "Erro ao configurar o repositório: " + error.message
            });
        }
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
