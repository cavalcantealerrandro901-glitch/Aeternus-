const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require('discord.js');

module.exports = {
    async startTaquionGame(ctx, amount = 100) {
        const user = ctx.user || ctx.author;
        const isInteraction = !ctx.author;

        let bet = parseInt(amount);
        if (isNaN(bet) || bet < 10) bet = 10;

        let multiplier = 1.0;
        let riskPercent = 10; // Chance inicial de colapso
        let currentProfit = bet;
        let isOver = false;

        function buildTaquionEmbed(statusText = '') {
            return new EmbedBuilder()
                .setColor(isOver ? '#e74c3c' : '#9b59b6')
                .setTitle('⚛️ Acelerador de Táquions - Aposta Quântica')
                .setDescription(
                    `**Aposta Inicial:** \`${bet}\` Cristais\n` +
                    `📈 **Multiplicador Atual:** \`${multiplier.toFixed(2)}x\`\n` +
                    `💰 **Retorno Atual:** \`${Math.floor(currentProfit)}\` Cristais\n` +
                    `⚠️ **Risco de Colapso:** \`${riskPercent}%\`\n\n` +
                    `${statusText || 'Pressione **Acelerar** para subir o lucro ou **Sacar** para garantir seus cristais!'}`
                )
                .setFooter({ text: 'Aeternus Quantum Bet • Cuidado com a anomalia!' });
        }

        function createControls() {
            return [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('boost').setLabel('🚀 Acelerar Tempo (+Multiplicador)').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('cashout').setLabel(`💰 Sacar (${Math.floor(currentProfit)} Cristais)`).setStyle(ButtonStyle.Primary)
                )
            ];
        }

        const msg = await ctx.reply({ 
            embeds: [buildTaquionEmbed()], 
            components: createControls(),
            fetchReply: isInteraction 
        });

        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

        collector.on('collect', async (i) => {
            if (i.user.id !== user.id) {
                return i.reply({ content: '❌ Inicie sua própria aposta!', flags: MessageFlags.Ephemeral });
            }

            if (i.customId === 'cashout') {
                isOver = true;
                const winEmbed = new EmbedBuilder()
                    .setColor('#2ecc71')
                    .setTitle('🎉 LUCRO SACADO COM SUCESSO!')
                    .setDescription(`Parabéns **${user.username}**! Você tirou **${Math.floor(currentProfit)} Cristais** com multiplicador de **${multiplier.toFixed(2)}x**!`)
                    .setFooter({ text: 'Aeternus Quantum Bet' });

                await i.update({ embeds: [winEmbed], components: [] });
                return collector.stop('win');
            }

            if (i.customId === 'boost') {
                // Testa se o colapso aconteceu com base no risco atual
                const roll = Math.random() * 100;
                if (roll < riskPercent) {
                    isOver = true;
                    const failEmbed = new EmbedBuilder()
                        .setColor('#e74c3c')
                        .setTitle('💥 COLAPSO TEMPORAL!')
                        .setDescription(`A anomalia explodiu em **${multiplier.toFixed(2)}x**! Você arriscou demais e perdeu sua aposta de **${bet} Cristais**.`)
                        .setFooter({ text: 'Aeternus Quantum Bet' });

                    await i.update({ embeds: [failEmbed], components: [] });
                    return collector.stop('fail');
                }

                // Incrementa multiplicador e risco
                multiplier += parseFloat((Math.random() * 0.4 + 0.2).toFixed(2));
                riskPercent = Math.min(riskPercent + 15, 90);
                currentProfit = bet * multiplier;

                await i.update({ 
                    embeds: [buildTaquionEmbed(`✨ **Aceleração bem sucedida!** O multiplicador subiu para **${multiplier.toFixed(2)}x**!`)], 
                    components: createControls() 
                });
            }
        });

        collector.on('end', (collected, reason) => {
            if (reason !== 'win' && reason !== 'fail' && msg && msg.editable) {
                msg.edit({ content: '⏳ O tempo limite da aposta esgotou.', components: [] }).catch(() => {});
            }
        });
    }
};
