const mongoose = require('mongoose');
const path = require('path');
const config = require(path.join(__dirname, '../../config.json'));

module.exports = async () => {
    try {
        // Pega a URI do arquivo .env ou do config.json
        const mongoURI = process.env.MONGO_URI || config.mongoURI;

        if (!mongoURI || mongoURI === 'SUA_URL_DO_MONGODB_AQUI') {
            console.log('⚠️ MONGO_URI não configurado. O bot funcionará sem banco de dados por enquanto.');
            return;
        }

        await mongoose.connect(mongoURI);
        console.log('📦 Conectado ao MongoDB com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao conectar ao MongoDB:', error);
    }
};
