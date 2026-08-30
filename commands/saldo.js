const { EmbedBuilder } = require('discord.js');
const flocos = require('../utils/flocos');
const cristais = require('../utils/cristais');

module.exports = {
    name: 'saldo',
    aliases: ['bal', 'atm', 'balance', 'carteira'],
    description: 'Mostra flocos e cristais',
    async execute(message, args) {
        // O.saldo bloqueado  →  redireciona
        const sub = (args[0] || '').toLowerCase();
        if (['bloqueado', 'locked', 'liquidacao', 'liquidação', 'vault', 'pending'].includes(sub)) {
            const cmd = message.client.commands.get('saldo-bloqueado');
            if (cmd?.execute) return cmd.execute(message, args.slice(1));
        }

        const user = message.mentions.users.first() || message.author;
        const f = flocos.get(user.id);
        const c = cristais.get(user.id);

        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x8b5cf6)
                    .setAuthor({
                        name: user.username,
                        iconURL: user.displayAvatarURL({ size: 64 })
                    })
                    .setTitle('💎 Carteira')
                    .setDescription(
                        [
                            `❄️ **${flocos.formatPlain(f)}** flocos`,
                            `💠 **${cristais.formatPlain(c)}** cristais`,
                            '',
                            '🔒 Saldo bloqueado: `O.saldo bloqueado` ou `O.bloqueado`',
                            '🛒 Loja: **`/loja cristais`**'
                        ].join('\n')
                    )
                    .setThumbnail(user.displayAvatarURL({ size: 128 }))
                    .setFooter({ text: 'Aeternus · economia' })
                    .setTimestamp()
            ]
        });
    }
};
