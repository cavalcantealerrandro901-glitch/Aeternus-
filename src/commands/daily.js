const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const User = require('../models/User');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Resgate sua recompensa diária de moedas!'),
    async execute(interaction) {
        const userId = interaction.user.id;
        let user = await User.findOne({ userId });

        if (!user) {
            user = new User({ userId });
        }

        const now = Date.now();
        const cooldownTime = 24 * 60 * 60 * 1000; // 24 horas

        let responseContent;

        if (user.lastDaily && (now - user.lastDaily < cooldownTime)) {
            const timeLeft = cooldownTime - (now - user.lastDaily);
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

            responseContent = {
                content: `⏳ Você já resgatou seu daily hoje! Volte em **${hours}h e ${minutes}m**.`,
                flags: MessageFlags.Ephemeral
            };
        } else {
            const reward = 1000; // Quantidade de moedas do daily
            user.wallet += reward;
            user.lastDaily = now;
            await user.save();

            responseContent = {
                content: `🎉 Parabéns, ${interaction.user.username}! Você resgatou **${reward} moedas** no seu daily de hoje.`
            };
        }

        // Envio seguro da resposta (evita duplo reply)
        if (interaction.replied || interaction.deferred) {
            return interaction.followUp(responseContent);
        } else {
            return interaction.reply(responseContent);
        }
    },
};
