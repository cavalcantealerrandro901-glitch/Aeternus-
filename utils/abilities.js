const store = require('./store');
const player = require('./player');
const classesMod = require('./classes');

const ABILITIES = {
    decapitacao: { id: 'decapitacao', name: 'Decapitação', emoji: '⚰️', kind: 'active', type: 'physical', mana: 25, cd: 99, power: 1.6, unique: true, oncePerBattle: true, consumeRandomAttr: true, classIds: ['ceifador_negro'], desc: '[Épica · 1×/partida] Consome 1 attr aleatório.' },
    corte_fantasma: { id: 'corte_fantasma', name: 'Corte Fantasma', emoji: '👻', kind: 'active', type: 'physical', mana: 14, cd: 2, power: 1.2, trueDamagePct: 0.25, classIds: ['ceifador_negro'], desc: '[Rara] Dano verdadeiro.' },
    estocada_fantasma: { id: 'estocada_fantasma', name: 'Estocada Fantasma', emoji: '🗡️', kind: 'active', type: 'physical', mana: 12, cd: 2, power: 0.75, effect: 'break_def', effectChance: 1, effectTurns: 2, classIds: ['ceifador_negro'], desc: '[Rara] Quebra defesa.' },
    manto_negro_hab: { id: 'manto_negro_hab', name: 'Manto Negro', emoji: '🌑', kind: 'active', type: 'buff', mana: 16, cd: 3, power: 0, effect: 'untouchable', effectTurns: 1, self: true, classIds: ['ceifador_negro'], desc: 'Intocável 1 turno.' },
    veu_da_morte: { id: 'veu_da_morte', name: 'Véu da Morte', emoji: '🌫️', kind: 'active', type: 'buff', mana: 20, cd: 5, power: 0, self: true, unique: true, effect: 'survive_fatal_window', effectTurns: 2, surviveFatalChanceMin: 0.05, surviveFatalChanceMax: 0.5, classIds: ['ceifador_negro'], desc: '[Épica] 5–50% sobreviver fatal 2 turnos.' },
    dado_da_morte_hab: { id: 'dado_da_morte_hab', name: 'Dado da Morte', emoji: '🎲', kind: 'active', type: 'magic', mana: 22, cd: 6, power: 0, unique: true, oncePerBattle: true, effect: 'death_dice', classIds: ['ceifador_negro'], desc: '[Épica · 1×] Dado 1–6.' },
    aura_da_morte: { id: 'aura_da_morte', name: 'Aura da Morte', emoji: '☠️', kind: 'passive', unique: true, classIds: ['ceifador_negro'], desc: '−1% HP máx/turno nos inimigos.', mods: { deathMarkPctMaxHpPerTurn: 0.01 } },
    maldicao_do_ceifador: { id: 'maldicao_do_ceifador', name: 'Maldição do Ceifador', emoji: '🖤', kind: 'passive', unique: true, classIds: ['ceifador_negro'], desc: 'Kill: −5% first strike; +drops.', mods: { killFirstStrikePenalty: 0.05, monsterDropBonus: 0.15 } },
    mao_negra: { id: 'mao_negra', name: 'Mão Negra', emoji: '🖐️', kind: 'passive', unique: true, classIds: ['ceifador_negro'], desc: 'Sem arma −30%; foice +30%.', mods: { unarmedDamageMult: 0.7, classWeaponDamageMult: 1.3, classWeaponIds: ['foice_grande'] } },
    maldicao_de_nivel: { id: 'maldicao_de_nivel', name: 'Maldição de Nível', emoji: '📉', kind: 'passive', classIds: ['ceifador_negro'], desc: 'Gap 10 níveis ±10% attrs.', mods: { levelGapAttrBonus: 0.1, levelGapThreshold: 10 } },
    presenca_funerea: { id: 'presenca_funerea', name: 'Presença Funérea', emoji: '🌑', kind: 'passive', classIds: ['ceifador_negro'], desc: 'Inimigos −3% attrs.', mods: { enemyAttrDebuffStart: 0.03 } },
    frio_do_tumulo: { id: 'frio_do_tumulo', name: 'Frio do Túmulo', emoji: '❄️', kind: 'passive', classIds: ['ceifador_negro'], desc: '−8% dano mágico.', mods: { magicDamageTakenReduce: 0.08 } },
    colheita_sombria: { id: 'colheita_sombria', name: 'Colheita Sombria', emoji: '🌾', kind: 'passive', classIds: ['ceifador_negro'], desc: 'Kill +8% HP.', mods: { onKillHealMaxHpPct: 0.08 } },
    silencio_do_veu: { id: 'silencio_do_veu', name: 'Silêncio do Véu', emoji: '🤫', kind: 'passive', classIds: ['ceifador_negro'], desc: '+5% crit/precisão.', mods: { critChance: 0.05, precision: 0.05 } },

    cartas_da_deducao: { id: 'cartas_da_deducao', name: 'Cartas da Dedução', emoji: '🃏', kind: 'active', type: 'magic', mana: 16, cd: 2, power: 0.45, hits: 3, infoStackOnHit: true, escalatingHitBonus: 0.15, classIds: ['l_detetive_arcano'], desc: '3 cartas; info e dano crescente.' },
    correntes_da_suspeita: { id: 'correntes_da_suspeita', name: 'Correntes da Suspeita', emoji: '⛓️', kind: 'active', type: 'magic', mana: 18, cd: 3, power: 0.9, effect: 'chains_suspect', effectTurns: 2, effectChance: 1, classIds: ['l_detetive_arcano'], desc: 'Correntes; fuga pode imobilizar.' },
    olho_analitico: { id: 'olho_analitico', name: 'Olho Analítico', emoji: '👁️', kind: 'active', type: 'buff', mana: 12, cd: 3, power: 0, effect: 'analyze_target', effectTurns: 1, classIds: ['l_detetive_arcano'], desc: 'Revela fraqueza/resistência.' },
    bengala_do_investigador: { id: 'bengala_do_investigador', name: 'Bengala do Investigador', emoji: '🦯', kind: 'active', type: 'physical', mana: 14, cd: 2, power: 1.15, effect: 'weapon_form_choice', forms: ['espada', 'lanca', 'corrente'], classIds: ['l_detetive_arcano'], desc: 'Forma espada/lança/corrente.' },
    xeque_mate: { id: 'xeque_mate', name: 'Xeque-Mate', emoji: '♟️', kind: 'active', type: 'magic', mana: 26, cd: 5, power: 1.4, unique: true, ignoreDefPctBase: 0.2, ignoreDefPctPerInfo: 0.05, precisionBonus: 0.35, classIds: ['l_detetive_arcano'], desc: '[Única] Precisão alta; ignora defesa.' },
    deducao_impossivel: { id: 'deducao_impossivel', name: 'Dedução Impossível', emoji: '🧩', kind: 'active', type: 'magic', mana: 20, cd: 99, power: 0, unique: true, oncePerBattle: true, effect: 'reveal_truth', classIds: ['l_detetive_arcano'], desc: '[Única · 1×] Revela verdade.' },
    mente_analitica: { id: 'mente_analitica', name: 'Mente Analítica', emoji: '🧠', kind: 'passive', classIds: ['l_detetive_arcano'], desc: 'Bônus vs skills vistas.', mods: { skillFamiliarityReduce: 0.1, observedSkillBonus: 0.08 } },
    memoria_fotografica: { id: 'memoria_fotografica', name: 'Memória Fotográfica', emoji: '📷', kind: 'passive', classIds: ['l_detetive_arcano'], desc: 'Não esquece infos.', mods: { permanentInfoMemory: true } },
    suspeita_constante: { id: 'suspeita_constante', name: 'Suspeita Constante', emoji: '🤨', kind: 'passive', classIds: ['l_detetive_arcano'], desc: 'Bônus vs surpresa.', mods: { surpriseDamageReduce: 0.2, trapDetect: true } },
    raciocinio_reverso: { id: 'raciocinio_reverso', name: 'Raciocínio Reverso', emoji: '🔁', kind: 'passive', classIds: ['l_detetive_arcano'], desc: '−dano de skills repetidas.', mods: { repeatedSkillDamageReduce: 0.18 } },
    instinto_investigativo: { id: 'instinto_investigativo', name: 'Instinto Investigativo', emoji: '🔍', kind: 'passive', classIds: ['l_detetive_arcano'], desc: 'Pistas mágicas.', mods: { envClueSense: true, precision: 0.05 } },
    um_passo_a_frente: { id: 'um_passo_a_frente', name: 'Um Passo à Frente', emoji: '👟', kind: 'passive', unique: true, classIds: ['l_detetive_arcano'], desc: '[Única] 1×/rodada reduz ataque previsto.', mods: { predictDodgeOncePerRound: true, predictDamageReduce: 0.25 } },
    genio_da_deducao: { id: 'genio_da_deducao', name: 'Gênio da Dedução', emoji: '📈', kind: 'passive', unique: true, classIds: ['l_detetive_arcano'], desc: '[Única] Stacks vs mesmo inimigo.', mods: { sameEnemyStackPerRound: { precision: 0.03, power: 0.03, maxStacks: 5 } } },
    a_verdade_sempre_aparece: { id: 'a_verdade_sempre_aparece', name: 'A Verdade Sempre Aparece', emoji: '💡', kind: 'passive', unique: true, classIds: ['l_detetive_arcano'], desc: '[Única] Quebra ilusão.', mods: { breakIllusionTurns: 2 } },

    julgamento_celestial: { id: 'julgamento_celestial', name: 'Julgamento Celestial', emoji: '🔱', kind: 'active', type: 'magic', mana: 18, cd: 3, power: 0.55, hits: 3, seeker: true, effect: 'stun', effectChance: 1, effectTurns: 1, effectRequireAllHits: true, classIds: ['arcanjo_do_veu'], desc: '3 lanças; 3 acertos → stun.' },
    barreira_veu_sagrado: { id: 'barreira_veu_sagrado', name: 'Barreira do Véu Sagrado', emoji: '🛡️', kind: 'active', type: 'buff', mana: 22, cd: 5, power: 0, self: true, effect: 'shield_maxhp', shieldPctMaxHp: 1.0, effectTurns: 2, classIds: ['arcanjo_do_veu'], desc: 'Escudo 100% HP 2 turnos.' },
    toque_restauracao: { id: 'toque_restauracao', name: 'Toque da Restauração', emoji: '✨', kind: 'active', type: 'heal', mana: 16, cd: 4, power: 0, healMissingPct: 0.6, cleanse: ['bleed', 'poison', 'sangramento', 'veneno'], classIds: ['arcanjo_do_veu'], desc: 'Cura até 60% vida perdida.' },
    passo_etereo: { id: 'passo_etereo', name: 'Passo Etéreo', emoji: '👻', kind: 'active', type: 'buff', mana: 14, cd: 3, power: 0, self: true, effect: 'untouchable', effectTurns: 1, dash: true, classIds: ['arcanjo_do_veu'], desc: 'Invulnerável 1 turno.' },
    decreto_final: { id: 'decreto_final', name: 'Decreto Final', emoji: '⚔️', kind: 'active', type: 'magic', mana: 30, cd: 99, power: 2.2, unique: true, oncePerBattle: true, effect: 'delayed_sky_sword', delayTurns: 1, classIds: ['arcanjo_do_veu'], desc: '[Épica · 1×] Espada do céu.' },
    lamina_do_veu_hab: { id: 'lamina_do_veu_hab', name: 'Lâmina do Véu', emoji: '🗡️', kind: 'active', type: 'magic', mana: 10, cd: 1, power: 1.1, scaleAttrs: ['forca', 'inteligencia'], classIds: ['arcanjo_do_veu'], desc: 'Força + Inteligência.' },
    regeneracao_benefica: { id: 'regeneracao_benefica', name: 'Regeneração Benéfica', emoji: '💚', kind: 'passive', unique: true, classIds: ['arcanjo_do_veu'], desc: 'Cada 4 turnos +8% HP.', mods: { regenEveryTurns: 4, regenPctMaxHp: 0.08 } },
    pele_de_luz: { id: 'pele_de_luz', name: 'Pele de Luz', emoji: '🌟', kind: 'passive', unique: true, classIds: ['arcanjo_do_veu'], desc: '−15% dano à distância.', mods: { rangedDamageTakenReduce: 0.15 } },
    eco_do_veu: { id: 'eco_do_veu', name: 'Eco do Véu', emoji: '📢', kind: 'passive', unique: true, classIds: ['arcanjo_do_veu'], desc: 'Após skill +30% próximo ataque.', mods: { afterSkillAttackBonus: 0.3, afterSkillAttackStacks: 2 } },
    asas_luminosas: { id: 'asas_luminosas', name: 'Asas Luminosas', emoji: '🪽', kind: 'passive', classIds: ['arcanjo_do_veu'], desc: '+8% agilidade.', mods: { agilidadeBonus: 0.08, evadeChance: 0.05 } },
    voto_sagrado: { id: 'voto_sagrado', name: 'Voto Sagrado', emoji: '✝️', kind: 'passive', classIds: ['arcanjo_do_veu'], desc: '+10% cura/escudo.', mods: { healBonus: 0.1, shieldBonus: 0.1 } },
    clareza: { id: 'clareza', name: 'Clareza', emoji: '🌤️', kind: 'passive', classIds: ['arcanjo_do_veu'], desc: 'Resist. confusão/cegueira.', mods: { statusResist: { confuse: 0.5, blind: 0.5 } } },
    protecao_menor: { id: 'protecao_menor', name: 'Proteção Menor', emoji: '🔰', kind: 'passive', classIds: ['arcanjo_do_veu'], desc: '−6% dano recebido.', mods: { allDamageTakenReduce: 0.06 } },
    fe_inabalavel: { id: 'fe_inabalavel', name: 'Fé Inabalável', emoji: '🕊️', kind: 'passive', classIds: ['arcanjo_do_veu'], desc: 'HP <30% +12% defesa.', mods: { lowHpDefBonus: { threshold: 0.3, defesaBonus: 0.12 } } },

    raio_primordial: { id: 'raio_primordial', name: 'Raio Primordial', emoji: '⚡', kind: 'active', type: 'magic', mana: 20, cd: 2, power: 1.45, trueDamagePct: 0.2, classIds: ['deus_criador'], desc: '[Épica] Dano mágico + verdadeiro.' },
    mao_do_arquiteto: { id: 'mao_do_arquiteto', name: 'Mão do Arquiteto', emoji: '🖐️', kind: 'active', type: 'magic', mana: 18, cd: 3, power: 1.1, effect: 'break_def', effectChance: 1, effectTurns: 2, classIds: ['deus_criador'], desc: 'Quebra defesa 2 turnos.' },
    veu_do_cosmos: { id: 'veu_do_cosmos', name: 'Véu do Cosmos', emoji: '🌌', kind: 'active', type: 'buff', mana: 22, cd: 4, power: 0, self: true, effect: 'untouchable', effectTurns: 1, classIds: ['deus_criador'], desc: 'Intocável 1 turno.' },
    decreto: { id: 'decreto', name: 'Decreto', emoji: '📜', kind: 'active', type: 'magic', mana: 24, cd: 4, power: 1.25, effect: 'stun', effectChance: 0.55, effectTurns: 1, classIds: ['deus_criador'], desc: 'Dano + chance stun.' },
    genese: { id: 'genese', name: 'Gênese', emoji: '🪐', kind: 'active', type: 'heal', mana: 28, cd: 6, power: 0, self: true, unique: true, healMissingPct: 0.45, cleanse: ['bleed', 'poison', 'sangramento', 'veneno', 'stun', 'break_def'], classIds: ['deus_criador'], desc: '[Única] Cura 45% + limpa debuffs.' },
    veredito_divino: { id: 'veredito_divino', name: 'Veredito Divino', emoji: '⚖️', kind: 'active', type: 'magic', mana: 30, cd: 7, power: 1.8, unique: true, oncePerBattle: true, trueDamagePct: 0.35, classIds: ['deus_criador'], desc: '[Única · 1×] Dano massivo.' },
    onisciencia: { id: 'onisciencia', name: 'Onisciência', emoji: '👁️', kind: 'passive', unique: true, classIds: ['deus_criador'], desc: '+15% precisão.', mods: { precision: 0.15, skillFamiliarityReduce: 0.12 } },
    imortalidade_relativa: { id: 'imortalidade_relativa', name: 'Imortalidade Relativa', emoji: '♾️', kind: 'passive', unique: true, classIds: ['deus_criador'], desc: '1× sobrevive fatal 15% HP.', mods: { surviveFatalOnce: true, surviveFatalHpPct: 0.15 } },
    autoridade: { id: 'autoridade', name: 'Autoridade', emoji: '👑', kind: 'passive', unique: true, classIds: ['deus_criador'], desc: '+12% ofensivo/mana.', mods: { allOffenseBonus: 0.12, manaBonus: 0.12 } },
    presenca_divina: { id: 'presenca_divina', name: 'Presença Divina', emoji: '✨', kind: 'passive', classIds: ['deus_criador'], desc: 'Inimigos −5% attrs.', mods: { enemyAttrDebuffStart: 0.05 } },
    criacao_constante: { id: 'criacao_constante', name: 'Criação Constante', emoji: '🌀', kind: 'passive', classIds: ['deus_criador'], desc: 'Regen mana/turno.', mods: { manaRegenPerTurn: 6 } },
    olhar_do_criador: { id: 'olhar_do_criador', name: 'Olhar do Criador', emoji: '🔭', kind: 'passive', classIds: ['deus_criador'], desc: '+10% 1º ataque.', mods: { firstAttackBonus: 0.1 } },
    equilibrio: { id: 'equilibrio', name: 'Equilíbrio', emoji: '☯️', kind: 'passive', classIds: ['deus_criador'], desc: 'Skills repetidas −15%.', mods: { repeatedSkillDamageReduce: 0.15 } },
    eco_do_eter: { id: 'eco_do_eter', name: 'Eco do Éter', emoji: '💫', kind: 'passive', classIds: ['deus_criador'], desc: '+3% todos attrs.', mods: { allAttrBonus: 0.03 } }
};

const ACTIVE_SLOTS = 4;
const PASSIVE_SLOTS = 5;

function getAbility(id) { return ABILITIES[id] || null; }
function listByKind(kind, userId) {
    const cls = userId ? classesMod.getClass((player.get(userId) || {}).classId) : null;
    const classId = cls?.id;
    return Object.values(ABILITIES).filter((a) => {
        if (a.kind !== kind) return false;
        if (!a.classIds || !a.classIds.length) return !classId;
        if (!classId) return false;
        return a.classIds.includes(classId);
    });
}
function loadLoadout(userId) {
    const data = store.load('ability_loadouts.json', {});
    const cur = data[userId] || { active: [null, null, null, null], passive: [null, null, null, null, null] };
    if (!Array.isArray(cur.active)) cur.active = [null, null, null, null];
    if (!Array.isArray(cur.passive)) cur.passive = [null, null, null, null, null];
    return cur;
}
function saveLoadout(userId, loadout) {
    const data = store.load('ability_loadouts.json', {});
    data[userId] = { active: (loadout.active || []).slice(0, ACTIVE_SLOTS), passive: (loadout.passive || []).slice(0, PASSIVE_SLOTS) };
    store.save('ability_loadouts.json', data);
}
function sanitizeLoadout(userId) {
    const loadout = loadLoadout(userId);
    const cls = classesMod.getClass((player.get(userId) || {}).classId);
    const classId = cls?.id;
    let changed = false;
    for (const kind of ['active', 'passive']) {
        const slots = loadout[kind];
        for (let i = 0; i < slots.length; i++) {
            const id = slots[i];
            if (!id) continue;
            const ab = getAbility(id);
            if (!ab || (ab.classIds && classId && !ab.classIds.includes(classId))) { slots[i] = null; changed = true; }
        }
    }
    if (changed) saveLoadout(userId, loadout);
    return loadout;
}
function equipAbility(userId, abilityId, slot) {
    const ab = getAbility(abilityId);
    if (!ab) return { ok: false, error: 'Habilidade inválida.' };
    const cls = classesMod.getClass((player.get(userId) || {}).classId);
    if (ab.classIds && cls?.id && !ab.classIds.includes(cls.id)) return { ok: false, error: 'Esta habilidade não é da sua classe.' };
    const loadout = sanitizeLoadout(userId);
    const slots = ab.kind === 'active' ? loadout.active : loadout.passive;
    const max = ab.kind === 'active' ? ACTIVE_SLOTS : PASSIVE_SLOTS;
    const idx = Math.max(0, Math.min(max - 1, Number(slot) || 0));
    slots[idx] = abilityId;
    saveLoadout(userId, loadout);
    return { ok: true, loadout, ability: ab, slot: idx };
}
function unequipAbility(userId, kind, slot) {
    const loadout = loadLoadout(userId);
    const slots = kind === 'active' ? loadout.active : loadout.passive;
    const idx = Math.max(0, Math.min(slots.length - 1, Number(slot) || 0));
    slots[idx] = null;
    saveLoadout(userId, loadout);
    return { ok: true, loadout };
}
function getEquipped(userId) {
    const loadout = sanitizeLoadout(userId);
    return {
        active: loadout.active.map((id) => (id ? getAbility(id) : null)),
        passive: loadout.passive.map((id) => (id ? getAbility(id) : null)),
        loadout
    };
}
function sumPassiveMods(userId) {
    const eq = getEquipped(userId);
    const mods = {};
    for (const p of eq.passive || []) {
        if (!p || !p.mods || typeof p.mods !== 'object') continue;
        for (const [k, v] of Object.entries(p.mods)) {
            if (typeof v === 'number') mods[k] = (Number(mods[k]) || 0) + v;
            else if (mods[k] === undefined) mods[k] = v;
        }
    }
    return mods;
}
function getEquippedAbilities(userId) { return getEquipped(userId); }

module.exports = {
    ABILITIES, ACTIVE_SLOTS, PASSIVE_SLOTS, getAbility, listByKind,
    loadLoadout, saveLoadout, sanitizeLoadout, equipAbility, unequipAbility,
    getEquipped, getEquippedAbilities, sumPassiveMods
};
