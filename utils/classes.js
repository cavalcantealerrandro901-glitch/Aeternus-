/**
 * Classes Aeternus — sistema de classes.
 * Classes customizadas (admin) ficam em data/custom_classes.json via store.
 * Classes com maxHolders limitam quantos jogadores podem tê-las (ex: única = 1).
 */
const store = require('./store');

const RARITIES = {
    comum: { id: 'comum', name: 'Comum', color: 0x9ca3af },
    incomum: { id: 'incomum', name: 'Incomum', color: 0x22c55e },
    rara: { id: 'rara', name: 'Rara', color: 0x3b82f6 },
    epica: { id: 'epica', name: 'Épica', color: 0xa855f7 },
    lendaria: { id: 'lendaria', name: 'Lendária', color: 0xf59e0b },
    unica: { id: 'unica', name: 'Única', color: 0xef4444 },
    mitica: { id: 'mitica', name: 'Mítica', color: 0xec4899 }
};

function splitList(v, max) {
    if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean).slice(0, max);
    return String(v || '')
        .split(/[|\n,;]+/)
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, max);
}

/** Única classe inicial do sistema (todas as antigas foram removidas). */
const BASE_CLASSES = {
    l_detetive_arcano: {
        id: 'l_detetive_arcano',
        name: 'L — O Detetive Arcano',
        emoji: '🕵️',
        type: 'magic',
        rarity: 'unica',
        rarityName: 'Única',
        maxHolders: 1,
        exclusive: true,
        desc:
            'Mente analítica e olho mágico. Deduz fraquezas, prevê movimentos e transforma informação em poder. Apenas uma pessoa no servidor pode usar esta classe.',
        uniqueAbilities: [
            'Xeque-Mate — Usa todas as informações coletadas para prever movimentos; precisão extrema e ignora parte da defesa. Quanto mais dados, mais forte.',
            'Dedução Impossível — Encontra a solução que ninguém viu (ilusão, verdadeiro inimigo, origem de habilidade). 1× por combate.'
        ],
        activeAbilities: [
            'Cartas da Dedução — Cartas mágicas afiadas; cada acerto revela info do alvo e aumenta o dano das próximas cartas.',
            'Correntes da Suspeita — Correntes negras que perseguem o alvo; se fugir, atacar outro ou usar movimento, ficam mais fortes e podem imobilizar.',
            'Olho Analítico — Analisa o inimigo por alguns segundos e revela fraqueza, resistência ou habilidade.',
            'Bengala do Investigador — A bengala vira arma escolhida (espada, lança ou corrente) com efeito diferente em cada forma.'
        ],
        uniquePassives: [
            'Um Passo à Frente — Prevê parcialmente o próximo movimento de um alvo já analisado; 1× por rodada reduz dano ou reposiciona.',
            'Gênio da Dedução — Quanto mais tempo contra o mesmo inimigo, mais bônus cumulativos de precisão, percepção e poder investigativo.',
            'A Verdade Sempre Aparece — Sob ilusão/disfarce/manipulação mental, busca inconsistências e pode quebrar o efeito revelando a verdade.'
        ],
        passives: [
            'Mente Analítica — Ao observar uma habilidade inimiga, ganha pequeno bônus contra ela.',
            'Memória Fotográfica — Nunca esquece o que viu; reconhece info, símbolos, rostos e movimentos de imediato.',
            'Suspeita Constante — Bônus para perceber emboscadas, armadilhas, mentiras e ataques surpresa.',
            'Raciocínio Reverso — Após tomar dano de uma habilidade, entende melhor e reduz dano de repetições da mesma técnica.',
            'Instinto Investigativo — Em ambiente desconhecido, percebe pistas mágicas, objetos escondidos e alterações no cenário.'
        ],
        powers: [
            'Cartas da Dedução',
            'Correntes da Suspeita',
            'Olho Analítico',
            'Bengala do Investigador'
        ],
        disadvantages: [
            'Classe exclusiva (só 1 jogador)',
            'Depende de observar o inimigo para maximizar o poder',
            'Dedução Impossível limitada a 1× por combate'
        ],
        bonus: { forca: 1, defesa: 1, agilidade: 3, vida: 1 },
        manaMult: 1.25,
        color: 0x1e3a5f,
        basicAttack: {
            id: 'golpe_bengala',
            name: 'Golpe de Bengala',
            emoji: '🪄',
            type: 'magic',
            power: 0.95,
            mana: 0
        },
        custom: false
    },

    ceifador_negro: {
        id: 'ceifador_negro',
        name: 'Ceifador Negro',
        emoji: '💀',
        type: 'melee',
        rarity: 'unica',
        rarityName: 'Única',
        maxHolders: 1,
        exclusive: true,
        boundUserId: '1483097258944630897',
        desc:
            'Avatar da morte com foice e véu negro. Marca inimigos, quebra defesas e joga o destino no Dado da Morte. Classe Única — apenas o usuário vinculado pode possuí-la.',
        uniqueAbilities: [
            'Decapitação [Épica] — Consome 1 ponto de atributo aleatório permanentemente do usuário. Só pode ser usada 1× por partida.',
            'Dado da Morte [Épico] — Dado de 6 lados: 4–6 oponente perde 50% da vida máx. e você recupera 25% do dano; 1–2 você perde 50% da vida máx.; 3 ambos perdem 25% da vida máx.'
        ],
        activeAbilities: [
            'Corte Fantasma [Rara] — Ignora parte da defesa e causa dano verdadeiro.',
            'Estocada Fantasma [Rara] — Quebra a defesa do alvo, causando pouco dano direto.',
            'Manto Negro — Envolve-se em névoa negra e fica intocável por 1 turno.',
            'Véu da Morte [Épica] — Por 2 turnos, chance de 5% a 50% de sobreviver a um golpe fatal.'
        ],
        uniquePassives: [
            'Aura da Morte [Épica] — Ao iniciar a batalha, inimigos recebem Marca da Morte e perdem 1% da vida máxima a cada turno.',
            'Maldição do Ceifador [Épica] — A cada kill, perde 5% de chance de ser o primeiro a atacar na próxima batalha.',
            'Mão Negra [Épica] — Sem arma: −30% dano. Com Foice Grande equipada: +30% dano.'
        ],
        passives: [
            'Maldição de Nível [Rara] — Se o inimigo tiver pelo menos 10 níveis a menos, o usuário recebe Marca da Morte no início da partida.',
            'Presença Funérea — Inimigos sob Marca da Morte sofrem leve redução de cura recebida.',
            'Frio do Túmulo — Resistência parcial a efeitos de medo e paralisia menores.',
            'Colheita Sombria — Ao eliminar um alvo marcado, recupera uma pequena parcela de mana.',
            'Silêncio do Véu — Em Manto Negro, não pode ser alvo de habilidades de suporte inimigas.'
        ],
        powers: [
            'Corte Fantasma',
            'Estocada Fantasma',
            'Manto Negro',
            'Véu da Morte'
        ],
        disadvantages: [
            'Classe exclusiva vinculada a um usuário',
            'Decapitação custa atributo permanente e 1× por partida',
            'Dado da Morte pode virar contra você',
            'Maldição do Ceifador reduz iniciativa após kills'
        ],
        classGear: {
            arma: 'foice_grande',
            armadura: 'manto_negro',
            acessorio: 'dado_da_morte'
        },
        bonus: { forca: 4, defesa: 1, agilidade: 2, vida: 2 },
        manaMult: 0.9,
        color: 0x1a1a1a,
        basicAttack: {
            id: 'golpe_foice',
            name: 'Golpe de Foice',
            emoji: '☠️',
            type: 'physical',
            power: 1.1,
            mana: 0
        },
        custom: false
    }
,
    deus_criador: {
        id: 'deus_criador',
        name: 'Deus Criador',
        emoji: '🌌',
        rarity: 'mitica',
        rarityName: 'Mítica',
        type: 'magic',
        maxHolders: 1,
        exclusive: true,
        boundUserId: process.env.OWNER_ID || process.env.BOT_OWNER_ID || process.env.ADMIN_ID || '1483097258944630897',
        desc: 'O arquiteto do Aeternus. Poder absoluto sobre a criação e o destino. Classe exclusiva do criador.',
        uniqueAbilities: [
            'Gênese — Reescreve uma regra menor do combate por alguns turnos.',
            'Veredito Divino — Julga o alvo; dano massivo ou selamento de habilidade.'
        ],
        activeAbilities: [
            'Raio Primordial — Energia criadora que ignora parte da defesa.',
            'Mão do Arquiteto — Cura ou reforça com poder divino.',
            'Véu do Cosmos — Intangível por um turno.',
            'Decreto — Força o inimigo a pular a próxima ação ofensiva.'
        ],
        uniquePassives: [
            'Onisciência — Percepção máxima de ilusões e emboscadas.',
            'Imortalidade Relativa — Chance de resistir a golpe fatal 1× por combate.',
            'Autoridade — Bônus cumulativo enquanto permanece em combate.'
        ],
        passives: [
            'Presença Divina — Inimigos sofrem menor precisão.',
            'Criação Constante — Regenera mana além do normal.',
            'Olhar do Criador — Revela fraquezas ao iniciar a luta.',
            'Equilíbrio — Reduz dano de técnicas repetidas.',
            'Eco do Éter — Pequeno bônus em todos os atributos.'
        ],
        powers: ['Raio Primordial', 'Mão do Arquiteto', 'Véu do Cosmos', 'Decreto'],
        disadvantages: ['Classe exclusiva do criador', 'Não aparece na lista pública'],
        bonus: { forca: 5, defesa: 5, agilidade: 5, vida: 5 },
        manaMult: 1.5,
        color: 0xc4b5fd,
        basicAttack: {
            id: 'toque_criador',
            name: 'Toque do Criador',
            emoji: '✨',
            type: 'magic',
            power: 1.35,
            mana: 0
        },
        classGear: null
    }
};

/** Sem mapeamento legado — classes antigas foram removidas. */
const LEGACY_MAP = {};

function loadCustom() {
    return store.load('custom_classes.json', {});
}

function saveCustom(data) {
    store.save('custom_classes.json', data);
}

/** Apaga todas as classes custom e deixa só as BASE. */
function clearAllCustom() {
    saveCustom({});
    return true;
}

function allClasses() {
    return { ...BASE_CLASSES, ...loadCustom() };
}

function getClass(classId) {
    const all = allClasses();
    if (classId && all[classId]) return all[classId];
    const mapped = LEGACY_MAP[classId];
    if (mapped && all[mapped]) return all[mapped];
    // Não força classe exclusiva em quem tinha classe antiga removida
    return null;
}

function resolveClassId(classId) {
    const all = allClasses();
    if (classId && all[classId]) return classId;
    if (LEGACY_MAP[classId] && all[LEGACY_MAP[classId]]) return LEGACY_MAP[classId];
    return classId || null;
}

function listClasses() {
    return Object.values(allClasses());
}

/** Classes que aparecem na lista pública (sem exclusivas/únicas/míticas vinculadas). */
function listSelectableClasses() {
    return listClasses().filter((c) => {
        if (!c) return false;
        if (c.exclusive || c.maxHolders === 1) return false;
        if (c.rarity === 'unica' || c.rarity === 'mitica') return false;
        if (c.boundUserId) return false;
        return true;
    });
}

/**
 * Quantos jogadores já usam esta classe.
 * @param {string} classId
 * @param {object} playersMap — player.all()
 * @returns {string[]} userIds
 */
function holdersOf(classId, playersMap) {
    const resolved = resolveClassId(classId);
    if (!resolved || !playersMap) return [];
    return Object.keys(playersMap).filter((uid) => {
        const p = playersMap[uid];
        return p && resolveClassId(p.classId) === resolved;
    });
}

/**
 * Pode este user pegar a classe? (respeita boundUserId / maxHolders / exclusive)
 * @returns {{ ok: boolean, reason?: string, holders?: string[] }}
 */
function canClaim(classId, userId, playersMap) {
    const cls = getClass(classId);
    if (!cls) return { ok: false, reason: 'Classe não existe.' };
    const uid = String(userId);
    if (cls.boundUserId && String(cls.boundUserId) !== uid) {
        return {
            ok: false,
            reason: 'Esta classe está **vinculada a outro usuário** e não pode ser escolhida por você.'
        };
    }
    const max = Number(cls.maxHolders);
    if (!max || max <= 0) return { ok: true };
    const holders = holdersOf(classId, playersMap);
    if (holders.includes(uid)) return { ok: true, holders };
    if (holders.length >= max) {
        return {
            ok: false,
            reason:
                max === 1
                    ? 'Esta classe **exclusiva** já está com outro jogador. Apenas uma pessoa pode usá-la.'
                    : `Limite de **${max}** jogadores nesta classe já atingido.`,
            holders
        };
    }
    return { ok: true, holders };
}

/**
 * Admin: cria ou atualiza classe customizada.
 */
function createClass(payload) {
    const id = String(payload.id || payload.name || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 40);
    if (!id || id.length < 2) throw new Error('Nome/ID inválido');
    if (BASE_CLASSES[id] && !payload.force) throw new Error('Não pode sobrescrever classe base do sistema');

    const rarity = String(payload.rarity || payload.raridade || 'comum').toLowerCase();
    if (!RARITIES[rarity]) throw new Error('Raridade inválida: ' + rarity);

    const custom = loadCustom();
    const uniqueAbilities = splitList(payload.uniqueAbilities || payload.habilidades_unicas, 2);
    const activeAbilities = splitList(payload.activeAbilities || payload.ativas, 4);
    const uniquePassives = splitList(payload.uniquePassives || payload.passivas_unicas, 3);
    const passives = splitList(payload.passives || payload.passivas, 5);

    while (uniqueAbilities.length < 2) uniqueAbilities.push('—');
    while (activeAbilities.length < 4) activeAbilities.push('—');
    while (uniquePassives.length < 3) uniquePassives.push('—');
    while (passives.length < 5) passives.push('—');

    const exclusive = rarity === 'unica' || rarity === 'mitica' || payload.exclusive === true || payload.maxHolders === 1;
    const maxHolders = exclusive
        ? 1
        : Math.max(0, Number(payload.maxHolders ?? 0) || 0);

    const cls = {
        id,
        name: String(payload.name || id).slice(0, 48),
        emoji: String(payload.emoji || '✨').slice(0, 8),
        type: String(payload.type || 'melee').slice(0, 16),
        rarity,
        rarityName: RARITIES[rarity].name,
        exclusive: !!exclusive,
        maxHolders: maxHolders || undefined,
        desc: String(payload.desc || '').slice(0, 800),
        uniqueAbilities: uniqueAbilities.slice(0, 2),
        activeAbilities: activeAbilities.slice(0, 4),
        uniquePassives: uniquePassives.slice(0, 3),
        passives: passives.slice(0, 5),
        powers: activeAbilities.slice(0, 4),
        disadvantages: splitList(payload.disadvantages || payload.desvantagens, 8),
        bonus: {
            forca: Number(payload.forca ?? 1) || 1,
            defesa: Number(payload.defesa ?? 1) || 1,
            agilidade: Number(payload.agilidade ?? 1) || 1,
            vida: Number(payload.vida ?? 1) || 1
        },
        manaMult: Math.min(2, Math.max(0.5, Number(payload.manaMult ?? 1) || 1)),
        color: Number(payload.color) || RARITIES[rarity].color,
        basicAttack: {
            id: 'basico_' + id,
            name: String(payload.basicName || 'Ataque Básico').slice(0, 32),
            emoji: String(payload.basicEmoji || '⚔️').slice(0, 8),
            type: ['magic', 'support'].includes(String(payload.type || '')) ? 'magic' : 'physical',
            power: Math.min(1.5, Math.max(0.5, Number(payload.basicPower ?? 1) || 1)),
            mana: Math.max(0, Number(payload.basicMana ?? 0) || 0)
        },
        custom: true,
        createdAt: custom[id]?.createdAt || Date.now(),
        updatedAt: Date.now()
    };
    custom[id] = cls;
    saveCustom(custom);
    return cls;
}

function deleteCustomClass(id) {
    const custom = loadCustom();
    if (!custom[id]) return false;
    delete custom[id];
    saveCustom(custom);
    return true;
}

// Garante que não sobrem customs antigas ao carregar o módulo pela 1ª vez após reset
try {
    const cur = loadCustom();
    if (cur && Object.keys(cur).length) {
        // não apaga automaticamente em todo boot — só quando admin pedir
    }
} catch (_) {}

module.exports = {
    BASE_CLASSES,
    LEGACY_MAP,
    allClasses,
    getClass,
    resolveClassId,
    listClasses,
    listSelectableClasses,
    createClass,
    deleteCustomClass,
    clearAllCustom,
    loadCustom,
    RARITIES,
    splitList,
    holdersOf,
    canClaim
};
