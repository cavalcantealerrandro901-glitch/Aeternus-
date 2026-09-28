const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');

fs.readdirSync(publicDir).forEach(file => {
    if (file.endsWith('.html')) {
        const filePath = path.join(publicDir, file);
        let content = fs.readFileSync(filePath, 'utf8');

        // Garante o CSS
        if (!content.includes('dashboard.css')) {
            content = content.replace('</head>', '    <link rel="stylesheet" href="dashboard.css">\n</head>');
        }

        // Garante o JS
        if (!content.includes('dashboard-app.js')) {
            content = content.replace('</body>', '    <script src="dashboard-app.js"></script>\n</body>');
        }

        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Atualizado automaticamente: ${file}`);
    }
});
