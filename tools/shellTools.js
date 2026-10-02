const shell = require('../utils/aiShell');

module.exports = function register({ registerTool }) {
    registerTool({
        name: 'shell_exec',
        description: 'Terminal sandbox do repo: ls, cat, tree, mkdir, touch, rm, node, npm, help. Args: cmd',
        async handler(args) {
            const line = String(args.cmd || args.comando || args.query || args.text || '').trim();
            if (!line) return { error: 'Informe cmd (ex: ls commands)' };
            const r = await shell.execLine(line);
            if (r.error) return { error: r.error };
            return { ok: true, text: '```\n' + (r.text || '(vazio)').slice(0, 5000) + '\n```' };
        }
    });

    registerTool({
        name: 'read_repo_file',
        description: 'Lê arquivo do repositório. Args: path',
        async handler(args) {
            const p = String(args.path || args.arquivo || args.file || '').trim();
            if (!p) return { error: 'Informe path' };
            const r = shell.cat(p);
            if (!r.ok) return { error: r.error };
            return { ok: true, text: '```\n' + r.content.slice(0, 6000) + '\n```' };
        }
    });

    registerTool({
        name: 'write_repo_file',
        description: 'Escreve arquivo no repo. Args: path, content',
        async handler(args) {
            const p = String(args.path || args.arquivo || '').trim();
            const content = args.content != null ? String(args.content) : '';
            if (!p) return { error: 'Informe path' };
            const r = shell.writeFile(p, content);
            if (!r.ok) return { error: 'falha ao escrever' };
            return { ok: true, text: 'Salvo **' + r.path + '** (' + r.bytes + ' bytes)' };
        }
    });
};
