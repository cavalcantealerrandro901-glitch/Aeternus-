const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const player = require('../utils/player');
const store = require('../utils/store');

module.exports = {
    name: 'anunciar',
    aliases: ['broadcast', 'avisar'],
    description: 'Admin: envia PV de atualização para todos com perfil',
    async execute(message, args) {
        if (!message.member?.permissions?.has(PermissionFlagsBits.Administrator)) {
            return message.reply('Apenas administradores.');
        }

        const custom = args.join(' ').trim();
        const embed = new EmbedBuilder()
            .setColor(0xc9a227)
            .setTitle('📢 Aeternus — Grandes mudanças chegando')
            .setDescription(
                custom ||
                    [
                        'Haverá **mudanças no perfil de jogadores**.',
                        '',
                        '✨ **Novas classes** (todas diferentes das antigas)',
                        '⚔️ **Nova interface de PvP** no painel (tema medieval e magia)',
                        '🎯 Sistema de **habilidades ativas e passivas**',
                        '🏰 **Masmorra** com dezenas de pisos',
                        '',
                        'Mais atualizações virão em breve.',
                        '**Aguarde e prepare-se.**',
                        '',
                        '— Equipe Aeternus'
                    ].join('\n')
            )
            .setFooter({ text: 'Mensagem oficial do bot' })
            .setTimestamp();

        const all = player.all();
        const ids = Object.keys(all).filter((id) => player.has(id));
        let ok = 0;
        let fail = 0;
        const status = await message.reply(`Enviando PV para **${ids.length}** jogadores...`);

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

        store.save('last_broadcast.json', { at: Date.now(), ok, fail, total: ids.length });
        return status.edit(`✅ Enviado: **${ok}** · Falhou (DM fechada): **${fail}** · Total: **${ids.length}**`);
    }
};
