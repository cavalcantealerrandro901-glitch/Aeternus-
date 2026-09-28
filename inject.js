const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');

console.log('⚡ Executando injeção de efeitos e CSS para o deploy no Render...');

if (fs.existsSync(publicDir)) {
    fs.readdirSync(publicDir).forEach(file => {
        if (file.endsWith('.html')) {
            const filePath = path.join(publicDir, file);
            let content = fs.readFileSync(filePath, 'utf8');
            let updated = false;

            // Injeta CSS se não existir
            if (!content.includes('dashboard.css')) {
                content = content.replace('</head>', '    <link rel="stylesheet" href="dashboard.css">\n</head>');
                updated = true;
            }

            // Injeta JS das brasas se não existir
            if (!content.includes('dashboard-app.js')) {
                content = content.replace('</body>', '    <script src="dashboard-app.js"></script>\n</body>');
                updated = true;
            }

            if (updated) {
                fs.writeFileSync(filePath, content, 'utf8');
                console.log(`✨ Efeitos injetados com sucesso em: ${file}`);
            }
        }
    });
}
