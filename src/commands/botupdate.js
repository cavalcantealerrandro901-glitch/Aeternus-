const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
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
                .setDescription('Versão personalizada (Opcional - por padrão usa a versão do package.json)')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const titulo = interaction.options.getString('titulo');
        const novidades = interaction.options.getString('novidades');
        
        // Puxa automaticamente a versão do package.json se não for informada
        const customVersion = interaction.options.getString('versao');
        const versaoFinal = customVersion ? customVersion : `v${currentVersion}`;

        let enviados = 0;
        let falhas = 0;

        for (const guild of interaction.client.guilds.cache.values()) {
            const guildConfig = db.getGuildConfig(guild.id);
            const updatesConfig = guildConfig.updates;

            if (!updatesConfig || !updatesConfig.updatesChannel) continue;

            const channel = guild.channels.cache.get(updatesConfig.updatesChannel);
            if (!channel) continue;

            try {
                let mentionContent = '';
                if (updatesConfig.mentionType === 'here') mentionContent = '@here';
                if (updatesConfig.mentionType === 'everyone') mentionContent = '@everyone';
                if (updatesConfig.mentionType === 'role' && updatesConfig.mentionRoleId) {
                    mentionContent = `<@&${updatesConfig.mentionRoleId}>`;
                }

                const embed = new EmbedBuilder()
                    .setTitle(`🚀 ${titulo}`)
                    .setDescription(novidades)
                    .addFields({ name: '📌 Versão', value: `\`${versaoFinal}\``, inline: true })
                    .setColor('#38bdf8')
                    .setThumbnail(interaction.client.user.displayAvatarURL())
                    .setTimestamp()
                    .setFooter({ text: `${interaction.client.user.username} Updates`, iconURL: interaction.client.user.displayAvatarURL() });

                await channel.send({ content: mentionContent || undefined, embeds: [embed] });
                enviados++;
            } catch (err) {
                falhas++;
            }
        }

        await interaction.editReply({
            content: `✅ Anúncio transmitido com sucesso!\n📢 Servidores notificados: **${enviados}**\n⚠️ Falhas: **${falhas}**\n🏷️ Versão aplicada: **${versaoFinal}**`
        });
    }
};
