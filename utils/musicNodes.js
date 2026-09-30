/**
 * Nodes Lavalink para o Shoukaku.
 * Padrão: Serenetia v4 (TLS 443).
 */

/** Node oficial do bot */
const SERENETIA = {
    name: 'serenetia',
    url: 'lavalinkv4.serenetia.com:443',
    auth: 'https://seretia.link/discord',
    secure: true
};

const DEFAULT_PUBLIC_NODES = [SERENETIA];

/**
 * LAVALINK_NODES=nome|host:porta|senha|true
 * Ex.: serenetia|lavalinkv4.serenetia.com:443|https://seretia.link/discord|true
 */
function parseNodesFromEnv(raw) {
    const str = String(raw || '').trim();
    if (!str) return [];

    if (str.startsWith('[')) {
        try {
            const arr = JSON.parse(str);
            return (Array.isArray(arr) ? arr : [])
                .map((n, i) => normalizeNode(n, i))
                .filter(Boolean);
        } catch {
            return [];
        }
    }

    return str
        .split(/[;\n]+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, i) => {
            // suporte formato antigo host:port:pass:secure (separado por vírgula)
            if (line.includes('|')) {
                const parts = line.split('|').map((p) => p.trim());
                if (parts.length < 3) return null;
                const [name, url, auth, secureRaw] = parts;
                return normalizeNode(
                    {
                        name: name || `node-${i + 1}`,
                        url,
                        auth,
                        secure: /^(1|true|yes|wss|https)$/i.test(String(secureRaw || ''))
                    },
                    i
                );
            }
            const bits = line.split(':');
            if (bits.length >= 3) {
                const secureFlag = String(bits[bits.length - 1]).toLowerCase();
                const isSecure =
                    secureFlag === 'secure' ||
                    secureFlag === 'true' ||
                    secureFlag === '1';
                const host = bits[0];
                const port = bits[1];
                const password = isSecure || secureFlag === 'false' || secureFlag === 'insecure'
                    ? bits.slice(2, -1).join(':')
                    : bits.slice(2).join(':');
                return normalizeNode(
                    {
                        name: `node-${i + 1}`,
                        url: `${host}:${port}`,
                        auth: password,
                        secure: isSecure || port === '443'
                    },
                    i
                );
            }
            return null;
        })
        .filter(Boolean);
}

function normalizeNode(n, i = 0) {
    if (!n) return null;
    let url = String(n.url || n.host || '')
        .replace(/^https?:\/\//i, '')
        .replace(/\/$/, '');
    if (n.port && !url.includes(':')) url = `${url}:${n.port}`;
    if (!url) return null;
    const auth = n.auth ?? n.password;
    if (auth == null || auth === '') return null;

    let secure = n.secure === true || n.secure === 'true';
    if (n.secure === false || n.secure === 'false') secure = false;
    else if (!secure && /:443$/.test(url)) secure = true;

    return {
        name: String(n.name || `node-${i + 1}`).slice(0, 64),
        url,
        auth: String(auth).replace(/^["']|["']$/g, ''),
        secure
    };
}

function getNodes() {
    const fromEnv = parseNodesFromEnv(process.env.LAVALINK_NODES);
    if (fromEnv.length) {
        console.log(`[music] ${fromEnv.length} node(s) via LAVALINK_NODES`);
        return fromEnv;
    }
    // também aceita vars avulsas
    if (process.env.LAVALINK_HOST) {
        const one = normalizeNode({
            name: 'primary',
            host: process.env.LAVALINK_HOST,
            port: process.env.LAVALINK_PORT || '443',
            auth: process.env.LAVALINK_PASSWORD || SERENETIA.auth,
            secure: String(process.env.LAVALINK_SECURE || 'true').toLowerCase() !== 'false'
        });
        if (one) {
            console.log(`[music] node via LAVALINK_HOST: ${one.url}`);
            return [one];
        }
    }
    console.log(`[music] node padrão: ${SERENETIA.name} @ ${SERENETIA.url}`);
    return DEFAULT_PUBLIC_NODES.map((n, i) => normalizeNode(n, i)).filter(Boolean);
}

module.exports = { getNodes, parseNodesFromEnv, DEFAULT_PUBLIC_NODES, SERENETIA };
