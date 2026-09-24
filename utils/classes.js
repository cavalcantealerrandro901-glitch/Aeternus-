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

const BASE_CLASSES = {
    cavalheiro_eter: {
        id: 'cavalheiro_eter', name: 'Cavalheiro do Éter', emoji: '⚔️', type: 'melee', rarity: 'comum', rarityName: 'Comum',
        desc: 'Guerreiro abençoado pelo Éter. Equilíbrio entre lâmina e resistência sagrada.',
        uniqueAbilities: ['Juramento do Éter', 'Postura Sagrada'],
        activeAbilities: ['Golpe de Éter', 'Investida', 'Escudo de Fé', 'Grito de Guerra'],
        uniquePassives: ['Aura protetora', 'Resistência sagrada', 'Maestria com espada'],
        passives: ['Defesa firme', 'Vitalidade', 'Determinação', 'Foco em combate', 'Presença'],
        powers: ['Golpe de Éter', 'Investida', 'Escudo de Fé', 'Grito de Guerra'],
        disadvantages: ['Mana limitada', 'Mobilidade média'],
        bonus: { forca: 3, defesa: 2, agilidade: 1, vida: 2 }, manaMult: 0.95, color: 0xc9a227,
        basicAttack: { id: 'golpe_espada', name: 'Golpe de Espada', emoji: '⚔️', type: 'physical', power: 1.0, mana: 0 }
    },
    bruxo_ruinas: {
        id: 'bruxo_ruinas', name: 'Bruxo das Ruínas', emoji: '📜', type: 'magic', rarity: 'rara', rarityName: 'Rara',
        desc: 'Canaliza magia proibida das ruínas antigas.',
        uniqueAbilities: ['Maldição Ancestral', 'Pacto das Ruínas'],
        activeAbilities: ['Rajada Arcana', 'Dreno de mana', 'Explosão sombria', 'Véu das ruínas'],
        uniquePassives: ['Afinidade arcana', 'Sede de mana', 'Conhecimento proibido'],
        passives: ['Poder mágico', 'Concentração', 'Resistência mental', 'Fluxo de éter', 'Sombra'],
        powers: ['Rajada Arcana', 'Dreno de mana', 'Explosão sombria', 'Véu das ruínas'],
        disadvantages: ['Vida baixa', 'Defesa frágil'],
        bonus: { forca: 1, defesa: 0, agilidade: 1, vida: 0 }, manaMult: 1.45, color: 0x6d28d9,
        basicAttack: { id: 'toque_sombrio', name: 'Toque Sombrio', emoji: '🌑', type: 'magic', power: 0.95, mana: 4 }
    },
    cacador_sombras: {
        id: 'cacador_sombras', name: 'Caçador de Sombras', emoji: '🏹', type: 'ranged', rarity: 'rara', rarityName: 'Rara',
        desc: 'Emboscadas e tiros precisos nas penumbras.',
        uniqueAbilities: ['Marca da Presa', 'Passo Sombrio'],
        activeAbilities: ['Tiro preciso', 'Chuva de flechas', 'Armadilha', 'Fuga sombria'],
        uniquePassives: ['Olho de falcão', 'Stealth', 'Crítico letal'],
        passives: ['Agilidade', 'Precisão', 'Instinto', 'Velocidade', 'Foco'],
        powers: ['Tiro preciso', 'Chuva de flechas', 'Armadilha', 'Fuga sombria'],
        disadvantages: ['Pouca vida'],
        bonus: { forca: 2, defesa: 0, agilidade: 4, vida: 0 }, manaMult: 1.0, color: 0x166534,
        basicAttack: { id: 'tiro_sombrio', name: 'Tiro Sombrio', emoji: '🏹', type: 'physical', power: 1.05, mana: 0 }
    },
    oraculo_vital: {
        id: 'oraculo_vital', name: 'Oráculo Vital', emoji: '🌿', type: 'support', rarity: 'incomum', rarityName: 'Incomum',
        desc: 'Cura, protege e sustenta aliados.',
        uniqueAbilities: ['Bênção da Fonte', 'Laço Vital'],
        activeAbilities: ['Cura vital', 'Escudo de vida', 'Purificar', 'Regeneração em massa'],
        uniquePassives: ['Mãos sagradas', 'Empatia', 'Fluxo vital'],
        passives: ['Cura aumentada', 'Mana estável', 'Proteção', 'Serenidade', 'Suporte'],
        powers: ['Cura vital', 'Escudo de vida', 'Purificar', 'Regeneração em massa'],
        disadvantages: ['Dano direto baixo'],
        bonus: { forca: 0, defesa: 2, agilidade: 1, vida: 3 }, manaMult: 1.3, color: 0x059669,
        basicAttack: { id: 'pulso_vital', name: 'Pulso Vital', emoji: '💚', type: 'magic', power: 0.7, mana: 3 }
    },
    berserker_ferro: {
        id: 'berserker_ferro', name: 'Berserker de Ferro', emoji: '🪓', type: 'melee', rarity: 'epica', rarityName: 'Épica',
        desc: 'Fúria incontrolável. Quanto mais ferido, mais destrutivo.',
        uniqueAbilities: ['Sede de Sangue', 'Último Fôlego'],
        activeAbilities: ['Golpe furioso', 'Fúria', 'Cleave', 'Ignorar dor'],
        uniquePassives: ['Fúria crescente', 'Pele de ferro', 'Sede de combate'],
        passives: ['Força bruta', 'Crítico selvagem', 'Resistência', 'Adrenalina', 'Ímpeto'],
        powers: ['Golpe furioso', 'Fúria', 'Cleave', 'Ignorar dor'],
        disadvantages: ['Defesa baixa', 'Pouca mana'],
        bonus: { forca: 4, defesa: 0, agilidade: 2, vida: 1 }, manaMult: 0.8, color: 0xb91c1c,
        basicAttack: { id: 'golpe_furioso', name: 'Golpe Furioso', emoji: '🪓', type: 'physical', power: 1.15, mana: 0 }
    },
    tecelao_tempestade: {
        id: 'tecelao_tempestade', name: 'Tecelão da Tempestade', emoji: '⛈️', type: 'magic', rarity: 'epica', rarityName: 'Épica',
        desc: 'Manipula raios e ventos.',
        uniqueAbilities: ['Olho da Tempestade', 'Condutor Celeste'],
        activeAbilities: ['Raio em cadeia', 'Rajada', 'Explosão elétrica', 'Vento cortante'],
        uniquePassives: ['Carga estática', 'Afinidade elemental', 'Tempestade interior'],
        passives: ['Dano elétrico', 'Controle', 'Velocidade de conjuração', 'Alcance', 'Instabilidade'],
        powers: ['Raio em cadeia', 'Rajada', 'Explosão elétrica', 'Vento cortante'],
        disadvantages: ['Mana cara'],
        bonus: { forca: 2, defesa: 1, agilidade: 2, vida: 1 }, manaMult: 1.25, color: 0x0284c7,
        basicAttack: { id: 'faisca', name: 'Faísca', emoji: '⚡', type: 'magic', power: 0.9, mana: 3 }
    },
    guardiao_runico: {
        id: 'guardiao_runico', name: 'Guardião Rúnico', emoji: '🛡️', type: 'tank', rarity: 'incomum', rarityName: 'Incomum',
        desc: 'Muralha viva marcada por runas.',
        uniqueAbilities: ['Runa Suprema', 'Muralha Ancestral'],
        activeAbilities: ['Impacto rúnico', 'Provocar', 'Barreira', 'Reflexo de dano'],
        uniquePassives: ['Pele rúnica', 'Aço vivo', 'Guardião'],
        passives: ['Defesa alta', 'Bloqueio', 'Vitalidade', 'Ameaças', 'Endurecido'],
        powers: ['Impacto rúnico', 'Provocar', 'Barreira', 'Reflexo de dano'],
        disadvantages: ['Dano baixo', 'Lento'],
        bonus: { forca: 1, defesa: 4, agilidade: 0, vida: 3 }, manaMult: 0.9, color: 0x475569,
        basicAttack: { id: 'bash_runico', name: 'Impacto Rúnico', emoji: '🛡️', type: 'physical', power: 0.75, mana: 0 }
    },
    lamina_fantasma: {
        id: 'lamina_fantasma', name: 'Lâmina Fantasma', emoji: '👻', type: 'melee', rarity: 'lendaria', rarityName: 'Lendária',
        desc: 'Assassino entre o material e o espectro.',
        uniqueAbilities: ['Forma Espectral', 'Corte entre Mundos'],
        activeAbilities: ['Corte fantasma', 'Veneno etéreo', 'Evasão', 'Execução'],
        uniquePassives: ['Entre mundos', 'Crítico fantasma', 'Invisibilidade parcial'],
        passives: ['Agilidade espectral', 'Letalidade', 'Furtividade', 'Precisão', 'Sombra'],
        powers: ['Corte fantasma', 'Veneno etéreo', 'Evasão', 'Execução'],
        disadvantages: ['Vida muito baixa'],
        bonus: { forca: 3, defesa: 0, agilidade: 3, vida: 0 }, manaMult: 0.95, color: 0x4c1d95,
        basicAttack: { id: 'corte_fantasma', name: 'Corte Fantasma', emoji: '🗡️', type: 'physical', power: 1.1, mana: 0 }
    },
    ceifador_negro: {
        id: 'ceifador_negro',
        name: 'Ceifador Negro',
        emoji: '🖤',
        type: 'melee',
        rarity: 'unica',
        rarityName: 'Única',
        exclusiveOwner: '1483097258944630897',
        desc: 'Classe única do Ceifador. Lâmina e névoa negra — só um portador no Aeternus.',
        uniqueAbilities: ['Decapitação', 'Véu da Morte'],
        activeAbilities: ['Decapitação', 'Corte Fantasma', 'Estocada Fantasma', 'Manto Negro', 'Véu da Morte', 'Dado da Morte'],
        uniquePassives: ['Aura da Morte', 'Maldição do Ceifador', 'Mão Negra'],
        passives: ['Aura da Morte', 'Maldição de Nível', 'Maldição do Ceifador', 'Mão Negra'],
        powers: ['Decapitação', 'Corte Fantasma', 'Estocada Fantasma', 'Manto Negro', 'Véu da Morte', 'Dado da Morte'],
        disadvantages: ['Maldição do Ceifador (leve)'],
        abilityIds: {
            active: ['cn_decapitacao', 'cn_corte_fantasma', 'cn_estocada_fantasma', 'cn_manto_negro', 'cn_veu_morte', 'cn_dado_morte'],
            passive: ['cn_aura_morte', 'cn_maldicao_nivel', 'cn_maldicao_ceifador', 'cn_mao_negra']
        },
        classGear: { weapon: 'foice_grande', armor: 'manto_negro_armadura', accessory: 'dado_da_morte' },
        bonus: { forca: 12, defesa: 6, agilidade: 10, vida: 8 },
        manaMult: 1.15,
        color: 0x0f0f0f,
        basicAttack: { id: 'corte_ceifador', name: 'Corte do Ceifador', emoji: '🖤', type: 'physical', power: 1.55, mana: 0 }
    },
    detetive_arcano: {
        id: 'detetive_arcano',
        name: 'L — O Detetive Arcano',
        emoji: '🕵️',
        type: 'magic',
        rarity: 'unica',
        rarityName: 'Única',
        exclusiveOwner: '1460227733023096875',
        desc: 'Mente afiada e magia investigativa. Só um portador enxerga o tabuleiro completo.',
        uniqueAbilities: ['Xeque-Mate', 'Dedução Impossível'],
        activeAbilities: ['Cartas da Dedução', 'Correntes da Suspeita', 'Olho Analítico', 'Bengala do Investigador'],
        uniquePassives: ['Um Passo à Frente', 'Gênio da Dedução', 'A Verdade Sempre Aparece'],
        passives: ['Mente Analítica', 'Memória Fotográfica', 'Suspeita Constante', 'Raciocínio Reverso', 'Instinto Investigativo'],
        powers: ['Cartas da Dedução', 'Correntes da Suspeita', 'Olho Analítico', 'Bengala do Investigador', 'Xeque-Mate', 'Dedução Impossível'],
        disadvantages: ['Precisa acumular informação para maximizar o poder'],
        abilityIds: {
            active: ['l_cartas_deducao', 'l_correntes_suspeita', 'l_olho_analitico', 'l_bengala_investigador', 'l_xeque_mate', 'l_deducao_impossivel'],
            passive: ['l_mente_analitica', 'l_memoria_fotografica', 'l_suspeita_constante', 'l_raciocinio_reverso', 'l_instinto_investigativo', 'l_um_passo_frente', 'l_genio_deducao', 'l_verdade_aparece']
        },
        classGear: {
            weapon: 'bengala_investigador',
            armor: 'capa_detetive_arcano',
            accessory: 'caderno_deducoes',
            extra: 'lentes_analiticas'
        },
        bonus: { forca: 5, defesa: 5, agilidade: 9, vida: 6 },
        manaMult: 1.55,
        color: 0x1e3a5f,
        basicAttack: { id: 'apontar_pista', name: 'Apontar a Pista', emoji: '🔍', type: 'magic', power: 1.25, mana: 0 }
    }
};

const LEGACY_MAP = {
    mago: 'bruxo_ruinas', arqueiro: 'cacador_sombras', tanque: 'guardiao_runico',
    healer: 'oraculo_vital', guerreiro: 'cavalheiro_eter', assassino: 'lamina_fantasma'
};

function loadCustom() { return store.load('custom_classes.json', {}); }
function saveCustom(data) { store.save('custom_classes.json', data); }
function allClasses() { return { ...BASE_CLASSES, ...loadCustom() }; }
function getClass(classId) {
    const all = allClasses();
    if (all[classId]) return all[classId];
    const mapped = LEGACY_MAP[classId];
    if (mapped && all[mapped]) return all[mapped];
    return all.cavalheiro_eter;
}
function resolveClassId(classId) {
    const all = allClasses();
    if (all[classId]) return classId;
    return LEGACY_MAP[classId] || 'cavalheiro_eter';
}
function listClasses(userId) {
    const all = Object.values(allClasses());
    if (userId == null) return all.filter((c) => !c.exclusiveOwner);
    const uid = String(userId);
    return all.filter((c) => !c.exclusiveOwner || String(c.exclusiveOwner) === uid);
}
function canUseClass(userId, classId) {
    const cls = getClass(classId);
    if (!cls) return false;
    if (!cls.exclusiveOwner) return true;
    return String(cls.exclusiveOwner) === String(userId);
}
function enforceExclusiveOwners() {
    try {
        const player = require('./player');
        const data = player.all();
        let changed = false;
        for (const cls of Object.values(BASE_CLASSES)) {
            if (!cls.exclusiveOwner) continue;
            const owner = String(cls.exclusiveOwner);
            for (const [uid, p] of Object.entries(data || {})) {
                if (!p) continue;
                if (String(p.classId || p.class) === cls.id && String(uid) !== owner) {
                    p.classId = 'cavalheiro_eter';
                    changed = true;
                }
            }
            if (data[owner]) {
                if (String(data[owner].classId || data[owner].class) !== cls.id) {
                    data[owner].classId = cls.id;
                    data[owner].class = cls.id;
                    changed = true;
                }
            }
        }
        if (changed) player.save(data);
    } catch (_) {}
}
function createClass(payload) {
    const id = String(payload.id || payload.name || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 32);
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
    const cls = {
        id,
        name: String(payload.name || id).slice(0, 40),
        emoji: String(payload.emoji || '✨').slice(0, 8),
        type: String(payload.type || 'melee').slice(0, 16),
        rarity,
        rarityName: RARITIES[rarity].name,
        desc: String(payload.desc || '').slice(0, 500),
        uniqueAbilities: uniqueAbilities.slice(0, 2),
        activeAbilities: activeAbilities.slice(0, 4),
        uniquePassives: uniquePassives.slice(0, 3),
        passives: passives.slice(0, 5),
        powers: activeAbilities.slice(0, 4),
        disadvantages: splitList(payload.disadvantages || payload.desvantagens, 6),
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
            power: 1,
            mana: 0
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
module.exports = {
    BASE_CLASSES, LEGACY_MAP, RARITIES, allClasses, getClass, resolveClassId,
    listClasses, canUseClass, enforceExclusiveOwners, createClass, deleteCustomClass, loadCustom, splitList
};
