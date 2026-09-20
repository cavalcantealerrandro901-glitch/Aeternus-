const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const player = require('../utils/player');
const store = require('../utils/store');

module.exports = {
    name: 'anunciar',
    aliases: ['broadcast', 'avisar'],
    description: 'Admin: anuncia no PV criação de avatar/foto e atualizações',
    async execute(message, args) {
        if (!message.member?.permissions?.has(PermissionFlagsBits.Administrator)) {
            return message.reply('Apenas administradores.');
        }

        const custom = args.join(' ').trim();
        const embed = new EmbedBuilder()
            .setColor(0xa78bfa)
            .setTitle('🎭 Aeternus — Avatar e foto de personagem')
            .setDescription(
                custom ||
                    [
                        'Agora você pode **criar a foto/avatar do personagem no PV** do bot.',
                        '',
                        '📌 **Como funciona**',
                        '1. Use `O.j criar` no servidor (abre o fluxo no privado)',
                        '2. Escolha nome e classe',
                        '3. No **PV do bot**, envie uma **imagem** (anexo)',
                        '4. O bot lê a imagem e salva no seu perfil',
                        '',
                        'Ou use o botão **Usar avatar do Discord** no mesmo PV.',
                        '',
                        'Depois você pode criar o **avatar de batalha** com `O.avatar`.',
                        '',
                        '— Equipe Aeternus'
                    ].join('\n')
            )
            .setFooter({ text: 'Mensagem no privado · não é no painel web' })
            .setTimestamp();

        const all = player.all();
        const ids = Object.keys(all).filter((id) => player.has(id));
        let ok = 0;
        let fail = 0;
        const status = await message.reply(`Enviando anúncio de **avatar/foto no PV** para **${ids.length}** jogadores...`);

        for (const id of ids) {
            try {
                const user = await message.client.users.fetch(id);
                await user.send({ embeds: [embed] });
                ok++;
            } catch (_) {
                fail++;
            }
            await new Promise((r) => setTimeout(r, 350));
        }

        store.save('last_broadcast.json', {
            at: Date.now(),
            ok,
            fail,
            total: ids.length,
            type: 'avatar_foto_pv'
        });
        return status.edit(
            `✅ PV enviado: **${ok}** · Falhou (DM fechada): **${fail}** · Total: **${ids.length}**`
        );
    }
};
