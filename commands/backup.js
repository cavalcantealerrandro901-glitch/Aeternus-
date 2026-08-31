const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const backup = require('../utils/backup');

function isOwner(message) {
    const owners = (process.env.OWNER_IDS || process.env.OWNER_ID || '')
        .split(/[,\s]+/)
        .filter(Boolean);
    if (owners.includes(message.author.id)) return true;
    return message.member?.permissions?.has(PermissionFlagsBits.Administrator);
}

module.exports = {
    name: 'backup',
    aliases: ['bkp'],
    description: 'Backup automático — criar / listar / restaurar (admin)',
    async execute(message, args) {
        if (!isOwner(message)) {
            return message.reply('❌ Só administradores / donos do bot.');
        }

        const sub = (args[0] || 'status').toLowerCase();

        if (sub === 'status' || sub === 'info') {
            const st = backup.getStatus();
            const last = st.lastBackup;
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x38bdf8)
                        .setTitle('💾 Sistema de Backup')
                        .setDescription(
                            [
                                `⏱️ Intervalo: **${st.intervalHours}h**`,
                                `📦 Retenção Mongo: **${st.keepMongo}** · Disco: **${st.keepLocal}**`,
                                last
                                    ? `🕐 Último: <t:${Math.floor(last.at / 1000)}:R> · **${last.reason}** · ${last.keys} chaves · ${(last.sizeBytes / 1024).toFixed(1)} KB`
                                    : '🕐 Ainda sem backup nesta sessão.',
                                '',
                                '`O.backup criar` · `O.backup lista` · `O.backup restaurar`'
                            ].join('\n')
                        )
                ]
            });
        }

        if (sub === 'criar' || sub === 'create' || sub === 'now') {
            const msg = await message.reply('💾 Criando backup…');
            const r = await backup.createBackup('manual');
            if (!r.ok) return msg.edit(`❌ ${r.error}`);
            return msg.edit(
                `✅ Backup criado · **${r.keys}** chaves · **${(r.sizeBytes / 1024).toFixed(1)} KB**` +
                    (r.mongoId ? ` · Mongo \`${r.mongoId}\`` : ' · só disco')
            );
        }

        if (sub === 'lista' || sub === 'list') {
            const list = await backup.listBackups(8);
            const local = list.local
                .map((b) => `• \`${b.file}\` — ${(b.sizeBytes / 1024).toFixed(1)} KB`)
                .join('\n') || '_nenhum_';
            const mongo = list.mongo
                .map(
                    (b) =>
                        `• \`${b._id}\` — ${b.reason} · ${b.keys?.length || 0} keys · ${new Date(b.createdAt).toLocaleString('pt-BR')}`
                )
                .join('\n') || '_nenhum_';

            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xa78bfa)
                        .setTitle('💾 Backups')
                        .addFields(
                            { name: 'Disco', value: local.slice(0, 1000) },
                            { name: 'MongoDB', value: mongo.slice(0, 1000) }
                        )
                ]
            });
        }

        if (sub === 'restaurar' || sub === 'restore') {
            const id = args[1];
            const msg = await message.reply('⚠️ Restaurando backup…');
            const r = id
                ? await backup.restoreByMongoId(id)
                : await backup.restoreLatest();
            if (!r.ok) return msg.edit(`❌ ${r.error}`);
            return msg.edit(
                `✅ Restaurado de **${r.source}** · **${r.keys}** chave(s).` +
                    (r.id ? ` ID \`${r.id}\`` : '') +
                    (r.file ? ` arquivo \`${r.file}\`` : '')
            );
        }

        return message.reply('Uso: `O.backup status|criar|lista|restaurar [id]`');
    }
};
