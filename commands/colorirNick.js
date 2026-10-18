const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
    MessageFlags
} = require('discord.js');
const store = require('../utils/store');

const STATE_KEY = 'nickColors.json';
const COLORS = [
    { name: 'Vermelho', hex: '#FF3B30', value: 0xFF3B30, emoji: '🔴' },
    { name: 'Laranja', hex: '#FF9500', value: 0xFF9500, emoji: '🟠' },
    { name: 'Amarelo', hex: '#FFD60A', value: 0xFFD60A, emoji: '🟡' },
    { name: 'Verde', hex: '#34C759', value: 0x34C759, emoji: '🟢' },
    { name: 'Azul', hex: '#0A84FF', value: 0x0A84FF, emoji: '🔵' },
    { name: 'Roxo', hex: '#AF52DE', value: 0xAF52DE, emoji: '🟣' },
    { name: 'Rosa', hex: '#FF2D55', value: 0xFF2D55, emoji: '🩷' },
    { name: 'Ciano', hex: '#64D2FF', value: 0x64D2FF, emoji: '🩵' },
    { name: 'Marrom', hex: '#A2845E', value: 0xA2845E, emoji: '🟤' },
    { name: 'Cinza', hex: '#8E8E93', value: 0x8E8E93, emoji: '⚪' },
    { name: 'Vermelho escuro', hex: '#8B0000', value: 0x8B0000, emoji: '🔻' },
    { name: 'Dourado', hex: '#D4AF37', value: 0xD4AF37, emoji: '⭐' },
    { name: 'Verde-água', hex: '#00C7BE', value: 0x00C7BE, emoji: '🔹' },
    { name: 'Azul-marinho', hex: '#1D3557', value: 0x1D3557, emoji: '🔷' },
    { name: 'Lavanda', hex: '#C4A7E7', value: 0xC4A7E7, emoji: '💜' },
    { name: 'Coral', hex: '#FF7F50', value: 0xFF7F50, emoji: '🧡' },
    { name: 'Menta', hex: '#98FF98', value: 0x98FF98, emoji: '💚' },
    { name: 'Prata', hex: '#C0C0C0', value: 0xC0C0C0, emoji: '🔘' },
    { name: 'Violeta', hex: '#7F00FF', value: 0x7F00FF, emoji: '💟' },
    { name: 'Turquesa', hex: '#40E0D0', value: 0x40E0D0, emoji: '🩵' }
];
const REACTIONS = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟','🅰️','🅱️','©️','®️','™️','🔠','🔡','🔢','#️⃣','*️⃣'];

function getState() {
    const value = store.load(STATE_KEY, {});
    return value && typeof value === 'object' ? value : {};
}

module.exports = {
    name: 'colorir-nick',
    aliases: ['colorirnick', 'colorir-nick'],
    description: 'Cria cargos coloridos para os membros escolherem a cor do nick',
    data: new SlashCommandBuilder()
        .setName('colorir-nick')
        .setDescription('Cria cargos coloridos para colorir o nick dos membros')
        .addIntegerOption((option) => option
            .setName('quantidade')
            .setDescription('Quantidade de cores/cargos para criar (de 5 a 20)')
            .setMinValue(5)
            .setMaxValue(20)
            .setRequired(false))
        .addBooleanOption((option) => option
            .setName('desativar')
            .setDescription('Desativa os painéis de cores deste servidor')
            .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async executeSlash(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({ content: '❌ Use este comando dentro de um servidor.', flags: MessageFlags.Ephemeral });
        }
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
            return interaction.reply({ content: '❌ Você precisa da permissão Gerenciar cargos.', flags: MessageFlags.Ephemeral });
        }

        const guild = interaction.guild;
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const me = guild.members.me || await guild.members.fetchMe().catch(() => null);
        if (!me?.permissions?.has(PermissionFlagsBits.ManageRoles)) {
            return interaction.editReply('❌ Preciso da permissão **Gerenciar cargos** para criar as cores.');
        }

        const shouldDisable = interaction.options.getBoolean('desativar') || false;
        const state = getState();
        const guildState = state[guild.id] || { panels: [], selections: {} };

        if (shouldDisable) {
            const panels = guildState.panels || [];
            if (!panels.length && !Object.keys(guildState.selections || {}).length) {
                return interaction.editReply('ℹ️ O sistema **Colorir Nick** já está desativado neste servidor.');
            }

            let deletedMessages = 0;
            for (const panel of panels) {
                const channel = await guild.channels.fetch(panel.channelId).catch(() => null);
                const message = channel?.isTextBased()
                    ? await channel.messages.fetch(panel.messageId).catch(() => null)
                    : null;
                if (message && await message.delete().then(() => true).catch(() => false)) deletedMessages++;
            }

            for (const [userId, selection] of Object.entries(guildState.selections || {})) {
                if (!selection?.roleId) continue;
                const member = await guild.members.fetch(userId).catch(() => null);
                if (member?.roles?.cache?.has(selection.roleId)) {
                    await member.roles.remove(selection.roleId, 'Aeternus • desativação do Colorir Nick').catch(() => {});
                }
            }

            guildState.panels = [];
            guildState.selections = {};
            state[guild.id] = guildState;
            store.save(STATE_KEY, state);

            const disabled = new EmbedBuilder()
                .setColor(0xA78BFA)
                .setTitle('⏹️ Colorir Nick desativado')
                .setDescription('Os painéis de escolha foram desativados e as cores escolhidas pelo sistema foram removidas dos membros. Os cargos coloridos foram mantidos no servidor, mas não estão mais ativos neste sistema.')
                .addFields({ name: 'Painéis removidos', value: String(deletedMessages), inline: true })
                .setFooter({ text: 'Aeternus • Colorir Nick' });
            return interaction.editReply({ embeds: [disabled] });
        }

        const count = interaction.options.getInteger('quantidade');
        if (count === null) {
            return interaction.editReply('❌ Informe **quantidade** (de 5 a 20) para criar o painel, ou use **desativar: Sim** para desligar o sistema.');
        }
        if (count < 5 || count > 20) return interaction.editReply('❌ Escolha entre 5 e 20 cores.');

        const palette = COLORS.slice(0, count);
        const created = [];
        const failed = [];

        for (let i = 0; i < palette.length; i++) {
            const color = palette[i];
            const roleName = 'Nick • ' + color.name;
            let role = guild.roles.cache.find((item) => item.name === roleName);
            try {
                if (!role) {
                    role = await guild.roles.create({
                        name: roleName,
                        colors: { primaryColor: color.value },
                        hoist: false,
                        mentionable: false,
                        reason: 'Aeternus • criação de cargos para colorir nick'
                    });
                } else if (role.colors?.primaryColor !== color.value) {
                    await role.edit({
                        colors: { primaryColor: color.value },
                        reason: 'Aeternus • atualização da cor do cargo'
                    });
                }

                // Cargos de cor precisam ficar acima dos cargos comuns dos membros
                // para que o Discord exiba a cor no nome. O cargo do bot continua acima deles.
                const position = Math.max(1, me.roles.highest.position - 1);
                await role.setPosition(position);
            } catch (error) {
                failed.push(color.name + ': ' + (error.code === 50013
                    ? 'hierarquia/permissão insuficiente — mova o cargo do Aeternus para cima dos cargos de membros'
                    : 'falha ao criar/posicionar cargo'));
                continue;
            }
            created.push({ index: i, name: color.name, hex: color.hex, value: color.value, emoji: color.emoji, reaction: REACTIONS[i], roleId: role.id });
        }

        if (created.length < 5) {
            return interaction.editReply('❌ Não consegui criar pelo menos 5 cargos. Verifique a permissão Gerenciar cargos e a posição do cargo do Aeternus.');
        }

        const panels = [];
        for (let start = 0; start < created.length; start += 5) {
            const group = created.slice(start, start + 5);
            const embed = new EmbedBuilder()
                .setColor(0xA78BFA)
                .setAuthor({ name: 'AETERNUS • CENTRAL DE CORES' })
                .setTitle('🎨 COLORIR NICK')
                .setDescription('Reaja com o símbolo correspondente para escolher a cor do seu nick.\n\n**Você pode ter apenas uma cor por vez.** Se escolher outra, a cor anterior será removida.')
                .addFields(group.map((color) => ({
                    name: color.reaction + '  ' + color.emoji + ' ' + color.name,
                    value: '**' + color.hex + '** · <@&' + color.roleId + '>',
                    inline: true
                })))
                .setFooter({ text: 'Aeternus • Reaja para aplicar · uma cor por membro' })
                .setTimestamp();

            const sent = await interaction.channel.send({ embeds: [embed] }).catch(() => null);
            if (!sent) continue;
            const panel = {
                guildId: guild.id,
                channelId: sent.channelId,
                messageId: sent.id,
                colors: group.map((color) => ({
                    emoji: color.reaction,
                    roleId: color.roleId,
                    name: color.name,
                    hex: color.hex,
                    value: color.value
                }))
            };
            panels.push(panel);
            for (const color of group) {
                await sent.react(color.emoji).catch(() => {});
            }
        }

        if (!panels.length) {
            return interaction.editReply('❌ Os cargos foram criados, mas não consegui enviar os embeds. Verifique se tenho permissão para enviar mensagens e adicionar reações.');
        }

        const latestState = getState();
        const latestGuildState = latestState[guild.id] || { panels: [], selections: {} };
        latestGuildState.panels = [...(latestGuildState.panels || []), ...panels];
        latestGuildState.selections = latestGuildState.selections || {};
        latestState[guild.id] = latestGuildState;
        store.save(STATE_KEY, latestState);

        const result = new EmbedBuilder()
            .setColor(0xA78BFA)
            .setTitle('✅ Painel de cores criado')
            .setDescription('Criei **' + created.length + ' cargos coloridos** e enviei **' + panels.length + ' embed(s)** com até 5 cores em cada um.')
            .addFields(
                { name: '📍 Canal', value: '<#' + interaction.channelId + '>', inline: true },
                { name: '🎨 Cores', value: String(created.length), inline: true }
            )
            .setFooter({ text: 'Aeternus • Colorir Nick' });

        const warning = failed.length ? '\n\n⚠️ Alguns cargos não foram criados:\n' + failed.slice(0, 5).join('\n') : '';
        return interaction.editReply({ embeds: [result], content: warning || undefined });
    }
};
