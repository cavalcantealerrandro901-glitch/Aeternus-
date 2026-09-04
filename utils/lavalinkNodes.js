/**
 * Parse lista de nodes Lavalink do .env
 */
function parseBool(v, def = false) {
    if (v === undefined || v === null || v === '') return def;
    const s = String(v).trim().toLowerCase();
    if (['1', 'true', 'yes', 'sim', 'on'].includes(s)) return true;
    if (['0', 'false', 'no', 'nao', 'não', 'off'].includes(s)) return false;
    return def;
}

function parseNodesFromEnv() {
    const nodes = [];
    const seen = new Set();

    const push = (hostname, port, password, secure) => {
        if (!hostname) return;
        let host = String(hostname).replace(/^https?:\/\//i, '').replace(/\/$/, '').trim();
        if (!host) return;
        let p = port != null && String(port).trim() !== '' ? String(port).trim() : '';
        let sec = parseBool(secure, false);
        if (host.includes('/') && !p) host = host.split('/')[0];
        if (host.includes(':') && !p) {
            const [h, maybePort] = host.split(':');
            if (maybePort && /^\d+$/.test(maybePort)) {
                host = h;
                p = maybePort;
            }
        }
        if (!p) p = sec ? '443' : '2333';
        const pass =
            password != null && String(password).trim() !== ''
                ? String(password)
                : 'youshallnotpass';
        const key = `${host}:${p}`;
        if (seen.has(key)) return;
        seen.add(key);
        nodes.push({
            hostname: host,
            port: String(p),
            password: pass,
            secure: sec,
            label: `${host}:${p}`
        });
    };

    const rawList = process.env.LAVALINK_NODES || process.env.LAVALINK_NODE_LIST || '';
    if (rawList.trim()) {
        for (const part of rawList.split(/[,;\n]+/)) {
            const item = part.trim();
            if (!item) continue;
            if (item.startsWith('{')) {
                try {
                    const o = JSON.parse(item);
                    push(o.host || o.hostname, o.port, o.password || o.auth || o.pass, o.secure);
                    continue;
                } catch (_) {}
            }
            const bits = item.split(':');
            if (bits.length >= 4) {
                const host = bits[0];
                const port = bits[1];
                const secure = bits[bits.length - 1];
                const password = bits.slice(2, -1).join(':');
                push(host, port, password, secure);
            } else if (bits.length === 3) {
                if (/^\d+$/.test(bits[1])) push(bits[0], bits[1], bits[2], false);
                else push(bits[0], null, bits[1], bits[2]);
            } else if (bits.length === 2) {
                if (/^\d+$/.test(bits[1])) push(bits[0], bits[1], null, false);
                else push(bits[0], null, bits[1], false);
            } else if (bits.length === 1) {
                push(bits[0], null, null, false);
            }
        }
    }

    for (let i = 1; i <= 15; i++) {
        const h = process.env[`LAVALINK_HOST_${i}`] || process.env[`LAVALINK_${i}_HOST`] || '';
        if (!h) continue;
        push(
            h,
            process.env[`LAVALINK_PORT_${i}`] || process.env[`LAVALINK_${i}_PORT`],
            process.env[`LAVALINK_PASSWORD_${i}`] ||
                process.env[`LAVALINK_${i}_PASSWORD`] ||
                process.env[`LAVALINK_PASS_${i}`],
            process.env[`LAVALINK_SECURE_${i}`] || process.env[`LAVALINK_${i}_SECURE`]
        );
    }

    const single = process.env.LAVALINK_HOST || process.env.LAVALINK_URL || '';
    if (single) {
        push(
            single,
            process.env.LAVALINK_PORT,
            process.env.LAVALINK_PASSWORD || process.env.LAVALINK_PASS,
            process.env.LAVALINK_SECURE === 'true' || String(single).startsWith('https')
        );
    }

    return nodes;
}

module.exports = { parseNodesFromEnv, parseBool };
