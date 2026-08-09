const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { broadcastUpdate } = require('../utils/broadcaster');
const { version: currentVersion } = require('../../package.json');

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
                .setDescription('Versão personalizada (Opcional - usa a versão do package.json por padrão)')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const titulo = interaction.options.getString('titulo');
        const novidades = interaction.options.getString('novidades');
        const customVersion = interaction.options.getString('versao');
        const versaoFinal = customVersion ? customVersion : `v${currentVersion}`;

        const result = await broadcastUpdate(interaction.client, {
            title: titulo,
            description: novidades,
            version: versaoFinal
        });

        await interaction.editReply({
            content: `✅ Transmissão concluída!\n📢 Servidores notificados: **${result.successCount}**\n⚠️ Falhas: **${result.failCount}**\n🏷️ Versão aplicada: **${versaoFinal}**`
        });
    }
};
