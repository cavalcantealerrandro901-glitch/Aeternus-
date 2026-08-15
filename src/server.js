const express = require('express');
const path = require('path');
const fs = require('fs');
const simpleGit = require('simple-git');
const { logs } = require('./logger');
const { getMaintenance, setMaintenance } = require('./state');
const app = express();
const git = simpleGit();

app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

function startDashboard(client) {
    app.get('/', (req, res) => {
        let envContent = '';
        try {
            envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
        } catch (e) {
            envContent = 'DISCORD_TOKEN=\nADMIN_PASSWORD=\nADMIN_USER_ID=';
        }

        res.render('index', {
            memory: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
            guildCount: client.guilds.cache.size,
            logs: logs,
            maintenance: getMaintenance(),
            envContent: envContent,
            error: null
        });
    });

    // Rota para salvar variáveis de ambiente no arquivo .env
    app.post('/save-env', (req, res) => {
        const { envData } = req.body;
        try {
            fs.writeFileSync(path.join(__dirname, '../.env'), envData, 'utf8');
            logs.unshift({ type: 'CONFIG', message: 'Variáveis de ambiente atualizadas!', timestamp: new Date().toLocaleTimeString() });
            res.redirect('/');
        } catch (error) {
            res.status(500).send("Erro ao salvar .env: " + error.message);
        }
    });

    // Rota para alternar o Modo de Manutenção
    app.post('/toggle-maintenance', (req, res) => {
        const current = getMaintenance();
        setMaintenance(!current);
        logs.unshift({ type: 'STATUS', message: `Modo de Manutenção alterado para: ${!current ? 'ATIVADO' : 'DESATIVADO'}`, timestamp: new Date().toLocaleTimeString() });
        res.redirect('/');
    });

    app.post('/update-repo', async (req, res) => {
        const { repoUrl } = req.body;
        try {
            const remotes = await git.getRemotes(true);
            if (remotes.some(r => r.name === 'origin')) {
                await git.remote(['set-url', 'origin', repoUrl]);
            } else {
                await git.addRemote('origin', repoUrl);
            }
            logs.unshift({ type: 'CONFIG', message: `Repositório atualizado para: ${repoUrl}`, timestamp: new Date().toLocaleTimeString() });
            res.redirect('/');
        } catch (error) {
            res.redirect('/');
        }
    });

    app.post('/restart', (req, res) => {
        if (req.body.password === process.env.ADMIN_PASSWORD) {
            res.send("<h1>Reiniciando o bot...</h1>");
            setTimeout(() => process.exit(0), 1000);
        } else {
            res.redirect('/');
        }
    });

    const port = process.env.PORT || 10000;
    app.listen(port, () => {
        console.log(`Painel rodando na porta ${port}`);
    });
}

module.exports = startDashboard;
