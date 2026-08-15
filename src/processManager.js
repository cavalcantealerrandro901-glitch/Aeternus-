const { spawn } = require('child_process');
const { addLog } = require('./logger');

let botProcess = null;

function startBotScript(scriptPath) {
    if (botProcess) {
        addLog('HOST', 'Já existe um bot ou processo rodando!');
        return false;
    }

    const targetPath = scriptPath || 'src/index.js';
    addLog('HOST', `Iniciando o processo: ${targetPath}`);
    botProcess = spawn('node', [targetPath], { stdio: ['pipe', 'pipe', 'pipe'] });

    botProcess.stdout.on('data', (data) => {
        addLog('BOT', data.toString().trim());
    });

    botProcess.stderr.on('data', (data) => {
        addLog('ERRO-BOT', data.toString().trim());
    });

    botProcess.on('close', (code) => {
        addLog('HOST', `O processo foi encerrado com código ${code}`);
        botProcess = null;
    });

    return true;
}

function stopBotScript() {
    if (!botProcess) {
        addLog('HOST', 'Nenhum bot rodando no momento.');
        return false;
    }

    addLog('HOST', 'Encerrando o processo...');
    botProcess.kill();
    botProcess = null;
    return true;
}

function isBotRunning() {
    return botProcess !== null;
}

module.exports = { startBotScript, stopBotScript, isBotRunning };
