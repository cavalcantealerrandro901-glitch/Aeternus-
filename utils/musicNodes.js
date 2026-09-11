/**
 * Parse e defaults de nodes Lavalink para o Shoukaku.
 * Vários nodes = menos sobrecarga e failover automático.
 */

/** Nodes públicos de fallback (podem cair — prefira os seus em LAVALINK_NODES) */
const DEFAULT_PUBLIC_NODES = [
    {
        name: 'serenetia-v4',
        url: 'lavalinkv4.serenetia.com:443',
        auth: 'https://discord.gg/Y93BRPNFYP',
        secure: true
    },
    {
        name: 'lavalink-host',
        url: 'lava-v4.ajieblogs.eu.org:443',
        auth: 'https://discord.gg/Y93BRPNFYP',
        secure: true
    },
    {
        name: 'heavencloud',
        url: 'free-lava.heavencloud.in:4000',
        auth: 'heaven',
        secure: false
    },
    {
        name: 'kakatxeira',
        url: 'lavalink.jirayu.net:443',
        auth: 'youshallnotpass',
        secure: true
    }
];

/**
 * LAVALINK_NODES=
 *   nome|host:porta|senha|true;
 *   nome2|host2:porta2|senha2|false
 *
 * Também aceita JSON: [{"name":"a","url":"h:443","auth":"x","secure":true}]
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
        })
        .filter(Boolean);
}

function normalizeNode(n, i = 0) {
    if (!n) return null;
    let url = String(n.url || n.host || '').replace(/^https?:\/\//i, '').replace(/\/$/, '');
    if (n.port && !url.includes(':')) url = `${url}:${n.port}`;
    if (!url || !n.auth && n.auth !== '') return null;
    return {
        name: String(n.name || `node-${i + 1}`).slice(0, 64),
        url,
        auth: String(n.auth ?? n.password ?? 'youshallnotpass'),
        secure: n.secure === true || n.secure === 'true' || Number(n.port) === 443
    };
}

function getNodes() {
    const fromEnv = parseNodesFromEnv(process.env.LAVALINK_NODES);
    if (fromEnv.length) {
        console.log(`[music] ${fromEnv.length} node(s) via LAVALINK_NODES`);
        return fromEnv;
    }
    console.log(
        `[music] LAVALINK_NODES vazio — usando ${DEFAULT_PUBLIC_NODES.length} nodes públicos (instáveis). Configure os seus no Render.`
    );
    return DEFAULT_PUBLIC_NODES.map((n, i) => normalizeNode(n, i));
}

module.exports = { getNodes, parseNodesFromEnv, DEFAULT_PUBLIC_NODES };
