const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const ai = require('../utils/aeternusAI');

async function replyChat(messageOrInteraction, text, isSlash) {
    const content = text.length > 1900 ? text.slice(0, 1890) + '…' : text;
    if (isSlash) {
        if (messageOrInteraction.deferred || messageOrInteraction.replied) {
            return messageOrInteraction.editReply({ content });
        }
        return messageOrInteraction.reply({ content });
    }
    return messageOrInteraction.reply({ content });
}

async function runChat(userId, text, client, guild, channel, respond) {
    const q = String(text || '').trim();
    if (!q) {
        return respond(
            'Sou a **IA do Aeternus**. Pergunte sobre comandos, saldo, sonhos (Loritta), RPG/classes ou servidores.\n' +
                'Ex.: `O.aeternus qual meu saldo e sonhos?` · `O.ia explique O.arena`'
        );
    }

    if (/^(limpar|clear|reset)$/i.test(q)) {
        ai.clearHistory(userId);
        return respond('🧠 Histórico desta conversa limpo.');
    }

    if (!ai.configured()) {
        return respond(
            '⚠️ IA ainda sem chave de API.\n' +
                'Configure no ambiente: `AETERNUS_AI_API_KEY` (ou `OPENAI_API_KEY` / `GROQ_API_KEY` / `XAI_API_KEY`) e opcional `AETERNUS_AI_MODEL`.'
        );
    }

    const result = await ai.chat({
        userId,
        message: q,
        client,
        guild,
        channel
    });

    if (!result.ok) return respond('❌ ' + (result.error || 'Falha na IA.'));
    return respond(result.text);
}

module.exports = {
    name: 'aeternus',
    aliases: ['ia', 'ai', 'assistente', 'ask'],
    description: 'IA do Aeternus — comandos, saldos, Loritta, RPG e servidores',
    data: new SlashCommandBuilder()
        .setName('aeternus')
        .setDescription('Fale com a IA do Aeternus')
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

    /** Chamado quando mencionam o bot com texto */
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
