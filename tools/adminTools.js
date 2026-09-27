/**
 * Ferramentas de Administração e Edição de Interface (Exclusivas do Proprietário)
 */
const fs = require('fs');
const path = require('path');

function registerAdminTools(ai) {
    ai.registerTool({
        name: 'edit_command_interface',
        description: 'Edita ou cria rascunhos de interface de comandos (Apenas Dono)',
        ownerOnly: true,
        handler: async (args, rt) => {
            const commandName = String(args.name || '')
                .toLowerCase()
                .replace(/[^a-z0-9_-]/g, '')
                .slice(0, 32);

            if (!commandName) {
                return { ok: false, error: 'Nome de comando inválido.' };
            }

            const title = String(args.title || commandName);
            const description = String(args.description || 'Interface customizada');
            const color = String(args.color || '#5865F2');

            const interfaceTemplate = `// Interface customizada para o comando: ${commandName}
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: '${commandName}',
    description: ${JSON.stringify(description)},
    async execute(message) {
        const embed = new EmbedBuilder()
            .setTitle(${JSON.stringify(title)})
            .setDescription(${JSON.stringify(description)})
            .setColor('${color}')
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
};
`;

            const draftsDir = path.join(process.cwd(), 'drafts');
            try {
                if (!fs.existsSync(draftsDir)) {
                    fs.mkdirSync(draftsDir, { recursive: true });
                }
                const filePath = path.join(draftsDir, `${commandName}.js`);
                fs.writeFileSync(filePath, interfaceTemplate, 'utf8');

                return {
                    ok: true,
                    path: filePath,
                    commandName,
                    message: `Interface do comando '${commandName}' salva com sucesso em drafts/${commandName}.js`
                };
            } catch (err) {
                return { ok: false, error: err.message };
            }
        }
    });
}

module.exports = registerAdminTools;
