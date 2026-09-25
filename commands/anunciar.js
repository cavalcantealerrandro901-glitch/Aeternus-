const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const player = require('../utils/player');
const store = require('../utils/store');

const DEFAULT_ONLINE_MSG = [
    '🟢 **Aeternus — Online novamente**',
    '',
    'O **Aeternus** está **online de novo**.',
    '',
    'A migração de hospedagem foi concluída e o bot **já está funcionando normalmente**.',
    '',
    'Você pode voltar a usar os comandos, perfil, arena e o restante do sistema como antes.',
    '',
    'Obrigado pela paciência.',
    '',
    '— Equipe Aeternus'
].join('\n');

module.exports = {
    name: 'anunciar',
    aliases: ['broadcast', 'avisar'],
    description: 'Admin: anuncia no PV dos jogadores (padrão: online novamente; ou texto livre)',
    async execute(message, args) {
        if (!message.member?.permissions?.has(PermissionFlagsBits.Administrator)) {
            return message.reply('Apenas administradores.');
        }

        const custom = args.join(' ').trim();
        const embed = new EmbedBuilder()
            .setColor(0x22c55e)
            .setTitle('🟢 Aeternus — Online novamente')
            .setDescription(custom || DEFAULT_ONLINE_MSG)
            .setFooter({ text: 'Mensagem no privado · Aeternus' })
            .setTimestamp();

        const all = player.all();
        const ids = Object.keys(all).filter((id) => player.has(id));
        let ok = 0;
        let fail = 0;
        const status = await message.reply(
            `Enviando anúncio no PV para **${ids.length}** jogadores...`
        );

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
            type: custom ? 'custom' : 'online_novamente'
        });
        return status.edit(
            `✅ PV enviado: **${ok}** · Falhou (DM fechada): **${fail}** · Total: **${ids.length}**`
        );
    }
};
