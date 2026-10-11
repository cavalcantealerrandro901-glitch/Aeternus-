const { EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

const STYLES = [
    { label: 'Padrão', value: 'normal', description: 'Texto original' },
    { label: 'Negrito Unicode', value: 'bold', description: 'Letras em negrito' },
    { label: 'Itálico Unicode', value: 'italic', description: 'Letras em itálico' },
    { label: 'Monoespaçado', value: 'mono', description: 'Estilo técnico' },
    { label: 'Gótico', value: 'gothic', description: 'Visual gótico' },
    { label: 'Circundado', value: 'circled', description: 'Letras circundadas quando disponíveis' },
    { label: 'Small caps', value: 'smallcaps', description: 'Letras pequenas estilizadas' },
    { label: 'Decorativo', value: 'decorated', description: 'Adiciona símbolos discretos' }
];
const COLOR = 0x5865F2;

function mapLetters(text, upper, lower) {
    return Array.from(String(text)).map((ch) => {
        const n = ch.codePointAt(0);
        if (n >= 65 && n <= 90) return String.fromCodePoint(upper + n - 65);
        if (n >= 97 && n <= 122) return String.fromCodePoint(lower + n - 97);
        return ch;
    }).join('');
}
function stylize(value, style) {
    const text = String(value || '').trim();
    if (style === 'bold') return mapLetters(text, 0x1D400, 0x1D41A);
    if (style === 'italic') return mapLetters(text, 0x1D434, 0x1D44E);
    if (style === 'mono') return mapLetters(text, 0x1D670, 0x1D68A);
    if (style === 'gothic') return mapLetters(text, 0x1D56C, 0x1D586);
    if (style === 'circled') return Array.from(text).map((ch) => {
        const n = ch.codePointAt(0);
        if (n >= 65 && n <= 90) return String.fromCodePoint(0x24B6 + n - 65);
        if (n >= 97 && n <= 122) return String.fromCodePoint(0x24D0 + n - 97);
        return ch;
    }).join('');
    if (style === 'smallcaps') {
        const map = {a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',q:'ǫ',r:'ʀ',s:'s',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',x:'x',y:'ʏ',z:'ᴢ'};
        return Array.from(text).map((ch) => map[ch.toLowerCase()] || ch).join('');
    }
    if (style === 'decorated') return '『 ' + text + ' 』';
    return text;
}
function cleanName(value) { return Array.from(String(value || '').trim()).slice(0, 32).join(''); }
function canManage(member) { return Boolean(member && member.permissions && member.permissions.has(PermissionFlagsBits.ManageNicknames)); }
async function botMember(guild) { return guild.members.me || guild.members.fetchMe().catch(() => null); }

function embedFor(member, base, style, note) {
    const selected = STYLES.find((s) => s.value === (style || 'normal'));
    const preview = cleanName(stylize(base, style || 'normal')) || 'Prévia do apelido';
    return new EmbedBuilder()
        .setColor(COLOR)
        .setAuthor({ name: 'AETERNUS • CENTRAL DE IDENTIDADE' })
        .setTitle('✦ Editor profissional de nick')
        .setDescription('Escolha uma fonte para aplicar ao apelido.' + (note ? '\n\n' + note : '') + '\n\n**Prévia**\n' + preview)
        .addFields(
            { name: '👤 Membro', value: String(member), inline: true },
            { name: '✒️ Estilo', value: selected ? selected.label : 'Padrão', inline: true },
            { name: '🔤 Tamanho', value: String(Array.from(preview).length) + '/32', inline: true },
            { name: '🎨 Cor', value: 'A cor do nome vem do cargo mais alto do Discord; não pode ser definida no apelido.', inline: false }
        )
        .setFooter({ text: 'Aeternus • Central de identidade' })
        .setTimestamp();
}
function styleMenu(current) {
    return new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
        .setCustomId('aeternus:nick:style')
        .setPlaceholder('Escolha um estilo de fonte')
        .addOptions(STYLES.map((s) => ({ label: s.label, value: s.value, description: s.description, default: s.value === (current || 'normal') }))));
}
async function apply(target, base, style, actor) {
    if (!target.manageable) return { ok: false, message: 'Não consigo editar esse membro por causa da hierarquia dos cargos.' };
    const me = await botMember(target.guild);
    if (!me || !me.permissions.has(PermissionFlagsBits.ManageNicknames)) return { ok: false, message: 'Preciso da permissão Gerenciar apelidos.' };
    const name = cleanName(stylize(base, style));
    if (!name) return { ok: false, message: 'O apelido não pode ficar vazio.' };
    if (Array.from(name).length > 32) return { ok: false, message: 'Esse estilo ultrapassou 32 caracteres. Use um nome menor.' };
    try {
        await target.setNickname(name, 'Personalização de nick por ' + (actor.tag || actor.id));
        return { ok: true, name };
    } catch (error) {
        return { ok: false, message: error && error.code === 50013 ? 'Permissão insuficiente ou cargo do membro acima do meu.' : 'Não foi possível atualizar o apelido.' };
    }
}
function attachCollector(sent, target, base, actor) {
    const collector = sent.createMessageComponentCollector({ time: 120000 });
    collector.on('collect', async (component) => {
        if (component.customId !== 'aeternus:nick:style') return;
        if (component.user.id !== actor.id) return component.reply({ content: 'Este painel pertence a quem executou o comando.', ephemeral: true }).catch(() => {});
        const style = component.values[0] || 'normal';
        const preview = cleanName(stylize(base, style));
        if (!preview || Array.from(preview).length > 32) return component.reply({ content: 'Esse estilo excede 32 caracteres. Experimente um nome menor.', ephemeral: true }).catch(() => {});
        const result = await apply(target, base, style, actor);
        const note = result.ok ? '✅ Apelido atualizado para **' + result.name + '**.' : '⚠️ ' + result.message;
        await component.update({ embeds: [embedFor(target, base, style, note)], components: [styleMenu(style)] }).catch(() => {});
    });
    collector.on('end', () => sent.edit({ components: [] }).catch(() => {}));
}
module.exports = {
    name: 'nick',
    aliases: ['editar-nick', 'editarnick', 'apelido', 'editarnickname'],
    description: 'Personaliza apelidos com estilos Unicode e painel interativo',
    rootSlash: true,
    data: new SlashCommandBuilder()
        .setName('editar-nick')
        .setDescription('Abre o editor profissional de apelidos')
        .addUserOption((o) => o.setName('membro').setDescription('Membro que terá o apelido alterado').setRequired(true))
        .addStringOption((o) => o.setName('nome').setDescription('Novo nome base; vazio usa o apelido atual').setMaxLength(32).setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),
    async execute(message, args) {
        if (!message.guild || !message.member) return message.reply('❌ Use este comando dentro de um servidor.');
        if (!canManage(message.member)) return message.reply('❌ Você precisa da permissão Gerenciar apelidos.');
        const target = message.mentions.members.first();
        if (!target) return message.reply({ embeds: [new EmbedBuilder().setColor(COLOR).setTitle('✦ AETERNUS • EDITOR DE NICK').setDescription('Uso: A.nick @membro Nome Novo\n\nEstilos Unicode, prévia interativa, validação de tamanho e checagem de permissões.\nA cor do nome é definida pelo cargo do Discord.') ] });
        const me = await botMember(message.guild);
        if (!me || !me.permissions.has(PermissionFlagsBits.ManageNicknames)) return message.reply('❌ Preciso da permissão Gerenciar apelidos.');
        const base = cleanName(args.filter((arg) => !/^<@!?\d+>$/.test(arg)).join(' ')) || target.displayName;
        const sent = await message.reply({ embeds: [embedFor(target, base, 'normal', 'Selecione um estilo para aplicar.')], components: [styleMenu('normal')] });
        attachCollector(sent, target, base, message.author);
        return sent;
    },
    async executeSlash(interaction) {
        if (!interaction.inGuild()) return interaction.reply({ content: '❌ Use este comando dentro de um servidor.', ephemeral: true });
        if (!canManage(interaction.member)) return interaction.reply({ content: '❌ Você precisa da permissão Gerenciar apelidos.', ephemeral: true });
        const user = interaction.options.getUser('membro', true);
        const target = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!target) return interaction.reply({ content: '❌ Membro não encontrado neste servidor.', ephemeral: true });
        const me = await botMember(interaction.guild);
        if (!me || !me.permissions.has(PermissionFlagsBits.ManageNicknames)) return interaction.reply({ content: '❌ Preciso da permissão Gerenciar apelidos.', ephemeral: true });
        const base = cleanName(interaction.options.getString('nome')) || target.displayName;
        await interaction.reply({ embeds: [embedFor(target, base, 'normal', 'Selecione um estilo para aplicar.')], components: [styleMenu('normal')], ephemeral: true });
        attachCollector(await interaction.fetchReply(), target, base, interaction.user);
    }
};
