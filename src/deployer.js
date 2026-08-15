const simpleGit = require('simple-git');
const { exec } = require('child_process');
const { addLog } = require('./logger');

const git = simpleGit();

function initAutoDeploy() {
    // Verifica o repositório a cada 15 segundos (entre 10 e 20s solicitados)
    setInterval(async () => {
        try {
            // Fetch nas alterações remotas do GitHub
            await git.fetch();
            const status = await git.status();

            // Se houver commits atrás do remoto, significa que há atualização
            if (status.behind > 0) {
                addLog('DEPLOY', 'Novas atualizações encontradas no repositório! Baixando...');
                
                // Puxa as alterações
                await git.pull();
                addLog('DEPLOY', 'Código atualizado com sucesso. Verificando dependências...');

                // Instala dependências caso o package.json tenha mudado
                exec('npm install', (err, stdout, stderr) => {
                    if (err) {
                        addLog('ERRO', `Falha ao instalar dependências: ${err.message}`);
                        return;
                    }
                    addLog('DEPLOY', 'Dependências atualizadas! Reiniciando o sistema...');
                    
                    // Reinicia o processo para aplicar as mudanças
                    setTimeout(() => process.exit(0), 2000);
                });
            }
        } catch (error) {
            console.error('Erro no auto-deploy:', error);
        }
    }, 15000); // 15 segundos
}

module.exports = { initAutoDeploy };
