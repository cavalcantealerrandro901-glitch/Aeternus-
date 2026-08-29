const { EmbedBuilder } = require('discord.js');
const flocos = require('../utils/flocos');
const cristais = require('../utils/cristais');
const { resolveBet } = require('../utils/parseAmount');

/** 1 cristal vendido → 50 flocos | 1 cristal comprado → 80 flocos */
const SELL_RATE = 50; // 💠 → ❄️
const BUY_RATE = 80; // ❄️ → 💠

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

module.exports = {
    name: 'cambio',
    aliases: ['exchange', 'trocar', 'converter', 'reverter', 'convert'],
    description: 'Converte cristais ↔ flocos',
    async execute(message, args) {
        const dir = (args[0] || '').toLowerCase();

        /*
          vender / sell / c2f / cristais  → 💠 para ❄️
          comprar / buy / f2c / flocos   → ❄️ para 💠
        */
        const toFlocos = ['vender', 'sell', 'c2f', 'cristal', 'cristais', '💠'].includes(dir);
        const toCristais = ['comprar', 'buy', 'f2c', 'floco', 'flocos', '❄️'].includes(dir);

        if (!toFlocos && !toCristais) {
            return message.reply(
                [
                    '💱 **Câmbio Aeternus**',
                    '',
                    '💠 → ❄️  `O.cambio vender <qtd|all|half>`  · 1💠 = **50**❄️',
                    '❄️ → 💠  `O.cambio comprar <qtd|all|half>` · 1💠 = **80**❄️',
                    '',
                    'Aliases: `converter` · `reverter` · `trocar`',
                    'Ex.: `O.cambio vender 10` · `O.cambio comprar half` · `O.cambio vender all`'
                ].join('\n')
            );
        }

        if (toFlocos) {
            // quantos cristais converter
            const bet = resolveBet(args[1], cristais.get(message.author.id), { label: '💠' });
            if (!bet.ok) return message.reply(`❌ ${bet.error}`);

            cristais.remove(message.author.id, bet.amount);
            const gained = bet.amount * SELL_RATE;
            flocos.add(message.author.id, gained, { reason: 'câmbio 💠→❄️' });

            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x34d399)
                        .setAuthor({
                            name: 'Aeternus · Câmbio',
                            iconURL: message.client.user.displayAvatarURL()
                        })
                        .setTitle('💱  Cristais → Flocos')
                        .setDescription(
                            [
                                `Vendeu 💠 **${fmt(bet.amount)}**`,
                                `Recebeu ❄️ **${fmt(gained)}**  (×${SELL_RATE})`,
                                '',
                                `💠 Saldo: **${fmt(cristais.get(message.author.id))}**`,
                                `❄️ Saldo: **${fmt(flocos.get(message.author.id))}**`
                            ].join('\n')
                        )
                        .setTimestamp()
                ]
            });
        }

        // comprar cristais com flocos — args[1] = quantidade de CRISTAIS desejada
        // se all/half, interpreta sobre quantos cristais cabem no saldo de flocos
        const maxBuy = Math.floor(flocos.get(message.author.id) / BUY_RATE);
        const bet = resolveBet(args[1], maxBuy, { label: '💠' });
        if (!bet.ok) {
            return message.reply(
                `❌ ${bet.error}\nCom ❄️ **${fmt(flocos.get(message.author.id))}** você compra até 💠 **${fmt(maxBuy)}**.`
            );
        }

        const cost = bet.amount * BUY_RATE;
        if (flocos.get(message.author.id) < cost) {
            return message.reply(`❌ ❄️ Insuficiente. Precisa de **${fmt(cost)}** flocos.`);
        }

        flocos.remove(message.author.id, cost, { reason: 'câmbio ❄️→💠' });
        cristais.add(message.author.id, bet.amount);

        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x22d3ee)
                    .setAuthor({
                        name: 'Aeternus · Câmbio',
                        iconURL: message.client.user.displayAvatarURL()
                    })
                    .setTitle('💱  Flocos → Cristais')
                    .setDescription(
                        [
                            `Comprou 💠 **${fmt(bet.amount)}**`,
                            `Gastou ❄️ **${fmt(cost)}**  (×${BUY_RATE})`,
                            '',
                            `💠 Saldo: **${fmt(cristais.get(message.author.id))}**`,
                            `❄️ Saldo: **${fmt(flocos.get(message.author.id))}**`
                        ].join('\n')
                    )
                    .setTimestamp()
            ]
        });
    }
};
