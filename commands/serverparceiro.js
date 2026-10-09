const { EmbedBuilder } = require('discord.js');
const store = require('../utils/store');

const FILE = 'serverPartners.json';

function getOwnerId(client) {
    return String(process.env.BOT_OWNER_ID || process.env.OWNER_ID || client.application?.owner?.id || '');
}
function getPartners() {
    const data = store.load(FILE, {});
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
}
function savePartners(data) {
    store.save(FILE, data);
}
function parseId(input) {
    const match = String(input || '').match(/(?:^|\D)(\d{17,20})(?:\D|$)/);
    return match ? match[1] : null;
}
function makeEmbed(title, description, color = 0x2878ff) {
    return new EmbedBuilder().setColor(color).setTitle('✦ AETERNUS • SERVIDOR PARCEIRO')
        .setDescription(description).setFooter({ text: '✧ Gestão exclusiva do proprietário' }).setTimestamp();
}

module.exports = {
    name: 'serverparceiro',
    aliases: ['parceria-server'],
    description: 'Gerencia servidores parceiros do Aeternus (somente proprietário)',
    async execute(message, args = [], client) {
        const ownerId = getOwnerId(client);
        if (!ownerId || message.author.id !== ownerId) {
            return message.reply({ embeds: [makeEmbed('Acesso restrito', '❌ Apenas o proprietário configurado do Aeternus pode usar este comando.', 0xef4444)] });
        }
        const action = String(args[0] || 'ajuda').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const partners = getPartners();

        if (['adicionar', 'add', 'registrar'].includes(action)) {
            const id = parseId(args[1] || message.mentions.guilds?.first()?.id) || message.guild?.id;
            if (!id) return message.reply({ embeds: [makeEmbed('Como adicionar', 'Use: `O.serverparceiro adicionar ID_DO_SERVIDOR`\nVocê também pode executar o comando dentro do servidor que deseja cadastrar, sem informar o ID.')] });
            const guild = client.guilds.cache.get(id);
            partners[id] = { guildId: id, name: guild?.name || 'Servidor parceiro', addedBy: message.author.id, addedAt: new Date().toISOString() };
            savePartners(partners);
            return message.reply({ embeds: [makeEmbed('Parceria cadastrada', `✅ **${guild?.name || 'Servidor'}** foi cadastrado como parceiro.\nID: \`${id}\`\n\nO bônus ×2 do daily será aplicado neste servidor.`, 0x22c55e)] });
        }

        if (['remover', 'remove', 'excluir', 'retirar'].includes(action)) {
            const id = parseId(args[1]) || message.guild?.id;
            if (!id || !partners[id]) return message.reply({ embeds: [makeEmbed('Servidor não encontrado', 'Não encontrei esse servidor na lista de parceiros.', 0xf59e0b)] });
            const name = partners[id].name || client.guilds.cache.get(id)?.name || id;
            delete partners[id];
            savePartners(partners);
            return message.reply({ embeds: [makeEmbed('Parceria removida', `✅ **${name}** não é mais um servidor parceiro. O bônus ×2 foi desativado.`, 0x22c55e)] });
        }

        if (['listar', 'list', 'lista'].includes(action)) {
            const entries = Object.values(partners);
            const description = entries.length
                ? entries.map((p, i) => `**${i + 1}. ${p.name || 'Servidor parceiro'}**\nID: \`${p.guildId}\``).join('\n\n')
                : 'Nenhum servidor parceiro cadastrado.';
            return message.reply({ embeds: [makeEmbed(`Servidores parceiros (${entries.length})`, description)] });
        }

        if (['info', 'informacao', 'informacoes'].includes(action)) {
            const id = parseId(args[1]) || message.guild?.id;
            const p = id ? partners[id] : null;
            if (!p) return message.reply({ embeds: [makeEmbed('Sem parceria', 'Esse servidor não está cadastrado como parceiro.', 0xf59e0b)] });
            return message.reply({ embeds: [makeEmbed('Detalhes da parceria', `**Servidor:** ${p.name || 'Servidor parceiro'}\n**ID:** \`${p.guildId}\`\n**Cadastrado em:** ${p.addedAt ? new Date(p.addedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : 'Não informado'}\n**Bônus diário:** ×2`)] });
        }

        return message.reply({ embeds: [makeEmbed('Comandos disponíveis', [
            '`O.serverparceiro adicionar ID` — cadastrar servidor',
            '`O.serverparceiro remover ID` — remover servidor',
            '`O.serverparceiro listar` — listar parcerias',
            '`O.serverparceiro info ID` — consultar parceria',
            '',
            'O prefixo pode variar conforme a configuração do servidor.'
        ].join('\n'))] });
    }
};
