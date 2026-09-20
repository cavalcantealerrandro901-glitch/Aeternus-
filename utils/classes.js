const store = require('./store');

const BASE_CLASSES = {
  cavalheiro_eter: { id: 'cavalheiro_eter', name: 'Cavalheiro do Éter', emoji: '⚔️', type: 'melee',
    desc: 'Guerreiro abençoado pelo Éter. Equilíbrio entre lâmina e resistência sagrada.',
    powers: ['Golpe de Éter', 'Aura protetora', 'Bônus de defesa'], disadvantages: ['Mana limitada', 'Mobilidade média'],
    bonus: { forca: 3, defesa: 2, agilidade: 1, vida: 2 }, manaMult: 0.95, color: 0xc9a227,
    basicAttack: { id: 'golpe_espada', name: 'Golpe de Espada', emoji: '⚔️', type: 'physical', power: 1.0, mana: 0 } },
  bruxo_ruinas: { id: 'bruxo_ruinas', name: 'Bruxo das Ruínas', emoji: '📜', type: 'magic',
    desc: 'Magia proibida das ruínas. Alto dano mágico e maldições.',
    powers: ['Rajada Arcana', 'Maldição', 'Dreno de mana'], disadvantages: ['Vida baixa', 'Defesa frágil'],
    bonus: { forca: 1, defesa: 0, agilidade: 1, vida: 0 }, manaMult: 1.45, color: 0x6d28d9,
    basicAttack: { id: 'toque_sombrio', name: 'Toque Sombrio', emoji: '🌑', type: 'magic', power: 0.95, mana: 4 } },
  cacador_sombras: { id: 'cacador_sombras', name: 'Caçador de Sombras', emoji: '🏹', type: 'ranged',
    desc: 'Emboscadas e tiros precisos nas penumbras.',
    powers: ['Tiro preciso', 'Crítico elevado', 'Fuga sombria'], disadvantages: ['Pouca vida'],
    bonus: { forca: 2, defesa: 0, agilidade: 4, vida: 0 }, manaMult: 1.0, color: 0x166534,
    basicAttack: { id: 'tiro_sombrio', name: 'Tiro Sombrio', emoji: '🏹', type: 'physical', power: 1.05, mana: 0 } },
  oraculo_vital: { id: 'oraculo_vital', name: 'Oráculo Vital', emoji: '🌿', type: 'support',
    desc: 'Cura, protege e sustenta aliados.',
    powers: ['Cura vital', 'Escudo de vida'], disadvantages: ['Dano direto baixo'],
    bonus: { forca: 0, defesa: 2, agilidade: 1, vida: 3 }, manaMult: 1.3, color: 0x059669,
    basicAttack: { id: 'pulso_vital', name: 'Pulso Vital', emoji: '💚', type: 'magic', power: 0.7, mana: 3 } },
  berserker_ferro: { id: 'berserker_ferro', name: 'Berserker de Ferro', emoji: '🪓', type: 'melee',
    desc: 'Fúria incontrolável. Quanto mais ferido, mais destrutivo.',
    powers: ['Fúria crescente', 'Golpes devastadores'], disadvantages: ['Defesa baixa', 'Pouca mana'],
    bonus: { forca: 4, defesa: 0, agilidade: 2, vida: 1 }, manaMult: 0.8, color: 0xb91c1c,
    basicAttack: { id: 'golpe_furioso', name: 'Golpe Furioso', emoji: '🪓', type: 'physical', power: 1.15, mana: 0 } },
  tecelao_tempestade: { id: 'tecelao_tempestade', name: 'Tecelão da Tempestade', emoji: '⛈️', type: 'magic',
    desc: 'Raios e ventos. Controle de área e dano em cadeia.',
    powers: ['Raio em cadeia', 'Explosão elétrica'], disadvantages: ['Mana cara'],
    bonus: { forca: 2, defesa: 1, agilidade: 2, vida: 1 }, manaMult: 1.25, color: 0x0284c7,
    basicAttack: { id: 'faisca', name: 'Faísca', emoji: '⚡', type: 'magic', power: 0.9, mana: 3 } },
  guardiao_runico: { id: 'guardiao_runico', name: 'Guardião Rúnico', emoji: '🛡️', type: 'tank',
    desc: 'Muralha viva marcada por runas. Absorve e devolve dano.',
    powers: ['Escudo rúnico', 'Reflexo de dano'], disadvantages: ['Dano baixo', 'Lento'],
    bonus: { forca: 1, defesa: 4, agilidade: 0, vida: 3 }, manaMult: 0.9, color: 0x475569,
    basicAttack: { id: 'bash_runico', name: 'Impacto Rúnico', emoji: '🛡️', type: 'physical', power: 0.75, mana: 0 } },
  lamina_fantasma: { id: 'lamina_fantasma', name: 'Lâmina Fantasma', emoji: '👻', type: 'melee',
    desc: 'Assassino entre o material e o espectro.',
    powers: ['Golpe fantasma', 'Evasão espectral'], disadvantages: ['Vida muito baixa'],
    bonus: { forca: 3, defesa: 0, agilidade: 3, vida: 0 }, manaMult: 0.95, color: 0x4c1d95,
    basicAttack: { id: 'corte_fantasma', name: 'Corte Fantasma', emoji: '🗡️', type: 'physical', power: 1.1, mana: 0 } }
};

const LEGACY_MAP = { mago: 'bruxo_ruinas', arqueiro: 'cacador_sombras', tanque: 'guardiao_runico', healer: 'oraculo_vital', guerreiro: 'cavalheiro_eter', assassino: 'lamina_fantasma' };

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
function listClasses() { return Object.values(allClasses()); }
function createClass(payload) {
  const id = String(payload.id || '').toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 32);
  if (!id || id.length < 3) throw new Error('ID inválido');
  if (BASE_CLASSES[id]) throw new Error('Não pode sobrescrever classe base');
  const custom = loadCustom();
  const cls = {
    id, name: String(payload.name || id).slice(0, 40), emoji: String(payload.emoji || '✨').slice(0, 8),
    type: String(payload.type || 'melee').slice(0, 16), desc: String(payload.desc || '').slice(0, 400),
    powers: Array.isArray(payload.powers) ? payload.powers.slice(0, 8) : String(payload.powers || '').split('|').map(s => s.trim()).filter(Boolean).slice(0, 8),
    disadvantages: Array.isArray(payload.disadvantages) ? payload.disadvantages.slice(0, 8) : String(payload.disadvantages || '').split('|').map(s => s.trim()).filter(Boolean).slice(0, 8),
    bonus: { forca: Number(payload.forca ?? 1) || 1, defesa: Number(payload.defesa ?? 1) || 1, agilidade: Number(payload.agilidade ?? 1) || 1, vida: Number(payload.vida ?? 1) || 1 },
    manaMult: Math.min(2, Math.max(0.5, Number(payload.manaMult ?? 1) || 1)), color: Number(payload.color) || 0x888888,
    basicAttack: { id: 'basico_' + id, name: String(payload.basicName || 'Ataque Básico').slice(0, 32), emoji: String(payload.basicEmoji || '⚔️').slice(0, 8),
      type: payload.type === 'magic' || payload.type === 'support' ? 'magic' : 'physical', power: 1, mana: 0 },
    custom: true, createdAt: custom[id]?.createdAt || Date.now(), updatedAt: Date.now()
  };
  custom[id] = cls; saveCustom(custom); return cls;
}
function deleteCustomClass(id) {
  const custom = loadCustom();
  if (!custom[id]) return false;
  delete custom[id]; saveCustom(custom); return true;
}
module.exports = { BASE_CLASSES, LEGACY_MAP, allClasses, getClass, resolveClassId, listClasses, createClass, deleteCustomClass, loadCustom };
