const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const publicDir = path.join(__dirname, 'public');

// 1. Injeta CSS e JS em todos os arquivos .html
console.log('🔍 Verificando e injetando efeitos nas páginas...');
fs.readdirSync(publicDir).forEach(file => {
    if (file.endsWith('.html')) {
        const filePath = path.join(publicDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        let updated = false;

        // Injeta o CSS se não existir
        if (!content.includes('dashboard.css')) {
            content = content.replace('</head>', '    <link rel="stylesheet" href="dashboard.css">\n</head>');
            updated = true;
        }

        // Injeta o JS das brasas se não existir
        if (!content.includes('dashboard-app.js')) {
            content = content.replace('</body>', '    <script src="dashboard-app.js"></script>\n</body>');
            updated = true;
        }

        if (updated) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✨ Efeitos injetados em: ${file}`);
        }
    }
});

// 2. Executa os comandos do Git
try {
    console.log('🚀 Enviando alterações para o GitHub...');
    execSync('git add .', { stdio: 'inherit' });
    
    const msg = process.argv[2] || 'update: aplicacao automatica de efeitos e deploy';
    execSync(`git commit -m "${msg}"`, { stdio: 'inherit' });
    execSync('git push origin main', { stdio: 'inherit' });
    
    console.log('✅ Publicado no GitHub com sucesso!');
} catch (error) {
    console.log('⚠️ Nada para atualizar ou ocorreu um erro no Git.');
}
