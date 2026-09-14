const { EmbedBuilder, SlashCommandBuilder, MessageFlags } = require('discord.js');
const eter = require('../utils/eter');
const store = require('../utils/store');

const CD = 15 * 60 * 1000; // 15 min
const MIN_TARGET = 100;
const SUCCESS_CHANCE = 0.5; // 50%

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

async function resolveTarget(message, args) {
    // 1) menção
    let user = message.mentions?.users?.first?.() || null;
    if (user) return user;

    // 2) ID ou @ bruto nos args
    const raw = (args || []).find((a) => /\d{15,20}/.test(a));
    if (raw) {
        const id = String(raw).replace(/[<@!>]/g, '');
        user = await message.client.users.fetch(id).catch(() => null);
        if (user) return user;
    }

    // 3) resposta a uma mensagem
    if (message.reference?.messageId) {
        const ref = await message.channel.messages
            .fetch(message.reference.messageId)
            .catch(() => null);
        if (ref?.author) return ref.author;
    }

    return null;
}

async function run(thief, target, reply) {
    if (!target) {
        return reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xf59e0b)
                    .setTitle('🕵️ Roubar')
                    .setDescription(
                        'Mencione alguém para roubar.\n' +
                            '**Exemplos:**\n' +
                            '`O.roubar @usuario`\n' +
                            '`O.roubar 123456789012345678`\n' +
                            'Ou responda a mensagem da pessoa com `O.roubar`'
                    )
            ]
        });
    }

    if (target.bot) return reply('❌ Não dá para roubar bots.');
    if (target.id === thief.id) return reply('❌ Você não pode roubar a si mesmo.');

    const cds = store.load('robcd.json', {});
    const last = Number(cds[thief.id] || 0);
    const left = CD - (Date.now() - last);
    if (left > 0) {
        const m = Math.ceil(left / 60000);
        return reply(`⏳ Aguarde **${m}** minuto(s) para tentar roubar de novo.`);
    }

    const targetBal = eter.get(target.id);
    if (targetBal < MIN_TARGET) {
        return reply(
            `❌ **${target.username}** não tem éter suficiente (mínimo ✨ **${fmt(MIN_TARGET)}** na carteira).`
        );
    }

    cds[thief.id] = Date.now();
    store.save('robcd.json', cds);

    const success = Math.random() < SUCCESS_CHANCE;

    if (success) {
        // 5% a 20% do saldo do alvo
        const pct = 0.05 + Math.random() * 0.15;
        let amount = Math.floor(targetBal * pct);
        amount = Math.max(50, Math.min(amount, targetBal));

        eter.remove(target.id, amount, { reason: 'roubo' });
        eter.add(thief.id, amount, { reason: 'roubo' });

        return reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x22c55e)
                    .setTitle('💰 Roubo bem-sucedido')
                    .setDescription(
                        `**${thief.username}** roubou ✨ **${fmt(amount)}** de **${target.username}**.`
                    )
                    .addFields(
                        {
                            name: 'Seu saldo',
                            value: `✨ **${fmt(eter.get(thief.id))}**`,
                            inline: true
                        },
                        {
                            name: `Saldo de ${target.username}`,
                            value: `✨ **${fmt(eter.get(target.id))}**`,
                            inline: true
                        }
                    )
                    .setThumbnail(target.displayAvatarURL({ size: 64 }))
                    .setTimestamp()
            ]
        });
    }

    // Falhou — multa
    const thiefBal = eter.get(thief.id);
    let fine = 200 + Math.floor(Math.random() * 800);
    fine = Math.min(fine, thiefBal);
    if (fine > 0) eter.remove(thief.id, fine, { reason: 'roubo falhou' });

    return reply({
        embeds: [
            new EmbedBuilder()
                .setColor(0xef4444)
                .setTitle('🚨 Roubo falhou')
                .setDescription(
                    `**${target.username}** te pegou no flagra!\n` +
                        (fine > 0
                            ? `Você perdeu ✨ **${fmt(fine)}** de multa.`
                            : 'Você não tinha éter para pagar multa.')
                )
                .addFields({
                    name: 'Seu saldo',
                    value: `✨ **${fmt(eter.get(thief.id))}**`,
                    inline: true
                })
                .setThumbnail(target.displayAvatarURL({ size: 64 }))
                .setTimestamp()
        ]
    });
}

module.exports = {
    name: 'rob',
    aliases: ['roubar', 'steal'],
    description: 'Rouba éter de outro usuário',
    data: new SlashCommandBuilder()
        .setName('roubar')
        .setDescription('Rouba éter de um usuário')
        .addUserOption((o) =>
            o.setName('usuario').setDescription('Quem você quer roubar').setRequired(true)
        ),

    async execute(message, args) {
        const target = await resolveTarget(message, args);
        await run(message.author, target, (p) => message.reply(p));
    },

    async executeSlash(i) {
        const target = i.options.getUser('usuario', true);
        await run(i.user, target, (p) => {
            if (typeof p === 'string') {
                return i.reply({ content: p, flags: MessageFlags.Ephemeral });
            }
            return i.reply(p);
        });
    }
};
