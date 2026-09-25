const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const player = require('../utils/player');
const store = require('../utils/store');

const pending = new Map(); // id -> trade

module.exports = {
    name: 'trocar',
    aliases: ['trade', 'negociar'],
    description: 'Trocar itens com outro jogador',
    async execute(message, args) {
        if (!player.has(message.author.id)) {
            return message.reply('Crie o perfil com `O.j criar`.');
        }
        const target = message.mentions.users.first();
        if (!target || target.bot || target.id === message.author.id) {
            return message.reply(
                'Uso: `O.trocar @user <seuNº> <nºDele>`\n' +
                    'Ex.: `O.trocar @amigo 2 5` — oferece seu item #2 pelo item #5 dele.\n' +
                    'Liste itens no perfil / inventário.'
            );
        }
        if (!player.has(target.id)) return message.reply('O outro jogador não tem perfil.');

        const nums = args.filter((a) => !a.startsWith('<@')).map((a) => parseInt(a, 10));
        const myIdx = nums[0];
        const theirIdx = nums[1];
        if (!myIdx || !theirIdx) {
            return message.reply('Informe os dois números: `O.trocar @user <seuItem> <itemDele>`');
        }

        const myInv = player.get(message.author.id)?.inventory || [];
        const theirInv = player.get(target.id)?.inventory || [];
        const myItem = myInv[myIdx - 1];
        const theirItem = theirInv[theirIdx - 1];
        if (!myItem) return message.reply('Seu item não existe nesse número.');
        if (!theirItem) return message.reply('O item dele não existe nesse número.');

        const id = `${message.author.id}_${target.id}_${Date.now()}`;
        pending.set(id, {
            a: message.author.id,
            b: target.id,
            aIdx: myIdx - 1,
            bIdx: theirIdx - 1,
            aItem: myItem,
            bItem: theirItem,
            at: Date.now()
        });

        const emb = new EmbedBuilder()
            .setColor(0x3b82f6)
            .setTitle('Proposta de troca')
            .setDescription(
                [
                    `**${message.author.username}** oferece: ${myItem.emoji || '📦'} **${myItem.name}**`,
                    `por ${theirItem.emoji || '📦'} **${theirItem.name}** de **${target.username}**`,
                    '',
                    `${target}, aceite ou recuse abaixo (2 min).`
                ].join('\n')
            );

        const msg = await message.reply({
            content: `<@${target.id}>`,
            embeds: [emb],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`trocar:ok:${id}`)
                        .setLabel('Aceitar')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`trocar:no:${id}`)
                        .setLabel('Recusar')
                        .setStyle(ButtonStyle.Danger)
                )
            ]
        });
        setTimeout(() => {
            if (pending.has(id)) {
                pending.delete(id);
                msg.edit({ components: [] }).catch(() => {});
            }
        }, 120000);
    },

    async handleComponent(interaction) {
        const id = interaction.customId || '';
        if (!id.startsWith('trocar:')) return;
        const [, action, tradeId] = id.split(':');
        const trade = pending.get(tradeId);
        if (!trade) {
            return interaction.reply({ content: 'Troca expirada.', ephemeral: true });
        }
        if (interaction.user.id !== trade.b && interaction.user.id !== trade.a) {
            return interaction.reply({ content: 'Não é sua troca.', ephemeral: true });
        }
        if (action === 'no') {
            pending.delete(tradeId);
            return interaction.update({
                content: 'Troca recusada.',
                embeds: [],
                components: []
            });
        }
        if (interaction.user.id !== trade.b) {
            return interaction.reply({ content: 'Só o destinatário pode aceitar.', ephemeral: true });
        }

        // Execute swap
        const aRem = player.removeItemAt(trade.a, trade.aIdx);
        const bRem = player.removeItemAt(trade.b, trade.bIdx);
        if (!aRem || !bRem) {
            // rollback best-effort
            if (aRem) player.addItem(trade.a, aRem);
            if (bRem) player.addItem(trade.b, bRem);
            pending.delete(tradeId);
            return interaction.update({
                content: 'Falha: inventário mudou. Tente de novo.',
                components: []
            });
        }
        player.addItem(trade.a, bRem);
        player.addItem(trade.b, aRem);
        pending.delete(tradeId);
        return interaction.update({
            content: `✅ Troca concluída: **${aRem.name}** ⇄ **${bRem.name}**`,
            embeds: [],
            components: []
        });
    }
};
