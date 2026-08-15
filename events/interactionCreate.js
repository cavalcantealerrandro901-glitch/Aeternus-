const { PermissionsBitField, EmbedBuilder, AttachmentBuilder, MessageFlags } = require('discord.js');
const db = require('../utils/database');
const { getRandomPhrase, generatePhrase, getRandomEmoji } = require('../utils/phrases');
const { createDailyImage } = require('../utils/imageGenerator');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (interaction.isChatInputCommand()) {
            const command = client.slashCommands.get(interaction.commandName);
            if (!command) return;
            try { 
                await command.execute(interaction, client); 
            } catch (error) {
                console.error(error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: '❌ Ocorreu um erro.', flags: MessageFlags.Ephemeral });
                }
            }
            return;
        }

        if (!interaction.isButton()) return;

        const parts = interaction.customId.split('_');
        const action = parts[0];
        const type = parts[1];

        if (action === 'daily' && type === 'claim') {
            const userId = interaction.user.id;
            const userDaily = db.getDaily(userId);
            const now = Date.now();
            const cooldown = 6 * 60 * 1000;

            if (userDaily.lastClaimed && (now - userDaily.lastClaimed < cooldown)) {
                const timeLeft = cooldown - (now - userDaily.lastClaimed);
                const minutes = Math.floor(timeLeft / (1000 * 60));
                const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
                
                if (!interaction.replied && !interaction.deferred) {
                    return interaction.reply({ 
                        content: `⏳ Você já coletou recentemente! Volte em **${minutes}m ${seconds}s**.`, 
                        flags: MessageFlags.Ephemeral 
                    });
                }
                return;
            }

            // Evita o erro 40060 verificando se já foi respondida ou adiada
            if (!interaction.replied && !interaction.deferred) {
                await interaction.deferUpdate();
            }

            let streak = userDaily.streak || 0;
            const twoDays = 48 * 60 * 60 * 1000;
            streak = (userDaily.lastClaimed && (now - userDaily.lastClaimed > twoDays)) ? 1 : streak + 1;
            
            const totalReward = 5000 + (Math.floor(streak / 2) * 2000);
            db.addBal(userId, totalReward);
            db.setDaily(userId, streak, now);

            // Gera a imagem limpa apenas com o fundo temático
            const imageBuffer = await createDailyImage();
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'daily-reward.png' });

            const embed = new EmbedBuilder()
                .setColor('#57F287')
                .setTitle(`🎉 Coletado com Sucesso! ${getRandomEmoji()}`)
                .setDescription(`✨ *"${getRandomPhrase()}"*`)
                .setImage('attachment://daily-reward.png')
                .addFields(
                    { name: '🔥 Streak', value: `${streak} dia(s)`, inline: true },
                    { name: '💀 Recompensa', value: `+${totalReward.toLocaleString()} almas`, inline: true }
                );

            setTimeout(async () => {
                try {
                    const user = await client.users.fetch(userId);
                    const buf = await createDailyImage();
                    await user.send({ 
                        embeds: [new EmbedBuilder().setTitle('🎁 Daily pronto!').setDescription(`*${generatePhrase()}*`).setImage('attachment://daily.png')],
                        files: [new AttachmentBuilder(buf, { name: 'daily.png' })]
                    });
                } catch (e) { console.log('Erro ao enviar DM'); }
            }, cooldown);

            return interaction.editReply({ embeds: [embed], files: [attachment], components: [] });
        }
    }
};
