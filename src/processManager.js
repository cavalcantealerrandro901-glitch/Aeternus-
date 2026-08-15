const { spawn } = require('child_process');
const { addLog } = require('./logger');

let botProcess = null;

function startBotScript(scriptPath) {
    if (botProcess) {
        addLog('HOST', 'O bot já está rodando!');
        return false;
    }

    addLog('HOST', `Iniciando o processo do bot: ${scriptPath}`);
    botProcess = spawn('node', [scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });

    botProcess.stdout.on('data', (data) => {
        addLog('BOT', data.toString().trim());
    });

    botProcess.stderr.on('data', (data) => {
        addLog('ERRO-BOT', data.toString().trim());
    });

    botProcess.on('close', (code) => {
        addLog('HOST', `O processo do bot foi encerrado com código ${code}`);
        botProcess = null;
    });

    return true;
}

function stopBotScript() {
    if (!botProcess) {
        addLog('HOST', 'O bot já está desligado.');
        return false;
    }

    addLog('HOST', 'Encerrando o bot...');
    botProcess.kill();
    botProcess = null;
    return true;
}

function isBotRunning() {
    return botProcess !== null;
}

module.exports = { startBotScript, stopBotScript, isBotRunning };
