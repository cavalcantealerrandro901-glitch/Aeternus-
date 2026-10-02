/**
 * Shell virtual do Aeternus — opera no diretório do projeto (sandbox).
 */
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

const ROOT = path.resolve(path.join(__dirname, '..'));
const MAX_READ = 200000;
const MAX_OUT = 12000;

function resolveSafe(rel) {
    const raw = String(rel || '.').replace(/\\/g, '/');
    if (raw.includes('\0') || raw.startsWith('~')) throw new Error('path inválido');
    const abs = path.resolve(ROOT, raw);
    if (!abs.startsWith(ROOT)) throw new Error('fora do sandbox do projeto');
    return abs;
}

function relFromRoot(abs) {
    return path.relative(ROOT, abs) || '.';
}

function listDir(rel = '.') {
    const abs = resolveSafe(rel);
    if (!fs.existsSync(abs)) return { ok: false, error: 'não existe: ' + rel };
    if (!fs.statSync(abs).isDirectory()) return { ok: false, error: 'não é pasta: ' + rel };
    const entries = fs.readdirSync(abs, { withFileTypes: true }).map((d) => {
        const full = path.join(abs, d.name);
        let size = 0;
        try { size = d.isFile() ? fs.statSync(full).size : 0; } catch (_) {}
        return { name: d.name, type: d.isDirectory() ? 'dir' : 'file', size };
    });
    entries.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));
    return { ok: true, path: relFromRoot(abs), entries };
}

function cat(rel, { max = MAX_READ } = {}) {
    const abs = resolveSafe(rel);
    if (!fs.existsSync(abs)) return { ok: false, error: 'arquivo não encontrado' };
    if (fs.statSync(abs).isDirectory()) return { ok: false, error: 'é uma pasta — use ls' };
    let text = fs.readFileSync(abs, 'utf8');
    const truncated = text.length > max;
    if (truncated) text = text.slice(0, max) + '\n… [truncado]';
    return { ok: true, path: relFromRoot(abs), content: text, truncated };
}

function writeFile(rel, content) {
    const abs = resolveSafe(rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, String(content ?? ''), 'utf8');
    return { ok: true, path: relFromRoot(abs), bytes: Buffer.byteLength(String(content ?? ''), 'utf8') };
}

function mkdir(rel) {
    const abs = resolveSafe(rel);
    fs.mkdirSync(abs, { recursive: true });
    return { ok: true, path: relFromRoot(abs) };
}

function touch(rel) {
    const abs = resolveSafe(rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    if (!fs.existsSync(abs)) fs.writeFileSync(abs, '', 'utf8');
    else fs.utimesSync(abs, new Date(), new Date());
    return { ok: true, path: relFromRoot(abs) };
}

function rm(rel) {
    const abs = resolveSafe(rel);
    if (abs === ROOT) return { ok: false, error: 'não pode apagar a raiz' };
    if (!fs.existsSync(abs)) return { ok: false, error: 'não existe' };
    if (fs.statSync(abs).isDirectory()) fs.rmSync(abs, { recursive: true, force: true });
    else fs.unlinkSync(abs);
    return { ok: true, removed: relFromRoot(abs) };
}

function tree(rel = '.', depth = 2) {
    const lines = [];
    function walk(r, d, prefix) {
        if (d < 0) return;
        const abs = resolveSafe(r);
        if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) return;
        for (const name of fs.readdirSync(abs).slice(0, 80)) {
            if (name === 'node_modules' || name === '.git') continue;
            const child = path.join(r, name);
            const full = path.join(abs, name);
            const isDir = fs.statSync(full).isDirectory();
            lines.push(prefix + (isDir ? '📁 ' : '📄 ') + name);
            if (isDir && d > 0) walk(child, d - 1, prefix + '  ');
        }
    }
    walk(rel, depth, '');
    return { ok: true, text: lines.join('\n') || '(vazio)' };
}

async function runAllowed(cmd, args = []) {
    const bin = String(cmd || '').toLowerCase();
    const allowed = new Set(['node', 'npm', 'npx', 'which', 'echo']);
    if (!allowed.has(bin)) return { ok: false, error: 'comando não permitido: ' + bin };
    if (bin === 'echo') return { ok: true, stdout: args.join(' '), stderr: '', code: 0 };
    if (bin === 'which') return { ok: true, stdout: args[0] ? '/usr/bin/' + args[0] : '', stderr: '', code: 0 };
    try {
        const { stdout, stderr } = await execFileAsync(bin, args, {
            cwd: ROOT, timeout: 25000, maxBuffer: 512000,
            env: { ...process.env, npm_config_yes: 'true' }
        });
        return { ok: true, stdout: String(stdout || '').slice(0, MAX_OUT), stderr: String(stderr || '').slice(0, MAX_OUT), code: 0 };
    } catch (e) {
        return { ok: false, stdout: String(e.stdout || '').slice(0, MAX_OUT), stderr: String(e.stderr || e.message || '').slice(0, MAX_OUT), code: e.code || 1 };
    }
}

async function execLine(line) {
    const raw = String(line || '').trim();
    if (!raw) return { ok: true, text: '' };
    const parts = raw.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
    const toks = parts.map((t) => t.replace(/^['"]|['"]$/g, ''));
    const cmd = (toks[0] || '').toLowerCase();
    const args = toks.slice(1);

    if (cmd === 'pwd') return { ok: true, text: ROOT };
    if (cmd === 'ls' || cmd === 'dir') {
        const r = listDir(args[0] || '.');
        if (!r.ok) return r;
        const text = r.entries.map((e) => (e.type === 'dir' ? '📁 ' : '📄 ') + e.name + (e.type === 'file' ? ' (' + e.size + 'b)' : '')).join('\n');
        return { ok: true, text: text || '(vazio)', path: r.path };
    }
    if (cmd === 'tree') return tree(args[0] || '.', Number(args[1]) || 2);
    if (cmd === 'cat' || cmd === 'type') {
        const r = cat(args[0] || '');
        if (!r.ok) return r;
        return { ok: true, text: r.content, path: r.path };
    }
    if (cmd === 'head') {
        const r = cat(args[0] || '');
        if (!r.ok) return r;
        return { ok: true, text: r.content.split('\n').slice(0, 20).join('\n') };
    }
    if (cmd === 'tail') {
        const r = cat(args[0] || '');
        if (!r.ok) return r;
        return { ok: true, text: r.content.split('\n').slice(-20).join('\n') };
    }
    if (cmd === 'mkdir' || cmd === 'md') {
        const r = mkdir(args[0] || '');
        return r.ok ? { ok: true, text: 'criado: ' + r.path } : r;
    }
    if (cmd === 'touch') {
        const r = touch(args[0] || '');
        return r.ok ? { ok: true, text: 'ok: ' + r.path } : r;
    }
    if (cmd === 'rm' || cmd === 'del') {
        const r = rm(args[0] || '');
        return r.ok ? { ok: true, text: 'removido: ' + r.removed } : r;
    }
    if (cmd === 'nano' || cmd === 'vim' || cmd === 'code' || cmd === 'edit') {
        const r = cat(args[0] || '');
        if (!r.ok && args[0]) {
            writeFile(args[0], '');
            return { ok: true, text: '', path: args[0], open: args[0], action: 'open' };
        }
        if (!r.ok) return r;
        return { ok: true, text: r.content, path: r.path, open: r.path, action: 'open' };
    }
    if (cmd === 'npm' || cmd === 'node' || cmd === 'npx' || cmd === 'echo' || cmd === 'which' || cmd === 'pkg') {
        const bin = cmd === 'pkg' ? 'npm' : cmd;
        const a = cmd === 'pkg' ? ['install', ...args] : args;
        const r = await runAllowed(bin, a);
        const text = [r.stdout, r.stderr].filter(Boolean).join('\n').trim() || '(exit ' + r.code + ')';
        return { ok: r.ok, text, code: r.code };
    }
    if (cmd === 'help') {
        return {
            ok: true,
            text: [
                'Comandos do shell Aeternus:',
                '  ls [pasta]     listar',
                '  cat <arq>      ler arquivo',
                '  nano <arq>     abrir no editor',
                '  tree [pasta]   árvore',
                '  mkdir / touch / rm',
                '  pwd',
                '  node <args>',
                '  npm install …',
                '  echo …'
            ].join('\n')
        };
    }
    return { ok: false, error: 'comando desconhecido: ' + cmd + ' (digite help)' };
}

function listProjectFiles(dir = '.', acc = [], depth = 0) {
    if (depth > 4) return acc;
    const abs = resolveSafe(dir);
    if (!fs.existsSync(abs)) return acc;
    for (const name of fs.readdirSync(abs)) {
        if (['node_modules', '.git', 'data', 'uploads'].includes(name)) continue;
        const rel = path.join(dir, name).replace(/\\/g, '/');
        const full = path.join(abs, name);
        try {
            const st = fs.statSync(full);
            if (st.isDirectory()) listProjectFiles(rel, acc, depth + 1);
            else if (/\.(js|ts|json|md|html|css|txt|yml|yaml)$/i.test(name)) acc.push(rel.replace(/^\.\//, ''));
        } catch (_) {}
    }
    return acc;
}

module.exports = {
    ROOT, resolveSafe, listDir, cat, writeFile, mkdir, touch, rm, tree, execLine, runAllowed, listProjectFiles
};
