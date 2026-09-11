/**
 * Parse e defaults de nodes Lavalink para o Shoukaku.
 * Vários nodes = menos sobrecarga e failover automático.
 */

/**
 * Nodes públicos de fallback (instáveis — use LAVALINK_NODES com nodes seus).
 * Credenciais atualizadas conforme listas públicas conhecidas.
 */
const DEFAULT_PUBLIC_NODES = [
    {
        name: 'serenetia',
        url: 'lavalinkv4.serenetia.com:80',
        auth: 'https://dsc.gg/ajidevserver',
        secure: false
    },
    {
        name: 'ajieblogs',
        url: 'lava-v4.ajieblogs.eu.org:80',
        auth: 'https://dsc.gg/ajidevserver',
        secure: false
    },
    {
        name: 'horizxon-ap',
        url: 'lava4.horizxon.studio:80',
        auth: 'horizxon.studio',
        secure: false
    },
    {
        name: 'horizxon-eu',
        url: 'lava3.horizxon.studio:80',
        auth: 'horizxon.studio',
        secure: false
    },
    {
        name: 'trinium',
        url: 'lavalink.triniumhost.com:4333',
        auth: 'free',
        secure: false
    },
    {
        name: 'jirayu',
        url: 'lavalink.jirayu.net:13592',
        auth: 'youshallnotpass',
        secure: false
    },
    {
        name: 'heavencloud',
        url: 'free-lava.heavencloud.in:4000',
        auth: 'heavencloud.in',
        secure: false
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
    let url = String(n.url || n.host || '')
        .replace(/^https?:\/\//i, '')
        .replace(/\/$/, '');
    if (n.port && !url.includes(':')) url = `${url}:${n.port}`;
    if (!url) return null;
    const auth = n.auth ?? n.password;
    if (auth == null || auth === '') return null;

    let secure = n.secure === true || n.secure === 'true';
    // só força secure se a porta for 443 e o usuário não tiver definido secure=false
    if (n.secure === false || n.secure === 'false') secure = false;
    else if (!secure && /:443$/.test(url)) secure = true;

    return {
        name: String(n.name || `node-${i + 1}`).slice(0, 64),
        url,
        auth: String(auth),
        secure
    };
}

function getNodes() {
    const fromEnv = parseNodesFromEnv(process.env.LAVALINK_NODES);
    if (fromEnv.length) {
        console.log(`[music] ${fromEnv.length} node(s) via LAVALINK_NODES`);
        return fromEnv;
    }
    console.log(
        `[music] LAVALINK_NODES vazio — usando ${DEFAULT_PUBLIC_NODES.length} nodes públicos (podem cair). Configure nodes estáveis no Render.`
    );
    return DEFAULT_PUBLIC_NODES.map((n, i) => normalizeNode(n, i)).filter(Boolean);
}

module.exports = { getNodes, parseNodesFromEnv, DEFAULT_PUBLIC_NODES };
