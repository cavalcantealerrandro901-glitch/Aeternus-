const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { broadcastUpdate } = require('../utils/broadcaster');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botupdate')
        .setDescription('Envia um anúncio de atualização para todos os servidores configurados.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option => 
            option.setName('titulo')
                .setDescription('Título da atualização')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('novidades')
                .setDescription('Descrição / Lista de novidades e mudanças')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('versao')
                .setDescription('Versão específica (Deixe em branco para auto-incrementar a versão atual)')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const titulo = interaction.options.getString('titulo');
        const novidades = interaction.options.getString('novidades');
        let customVersion = interaction.options.getString('versao');

        const packagePath = path.join(__dirname, '../../package.json');
        
        let packageData;
        try {
            packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        } catch (err) {
            packageData = { version: '1.0.0' };
        }

        let currentVersion = packageData.version || '1.0.0';
        let newVersion = '';

        if (customVersion) {
            // Se o usuário passou uma versão customizada (ex: 1.2.0 ou v1.2.0)
            newVersion = customVersion.replace(/^v/i, '').trim();
        } else {
            // Auto-incrementa a versão Patch (ex: 1.0.0 -> 1.0.1)
            const parts = currentVersion.replace(/^v/i, '').split('.').map(Number);
            if (parts.length === 3 && !parts.some(isNaN)) {
                parts[2] += 1;
                newVersion = parts.join('.');
            } else {
                newVersion = currentVersion;
            }
        }

        // Atualiza o arquivo package.json localmente
        try {
            packageData.version = newVersion;
            fs.writeFileSync(packagePath, JSON.stringify(packageData, null, 2), 'utf8');
        } catch (err) {
            console.error('❌ Erro ao atualizar o package.json:', err);
        }

        const versaoFinal = `v${newVersion}`;

        const result = await broadcastUpdate(interaction.client, {
            title: titulo,
            description: novidades,
            version: versaoFinal
        });

        await interaction.editReply({
            content: `✅ Transmissão concluída!\n📢 Servidores notificados: **${result.successCount}**\n⚠️ Falhas: **${result.failCount}**\n🏷️ Versão salva no package.json: **${versaoFinal}**`
        });
    }
};
