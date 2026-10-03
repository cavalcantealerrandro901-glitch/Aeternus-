const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const classes = require('../utils/classes');

module.exports = {
    name: 'classeadmin',
    aliases: ['criarclasse', 'classadmin'],
    description: 'Admin: cria classes novas com descrição, poderes e desvantagens',
    async execute(message, args) {
        if (!message.member?.permissions?.has(PermissionFlagsBits.Administrator)) {
            return message.reply('Apenas administradores.');
        }
        const sub = (args[0] || '').toLowerCase();
        if (sub === 'lista' || sub === 'list') {
            const list = classes.listClasses();
            const embed = new EmbedBuilder()
                .setColor(0xc9a227)
                .setTitle('📜 Classes Aeternus')
                .setDescription(
                    list
                        .map(
                            (c) =>
                                `${c.emoji} **${c.name}** (\`${c.id}\`)${c.custom ? ' · custom' : ''}\n${c.desc}`
                        )
                        .join('\n\n')
                        .slice(0, 4000)
                );
            return message.reply({ embeds: [embed] });
        }

        if (sub === 'criar' || sub === 'create') {
            const raw = args.slice(1).join(' ');
            const parts = raw.split('|').map((s) => s.trim());
            if (parts.length < 5) {
                return message.reply(
                    'Uso:\n`O.classeadmin criar id|Nome|emoji|tipo|descrição|poder1|poder2|desv1|desv2`\n' +
                        'Tipos: melee, magic, ranged, support, tank'
                );
            }
            try {
                const cls = classes.createClass({
                    id: parts[0],
                    name: parts[1],
                    emoji: parts[2],
                    type: parts[3],
                    desc: parts[4],
                    powers: parts.slice(5, 7),
                    disadvantages: parts.slice(7, 9)
                });
                return message.reply(
                    `✅ Classe criada: ${cls.emoji} **${cls.name}** (\`${cls.id}\`)\n${cls.desc}`
                );
            } catch (e) {
                return message.reply('❌ ' + e.message);
            }
        }

        if (sub === 'remover' || sub === 'delete') {
            const id = args[1];
            if (typeof classes.deleteCustomClass !== 'function' || !classes.deleteCustomClass(id)) {
                return message.reply('Classe custom não encontrada (não remove classes base).');
            }
            return message.reply(`Removida classe custom \`${id}\`.`);
        }

        if (sub === 'setar' || sub === 'set' || sub === 'dar') {
            const user = message.mentions.users.first();
            const classId = args.find((a) => !a.startsWith('<@') && a !== sub);
            if (!user || !classId) {
                return message.reply(
                    'Uso: `O.classeadmin setar @user <id_da_classe>`\n' +
                        'Ex.: `O.classeadmin setar @fulano arcanjo_do_veu`\n' +
                        'Ex.: `O.classeadmin setar @voce deus_criador`'
                );
            }
            const player = require('../utils/player');
            if (!player.has(user.id)) {
                return message.reply('Usuário sem perfil. Peça para usar `O.j criar` primeiro.');
            }
            const r = player.changeClass(user.id, classId);
            if (!r.ok) return message.reply('❌ ' + r.error);

            let gearNote = '';
            try {
                const excl = require('../systems/exclusiveClass');
                const entry = (excl.EXCLUSIVES || []).find(
                    (e) => String(e.classId) === String(r.class.id)
                );
                if (entry?.gear?.length) {
                    excl.grantGear(user.id, entry.gear);
                    gearNote =
                        '\n🎒 Itens entregues: ' +
                        entry.gear.map((g) => g.name || g.id).join(', ');
                } else if (Array.isArray(r.class.classGear) && r.class.classGear.length) {
                    const items = require('../utils/items');
                    for (const id of r.class.classGear) {
                        const inst =
                            typeof items.instantiateItem === 'function'
                                ? items.instantiateItem(id)
                                : items.getItemDef?.(id);
                        if (inst) player.addItem(user.id, { ...inst });
                    }
                    gearNote = '\n🎒 Itens do catálogo entregues.';
                }
            } catch (e) {
                gearNote = '\n⚠️ Classe ok, mas itens: ' + (e.message || e);
            }

            return message.reply(
                `✅ ${user.username} agora é ${r.class.emoji} **${r.class.name}** (\`${r.class.id}\`).` +
                    gearNote
            );
        }

        return message.reply(
            'Subcomandos: `lista` · `criar ...` · `remover <id>` · `setar @user <id>`'
        );
    }
};
