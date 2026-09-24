const store = require('./store');
const player = require('./player');

const ABILITIES = {
  bola_fogo: { id: 'bola_fogo', name: 'Bola de Fogo', emoji: '🔥', kind: 'active', type: 'magic', mana: 18, cd: 1, power: 1.35, effect: 'burn', effectChance: 0.35, effectTurns: 2, desc: 'Projétil flamejante. Chance de queimar.' },
  lanca_gelo: { id: 'lanca_gelo', name: 'Lança de Gelo', emoji: '❄️', kind: 'active', type: 'magic', mana: 16, cd: 1, power: 1.2, effect: 'slow', effectChance: 0.4, effectTurns: 1, desc: 'Reduz agilidade do alvo.' },
  raio_cadeia: { id: 'raio_cadeia', name: 'Raio em Cadeia', emoji: '⚡', kind: 'active', type: 'magic', mana: 22, cd: 2, power: 1.15, aoe: true, desc: 'Raio que salta entre inimigos.' },
  golpe_devastador: { id: 'golpe_devastador', name: 'Golpe Devastador', emoji: '💥', kind: 'active', type: 'physical', mana: 12, cd: 2, power: 1.55, effect: 'stun', effectChance: 0.2, effectTurns: 1, desc: 'Golpe pesado com chance de atordoar.' },
  corte_venenoso: { id: 'corte_venenoso', name: 'Corte Venenoso', emoji: '☠️', kind: 'active', type: 'physical', mana: 10, cd: 1, power: 1.1, effect: 'poison', effectChance: 0.5, effectTurns: 3, desc: 'Envenena por vários turnos.' },
  cura_vital: { id: 'cura_vital', name: 'Cura Vital', emoji: '💚', kind: 'active', type: 'heal', mana: 20, cd: 2, power: 0.9, self: true, desc: 'Restaura vida própria.' },
  escudo_arcano: { id: 'escudo_arcano', name: 'Escudo Arcano', emoji: '🔮', kind: 'active', type: 'buff', mana: 14, cd: 3, power: 0, effect: 'shield', effectTurns: 2, self: true, desc: 'Absorve parte do próximo dano.' },
  furia_berserker: { id: 'furia_berserker', name: 'Fúria Berserker', emoji: '😡', kind: 'active', type: 'buff', mana: 8, cd: 3, power: 0, effect: 'rage', effectTurns: 2, self: true, desc: '+dano por 2 turnos.' },
  disparo_preciso: { id: 'disparo_preciso', name: 'Disparo Preciso', emoji: '🎯', kind: 'active', type: 'physical', mana: 11, cd: 1, power: 1.4, critBonus: 0.25, desc: 'Tiro com alto crítico.' },
  barreira_runica: { id: 'barreira_runica', name: 'Barreira Rúnica', emoji: '🧱', kind: 'active', type: 'buff', mana: 16, cd: 3, power: 0, effect: 'barrier', effectTurns: 2, self: true, desc: 'Aumenta defesa por 2 turnos.' },
  dreno_vida: { id: 'dreno_vida', name: 'Dreno de Vida', emoji: '🩸', kind: 'active', type: 'magic', mana: 15, cd: 2, power: 1.0, lifesteal: 0.4, desc: 'Dano e cura parcial.' },
  explosao_eter: { id: 'explosao_eter', name: 'Explosão de Éter', emoji: '✨', kind: 'active', type: 'magic', mana: 28, cd: 3, power: 1.7, desc: 'Explosão massiva de Éter.' },
  pele_ferro: { id: 'pele_ferro', name: 'Pele de Ferro', emoji: '🪨', kind: 'passive', desc: '+8% redução de dano físico.', mods: { dmgReducePhys: 0.08 } },
  mente_clara: { id: 'mente_clara', name: 'Mente Clara', emoji: '🧠', kind: 'passive', desc: '+10% mana e +5% dano mágico.', mods: { manaBonus: 0.1, magicPower: 0.05 } },
  sangue_quente: { id: 'sangue_quente', name: 'Sangue Quente', emoji: '🔥', kind: 'passive', desc: '+6% dano físico.', mods: { physPower: 0.06 } },
  pes_ligeiros: { id: 'pes_ligeiros', name: 'Pés Ligeiros', emoji: '👟', kind: 'passive', desc: '+12% esquiva.', mods: { dodge: 0.12 } },
  critica_letal: { id: 'critica_letal', name: 'Crítica Letal', emoji: '💀', kind: 'passive', desc: '+10% crítico.', mods: { crit: 0.1 } },
  regeneracao: { id: 'regeneracao', name: 'Regeneração', emoji: '💚', kind: 'passive', desc: '3% vida no fim do turno.', mods: { regenPct: 0.03 } },
  sede_mana: { id: 'sede_mana', name: 'Sede de Mana', emoji: '🔵', kind: 'passive', desc: '+4 mana por turno.', mods: { manaRegen: 4 } },
  olho_falcao: { id: 'olho_falcao', name: 'Olho de Falcão', emoji: '👁️', kind: 'passive', desc: '+8% precisão.', mods: { accuracy: 0.08 } },
  resistencia_magica: { id: 'resistencia_magica', name: 'Resistência Mágica', emoji: '🟣', kind: 'passive', desc: '+10% redução mágica.', mods: { dmgReduceMag: 0.1 } },
  fortuna: { id: 'fortuna', name: 'Fortuna', emoji: '🍀', kind: 'passive', desc: '+15% sorte em baús/drops.', mods: { luck: 0.15 } },

  cn_decapitacao: { id: 'cn_decapitacao', name: 'Decapitação', emoji: '⚰️', kind: 'active', type: 'physical', mana: 25, cd: 99, power: 2.1, rarity: 'epica', oncePerMatch: true, effect: 'consume_random_attr', exclusiveClass: 'ceifador_negro', exclusiveOwner: '1483097258944630897', desc: 'Épica · 1x por partida. Consome 1 ponto de atributo aleatório permanentemente.' },
  cn_corte_fantasma: { id: 'cn_corte_fantasma', name: 'Corte Fantasma', emoji: '👻', kind: 'active', type: 'physical', mana: 14, cd: 2, power: 1.25, rarity: 'rara', trueDamage: 0.45, ignoreDefense: 0.5, exclusiveClass: 'ceifador_negro', exclusiveOwner: '1483097258944630897', desc: 'Rara · Ignora parte da defesa e causa dano verdadeiro.' },
  cn_estocada_fantasma: { id: 'cn_estocada_fantasma', name: 'Estocada Fantasma', emoji: '🗡️', kind: 'active', type: 'physical', mana: 12, cd: 2, power: 0.55, rarity: 'rara', effect: 'break_defense', effectTurns: 2, exclusiveClass: 'ceifador_negro', exclusiveOwner: '1483097258944630897', desc: 'Rara · Quebra defesa; pouco dano direto.' },
  cn_manto_negro: { id: 'cn_manto_negro', name: 'Manto Negro', emoji: '🌑', kind: 'active', type: 'buff', mana: 18, cd: 4, power: 0, self: true, effect: 'untargetable', effectTurns: 1, exclusiveClass: 'ceifador_negro', exclusiveOwner: '1483097258944630897', desc: 'Névoa negra — intocável por 1 turno.' },
  cn_veu_morte: { id: 'cn_veu_morte', name: 'Véu da Morte', emoji: '🌫️', kind: 'active', type: 'buff', mana: 20, cd: 5, power: 0, self: true, rarity: 'epica', effect: 'fatal_save', effectChanceMin: 0.05, effectChanceMax: 0.5, effectTurns: 2, exclusiveClass: 'ceifador_negro', exclusiveOwner: '1483097258944630897', desc: 'Épica · 2 turnos: 5–50% de sobreviver a golpe fatal.' },
  cn_dado_morte: { id: 'cn_dado_morte', name: 'Dado da Morte', emoji: '🎲', kind: 'active', type: 'special', mana: 22, cd: 4, power: 0, rarity: 'epica', effect: 'death_dice', exclusiveClass: 'ceifador_negro', exclusiveOwner: '1483097258944630897', desc: 'Épica · Dado 1–6 define o destino de ambos.' },
  cn_aura_morte: { id: 'cn_aura_morte', name: 'Aura da Morte', emoji: '☠️', kind: 'passive', rarity: 'epica', exclusiveClass: 'ceifador_negro', exclusiveOwner: '1483097258944630897', desc: 'Épica · Inimigos: Marca da Morte (−1% vida máx/turno).', mods: { deathMark: 0.01 } },
  cn_maldicao_nivel: { id: 'cn_maldicao_nivel', name: 'Maldição de Nível', emoji: '📉', kind: 'passive', exclusiveClass: 'ceifador_negro', exclusiveOwner: '1483097258944630897', desc: 'Diferença ≥10 níveis: −10% ou +10% atributos.', mods: { levelCurse: 0.1 } },
  cn_maldicao_ceifador: { id: 'cn_maldicao_ceifador', name: 'Maldição do Ceifador', emoji: '🩸', kind: 'passive', rarity: 'epica', exclusiveClass: 'ceifador_negro', exclusiveOwner: '1483097258944630897', desc: 'Épica · Kill: −5% first strike; +drops.', mods: { firstStrikePenalty: 0.05, dropBonus: 0.12 } },
  cn_mao_negra: { id: 'cn_mao_negra', name: 'Mão Negra', emoji: '🤚', kind: 'passive', rarity: 'epica', exclusiveClass: 'ceifador_negro', exclusiveOwner: '1483097258944630897', desc: 'Épica · Sem arma −30%; com Foice Grande +30%.', mods: { unarmedPenalty: 0.3, classWeaponBonus: 0.3, classWeaponId: 'foice_grande' } }
};

const ACTIVE_SLOTS = 4;
const PASSIVE_SLOTS = 5;

function getAbility(id) {
  return ABILITIES[id] || null;
}

function getUserClassId(userId) {
  try {
    const p = player.get(userId);
    return p?.classId || p?.class || null;
  } catch {
    return null;
  }
}

function canUseAbility(userId, ab) {
  if (!ab) return false;
  const uid = String(userId);
  if (ab.exclusiveOwner && String(ab.exclusiveOwner) !== uid) return false;
  if (ab.exclusiveClass) {
    const cid = getUserClassId(uid);
    if (String(cid) !== String(ab.exclusiveClass)) return false;
  }
  return true;
}

function listByKind(kind, userId) {
  const uid = userId != null ? String(userId) : null;
  return Object.values(ABILITIES).filter((a) => {
    if (a.kind !== kind) return false;
    if (a.exclusiveOwner || a.exclusiveClass) {
      if (!uid) return false;
      return canUseAbility(uid, a);
    }
    if (uid && getUserClassId(uid) === 'ceifador_negro') {
      return a.exclusiveClass === 'ceifador_negro';
    }
    return true;
  });
}

function loadLoadout(userId) {
  const data = store.load('ability_loadouts.json', {});
  const cur = data[userId] || { active: [null, null, null, null], passive: [null, null, null, null, null] };
  while (cur.active.length < ACTIVE_SLOTS) cur.active.push(null);
  while (cur.passive.length < PASSIVE_SLOTS) cur.passive.push(null);
  cur.active = cur.active.slice(0, ACTIVE_SLOTS);
  cur.passive = cur.passive.slice(0, PASSIVE_SLOTS);
  return cur;
}

function saveLoadout(userId, loadout) {
  const data = store.load('ability_loadouts.json', {});
  data[userId] = {
    active: (loadout.active || []).slice(0, ACTIVE_SLOTS),
    passive: (loadout.passive || []).slice(0, PASSIVE_SLOTS)
  };
  store.save('ability_loadouts.json', data);
  return data[userId];
}

function equipAbility(userId, abilityId, slotIndex) {
  const ab = getAbility(abilityId);
  if (!ab) return { ok: false, error: 'Habilidade inexistente.' };
  if (!player.has(userId)) return { ok: false, error: 'Crie o perfil primeiro (O.j criar).' };
  if (!canUseAbility(userId, ab)) {
    return { ok: false, error: 'Você não pode usar esta habilidade (classe/dono exclusivo).' };
  }
  const loadout = loadLoadout(userId);
  const slots = ab.kind === 'active' ? loadout.active : loadout.passive;
  const max = ab.kind === 'active' ? ACTIVE_SLOTS : PASSIVE_SLOTS;
  let idx = Number(slotIndex);
  if (!Number.isFinite(idx) || idx < 0 || idx >= max) {
    idx = slots.findIndex((s) => !s);
    if (idx < 0) return { ok: false, error: 'Slots cheios.' };
  }
  for (let i = 0; i < slots.length; i++) if (slots[i] === abilityId) slots[i] = null;
  slots[idx] = abilityId;
  saveLoadout(userId, loadout);
  return { ok: true, loadout, ability: ab, slot: idx };
}

function unequipSlot(userId, kind, slotIndex) {
  const loadout = loadLoadout(userId);
  const slots = kind === 'active' ? loadout.active : loadout.passive;
  const idx = Number(slotIndex);
  if (!Number.isFinite(idx) || idx < 0 || idx >= slots.length) return { ok: false, error: 'Slot inválido.' };
  slots[idx] = null;
  saveLoadout(userId, loadout);
  return { ok: true, loadout };
}

function getEquippedAbilities(userId) {
  const loadout = loadLoadout(userId);
  let dirty = false;
  for (let i = 0; i < loadout.active.length; i++) {
    const id = loadout.active[i];
    if (id && !canUseAbility(userId, getAbility(id))) {
      loadout.active[i] = null;
      dirty = true;
    }
  }
  for (let i = 0; i < loadout.passive.length; i++) {
    const id = loadout.passive[i];
    if (id && !canUseAbility(userId, getAbility(id))) {
      loadout.passive[i] = null;
      dirty = true;
    }
  }
  if (dirty) saveLoadout(userId, loadout);
  return {
    active: loadout.active.map((id) => (id ? getAbility(id) : null)),
    passive: loadout.passive.map((id) => (id ? getAbility(id) : null)),
    loadout
  };
}

function sumPassiveMods(userId) {
  const { passive } = getEquippedAbilities(userId);
  const mods = {};
  for (const p of passive) {
    if (!p?.mods) continue;
    for (const [k, v] of Object.entries(p.mods)) {
      if (typeof v === 'number') mods[k] = (mods[k] || 0) + Number(v);
      else if (mods[k] == null) mods[k] = v;
    }
  }
  return mods;
}

module.exports = {
  ABILITIES,
  ACTIVE_SLOTS,
  PASSIVE_SLOTS,
  getAbility,
  listByKind,
  canUseAbility,
  loadLoadout,
  saveLoadout,
  equipAbility,
  unequipSlot,
  getEquippedAbilities,
  sumPassiveMods
};
