const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

const PUNISH_CATEGORIES = ['slap', 'baka', 'poke', 'hug'];

// Lista de GIFs de fallback seguros caso a API falhe
const FALLBACK_GIFS = [
    'https://nekos.best/api/v2/slap/slap_001.gif',
    'https://nekos.best/api/v2/baka/baka_001.gif',
    'https://nekos.best/api/v2/poke/poke_001.gif',
    'https://nekos.best/api/v2/hug/hug_001.gif'
];

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
            return await interaction.reply({ content: '❌ Você não pode castigar a si mesmo!', flags: [MessageFlags.Ephemeral] });
        }

        if (target.bot) {
            return await interaction.reply({ content: '🤖 Você não pode castigar um bot, eles são intocáveis!', flags: [MessageFlags.Ephemeral] });
        }

        try {
            let gifUrl = '';
            
            try {
                const category = PUNISH_CATEGORIES[Math.floor(Math.random() * PUNISH_CATEGORIES.length)];
                const response = await fetch(`https://nekos.best/api/v2/${category}`);
                
                // Verifica se a resposta é válida e JSON
                const contentType = response.headers.get('content-type');
                if (response.ok && contentType && contentType.includes('application/json')) {
                    const data = await response.json();
                    if (data && data.results && data.results.length > 0) {
                        gifUrl = data.results[0].url;
                    }
                }
            } catch (apiErr) {
                // Se a API falhar silenciosamente, usa o fallback
            }

            // Se o GIF da API falhar, pega um da lista de segurança
            if (!gifUrl) {
                gifUrl = FALLBACK_GIFS[Math.floor(Math.random() * FALLBACK_GIFS.length)];
            }

            const randomText = PUNISH_TEXTS[Math.floor(Math.random() * PUNISH_TEXTS.length)];

            const embed = new EmbedBuilder()
                .setDescription(`⚠️ **${target}** ${randomText} *(Enviado por ${author})*`)
                .setImage(gifUrl)
                .setColor('#ec4899');

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('return_punish')
                        .setLabel('🔄 Devolver Castigo')
                        .setStyle(ButtonStyle.Danger)
                );

            const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

            const collector = message.createMessageComponentCollector({ time: 60000 });

            collector.on('collect', async i => {
                if (i.user.id !== target.id) {
                    return await i.reply({ content: '❌ Apenas a pessoa que recebeu o castigo pode devolvê-lo!', flags: [MessageFlags.Ephemeral] });
                }

                const returnEmbed = new EmbedBuilder()
                    .setDescription(`🔄 O jogo virou! **${target}** devolveu o castigo em **${author}**! 🚀`)
                    .setImage(gifUrl)
                    .setColor('#38bdf8');

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
                    } catch (e) {}
                }
            });

        } catch (err) {
            console.error('Erro no comando castigar:', err);
            if (!interaction.replied) {
                await interaction.reply({ content: '❌ Ocorreu um erro ao executar o comando.', flags: [MessageFlags.Ephemeral] });
            }
        }
    }
};
