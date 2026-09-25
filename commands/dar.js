const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const player = require('../utils/player');
const xp = require('../utils/xp');
const eter = require('../utils/eter');
const cp = require('../utils/cp');
const items = require('../utils/items');
const store = require('../utils/store');

/**
 * O.dar @user <tipo> <valor>
 * tipos: xp | eter | cp | item:<id> | livro:<attr> | attr:<chave> | pontos <n>
 */
module.exports = {
    name: 'dar',
    aliases: ['give', 'daritem', 'giveitem'],
    description: 'Admin: dar XP, CP, éter, itens, livros de atributo, pontos de atributo',
    async execute(message, args) {
        if (!message.member?.permissions?.has(PermissionFlagsBits.Administrator)) {
            return message.reply('Apenas administradores.');
        }
        const user = message.mentions.users.first();
        if (!user || user.bot) return message.reply('Mencione um usuário.');
        const rest = args.filter((a) => !a.startsWith('<@'));
        const tipo = String(rest[0] || '').toLowerCase();
        const valor = rest.slice(1).join(' ').trim();

        if (!tipo) {
            return message.reply(
                [
                    '**Uso:** `O.dar @user <tipo> <valor>`',
                    '',
                    '**Tipos**',
                    '`xp <qtd>` — experiência',
                    '`cp <qtd>` — cristais de proeza',
                    '`eter <qtd>` — éter',
                    '`item <id>` — arma/acessório/etc (id do catálogo)',
                    '`livro <forca|defesa|agilidade|vida>` — livro de atributo',
                    '`attr <chave> <qtd>` — pontos diretos no atributo',
                    '`pontos <qtd>` — pontos de atributo livres (attrPoints)'
                ].join('\n')
            );
        }

        const lines = [];

        if (tipo === 'xp') {
            const n = Math.max(0, parseInt(valor, 10) || 0);
            xp.addXp(user.id, n);
            lines.push(`✨ +**${n}** XP`);
        } else if (tipo === 'cp') {
            const n = Math.max(0, parseInt(valor, 10) || 0);
            cp.add(user.id, n, { reason: 'admin_dar' });
            lines.push(`💠 +**${n}** CP`);
        } else if (tipo === 'eter' || tipo === 'money' || tipo === 'flocos') {
            const n = Math.max(0, parseInt(valor, 10) || 0);
            eter.add(user.id, n, { reason: 'admin_dar' });
            lines.push(`✨ +**${n}** éter`);
        } else if (tipo === 'item' || tipo.startsWith('item:')) {
            const id = tipo.startsWith('item:') ? tipo.slice(5) : valor.split(/\s+/)[0];
            const inst = items.instantiateItem(id);
            if (!inst) return message.reply('Item inválido. Use um id do catálogo (`cajado_arcano`, `foice_grande`…).');
            if (!player.has(user.id)) return message.reply('Usuário sem perfil.');
            player.addItem(user.id, inst);
            lines.push(`${inst.emoji || '📦'} **${inst.name}**`);
        } else if (tipo === 'livro' || tipo === 'book') {
            const key = valor.toLowerCase().replace(/[^a-z]/g, '');
            const map = {
                forca: 'livro_forca',
                defesa: 'livro_defesa',
                agilidade: 'livro_agilidade',
                vida: 'livro_vida'
            };
            const id = map[key];
            if (!id) return message.reply('Livro: forca | defesa | agilidade | vida');
            const inst = items.instantiateItem(id);
            if (!player.has(user.id)) return message.reply('Usuário sem perfil.');
            player.addItem(user.id, inst);
            lines.push(`${inst.emoji || '📕'} **${inst.name}**`);
        } else if (tipo === 'attr' || tipo === 'atributo') {
            const parts = valor.split(/\s+/);
            const key = parts[0];
            const n = Math.max(0, parseInt(parts[1], 10) || 1);
            if (!['forca', 'defesa', 'agilidade', 'vida'].includes(key)) {
                return message.reply('Atributo: forca | defesa | agilidade | vida');
            }
            const data = store.load('xp.json', {});
            const cur = data[user.id] || { xp: 0, level: 0, attrs: {} };
            if (!cur.attrs) cur.attrs = {};
            cur.attrs[key] = Math.max(0, Math.floor(Number(cur.attrs[key] || 0)) + n);
            data[user.id] = cur;
            store.save('xp.json', data);
            lines.push(`📊 **${key}** +${n}`);
        } else if (tipo === 'pontos' || tipo === 'attrpoints') {
            const n = Math.max(0, parseInt(valor, 10) || 0);
            const data = store.load('xp.json', {});
            const cur = data[user.id] || { xp: 0, level: 0, attrs: {} };
            cur.attrPoints = Math.max(0, Math.floor(Number(cur.attrPoints || 0)) + n);
            data[user.id] = cur;
            store.save('xp.json', data);
            lines.push(`🎯 +**${n}** pontos de atributo livres`);
        } else {
            return message.reply('Tipo desconhecido. Use `O.dar` sem args para a lista.');
        }

        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x22c55e)
                    .setTitle('Entregue')
                    .setDescription(`Para **${user.username}**:\n` + lines.join('\n'))
            ]
        });
    }
};
