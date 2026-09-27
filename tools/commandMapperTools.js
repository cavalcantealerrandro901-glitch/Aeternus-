/**
 * Ferramenta para mapeamento dinâmico de comandos da aplicação.
 * Lê a pasta /commands, extrai nome, descrição, uso e propósito de cada comando.
 */
const fs = require('fs');
const path = require('path');

function registerCommandMapperTools(ai) {
    ai.registerTool({
        name: 'map_all_commands',
        description: 'Mapeia dinamicamente todos os comandos na pasta commands com descrição e modo de uso',
        handler: async () => {
            const commandsDir = path.join(process.cwd(), 'commands');
            if (!fs.existsSync(commandsDir)) {
                return { ok: false, error: 'A pasta /commands não foi encontrada no projeto.' };
            }

            const files = fs.readdirSync(commandsDir).filter((f) => f.endsWith('.js'));
            const commandList = [];

            for (const file of files) {
                try {
                    const filePath = path.join(commandsDir, file);
                    delete require.cache[require.resolve(filePath)];
                    const cmd = require(filePath);

                    const name = cmd.name || file.replace('.js', '');
                    const description = cmd.description || 'Sem descrição cadastrada.';
                    const usage = cmd.usage || (cmd.data ? `/${name}` : `O.${name}`);
                    const purpose = cmd.about || cmd.purpose || description;
                    const aliases = Array.isArray(cmd.aliases) && cmd.aliases.length > 0 
                        ? cmd.aliases.join(', ') 
                        : 'Nenhum';

                    commandList.push({
                        name,
                        description,
                        usage,
                        purpose,
                        aliases
                    });
                } catch (e) {
                    commandList.push({
                        name: file.replace('.js', ''),
                        error: `Erro ao ler arquivo: ${e.message}`
                    });
                }
            }

            return { ok: true, count: commandList.length, commands: commandList };
        }
    });
}

module.exports = registerCommandMapperTools;
