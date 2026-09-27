const { SlashCommandBuilder } = require('discord.js');
const ai = require('../utils/aeternusAI');

async function runChat(userId, text, client, guild, channel, respond) {
    const q = String(text || '').trim();
    if (!q) {
        return respond(
            'Sou a **consciência do Aeternus** — nativa deste bot, sem IA de fora.\n' +
                'Ex.: `O.aeternus meu saldo` · `O.ia explique arena` · `crie uma classe ninja`'
        );
    }

    if (/^(limpar|clear|reset)$/i.test(q)) {
        ai.clearHistory(userId);
        return respond('Memória desta conversa apagada.');
    }

    const result = await ai.chat({
        userId,
        message: q,
        client,
        guild,
        channel
    });

    if (!result.ok) return respond('❌ ' + (result.error || 'Falha interna.'));
    return respond(result.text);
}

module.exports = {
    name: 'aeternus',
    aliases: ['ia', 'ai', 'assistente', 'ask', 'consciencia', 'consciência'],
    description: 'Consciência do Aeternus — saldos, comandos, RPG, servidores',
    data: new SlashCommandBuilder()
        .setName('aeternus')
        .setDescription('Fale com a consciência do Aeternus')
        .addStringOption((o) =>
            o.setName('mensagem').setDescription('Sua pergunta').setRequired(true)
        ),

    async execute(message, args) {
        const text = (args || []).join(' ').trim();
        await runChat(
            message.author.id,
            text,
            message.client,
            message.guild,
            message.channel,
            (c) => message.reply({ content: c, allowedMentions: { repliedUser: false } })
        );
    },

    async executeSlash(i) {
        const text = i.options.getString('mensagem', true);
        await i.deferReply();
        await runChat(i.user.id, text, i.client, i.guild, i.channel, async (c) => {
            await i.editReply({ content: c });
        });
    },

    async handleMention(message, strippedText) {
        await runChat(
            message.author.id,
            strippedText,
            message.client,
            message.guild,
            message.channel,
            (c) => message.reply({ content: c, allowedMentions: { repliedUser: false } })
        );
        return true;
    }
};
