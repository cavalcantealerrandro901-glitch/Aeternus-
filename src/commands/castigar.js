const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const PUNISH_CATEGORIES = ['slap', 'baka', 'poke', 'hug'];

const PUNISH_TEXTS = [
    "recebeu um castigo merecido! 💢",
    "foi colocado(a) de castigo! 😈",
    "levou uma bronca e tanto! 💥",
    "precisa prestar mais atenção! ⚡"
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('castigar')
        .setDescription('Dá um castigo divertido em alguém com direito a revide!')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('Quem você quer castigar?')
                .setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser('usuario');
        const author = interaction.user;

        if (target.id === author.id) {
            return await interaction.reply({ content: '❌ Você não pode castigar a si mesmo!', ephemeral: true });
        }

        if (target.bot) {
            return await interaction.reply({ content: '🤖 Você não pode castigar um bot, eles são intocáveis!', ephemeral: true });
        }

        try {
            // Busca um GIF de ação aleatório
            const category = PUNISH_CATEGORIES[Math.floor(Math.random() * PUNISH_CATEGORIES.length)];
            const response = await fetch(`https://nekos.best/api/v2/${category}`);
            const data = await response.json();
            
            if (!data || !data.results || data.results.length === 0) {
                return await interaction.reply({ content: '❌ Erro ao buscar a figurinha.', ephemeral: true });
            }

            const gifUrl = data.results[0].url;
            const randomText = PUNISH_TEXTS[Math.floor(Math.random() * PUNISH_TEXTS.length)];

            // Embed inicial do castigo
            const embed = new EmbedBuilder()
                .setDescription(`⚠️ **${target}** ${randomText} *(Enviado por ${author})*`)
                .setImage(gifUrl)
                .setColor('#ec4899');

            // Botão de devolver
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('return_punish')
                        .setLabel('🔄 Devolver Castigo')
                        .setStyle(ButtonStyle.Danger)
                );

            const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

            // Coletor para o botão funcionar apenas para quem foi castigado
            const collector = message.createMessageComponentCollector({ time: 60000 }); // Expira em 1 minuto

            collector.on('collect', async i => {
                if (i.user.id !== target.id) {
                    return await i.reply({ content: '❌ Apenas a pessoa que recebeu o castigo pode devolvê-lo!', ephemeral: true });
                }

                // Inverte os papéis no revide
                const returnEmbed = new EmbedBuilder()
                    .setDescription(`🔄 O jogo virou! **${target}** devolveu o castigo em **${author}**! 🚀`)
                    .setImage(gifUrl)
                    .setColor('#38bdf8');

                // Desativa o botão após o uso
                const disabledRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('return_punish')
                            .setLabel('🔄 Castigo Devolvido')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true)
                    );

                await i.update({ embeds: [returnEmbed], components: [disabledRow] });
                collector.stop();
            });

            collector.on('end', async collected => {
                if (collected.size === 0) {
                    try {
                        const expiredRow = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId('return_punish')
                                    .setLabel('🔄 Tempo Esgotado')
                                    .setStyle(ButtonStyle.Secondary)
                                    .setDisabled(true)
                            );
                        await message.edit({ components: [expiredRow] });
                    } catch (e) {
                        // Mensagem pode ter sido deletada
                    }
                }
            });

        } catch (err) {
            console.error('Erro no comando castigar:', err);
            if (!interaction.replied) {
                await interaction.reply({ content: '❌ Ocorreu um erro ao executar o comando.', ephemeral: true });
            }
        }
    }
};
