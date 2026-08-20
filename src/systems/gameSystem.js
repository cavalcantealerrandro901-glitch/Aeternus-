const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require('discord.js');

module.exports = {
    // =======================================================
    // JOGO 1: O PARADOXO DO FANTASMA TEMPORAL
    // =======================================================
    async startLoopGame(ctx) {
        const user = ctx.user || ctx.author;
        const isInteraction = !ctx.author;

        let playerPos = { r: 4, c: 0 };
        let ghostHistory = null;
        let currentHistory = [{ r: 4, c: 0 }];
        let step = 0;
        let loopNumber = 1;
        const maxSteps = 7;

        function checkDoorOpen(pPos, gPos) {
            const pOnPlate = pPos.r === 3 && pPos.c === 1;
            const gOnPlate = gPos && gPos.r === 3 && gPos.c === 1;
            return pOnPlate || gOnPlate;
        }

        function renderMap(pPos, gPos, isOpen) {
            let map = [
                ['⬛', '⬛', '⬛', '🚪', '⬛'],
                ['⬛', '⬛', '⬛', isOpen ? '🟢' : '🔴', '⬛'],
                ['⬛', '⬛', '⬛', '⬛', '⬛'],
                ['⬛', '🔘', '⬛', '⬛', '⬛'],
                ['🏁', '⬛', '⬛', '⬛', '⬛']
            ];

            if (gPos) map[gPos.r][gPos.c] = '👻';

            if (gPos && pPos.r === gPos.r && pPos.c === gPos.c) {
                map[pPos.r][pPos.c] = '👥';
            } else {
                map[pPos.r][pPos.c] = '👤';
            }

            return map.map(row => row.join(' ')).join('\n');
        }

        function createControls() {
            return [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('up').setEmoji('⬆️').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('reset').setLabel('🔄 Resetar Loop').setStyle(ButtonStyle.Danger)
                ),
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('left').setEmoji('⬅️').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('down').setEmoji('⬇️').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('right').setEmoji('➡️').setStyle(ButtonStyle.Primary)
                )
            ];
        }

        function buildEmbed(statusText = '') {
            const ghostPos = (ghostHistory && ghostHistory[step]) ? ghostHistory[step] : null;
            const isOpen = checkDoorOpen(playerPos, ghostPos);

            return new EmbedBuilder()
                .setColor('#38bdf8')
                .setTitle(`⏳ Paradoxo Temporal - Loop #${loopNumber}`)
                .setDescription(
                    `**Objetivo:** Chegue até a Saída \`🚪\`!\n` +
                    `⚠️ **Laser:** O laser \`🔴\` só vira \`🟢\` se você ou seu **Fantasma \`👻\`** pisarem na placa \`🔘\`.\n\n` +
                    renderMap(playerPos, ghostPos, isOpen) +
                    `\n\n${statusText}`
                )
                .addFields(
                    { name: '👣 Passos Restantes', value: `\`${maxSteps - step}\``, inline: true },
                    { name: '👻 Fantasma Ativo', value: ghostHistory ? '`Sim (Repetindo Loop 1)`' : '`Nenhum (Primeiro Loop)`', inline: true }
                )
                .setFooter({ text: 'Aeternus Time-Loop • Use as setas para andar' });
        }

        const msg = await ctx.reply({ 
            embeds: [buildEmbed()], 
            components: createControls(),
            fetchReply: true 
        });

        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 });

        collector.on('collect', async (i) => {
            if (i.user.id !== user.id) {
                return i.reply({ content: '❌ Inicie seu próprio jogo!', flags: MessageFlags.Ephemeral });
            }

            await i.deferUpdate().catch(() => {});

            if (i.customId === 'reset') {
                loopNumber++;
                ghostHistory = [...currentHistory];
                currentHistory = [{ r: 4, c: 0 }];
                playerPos = { r: 4, c: 0 };
                step = 0;
                await msg.edit({ embeds: [buildEmbed('🔄 **Loop resetado manualmente!** Seu fantasma agora imitará seus últimos passos.')], components: createControls() });
                return;
            }

            let nextR = playerPos.r;
            let nextC = playerPos.c;

            if (i.customId === 'up') nextR--;
            if (i.customId === 'down') nextR++;
            if (i.customId === 'left') nextC--;
            if (i.customId === 'right') nextC++;

            if (nextR < 0 || nextR > 4 || nextC < 0 || nextC > 4) {
                return i.followUp({ content: '🚧 Pátio temporal trancado! Não pode sair do mapa.', flags: MessageFlags.Ephemeral });
            }

            const ghostPosCurrent = (ghostHistory && ghostHistory[step]) ? ghostHistory[step] : null;
            const doorOpenNow = checkDoorOpen(playerPos, ghostPosCurrent);

            if (nextR === 1 && nextC === 3 && !doorOpenNow) {
                return i.followUp({ content: '🔴 O Laser Temporal está ATIVO! Alguém precisa pisar no botão 🔘 para desativá-lo.', flags: MessageFlags.Ephemeral });
            }

            playerPos = { r: nextR, c: nextC };
            step++;
            currentHistory.push({ ...playerPos });

            if (playerPos.r === 0 && playerPos.c === 3) {
                const winEmbed = new EmbedBuilder()
                    .setColor('#2ecc71')
                    .setTitle('🎉 PARADOXO RESOLVIDO!')
                    .setDescription(`Incrível, **${user.username}**! Você usou seu Fantasma Temporal do passado para abrir o caminho e escapar da anomalia!`)
                    .setFooter({ text: `Vencido no Loop #${loopNumber}` });

                await msg.edit({ embeds: [winEmbed], components: [] });
                return collector.stop('win');
            }

            if (step >= maxSteps) {
                loopNumber++;
                ghostHistory = [...currentHistory];
                currentHistory = [{ r: 4, c: 0 }];
                playerPos = { r: 4, c: 0 };
                step = 0;

                await msg.edit({ 
                    embeds: [buildEmbed('🌀 **O tempo do loop acabou!** Você voltou ao início, mas seu **Fantasma `👻`** agora repetirá o que você fez!')], 
                    components: createControls() 
                });
            } else {
                await msg.edit({ embeds: [buildEmbed()], components: createControls() });
            }
        });

        collector.on('end', (collected, reason) => {
            if (reason !== 'win' && msg && msg.editable) {
                msg.edit({ content: '⏳ A fenda de tempo colapsou por inatividade.', components: [] }).catch(() => {});
            }
        });
    },

    // =======================================================
    // JOGO 2: SINTONIZADOR DE ONDAS TEMPORAIS
    // =======================================================
    async startWaveGame(ctx) {
        const user = ctx.user || ctx.author;
        const isInteraction = !ctx.author;

        const target = {
            freq: Math.floor(Math.random() * 3) + 1,
            amp: Math.floor(Math.random() * 3) + 1,
            phase: Math.floor(Math.random() * 2)
        };

        let current = { freq: 1, amp: 1, phase: 0 };
        let stability = 100;

        function drawWave(state) {
            const symbols = state.phase === 0 ? ['▲', '▼', '_'] : ['▼', '▲', '-'];
            let line = '';
            for (let i = 0; i < 6; i++) {
                if (i % (4 - state.freq) === 0) {
                    line += state.amp === 3 ? `[${symbols[0]}]` : state.amp === 2 ? symbols[0] : symbols[2];
                } else {
                    line += state.amp === 3 ? `[${symbols[1]}]` : state.amp === 2 ? symbols[1] : symbols[2];
                }
            }
            return `\`${line}\``;
        }

        function buildWaveEmbed() {
            const isMatch = current.freq === target.freq && current.amp === target.amp && current.phase === target.phase;

            return new EmbedBuilder()
                .setColor(isMatch ? '#2ecc71' : '#38bdf8')
                .setTitle('📻 Sintonizador de Ondas Temporais')
                .setDescription(
                    `Ajuste os controles para alinhar a **Sua Onda** com a **Onda Alvo** antes que a estabilidade chegue a 0%!\n\n` +
                    `🎯 **Onda Alvo:** ${drawWave(target)}\n` +
                    `🎛️ **Sua Onda:**  ${drawWave(current)}\n\n` +
                    `📉 **Estabilidade da Fenda:** \`${stability}%\``
                )
                .addFields(
                    { name: '📊 Frequência', value: `\`Nível ${current.freq}/3\``, inline: true },
                    { name: '🔊 Amplitude', value: `\`Nível ${current.amp}/3\``, inline: true },
                    { name: '🔄 Fase Quântica', value: current.phase === 0 ? '`Normal (0°)`' : '`Invertida (180°)`', inline: true }
                )
                .setFooter({ text: 'Aeternus Frequency • Use os botões para calibrar' });
        }

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('freq').setLabel('⚡ Frequência +1').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('amp').setLabel('🔊 Amplitude +1').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('phase').setLabel('🔄 Inverter Fase').setStyle(ButtonStyle.Secondary)
        );

        const msg = await ctx.reply({ 
            embeds: [buildWaveEmbed()], 
            components: [buttons],
            fetchReply: true 
        });

        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

        const timer = setInterval(async () => {
            stability -= 10;
            if (stability <= 0) {
                clearInterval(timer);
                collector.stop('fail');
            } else if (msg && msg.editable) {
                await msg.edit({ embeds: [buildWaveEmbed()] }).catch(() => {});
            }
        }, 4000);

        collector.on('collect', async (i) => {
            if (i.user.id !== user.id) {
                return i.reply({ content: '❌ Inicie seu jogo!', flags: MessageFlags.Ephemeral });
            }

            await i.deferUpdate().catch(() => {});

            if (i.customId === 'freq') current.freq = (current.freq % 3) + 1;
            if (i.customId === 'amp') current.amp = (current.amp % 3) + 1;
            if (i.customId === 'phase') current.phase = current.phase === 0 ? 1 : 0;

            if (current.freq === target.freq && current.amp === target.amp && current.phase === target.phase) {
                clearInterval(timer);
                const winEmbed = new EmbedBuilder()
                    .setColor('#2ecc71')
                    .setTitle('🎉 ONDA TEMPORAL SINTONIZADA!')
                    .setDescription(`Perfeito, **${user.username}**! Você alinhou a frequência da fenda temporal com **${stability}% de Estabilidade restante**!`);

                await msg.edit({ embeds: [winEmbed], components: [] });
                return collector.stop('win');
            }

            await msg.edit({ embeds: [buildWaveEmbed()] });
        });

        collector.on('end', (collected, reason) => {
            clearInterval(timer);
            if (reason === 'fail' && msg && msg.editable) {
                msg.edit({ content: '💥 **COLAPSO QUÂNTICO!** A estabilidade chegou a 0% e a onda se desfez.', components: [] }).catch(() => {});
            }
        });
    },

    // =======================================================
    // JOGO 3: O EFEITO BORBOLETA
    // =======================================================
    async startButterflyGame(ctx) {
        const user = ctx.user || ctx.author;
        const isInteraction = !ctx.author;

        const choices = [
            { id: 'act_1', label: '📜 Salvar Biblioteca de Alexandria' },
            { id: 'act_2', label: '⚙️ Antecipar a Revolução Industrial' },
            { id: 'act_3', label: '🌱 Preservar Floresta Primordial' }
        ];

        let state = {
            past: 'Nenhuma ação tomada no Passado.',
            present: 'Mundo atual padrão.',
            future: '🔴 FUTURO EM COLAPSO (Anomalia Temporal)'
        };

        function buildButterflyEmbed(isWin = false) {
            return new EmbedBuilder()
                .setColor(isWin ? '#2ecc71' : '#e67e22')
                .setTitle('🦋 O Efeito Borboleta - Simulador de Causa e Efeito')
                .setDescription(
                    `**Objetivo:** Altere o Passado para criar uma combinação que salve o **Futuro** sem colapsar o **Presente**!\n\n` +
                    `🏛️ **PASSADO (Ano 1200):**\n${state.past}\n\n` +
                    `🏙️ **PRESENTE (Ano 2026):**\n${state.present}\n\n` +
                    `🚀 **FUTURO (Ano 3100):**\n${state.future}`
                )
                .setFooter({ text: 'Aeternus Butterfly Effect • Escolha um evento histórico' });
        }

        const row = new ActionRowBuilder().addComponents(
            choices.map(c => new ButtonBuilder().setCustomId(c.id).setLabel(c.label).setStyle(ButtonStyle.Primary))
        );

        const msg = await ctx.reply({ 
            embeds: [buildButterflyEmbed()], 
            components: [row],
            fetchReply: true 
        });

        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

        collector.on('collect', async (i) => {
            if (i.user.id !== user.id) {
                return i.reply({ content: '❌ Inicie seu jogo!', flags: MessageFlags.Ephemeral });
            }

            await i.deferUpdate().catch(() => {});
            let won = false;

            if (i.customId === 'act_1') {
                state.past = '📜 A Biblioteca foi salva e o conhecimento antigo preservado.';
                state.present = '⚠️ O Presente virou uma sociedade ultra-burocrática e controlada.';
                state.future = '🔴 FUTURO: Guerra de Informação e Colapso Digital.';
            } else if (i.customId === 'act_2') {
                state.past = '⚙️ Máquinas a vapor foram criadas 600 anos antes da hora.';
                state.present = '⚠️ O Presente sofre com poluição extrema e falta de recursos.';
                state.future = '🔴 FUTURO: Planeta inabitável coberto por cinzas.';
            } else if (i.customId === 'act_3') {
                state.past = '🌱 A Floresta Primordial foi declarada solo sagrado e intocável.';
                state.present = '🟢 O Presente possui fontes de energia limpa e equilíbrio ecológico.';
                state.future = '🟢 FUTURO SALVO: Utopianismo Solarpunk e Viagens Interstelares!';
                won = true;
            }

            if (won) {
                await msg.edit({ embeds: [buildButterflyEmbed(true)], components: [] });
                collector.stop('win');
            } else {
                await msg.edit({ embeds: [buildButterflyEmbed(false)] });
            }
        });
    },

    // =======================================================
    // JOGO 4: APOSTA QUÂNTICA DE ENTROPIA
    // =======================================================
    async startQuantumInvest(ctx, amount) {
        const user = ctx.user || ctx.author;

        if (!amount || isNaN(amount) || amount <= 0) {
            return ctx.reply({ content: '❌ Informe uma quantidade válida de cristais virtuais! Exemplo: `!apostar 100`', flags: MessageFlags.Ephemeral });
        }

        function buildPhase1Embed() {
            return new EmbedBuilder()
                .setColor('#9b59b6')
                .setTitle('🌌 Aposta Quântica - Anomalia Temporal')
                .setDescription(
                    `Você está investindo **${amount} Cristais** no fluxo do tempo.\n` +
                    `Escolha em qual **Linha do Tempo** deseja injetar sua energia quântica:\n\n` +
                    `🔵 **Alpha (Estável):** 80% chance | Multiplicador 1.3x\n` +
                    `🟡 **Beta (Instável):** 50% chance | Multiplicador 2.2x\n` +
                    `🔴 **Gamma (Caótica):** 20% chance | Multiplicador 5.0x`
                )
                .setFooter({ text: 'Aeternus Economy • Escolha o nível de entropia' });
        }

        const initialButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('alpha').setLabel('🔵 Linha Alpha').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('beta').setLabel('🟡 Linha Beta').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('gamma').setLabel('🔴 Linha Gamma').setStyle(ButtonStyle.Danger)
        );

        const msg = await ctx.reply({ 
            embeds: [buildPhase1Embed()], 
            components: [initialButtons],
            fetchReply: true 
        });

        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });

        collector.on('collect', async (i) => {
            if (i.user.id !== user.id) {
                return i.reply({ content: '❌ Inicie sua própria aposta quântica!', flags: MessageFlags.Ephemeral });
            }

            await i.deferUpdate().catch(() => {});
            const choice = i.customId;

            let chance = 0.8;
            let mult = 1.3;
            let lineName = 'Alpha (Estável)';

            if (choice === 'beta') { chance = 0.5; mult = 2.2; lineName = 'Beta (Instável)'; }
            if (choice === 'gamma') { chance = 0.2; mult = 5.0; lineName = 'Gamma (Caótica)'; }

            const success = Math.random() < chance;
            const winAmount = Math.floor(amount * mult);

            const resultEmbed = new EmbedBuilder();

            if (success) {
                resultEmbed
                    .setColor('#2ecc71')
                    .setTitle('⚡ ESTABILIZAÇÃO BEM-SUCEDIDA!')
                    .setDescription(
                        `A Linha do Tempo **${lineName}** permaneceu intacta!\n\n` +
                        `📈 **Resultado:** Ganhou **+${winAmount - amount}** Cristais!\n` +
                        `💰 **Total Recebido:** \`${winAmount}\` Cristais (${mult.toFixed(1)}x)`
                    );
            } else {
                resultEmbed
                    .setColor('#e74c3c')
                    .setTitle('💥 COLAPSO TEMPORAL!')
                    .setDescription(
                        `A Linha do Tempo **${lineName}** colapsou no vácuo!\n\n` +
                        `📉 **Prejuízo:** Você perdeu **${amount}** Cristais.`
                    );
            }

            await msg.edit({ embeds: [resultEmbed], components: [] });
            collector.stop('done');
        });
    }
};
