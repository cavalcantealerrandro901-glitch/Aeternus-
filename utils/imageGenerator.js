const fs = require('fs');
const path = require('path');

module.exports = {
    async createDailyImage() {
        // Define o caminho para a pasta local de imagens
        const imagesDir = path.join(__dirname, '..', 'assets', 'daily-images');

        try {
            // Verifica se a pasta existe, senão cria uma estrutura padrão para evitar crash
            if (!fs.existsSync(imagesDir)) {
                fs.mkdirSync(imagesDir, { recursive: true });
                throw new Error('A pasta assets/daily-images estava vazia ou não existia.');
            }

            // Lê todos os arquivos da pasta
            const files = fs.readdirSync(imagesDir).filter(file => 
                /\.(png|jpg|jpeg|webp)$/i.test(file)
            );

            if (files.length === 0) {
                throw new Error('Nenhuma imagem encontrada na pasta assets/daily-images.');
            }

            // Seleciona uma imagem aleatória da pasta local
            const randomFile = files[Math.floor(Math.random() * files.length)];
            const filePath = path.join(imagesDir, randomFile);

            // Retorna o buffer da imagem diretamente do arquivo local
            return fs.readFileSync(filePath);
        } catch (error) {
            console.error("⚠️ Erro ao carregar imagem local do daily:", error.message);
            
            // Fallback caso a pasta esteja vazia: cria um buffer vazio ou lida com o erro suavemente
            // Retorna null para o handler tratar o envio sem imagem se necessário
            return null;
        }
    }
};
