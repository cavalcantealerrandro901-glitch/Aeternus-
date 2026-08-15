const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('Define seu status como AFK')
        .addStringOption(opt => 
            opt.setName('motivo')
               .setDescription('O motivo de ficar ausente')
               .setRequired(false)
        ),
    async execute(interaction, client) {
        const reason = interaction.options.getString('motivo') || 'Sem motivo';
        
        client.afk.set(interaction.user.id, {
            reason: reason,
            time: Date.now()
        });

        await interaction.reply({ content: `✅ Você está agora AFK. Motivo: ${reason}`, ephemeral: true });
    }
};
