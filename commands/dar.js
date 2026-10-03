const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const player = require('../utils/player');
const xp = require('../utils/xp');
const eter = require('../utils/eter');
const cp = require('../utils/cp');
const items = require('../utils/items');
const store = require('../utils/store');

function makeItem(id) {
    if (typeof items.instantiateItem === 'function') return items.instantiateItem(id);
    const def = items.getItemDef?.(id) || items.ITEMS?.[id];
    if (!def) return null;
    return { ...def, effects: { ...(def.effects || {}) } };
}

/**
 * O.dar @user <tipo> <valor>
 * tipos: xp | eter | cp | item <id> | livro <attr> | attr <chave> <n> | pontos <n>
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
            if (typeof cp.add === 'function') cp.add(user.id, n);
            else if (typeof cp.addCp === 'function') cp.addCp(user.id, n);
            lines.push(`💎 +**${n}** CP`);
        } else if (tipo === 'eter' || tipo === 'ether') {
            const n = Math.max(0, parseInt(valor, 10) || 0);
            if (typeof eter.add === 'function') eter.add(user.id, n);
            else if (typeof eter.addEter === 'function') eter.addEter(user.id, n);
            lines.push(`🌌 +**${n}** éter`);
        } else if (tipo === 'item' || tipo.startsWith('item:')) {
            const id = tipo.startsWith('item:') ? tipo.slice(5) : valor.split(/\s+/)[0];
            const inst = makeItem(id);
            if (!inst) {
                return message.reply(
                    'Item inválido. Exemplos: `lamina_arcana`, `armadura_de_corceus`, `colar_da_ressurreicao`, `espada_aco`.'
                );
            }
            if (!player.has(user.id)) return message.reply('Usuário sem perfil. Peça para usar `O.j criar`.');
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
            const inst = makeItem(id);
            if (!inst) return message.reply('Livro não encontrado no catálogo.');
            if (!player.has(user.id)) return message.reply('Usuário sem perfil. Peça para usar `O.j criar`.');
            player.addItem(user.id, inst);
            lines.push(`${inst.emoji || '📕'} **${inst.name}**`);
        } else if (tipo === 'attr' || tipo === 'atributo') {
            const parts = valor.split(/\s+/);
            const key = parts[0];
            const n = Math.max(0, parseInt(parts[1], 10) || 1);
            const ok = [
                'forca',
                'defesa',
                'agilidade',
                'vida',
                'inteligencia',
                'sorte',
                'precisao',
                'resistencia'
            ];
            if (!ok.includes(key)) {
                return message.reply('Atributo: ' + ok.join(' | '));
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
