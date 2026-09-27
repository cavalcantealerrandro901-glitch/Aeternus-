const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const eter = require('../utils/eter');
const loritta = require('../utils/loritta');
const { resolveBet } = require('../utils/parseAmount');
const store = require('../utils/store');

const PENDING_KEY = 'loritta_exchange_pending.json';

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function loadPending() {
    return store.load(PENDING_KEY, {});
}
function savePending(data) {
    store.save(PENDING_KEY, data);
}

function rateEmbed() {
    const rate = loritta.sonhosPerEter();
    return new EmbedBuilder()
        .setColor(0xf472b6)
        .setTitle('💱 Câmbio · Éter ⇄ Sonhos (Loritta)')
        .setDescription(
            [
                loritta.configured()
                    ? '✅ API da Loritta **conectada**.'
                    : '⚠️ Configure `LORITTA_API_TOKEN` no Render (token `lorixp_...`).',
                '',
                `**Taxa:** \`1\` ✨ Éter = **${fmt(rate)}** 💤 Sonhos`,
                `**Inverso:** **${fmt(rate)}** 💤 = \`1\` ✨`,
                '',
                '**Comandos**',
                '`O.cambio comprar <éter>` — gasta Éter e recebe Sonhos na Loritta',
                '`O.cambio vender <sonhos>` — vende Sonhos e recebe Éter',
                '`O.cambio taxa` — ver taxa',
                '`O.cambio saldo` — seu Éter + Sonhos (Loritta)',
                '',
                '_Comprar: Sonhos saem da carteira do dono do token Loritta._',
                '_Vender: você envia Sonhos ao dono via `+pay` da Loritta e confirma._'
            ].join('\n')
        )
        .setFooter({ text: 'Aeternus × Loritta' })
        .setTimestamp();
}

module.exports = {
    name: 'cambio',
    aliases: ['câmbio', 'loritta', 'sonhos', 'exchange'],
    description: 'Trocar Éter do Aeternus por Sonhos da Loritta',

    async execute(message, args) {
        const sub = String(args[0] || 'ajuda').toLowerCase();

        if (['ajuda', 'help', 'taxa', 'info', 'rate'].includes(sub) || !args.length) {
            return message.reply({ embeds: [rateEmbed()] });
        }

        if (sub === 'saldo' || sub === 'bal') {
            const et = eter.get(message.author.id);
            let sonhosLine = '_Não foi possível consultar a Loritta._';
            if (loritta.configured()) {
                try {
                    const u = await loritta.getUser(message.author.id);
                    sonhosLine = `💤 **${fmt(u.sonhos)}** sonhos`;
                } catch (e) {
                    sonhosLine = `⚠️ Loritta: ${e.response?.status || e.message}`;
                }
            }
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xa78bfa)
                        .setTitle('💱 Seu saldo')
                        .setDescription(
                            [
                                `✨ **${fmt(et)}** éter (Aeternus)`,
                                sonhosLine,
                                '',
                                `Taxa: 1✨ = **${fmt(loritta.sonhosPerEter())}**💤`
                            ].join('\n')
                        )
                        .setTimestamp()
                ]
            });
        }

        if (['comprar', 'buy'].includes(sub)) {
            if (!loritta.configured()) {
                return message.reply('❌ `LORITTA_API_TOKEN` não configurado no bot.');
            }
            if (!message.guild) {
                return message.reply('❌ Use este comando **no servidor** (a Loritta precisa do canal).');
            }

            const raw = args.slice(1).join(' ').trim();
            if (!raw) {
                return message.reply(
                    'Uso: `O.cambio comprar <éter>`\nEx.: `O.cambio comprar 100` → **' +
                        fmt(100 * loritta.sonhosPerEter()) +
                        '** sonhos'
                );
            }

            const bal = eter.get(message.author.id);
            const bet = resolveBet(raw, bal, { label: '✨' });
            if (!bet.ok) return message.reply('❌ ' + bet.error);
            if (bet.amount < 1) return message.reply('❌ Mínimo **1** éter.');

            const sonhos = Math.floor(bet.amount * loritta.sonhosPerEter());
            if (sonhos < 1) return message.reply('❌ Quantidade de sonhos inválida.');

            const took = eter.remove(message.author.id, bet.amount, { reason: 'cambio_loritta_buy' });
            if (!took) return message.reply('❌ Não foi possível debitar o éter.');

            const reason = 'Cambio Aeternus: ' + bet.amount + ' eter -> ' + sonhos + ' sonhos';
            let result;
            try {
                result = await loritta.transferSonhos({
                    guildId: message.guild.id,
                    channelId: message.channel.id,
                    receiverId: message.author.id,
                    quantity: sonhos,
                    reason: reason,
                    expiresAfterMillis: 15 * 60 * 1000
                });
            } catch (e) {
                eter.add(message.author.id, bet.amount, { reason: 'cambio_loritta_refund' });
                return message.reply(
                    '❌ Erro na API Loritta: ' + e.message + '\n✨ **' + fmt(bet.amount) + '** devolvidos.'
                );
            }

            if (!result.ok) {
                eter.add(message.author.id, bet.amount, { reason: 'cambio_loritta_refund' });
                return message.reply(
                    '❌ Loritta recusou (' +
                        (result.status || '?') +
                        '): ' +
                        result.error +
                        '\n✨ **' +
                        fmt(bet.amount) +
                        '** devolvidos.\n_Confira se a Loritta está no servidor e se o token tem sonhos._'
                );
            }

            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x34d399)
                        .setTitle('✅ Câmbio enviado')
                        .setDescription(
                            [
                                'Você trocou **✨ ' + fmt(bet.amount) + '** por **💤 ' + fmt(sonhos) + '** sonhos.',
                                '',
                                'A Loritta deve postar a **transferência neste canal** — aceite se pedir confirmação.',
                                '_Motivo: ' + reason + '_'
                            ].join('\n')
                        )
                        .setTimestamp()
                ]
            });
        }

        if (['vender', 'sell'].includes(sub)) {
            if (!loritta.configured()) {
                return message.reply('❌ `LORITTA_API_TOKEN` não configurado no bot.');
            }
            const raw = args.slice(1).join(' ').trim();
            if (!raw) {
                return message.reply(
                    'Uso: `O.cambio vender <sonhos>`\nEx.: `O.cambio vender 1000` → **' +
                        fmt(Math.floor(1000 / loritta.sonhosPerEter())) +
                        '** éter'
                );
            }
            const sonhos = Math.floor(Number(String(raw).replace(/[^\d]/g, '')) || 0);
            if (sonhos < loritta.sonhosPerEter()) {
                return message.reply(
                    '❌ Mínimo **' + fmt(loritta.sonhosPerEter()) + '** sonhos (1 éter).'
                );
            }
            const eterOut = Math.floor(sonhos / loritta.sonhosPerEter());
            if (eterOut < 1) return message.reply('❌ Valor muito baixo.');

            const ownerId = process.env.OWNER_ID || process.env.LORITTA_TREASURY_ID;
            if (!ownerId) {
                return message.reply('❌ `OWNER_ID` não configurado (recebedor dos sonhos).');
            }

            const id = message.author.id + '_' + Date.now();
            const pending = loadPending();
            pending[id] = {
                userId: message.author.id,
                sonhos: sonhos,
                eter: eterOut,
                ownerId: String(ownerId),
                at: Date.now(),
                channelId: message.channel.id
            };
            savePending(pending);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('cambio:confirm:' + id)
                    .setLabel('Já enviei os sonhos')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('cambio:cancel:' + id)
                    .setLabel('Cancelar')
                    .setStyle(ButtonStyle.Secondary)
            );

            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xfbbf24)
                        .setTitle('💱 Vender Sonhos → Éter')
                        .setDescription(
                            [
                                '1. Na **Loritta**, envie **💤 ' + fmt(sonhos) + '** sonhos para <@' + ownerId + '>:',
                                '```',
                                '+pay <@' + ownerId + '> ' + sonhos,
                                '```',
                                '2. Depois clique em **Já enviei os sonhos**.',
                                '',
                                'Você receberá **✨ ' + fmt(eterOut) + '** éter.',
                                '_Pedido expira em 30 minutos._'
                            ].join('\n')
                        )
                ],
                components: [row]
            });
        }

        return message.reply({ embeds: [rateEmbed()] });
    },

    async handleComponent(interaction) {
        if (!String(interaction.customId || '').startsWith('cambio:')) return false;
        const parts = interaction.customId.split(':');
        const action = parts[1];
        const id = parts.slice(2).join(':');
        const pending = loadPending();
        const p = pending[id];
        if (!p) {
            return interaction.reply({ content: 'Pedido expirado ou inválido.', ephemeral: true });
        }
        if (interaction.user.id !== p.userId) {
            return interaction.reply({ content: 'Este pedido não é seu.', ephemeral: true });
        }
        if (Date.now() - p.at > 30 * 60 * 1000) {
            delete pending[id];
            savePending(pending);
            return interaction.update({ content: '⏰ Pedido expirado.', embeds: [], components: [] });
        }

        if (action === 'cancel') {
            delete pending[id];
            savePending(pending);
            return interaction.update({ content: '❌ Câmbio cancelado.', embeds: [], components: [] });
        }

        if (action === 'confirm') {
            delete pending[id];
            savePending(pending);
            eter.add(p.userId, p.eter, { reason: 'cambio_loritta_sell' });
            return interaction.update({
                content:
                    '✅ Câmbio concluído! **✨ ' +
                    fmt(p.eter) +
                    '** creditados (referente a 💤 ' +
                    fmt(p.sonhos) +
                    ').',
                embeds: [],
                components: []
            });
        }

        return false;
    }
};
