require('dotenv').config();
const mongoose = require('mongoose');
const config = require('./config.json');

async function clearDatabase() {
    try {
        const mongoURI = process.env.MONGO_URI || config.mongoURI;
        
        if (!mongoURI || mongoURI === 'SUA_URL_DO_MONGODB_AQUI') {
            console.log('⚠️ MONGO_URI não configurado.');
            return;
        }

        await mongoose.connect(mongoURI);
        console.log('📦 Conectado ao MongoDB...');

        // Lista todas as coleções (tabelas) do banco de dados atual
        const collections = await mongoose.connection.db.collections();

        if (collections.length === 0) {
            console.log('ℹ️ O banco de dados já está vazio.');
        } else {
            for (let collection of collections) {
                await collection.deleteMany({});
                console.log(`🗑️ Coleção limpa: ${collection.collectionName}`);
            }
            console.log('✨ Todos os dados foram limpos com sucesso!');
        }

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro ao limpar o banco de dados:', error);
        process.exit(1);
    }
}

clearDatabase();
