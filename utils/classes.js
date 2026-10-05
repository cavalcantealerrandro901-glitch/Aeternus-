const store = require('./store');

const BASE_CLASSES = {
    guerreiro: {
        id: 'guerreiro', name: 'Guerreiro', emoji: '⚔️', type: 'melee', rarity: 'comum', rarityName: 'Comum',
        desc: 'Combate corpo a corpo e resistência.',
        uniqueAbilities: [], activeAbilities: ['Golpe Poderoso', 'Escudo', 'Investida', 'Grito de Guerra'],
        uniquePassives: [], passives: ['Pele Dura', 'Fôlego de Ferro', 'Postura Firme', 'Instinto de Caça', 'Segundo Fôlego'],
        powers: ['Golpe Poderoso', 'Escudo', 'Investida', 'Grito de Guerra'], disadvantages: [],
        bonus: { forca: 2, defesa: 1, agilidade: 0, vida: 1 }, manaMult: 1, color: 0xf97316,
        basicAttack: { id: 'golpe_basico', name: 'Golpe', emoji: '⚔️', type: 'physical', power: 1, mana: 0 }, classGear: null
    },
    mago: {
        id: 'mago', name: 'Mago', emoji: '🔮', type: 'magic', rarity: 'comum', rarityName: 'Comum',
        desc: 'Magia ofensiva e controle de mana.',
        uniqueAbilities: [], activeAbilities: ['Bola de Fogo', 'Gelo', 'Raio', 'Barreira Arcana'],
        uniquePassives: [], passives: ['Mente Clara', 'Fluxo de Mana', 'Foco', 'Estudo', 'Catalisador'],
        powers: ['Bola de Fogo', 'Gelo', 'Raio', 'Barreira Arcana'], disadvantages: [],
        bonus: { forca: 0, defesa: 0, agilidade: 1, vida: 0 }, manaMult: 1.35, color: 0x6366f1,
        basicAttack: { id: 'proj_arcano', name: 'Projétil Arcano', emoji: '✨', type: 'magic', power: 1.05, mana: 0 }, classGear: null
    },
    arqueiro: {
        id: 'arqueiro', name: 'Arqueiro', emoji: '🏹', type: 'ranged', rarity: 'comum', rarityName: 'Comum',
        desc: 'Precisão e agilidade à distância.',
        uniqueAbilities: [], activeAbilities: ['Tiro Certeiro', 'Chuva de Flechas', 'Armadilha', 'Tiro Perfurante'],
        uniquePassives: [], passives: ['Olho de Águia', 'Passo Leve', 'Calma', 'Rastreador', 'Reserva'],
        powers: ['Tiro Certeiro', 'Chuva de Flechas', 'Armadilha', 'Tiro Perfurante'], disadvantages: [],
        bonus: { forca: 1, defesa: 0, agilidade: 2, vida: 0 }, manaMult: 1.1, color: 0x22c55e,
        basicAttack: { id: 'tiro', name: 'Tiro', emoji: '🏹', type: 'physical', power: 1, mana: 0 }, classGear: null
    },
    clerigo: {
        id: 'clerigo', name: 'Clérigo', emoji: '✝️', type: 'magic', rarity: 'incomum', rarityName: 'Incomum',
        desc: 'Cura e suporte sagrado.',
        uniqueAbilities: [], activeAbilities: ['Cura', 'Bênção', 'Smite', 'Proteção'],
        uniquePassives: [], passives: ['Fé', 'Serenidade', 'Aura', 'Compixão', 'Voto'],
        powers: ['Cura', 'Bênção', 'Smite', 'Proteção'], disadvantages: [],
        bonus: { forca: 0, defesa: 1, agilidade: 1, vida: 2 }, manaMult: 1.2, color: 0x22c55e,
        basicAttack: { id: 'toque_luz', name: 'Toque de Luz', emoji: '💚', type: 'magic', power: 0.9, mana: 0 }, classGear: null
    },
    l_detetive_arcano: {
        id: 'l_detetive_arcano', name: 'L — O Detetive Arcano', emoji: '🕵️', type: 'magic', rarity: 'unica', rarityName: 'Única',
        maxHolders: 1, exclusive: true, boundUserId: '1460227733023096875',
        desc: 'Classe Única do Detetive Arcano.',
        uniqueAbilities: ['Xeque-Mate', 'Dedução Impossível'],
        activeAbilities: ['Cartas da Dedução', 'Correntes da Suspeita', 'Olho Analítico', 'Bengala do Investigador', 'Xeque-Mate', 'Dedução Impossível'],
        uniquePassives: [],
        passives: ['Mente Analítica Absoluta', 'Memória Fotográfica Infinita', 'Suspeita Onisciente', 'Raciocínio Reverso Absoluto', 'Um Passo à Frente', 'A Verdade Sempre Aparece'],
        powers: ['Cartas da Dedução', 'Correntes da Suspeita', 'Olho Analítico', 'Bengala do Investigador', 'Xeque-Mate', 'Dedução Impossível'],
        disadvantages: ['Classe exclusiva (1 titular)'],
        bonus: { forca: 2, defesa: 2, agilidade: 3, vida: 2 }, manaMult: 1.2, color: 0xef4444,
        classBonuses: {
            abilities: {
                'Cartas da Dedução': { dano: 950, precisao: 950, penetracao: 950 },
                'Correntes da Suspeita': { dano: 950, controle: 950, velocidade: 950, forca: 950 },
                'Olho Analítico': { dano: 950, percepcao: 950, analise: 950, deteccao: 950 },
                'Bengala do Investigador': { dano: 950, velocidade: 950, alcance: 950 },
                'Xeque-Mate': { dano: 1200, precisao: 950, penetracao: 950, previsao: 950 },
                'Dedução Impossível': { dano: 1200, investigacao: 950, percepcao: 950, revelacao: 950 }
            },
            passives: {
                'Mente Analítica Absoluta': { adaptacao: 950, resistencia: 950, analise: 950 },
                'Memória Fotográfica Infinita': { memoria: 950, reconhecimento: 950, precisao: 950 },
                'Suspeita Onisciente': { percepcao: 950, deteccao: 950, reacao: 950 },
                'Raciocínio Reverso Absoluto': { resistencia: 950, adaptacao: 950, defesa: 950 },
                'Um Passo à Frente': { previsao: 950, reacao: 950, evasao: 950 },
                'A Verdade Sempre Aparece': { deteccao: 950, resistenciaMental: 950, revelacao: 950 }
            }
        },
        cosmicItems: {
            'Olho do Infinito Absoluto': { percepcao: 900, precisao: 800, deteccao: 700 },
            'Escudo da Dedução Cósmica Suprema': { defesa: 1200, resistencia: 1000, reflexo: 900, danoRetorno: 950 },
            'Relíquia da Verdade Absoluta': { investigacao: 1100, inteligencia: 950, penetracao: 900 }
        },
        basicAttack: { id: 'golpe_bengala', name: 'Golpe de Bengala', emoji: '🪄', type: 'magic', power: 1.15, mana: 0 },
        classGear: { weapon: 'olho_infinito_absoluto', armor: 'escudo_deducao_cosmica_suprema', accessory: 'reliquia_verdade_absoluta' }
    },
    ceifador_negro: {
        id: 'ceifador_negro', name: 'Ceifador Negro', emoji: '💀', type: 'melee', rarity: 'unica', rarityName: 'Única',
        maxHolders: 1, exclusive: true, boundUserId: '1483097258944630897',
        desc: 'Avatar da morte. Classe Única vinculada.',
        uniqueAbilities: ['Decapitação', 'Dado da Morte'],
        activeAbilities: ['Corte Fantasma', 'Estocada Fantasma', 'Manto Negro', 'Véu da Morte'],
        uniquePassives: ['Aura da Morte', 'Maldição do Ceifador', 'Mão Negra'],
        passives: ['Maldição de Nível', 'Presença Funérea', 'Frio do Túmulo', 'Colheita Sombria', 'Silêncio do Véu'],
        powers: ['Corte Fantasma', 'Estocada Fantasma', 'Manto Negro', 'Véu da Morte'],
        disadvantages: ['Classe exclusiva vinculada'],
        bonus: { forca: 4, defesa: 2, agilidade: 2, vida: 2 }, manaMult: 1.1, color: 0x1f2937,
        basicAttack: { id: 'golpe_foice', name: 'Golpe de Foice', emoji: '⚰️', type: 'physical', power: 1.25, mana: 0 },
        classGear: { weapon: 'foice_grande', armor: 'manto_negro_armadura', accessory: 'dado_da_morte' }
    },
    deus_criador: {
        id: 'deus_criador', name: 'Deus Criador', emoji: '🌌', rarity: 'mitica', rarityName: 'Mítica', type: 'magic',
        maxHolders: 1, exclusive: true,
        boundUserId: process.env.OWNER_ID || process.env.BOT_OWNER_ID || process.env.ADMIN_ID || '1483097258944630897',
        desc: 'Arquiteto do Aeternus. Exclusiva do criador (OWNER_ID).',
        uniqueAbilities: ['Gênese', 'Veredito Divino'],
        activeAbilities: ['Raio Primordial', 'Mão do Arquiteto', 'Véu do Cosmos', 'Decreto'],
        uniquePassives: ['Onisciência', 'Imortalidade Relativa', 'Autoridade'],
        passives: ['Presença Divina', 'Criação Constante', 'Olhar do Criador', 'Equilíbrio', 'Eco do Éter'],
        powers: ['Raio Primordial', 'Mão do Arquiteto', 'Véu do Cosmos', 'Decreto'],
        disadvantages: ['Classe exclusiva do criador'],
        bonus: { forca: 5, defesa: 5, agilidade: 5, vida: 5 }, manaMult: 1.5, color: 0xc4b5fd,
        basicAttack: { id: 'toque_criador', name: 'Toque do Criador', emoji: '✨', type: 'magic', power: 1.35, mana: 0 },
        classGear: { weapon: 'cetro_da_genese', armor: 'manto_cosmico', accessory: 'orbe_do_arquiteto' }
    },
    arcanjo_do_veu: {
        id: 'arcanjo_do_veu', name: 'Arcanjo do Véu', emoji: '👼', type: 'magic', rarity: 'unica', rarityName: 'Única',
        maxHolders: 1, exclusive: true, boundUserId: '1393079977410428968',
        desc: 'Mensageiro da luz velada. Classe Única vinculada.',
        uniqueAbilities: ['Decreto Final', 'Lâmina do Véu'],
        activeAbilities: ['Julgamento Celestial', 'Barreira do Véu Sagrado', 'Toque da Restauração', 'Passo Etéreo'],
        uniquePassives: ['Regeneração Benéfica', 'Pele de Luz', 'Eco do Véu'],
        passives: ['Asas Luminosas', 'Voto Sagrado', 'Clareza', 'Proteção Menor', 'Fé Inabalável'],
        powers: ['Julgamento Celestial', 'Barreira do Véu Sagrado', 'Toque da Restauração', 'Passo Etéreo'],
        disadvantages: ['Classe exclusiva vinculada'],
        bonus: { forca: 2, defesa: 3, agilidade: 2, vida: 3 }, manaMult: 1.25, color: 0xfde68a,
        basicAttack: { id: 'lamina_veu', name: 'Lâmina do Véu', emoji: '⚔️', type: 'magic', power: 1.1, mana: 0 },
        classGear: { weapon: 'espada_do_ceu', armor: 'armadura_do_veu', accessory: 'colar_da_ressurreicao' }
    }
};

// Classes da nova seleção de raridade Comum. Habilidades, passivas, atributos e itens serão definidos posteriormente.
const COMMON_CLASSES = {
    guerreiro: {
        id: 'guerreiro', name: 'Guerreiro', emoji: '⚔️', type: 'melee', rarity: 'comum', rarityName: 'Comum',
        selectionPool: 'common', desc: 'Combate corpo a corpo.',
        uniqueAbilities: [], activeAbilities: [], uniquePassives: [], passives: [], powers: [], disadvantages: [],
        bonus: {}, manaMult: 1, color: 0xc9a227,
        basicAttack: { id: 'guerreiro_ataque_basico', name: 'Ataque Básico', emoji: '⚔️', type: 'melee', power: 1, mana: 0 }, classGear: null
    },
    mago: {
        id: 'mago', name: 'Mago', emoji: '🔮', type: 'magic', rarity: 'comum', rarityName: 'Comum',
        selectionPool: 'common', desc: 'Manipulação de energia arcana.',
        uniqueAbilities: [], activeAbilities: [], uniquePassives: [], passives: [], powers: [], disadvantages: [],
        bonus: {}, manaMult: 1, color: 0xc9a227,
        basicAttack: { id: 'mago_ataque_basico', name: 'Ataque Básico', emoji: '🔮', type: 'magic', power: 1, mana: 0 }, classGear: null
    },
    mago_fogo: {
        id: 'mago_fogo', name: 'Mago de Fogo', emoji: '🔥', type: 'magic', rarity: 'comum', rarityName: 'Comum',
        selectionPool: 'common', desc: 'Especialista em magia elemental de fogo.',
        uniqueAbilities: [], activeAbilities: [], uniquePassives: [], passives: [], powers: [], disadvantages: [],
        bonus: {}, manaMult: 1, color: 0xc9a227,
        basicAttack: { id: 'mago_fogo_ataque_basico', name: 'Ataque Básico', emoji: '🔥', type: 'magic', power: 1, mana: 0 }, classGear: null
    },
    mago_gelo: {
        id: 'mago_gelo', name: 'Mago de Gelo', emoji: '🧊', type: 'magic', rarity: 'comum', rarityName: 'Comum',
        selectionPool: 'common', desc: 'Especialista em magia elemental de gelo.',
        uniqueAbilities: [], activeAbilities: [], uniquePassives: [], passives: [], powers: [], disadvantages: [],
        bonus: {}, manaMult: 1, color: 0xc9a227,
        basicAttack: { id: 'mago_gelo_ataque_basico', name: 'Ataque Básico', emoji: '🧊', type: 'magic', power: 1, mana: 0 }, classGear: null
    },
    mago_terra: {
        id: 'mago_terra', name: 'Mago de Terra', emoji: '🪨', type: 'magic', rarity: 'comum', rarityName: 'Comum',
        selectionPool: 'common', desc: 'Especialista em magia elemental de terra.',
        uniqueAbilities: [], activeAbilities: [], uniquePassives: [], passives: [], powers: [], disadvantages: [],
        bonus: {}, manaMult: 1, color: 0xc9a227,
        basicAttack: { id: 'mago_terra_ataque_basico', name: 'Ataque Básico', emoji: '🪨', type: 'magic', power: 1, mana: 0 }, classGear: null
    },
    mago_vento: {
        id: 'mago_vento', name: 'Mago de Vento', emoji: '🌪️', type: 'magic', rarity: 'comum', rarityName: 'Comum',
        selectionPool: 'common', desc: 'Especialista em magia elemental de vento.',
        uniqueAbilities: [], activeAbilities: [], uniquePassives: [], passives: [], powers: [], disadvantages: [],
        bonus: {}, manaMult: 1, color: 0xc9a227,
        basicAttack: { id: 'mago_vento_ataque_basico', name: 'Ataque Básico', emoji: '🌪️', type: 'magic', power: 1, mana: 0 }, classGear: null
    },
    mago_agua: {
        id: 'mago_agua', name: 'Mago de Água', emoji: '💧', type: 'magic', rarity: 'comum', rarityName: 'Comum',
        selectionPool: 'common', desc: 'Especialista em magia elemental de água.',
        uniqueAbilities: [], activeAbilities: [], uniquePassives: [], passives: [], powers: [], disadvantages: [],
        bonus: {}, manaMult: 1, color: 0xc9a227,
        basicAttack: { id: 'mago_agua_ataque_basico', name: 'Ataque Básico', emoji: '💧', type: 'magic', power: 1, mana: 0 }, classGear: null
    },
    mago_natureza: {
        id: 'mago_natureza', name: 'Mago da Natureza', emoji: '🌿', type: 'magic', rarity: 'comum', rarityName: 'Comum',
        selectionPool: 'common', desc: 'Especialista em magia ligada à natureza.',
        uniqueAbilities: [], activeAbilities: [], uniquePassives: [], passives: [], powers: [], disadvantages: [],
        bonus: {}, manaMult: 1, color: 0xc9a227,
        basicAttack: { id: 'mago_natureza_ataque_basico', name: 'Ataque Básico', emoji: '🌿', type: 'magic', power: 1, mana: 0 }, classGear: null
    },
    mago_trovao: {
        id: 'mago_trovao', name: 'Mago de Trovão', emoji: '⚡', type: 'magic', rarity: 'comum', rarityName: 'Comum',
        selectionPool: 'common', desc: 'Especialista em magia elemental de trovão.',
        uniqueAbilities: [], activeAbilities: [], uniquePassives: [], passives: [], powers: [], disadvantages: [],
        bonus: {}, manaMult: 1, color: 0xc9a227,
        basicAttack: { id: 'mago_trovao_ataque_basico', name: 'Ataque Básico', emoji: '⚡', type: 'magic', power: 1, mana: 0 }, classGear: null
    },
    mago_luz: {
        id: 'mago_luz', name: 'Mago de Luz', emoji: '☀️', type: 'magic', rarity: 'comum', rarityName: 'Comum',
        selectionPool: 'common', desc: 'Especialista em magia de luz.',
        uniqueAbilities: [], activeAbilities: [], uniquePassives: [], passives: [], powers: [], disadvantages: [],
        bonus: {}, manaMult: 1, color: 0xc9a227,
        basicAttack: { id: 'mago_luz_ataque_basico', name: 'Ataque Básico', emoji: '☀️', type: 'magic', power: 1, mana: 0 }, classGear: null
    },
    mago_sombra: {
        id: 'mago_sombra', name: 'Mago de Sombra', emoji: '🌑', type: 'magic', rarity: 'comum', rarityName: 'Comum',
        selectionPool: 'common', desc: 'Especialista em magia de sombra.',
        uniqueAbilities: [], activeAbilities: [], uniquePassives: [], passives: [], powers: [], disadvantages: [],
        bonus: {}, manaMult: 1, color: 0xc9a227,
        basicAttack: { id: 'mago_sombra_ataque_basico', name: 'Ataque Básico', emoji: '🌑', type: 'magic', power: 1, mana: 0 }, classGear: null
    },
    arqueiro: {
        id: 'arqueiro', name: 'Arqueiro', emoji: '🏹', type: 'ranged', rarity: 'comum', rarityName: 'Comum',
        selectionPool: 'common', desc: 'Combate à distância com arco.',
        uniqueAbilities: [], activeAbilities: [], uniquePassives: [], passives: [], powers: [], disadvantages: [],
        bonus: {}, manaMult: 1, color: 0xc9a227,
        basicAttack: { id: 'arqueiro_ataque_basico', name: 'Ataque Básico', emoji: '🏹', type: 'ranged', power: 1, mana: 0 }, classGear: null
    },
    ladino: {
        id: 'ladino', name: 'Ladino', emoji: '🗝️', type: 'melee', rarity: 'comum', rarityName: 'Comum',
        selectionPool: 'common', desc: 'Mobilidade, furtividade e ataques oportunos.',
        uniqueAbilities: [], activeAbilities: [], uniquePassives: [], passives: [], powers: [], disadvantages: [],
        bonus: {}, manaMult: 1, color: 0xc9a227,
        basicAttack: { id: 'ladino_ataque_basico', name: 'Ataque Básico', emoji: '🗝️', type: 'melee', power: 1, mana: 0 }, classGear: null
    },
    guardiao: {
        id: 'guardiao', name: 'Guardião', emoji: '🛡️', type: 'tank', rarity: 'comum', rarityName: 'Comum',
        selectionPool: 'common', desc: 'Defesa e proteção.',
        uniqueAbilities: [], activeAbilities: [], uniquePassives: [], passives: [], powers: [], disadvantages: [],
        bonus: {}, manaMult: 1, color: 0xc9a227,
        basicAttack: { id: 'guardiao_ataque_basico', name: 'Ataque Básico', emoji: '🛡️', type: 'tank', power: 1, mana: 0 }, classGear: null
    },
    barbaro: {
        id: 'barbaro', name: 'Bárbaro', emoji: '🪓', type: 'melee', rarity: 'comum', rarityName: 'Comum',
        selectionPool: 'common', desc: 'Força bruta e combate agressivo.',
        uniqueAbilities: [], activeAbilities: [], uniquePassives: [], passives: [], powers: [], disadvantages: [],
        bonus: {}, manaMult: 1, color: 0xc9a227,
        basicAttack: { id: 'barbaro_ataque_basico', name: 'Ataque Básico', emoji: '🪓', type: 'melee', power: 1, mana: 0 }, classGear: null
    },
    lutador: {
        id: 'lutador', name: 'Lutador', emoji: '🥊', type: 'melee', rarity: 'comum', rarityName: 'Comum',
        selectionPool: 'common', desc: 'Combate físico baseado em técnica e impacto.',
        uniqueAbilities: [], activeAbilities: [], uniquePassives: [], passives: [], powers: [], disadvantages: [],
        bonus: {}, manaMult: 1, color: 0xc9a227,
        basicAttack: { id: 'lutador_ataque_basico', name: 'Ataque Básico', emoji: '🥊', type: 'melee', power: 1, mana: 0 }, classGear: null
    },
    ferreiro: {
        id: 'ferreiro', name: 'Ferreiro', emoji: '🔨', type: 'support', rarity: 'comum', rarityName: 'Comum',
        selectionPool: 'common', desc: 'Especialista em forja e equipamentos.',
        uniqueAbilities: [], activeAbilities: [], uniquePassives: [], passives: [], powers: [], disadvantages: [],
        bonus: {}, manaMult: 1, color: 0xc9a227,
        basicAttack: { id: 'ferreiro_ataque_basico', name: 'Ataque Básico', emoji: '🔨', type: 'support', power: 1, mana: 0 }, classGear: null
    },
    cacador: {
        id: 'cacador', name: 'Caçador', emoji: '🐺', type: 'ranged', rarity: 'comum', rarityName: 'Comum',
        selectionPool: 'common', desc: 'Rastreamento e combate contra alvos.',
        uniqueAbilities: [], activeAbilities: [], uniquePassives: [], passives: [], powers: [], disadvantages: [],
        bonus: {}, manaMult: 1, color: 0xc9a227,
        basicAttack: { id: 'cacador_ataque_basico', name: 'Ataque Básico', emoji: '🐺', type: 'ranged', power: 1, mana: 0 }, classGear: null
    },
    espadachim_sombrio: {
        id: 'espadachim_sombrio', name: 'Espadachim Sombrio', emoji: '🩸', type: 'melee', rarity: 'comum', rarityName: 'Comum',
        selectionPool: 'common', desc: 'Espadachim que utiliza energia sombria.',
        uniqueAbilities: [], activeAbilities: [], uniquePassives: [], passives: [], powers: [], disadvantages: [],
        bonus: {}, manaMult: 1, color: 0xc9a227,
        basicAttack: { id: 'espadachim_sombrio_ataque_basico', name: 'Ataque Básico', emoji: '🩸', type: 'melee', power: 1, mana: 0 }, classGear: null
    },
    espadachim_magico: {
        id: 'espadachim_magico', name: 'Espadachim Mágico', emoji: '✨', type: 'hybrid', rarity: 'comum', rarityName: 'Comum',
        selectionPool: 'common', desc: 'Combinação de espada e magia.',
        uniqueAbilities: [], activeAbilities: [], uniquePassives: [], passives: [], powers: [], disadvantages: [],
        bonus: {}, manaMult: 1, color: 0xc9a227,
        basicAttack: { id: 'espadachim_magico_ataque_basico', name: 'Ataque Básico', emoji: '✨', type: 'hybrid', power: 1, mana: 0 }, classGear: null
    },
    espadachim_flamejante: {
        id: 'espadachim_flamejante', name: 'Espadachim Flamejante', emoji: '🌋', type: 'melee', rarity: 'comum', rarityName: 'Comum',
        selectionPool: 'common', desc: 'Espadachim especializado em energia flamejante.',
        uniqueAbilities: [], activeAbilities: [], uniquePassives: [], passives: [], powers: [], disadvantages: [],
        bonus: {}, manaMult: 1, color: 0xc9a227,
        basicAttack: { id: 'espadachim_flamejante_ataque_basico', name: 'Ataque Básico', emoji: '🌋', type: 'melee', power: 1, mana: 0 }, classGear: null
    },
    espadachim_glacial: {
        id: 'espadachim_glacial', name: 'Espadachim Glacial', emoji: '❄️', type: 'melee', rarity: 'comum', rarityName: 'Comum',
        selectionPool: 'common', desc: 'Espadachim especializado em energia glacial.',
        uniqueAbilities: [], activeAbilities: [], uniquePassives: [], passives: [], powers: [], disadvantages: [],
        bonus: {}, manaMult: 1, color: 0xc9a227,
        basicAttack: { id: 'espadachim_glacial_ataque_basico', name: 'Ataque Básico', emoji: '❄️', type: 'melee', power: 1, mana: 0 }, classGear: null
    },
    espadachim_rochoso: {
        id: 'espadachim_rochoso', name: 'Espadachim Rochoso', emoji: '🗿', type: 'melee', rarity: 'comum', rarityName: 'Comum',
        selectionPool: 'common', desc: 'Espadachim especializado em poder terrestre.',
        uniqueAbilities: [], activeAbilities: [], uniquePassives: [], passives: [], powers: [], disadvantages: [],
        bonus: {}, manaMult: 1, color: 0xc9a227,
        basicAttack: { id: 'espadachim_rochoso_ataque_basico', name: 'Ataque Básico', emoji: '🗿', type: 'melee', power: 1, mana: 0 }, classGear: null
    },
    espadachim_vendaval: {
        id: 'espadachim_vendaval', name: 'Espadachim do Vendaval', emoji: '🌬️', type: 'melee', rarity: 'comum', rarityName: 'Comum',
        selectionPool: 'common', desc: 'Espadachim especializado em velocidade e vento.',
        uniqueAbilities: [], activeAbilities: [], uniquePassives: [], passives: [], powers: [], disadvantages: [],
        bonus: {}, manaMult: 1, color: 0xc9a227,
        basicAttack: { id: 'espadachim_vendaval_ataque_basico', name: 'Ataque Básico', emoji: '🌬️', type: 'melee', power: 1, mana: 0 }, classGear: null
    },
    espadachim_trovao: {
        id: 'espadachim_trovao', name: 'Espadachim do Trovão', emoji: '🌩️', type: 'melee', rarity: 'comum', rarityName: 'Comum',
        selectionPool: 'common', desc: 'Espadachim especializado em energia elétrica.',
        uniqueAbilities: [], activeAbilities: [], uniquePassives: [], passives: [], powers: [], disadvantages: [],
        bonus: {}, manaMult: 1, color: 0xc9a227,
        basicAttack: { id: 'espadachim_trovao_ataque_basico', name: 'Ataque Básico', emoji: '🌩️', type: 'melee', power: 1, mana: 0 }, classGear: null
    },
    espadachim_aquatico: {
        id: 'espadachim_aquatico', name: 'Espadachim Aquático', emoji: '🫧', type: 'melee', rarity: 'comum', rarityName: 'Comum',
        selectionPool: 'common', desc: 'Espadachim especializado em energia aquática.',
        uniqueAbilities: [], activeAbilities: [], uniquePassives: [], passives: [], powers: [], disadvantages: [],
        bonus: {}, manaMult: 1, color: 0xc9a227,
        basicAttack: { id: 'espadachim_aquatico_ataque_basico', name: 'Ataque Básico', emoji: '🫧', type: 'melee', power: 1, mana: 0 }, classGear: null
    },
    espadachim_natural: {
        id: 'espadachim_natural', name: 'Espadachim Natural', emoji: '🍃', type: 'melee', rarity: 'comum', rarityName: 'Comum',
        selectionPool: 'common', desc: 'Espadachim ligado à força da natureza.',
        uniqueAbilities: [], activeAbilities: [], uniquePassives: [], passives: [], powers: [], disadvantages: [],
        bonus: {}, manaMult: 1, color: 0xc9a227,
        basicAttack: { id: 'espadachim_natural_ataque_basico', name: 'Ataque Básico', emoji: '🍃', type: 'melee', power: 1, mana: 0 }, classGear: null
    },
    espadachim_luminoso: {
        id: 'espadachim_luminoso', name: 'Espadachim Luminoso', emoji: '🌅', type: 'melee', rarity: 'comum', rarityName: 'Comum',
        selectionPool: 'common', desc: 'Espadachim especializado em energia luminosa.',
        uniqueAbilities: [], activeAbilities: [], uniquePassives: [], passives: [], powers: [], disadvantages: [],
        bonus: {}, manaMult: 1, color: 0xc9a227,
        basicAttack: { id: 'espadachim_luminoso_ataque_basico', name: 'Ataque Básico', emoji: '🌅', type: 'melee', power: 1, mana: 0 }, classGear: null
    },
    espadachim_sombrio: {
        id: 'espadachim_sombrio', name: 'Espadachim Sombrio', emoji: '🌘', type: 'melee', rarity: 'comum', rarityName: 'Comum',
        selectionPool: 'common', desc: 'Espadachim especializado em sombras.',
        uniqueAbilities: [], activeAbilities: [], uniquePassives: [], passives: [], powers: [], disadvantages: [],
        bonus: {}, manaMult: 1, color: 0xc9a227,
        basicAttack: { id: 'espadachim_sombrio_ataque_basico', name: 'Ataque Básico', emoji: '🌘', type: 'melee', power: 1, mana: 0 }, classGear: null
    },
    alquimista: {
        id: 'alquimista', name: 'Alquimista', emoji: '🧪', type: 'support', rarity: 'comum', rarityName: 'Comum',
        selectionPool: 'common', desc: 'Especialista em alquimia e preparação de recursos.',
        uniqueAbilities: [], activeAbilities: [], uniquePassives: [], passives: [], powers: [], disadvantages: [],
        bonus: {}, manaMult: 1, color: 0xc9a227,
        basicAttack: { id: 'alquimista_ataque_basico', name: 'Ataque Básico', emoji: '🧪', type: 'support', power: 1, mana: 0 }, classGear: null
    }
};

function loadCustom() {
    try { return store.load('custom_classes.json', {}) || {}; } catch (_) { return {}; }
}
function allClasses() { return { ...BASE_CLASSES, ...COMMON_CLASSES, ...loadCustom() }; }
function getClass(id) {
    const all = allClasses();
    return all[id] || all[String(id || '').toLowerCase()] || null;
}
function resolveClassId(classId) {
    if (!classId) return null;
    const id = String(classId).trim();
    const direct = getClass(id);
    if (direct) return direct.id || id;
    const lower = id.toLowerCase();
    const all = allClasses();
    if (all[lower]) return all[lower].id || lower;
    for (const c of Object.values(all)) {
        if (c && String(c.name || '').toLowerCase() === lower) return c.id;
    }
    return id;
}
function canClaim(classId, userId, playersMap) {
    const cls = getClass(resolveClassId(classId) || classId);
    if (!cls) return { ok: false, reason: 'Classe inválida.' };
    if (!(cls.exclusive || cls.maxHolders === 1 || cls.boundUserId)) return { ok: true };
    const bound = cls.boundUserId ? String(cls.boundUserId) : null;
    if (bound && String(userId) !== bound) return { ok: false, reason: 'Classe exclusiva vinculada a outro usuário.' };
    if (playersMap && typeof playersMap === 'object') {
        const holders = Object.entries(playersMap).filter(
            ([uid, p]) => p && String(p.classId) === String(cls.id) && String(uid) !== String(userId)
        );
        const max = cls.maxHolders || (cls.exclusive ? 1 : 0);
        if (max && holders.length >= max) return { ok: false, reason: 'Limite de titulares desta classe atingido.' };
    }
    return { ok: true };
}
function listSelectableClasses() {
    return Object.values(allClasses()).filter((c) => c && c.id && c.selectionPool === 'common' && !(c.exclusive || c.maxHolders === 1));
}
function listClassesForUser(userId) {
    const uid = String(userId || '');
    return Object.values(allClasses()).filter((c) => {
        if (!c || !c.id) return false;
        if (c.exclusive || c.maxHolders === 1 || c.boundUserId) return String(c.boundUserId || '') === uid;
        return true;
    });
}
function enforceExclusiveOwners(playersMap) {
    if (!playersMap || typeof playersMap !== 'object') return;
    for (const [uid, p] of Object.entries(playersMap)) {
        if (!p || !p.classId) continue;
        const cls = getClass(p.classId);
        if (!cls || !(cls.exclusive || cls.maxHolders === 1 || cls.boundUserId)) continue;
        if (cls.boundUserId && String(cls.boundUserId) !== String(uid)) p.classId = 'guerreiro';
    }
}

module.exports = {
    BASE_CLASSES, COMMON_CLASSES, allClasses, getClass, resolveClassId, canClaim,
    listSelectableClasses, listClassesForUser, enforceExclusiveOwners, loadCustom
};
