const fs = require('fs');
const path = require('path');
const dbFile = path.join(__dirname, '..', 'database.json');

function addWarning(userId, moderatorTag, reason) {
    try {
        let data = {};
        if (fs.existsSync(dbFile)) {
            data = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
        }
        if (!data[`user_${userId}`]) {
            data[`user_${userId}`] = { balance: 0, warnings: [] };
        }
        if (!data[`user_${userId}`].warnings) {
            data[`user_${userId}`].warnings = [];
        }
        
        const warningObj = {
            moderator: moderatorTag,
            reason: reason,
            date: new Date().toISOString()
        };
        
        data[`user_${userId}`].warnings.push(warningObj);
        fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
        return data[`user_${userId}`].warnings.length;
    } catch (e) {
        console.error(e);
        return null;
    }
}

module.exports = {
    name: 'warn',
    description: 'Aplica um aviso a um usuário.',
    async execute(message, args) {
        // Verifica se tem permissão para moderar membros ou é Administrador
        if (!message.member.permissions.has('ModerateMembers') && !message.member.permissions.has('Administrator')) {
            return message.reply({ content: '❌ Você não tem permissão para usar este comando!' });
        }

        const targetUser = message.mentions.users.first();
        if (!targetUser) {
            return message.reply({ content: '⚠️ Uso incorreto! Exemplo: `!warn @usuario Motivo da infração`' });
        }

        const reason = args.slice(1).join(' ') || 'Nenhum motivo especificado';

        const warnCount = addWarning(targetUser.id, message.author.tag, reason);

        if (warnCount === null) {
            return message.reply({ content: '❌ Erro ao salvar o aviso no banco de dados.' });
        }

        try {
            await targetUser.send(`⚠️ Você recebeu um aviso no servidor **${message.guild.name}**.\n**Motivo:** ${reason}\n**Total de avisos:** ${warnCount}`);
        } catch (err) {}

        await message.reply({
            content: `✅ O usuário **${targetUser.tag}** foi avisado com sucesso!\n📌 **Motivo:** ${reason}\n📊 **Total de avisos:** ${warnCount}`
        });
    }
};
