const fs = require('fs');
const path = require('path');
const dbFile = path.join(__dirname, '..', 'database.json');

function getWarnings(userId) {
    try {
        if (!fs.existsSync(dbFile)) return [];
        const data = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
        return data[`user_${userId}`]?.warnings || [];
    } catch (e) {
        return [];
    }
}

module.exports = {
    name: 'warns',
    description: 'Mostra os avisos de um usuário.',
    async execute(message, args) {
        const targetUser = message.mentions.users.first() || message.author;
        const warnings = getWarnings(targetUser.id);

        if (warnings.length === 0) {
            return message.reply({ 
                content: `✨ O usuário **${targetUser.tag}** não possui nenhum aviso registrado.` 
            });
        }

        let description = warnings.map((w, index) => {
            const dateStr = w.date ? new Date(w.date).toLocaleDateString('pt-BR') : 'Data desconhecida';
            return `**#${index + 1}** | **Mod:** ${w.moderator} | **Data:** ${dateStr}\n📌 *${w.reason}*`;
        }).join('\n\n');

        await message.reply({
            content: `📋 **Lista de avisos de ${targetUser.tag}** (Total: ${warnings.length}):\n\n${description}`
        });
    }
};
