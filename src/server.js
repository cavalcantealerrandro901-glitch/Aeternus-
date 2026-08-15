const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const simpleGit = require('simple-git');
const { logs } = require('./logger');
const { getMaintenance, setMaintenance } = require('./state');
const { encrypt, decrypt } = require('./security');
const Setting = require('./models/Setting');
const { startBotScript, stopBotScript, isBotRunning } = require('./processManager');

const app = express();
const git = simpleGit();

app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

if (process.env.MONGO_URI) {
    mongoose.connect(process.env.MONGO_URI).then(() => {
        logs.unshift({ type: 'DB', message: 'Conectado ao MongoDB com sucesso!', timestamp: new Date().toLocaleTimeString() });
    }).catch(err => {
        logs.unshift({ type: 'ERRO', message: 'Falha ao conectar no MongoDB: ' + err.message, timestamp: new Date().toLocaleTimeString() });
    });
}

function startDashboard(client) {
    app.get('/', async (req, res) => {
        let envText = '';
        try {
            const setting = await Setting.findOne({ key: 'env_vars' });
            if (setting) {
                envText = decrypt(setting.encryptedValue);
            }
        } catch (e) {
            envText = 'Erro ao carregar do banco de dados';
        }

        res.render('index', {
            memory: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
            guildCount: client ? client.guilds.cache.size : 0,
            logs: logs,
            maintenance: getMaintenance(),
            envContent: envText,
            isRunning: isBotRunning(),
            error: null
        });
    });

    app.post('/save-env', async (req, res) => {
        const { envData } = req.body;
        try {
            const encrypted = encrypt(envData);
            await Setting.findOneAndUpdate(
                { key: 'env_vars' },
                { encryptedValue: encrypted },
                { upsert: true, new: true }
            );
            logs.unshift({ type: 'CONFIG', message: 'Variáveis criptografadas e salvas no MongoDB!', timestamp: new Date().toLocaleTimeString() });
            res.redirect('/');
        } catch (error) {
            res.status(500).send("Erro ao salvar no MongoDB: " + error.message);
        }
    });

    app.post('/toggle-maintenance', (req, res) => {
        const current = getMaintenance();
        setMaintenance(!current);
        logs.unshift({ type: 'STATUS', message: `Modo de Manutenção: ${!current ? 'ATIVADO' : 'DESATIVADO'}`, timestamp: new Date().toLocaleTimeString() });
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
            logs.unshift({ type: 'CONFIG', message: `Repositório alterado para: ${repoUrl}`, timestamp: new Date().toLocaleTimeString() });
            res.redirect('/');
        } catch (error) {
            res.redirect('/');
        }
    });

    // Controle dinâmico do bot hospedado
    app.post('/bot/start', (req, res) => {
        const { scriptPath } = req.body;
        startBotScript(scriptPath);
        res.redirect('/');
    });

    app.post('/bot/stop', (req, res) => {
        stopBotScript();
        res.redirect('/');
    });

    app.post('/restart', (req, res) => {
        if (req.body.password === process.env.ADMIN_PASSWORD) {
            res.send("<h1>Reiniciando painel...</h1>");
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
