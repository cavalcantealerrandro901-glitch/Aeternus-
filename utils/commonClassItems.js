/* Catálogo dos 90 itens exclusivos das classes Comuns. */
module.exports = [
    {
        "id": "armadura_armadura_do_primeiro_corte",
        "name": "Armadura do Primeiro Corte",
        "emoji": "🛡️",
        "category": "armadura",
        "rarity": "comum",
        "classId": "guerreiro",
        "exclusive": true,
        "effects": {
            "defesa": 8,
            "vida": 35
        },
        "uniqueAbility": {
            "name": "Guarda do Primeiro Corte",
            "type": "passiva",
            "description": "Ao iniciar a batalha, recebe +5% de Defesa por 3 turnos."
        },
        "desc": "Item exclusivo da classe guerreiro."
    },
    {
        "id": "acessorio_medalhao_do_duelista",
        "name": "Medalhão do Duelista",
        "emoji": "💍",
        "category": "acessorio",
        "rarity": "comum",
        "classId": "guerreiro",
        "exclusive": true,
        "effects": {
            "agilidade": 4,
            "precisao": 3
        },
        "uniqueAbility": {
            "name": "Medalha do Duelista",
            "type": "passiva",
            "description": "Após acertar um ataque, recebe +5% de precisão no próximo."
        },
        "desc": "Item exclusivo da classe guerreiro."
    },
    {
        "id": "arma_lamina_do_primeiro_corte",
        "name": "Lâmina do Primeiro Corte",
        "emoji": "⚔️",
        "category": "arma",
        "rarity": "comum",
        "classId": "guerreiro",
        "exclusive": true,
        "effects": {
            "forca": 10,
            "precisao": 4
        },
        "uniqueAbility": {
            "name": "Corte Preciso",
            "type": "passiva",
            "description": "O primeiro ataque acertado causa +10% de dano."
        },
        "desc": "Item exclusivo da classe guerreiro."
    },
    {
        "id": "armadura_manto_do_arcano",
        "name": "Manto do Arcano",
        "emoji": "🛡️",
        "category": "armadura",
        "rarity": "comum",
        "classId": "mago",
        "exclusive": true,
        "effects": {
            "defesa": 5,
            "inteligencia": 7
        },
        "uniqueAbility": {
            "name": "Barreira Arcana",
            "type": "passiva",
            "description": "Reduz em 5% o primeiro dano mágico recebido."
        },
        "desc": "Item exclusivo da classe mago."
    },
    {
        "id": "acessorio_anel_do_conhecimento",
        "name": "Anel do Conhecimento",
        "emoji": "💍",
        "category": "acessorio",
        "rarity": "comum",
        "classId": "mago",
        "exclusive": true,
        "effects": {
            "inteligencia": 5,
            "sorte": 2
        },
        "uniqueAbility": {
            "name": "Olhar do Erudito",
            "type": "passiva",
            "description": "Recebe +5% de chance de acerto com habilidades mágicas."
        },
        "desc": "Item exclusivo da classe mago."
    },
    {
        "id": "arma_grimorio_arcano",
        "name": "Grimório Arcano",
        "emoji": "🔮",
        "category": "arma",
        "rarity": "comum",
        "classId": "mago",
        "exclusive": true,
        "effects": {
            "inteligencia": 11,
            "agilidade": 2
        },
        "uniqueAbility": {
            "name": "Explosão Arcana",
            "type": "passiva",
            "description": "A primeira habilidade mágica usada causa +10% de dano."
        },
        "desc": "Item exclusivo da classe mago."
    },
    {
        "id": "armadura_manto_da_chama",
        "name": "Manto da Chama",
        "emoji": "🛡️",
        "category": "armadura",
        "rarity": "comum",
        "classId": "mago_fogo",
        "exclusive": true,
        "effects": {
            "defesa": 5,
            "inteligencia": 7
        },
        "uniqueAbility": {
            "name": "Manto Incandescente",
            "type": "passiva",
            "description": "Reduz em 5% o dano de fogo recebido."
        },
        "desc": "Item exclusivo da classe mago_fogo."
    },
    {
        "id": "acessorio_coracao_incandescente",
        "name": "Coração Incandescente",
        "emoji": "💍",
        "category": "acessorio",
        "rarity": "comum",
        "classId": "mago_fogo",
        "exclusive": true,
        "effects": {
            "inteligencia": 5,
            "vida": 20
        },
        "uniqueAbility": {
            "name": "Pulso da Chama",
            "type": "passiva",
            "description": "Ataques de fogo recebem +5% de dano."
        },
        "desc": "Item exclusivo da classe mago_fogo."
    },
    {
        "id": "arma_cajado_da_chama_eterna",
        "name": "Cajado da Chama Eterna",
        "emoji": "🔥",
        "category": "arma",
        "rarity": "comum",
        "classId": "mago_fogo",
        "exclusive": true,
        "effects": {
            "inteligencia": 12,
            "precisao": 2
        },
        "uniqueAbility": {
            "name": "Inferno Crescente",
            "type": "passiva",
            "description": "Ataques consecutivos de fogo recebem +3% de dano, até 3 vezes."
        },
        "desc": "Item exclusivo da classe mago_fogo."
    },
    {
        "id": "armadura_manto_do_inverno",
        "name": "Manto do Inverno",
        "emoji": "🛡️",
        "category": "armadura",
        "rarity": "comum",
        "classId": "mago_gelo",
        "exclusive": true,
        "effects": {
            "defesa": 7,
            "inteligencia": 6
        },
        "uniqueAbility": {
            "name": "Casulo de Geada",
            "type": "passiva",
            "description": "Reduz em 5% o dano de gelo recebido."
        },
        "desc": "Item exclusivo da classe mago_gelo."
    },
    {
        "id": "acessorio_cristal_congelado",
        "name": "Cristal Congelado",
        "emoji": "💍",
        "category": "acessorio",
        "rarity": "comum",
        "classId": "mago_gelo",
        "exclusive": true,
        "effects": {
            "inteligencia": 4,
            "resistencia": 4
        },
        "uniqueAbility": {
            "name": "Cristal da Frigidez",
            "type": "passiva",
            "description": "Ataques de gelo recebem +5% de precisão."
        },
        "desc": "Item exclusivo da classe mago_gelo."
    },
    {
        "id": "arma_cajado_do_gelo_eterno",
        "name": "Cajado do Gelo Eterno",
        "emoji": "🧊",
        "category": "arma",
        "rarity": "comum",
        "classId": "mago_gelo",
        "exclusive": true,
        "effects": {
            "inteligencia": 11,
            "precisao": 3
        },
        "uniqueAbility": {
            "name": "Lança Invernal",
            "type": "passiva",
            "description": "O primeiro ataque de gelo recebe +10% de precisão."
        },
        "desc": "Item exclusivo da classe mago_gelo."
    },
    {
        "id": "armadura_manto_do_monolito",
        "name": "Manto do Monólito",
        "emoji": "🛡️",
        "category": "armadura",
        "rarity": "comum",
        "classId": "mago_terra",
        "exclusive": true,
        "effects": {
            "defesa": 9,
            "inteligencia": 5
        },
        "uniqueAbility": {
            "name": "Fortaleza Mineral",
            "type": "passiva",
            "description": "Reduz em 7% o dano físico recebido."
        },
        "desc": "Item exclusivo da classe mago_terra."
    },
    {
        "id": "acessorio_nucleo_de_pedra",
        "name": "Núcleo de Pedra",
        "emoji": "💍",
        "category": "acessorio",
        "rarity": "comum",
        "classId": "mago_terra",
        "exclusive": true,
        "effects": {
            "resistencia": 5,
            "vida": 25
        },
        "uniqueAbility": {
            "name": "Núcleo Geológico",
            "type": "passiva",
            "description": "Recebe +5% de Resistência."
        },
        "desc": "Item exclusivo da classe mago_terra."
    },
    {
        "id": "arma_cajado_da_terra_profunda",
        "name": "Cajado da Terra Profunda",
        "emoji": "🪨",
        "category": "arma",
        "rarity": "comum",
        "classId": "mago_terra",
        "exclusive": true,
        "effects": {
            "inteligencia": 10,
            "defesa": 4
        },
        "uniqueAbility": {
            "name": "Impacto Tectônico",
            "type": "passiva",
            "description": "Ataques físicos recebem +7% de dano contra alvos com alta Defesa."
        },
        "desc": "Item exclusivo da classe mago_terra."
    },
    {
        "id": "armadura_manto_do_vendaval",
        "name": "Manto do Vendaval",
        "emoji": "🛡️",
        "category": "armadura",
        "rarity": "comum",
        "classId": "mago_vento",
        "exclusive": true,
        "effects": {
            "defesa": 5,
            "agilidade": 6
        },
        "uniqueAbility": {
            "name": "Leveza do Vendaval",
            "type": "passiva",
            "description": "Recebe +5% de evasão."
        },
        "desc": "Item exclusivo da classe mago_vento."
    },
    {
        "id": "acessorio_anel_da_corrente_celeste",
        "name": "Anel da Corrente Celeste",
        "emoji": "💍",
        "category": "acessorio",
        "rarity": "comum",
        "classId": "mago_vento",
        "exclusive": true,
        "effects": {
            "agilidade": 5,
            "precisao": 3
        },
        "uniqueAbility": {
            "name": "Anel da Brisa",
            "type": "passiva",
            "description": "Recebe +5% de Agilidade durante a batalha."
        },
        "desc": "Item exclusivo da classe mago_vento."
    },
    {
        "id": "arma_cajado_dos_ventos",
        "name": "Cajado dos Ventos",
        "emoji": "🌪️",
        "category": "arma",
        "rarity": "comum",
        "classId": "mago_vento",
        "exclusive": true,
        "effects": {
            "inteligencia": 10,
            "agilidade": 4
        },
        "uniqueAbility": {
            "name": "Lâmina do Vento",
            "type": "passiva",
            "description": "Ataques físicos recebem +5% de evasão após acertar."
        },
        "desc": "Item exclusivo da classe mago_vento."
    },
    {
        "id": "armadura_manto_das_mares",
        "name": "Manto das Marés",
        "emoji": "🛡️",
        "category": "armadura",
        "rarity": "comum",
        "classId": "mago_agua",
        "exclusive": true,
        "effects": {
            "defesa": 6,
            "vida": 25
        },
        "uniqueAbility": {
            "name": "Véu das Marés",
            "type": "passiva",
            "description": "Reduz em 5% o dano recebido no primeiro ataque."
        },
        "desc": "Item exclusivo da classe mago_agua."
    },
    {
        "id": "acessorio_perola_abissal",
        "name": "Pérola Abissal",
        "emoji": "💍",
        "category": "acessorio",
        "rarity": "comum",
        "classId": "mago_agua",
        "exclusive": true,
        "effects": {
            "inteligencia": 5,
            "resistencia": 3
        },
        "uniqueAbility": {
            "name": "Pérola Regeneradora",
            "type": "passiva",
            "description": "Recupera 2% da Vida máxima após uma vitória."
        },
        "desc": "Item exclusivo da classe mago_agua."
    },
    {
        "id": "arma_cajado_da_mare",
        "name": "Cajado da Maré",
        "emoji": "💧",
        "category": "arma",
        "rarity": "comum",
        "classId": "mago_agua",
        "exclusive": true,
        "effects": {
            "inteligencia": 11,
            "vida": 15
        },
        "uniqueAbility": {
            "name": "Onda Profunda",
            "type": "passiva",
            "description": "O primeiro ataque causa +8% de dano e restaura 2% da Vida."
        },
        "desc": "Item exclusivo da classe mago_agua."
    },
    {
        "id": "armadura_manto_da_floresta",
        "name": "Manto da Floresta",
        "emoji": "🛡️",
        "category": "armadura",
        "rarity": "comum",
        "classId": "mago_natureza",
        "exclusive": true,
        "effects": {
            "defesa": 7,
            "vida": 30
        },
        "uniqueAbility": {
            "name": "Raízes Protetoras",
            "type": "passiva",
            "description": "Recebe +5% de Vida máxima."
        },
        "desc": "Item exclusivo da classe mago_natureza."
    },
    {
        "id": "acessorio_semente_ancestral",
        "name": "Semente Ancestral",
        "emoji": "💍",
        "category": "acessorio",
        "rarity": "comum",
        "classId": "mago_natureza",
        "exclusive": true,
        "effects": {
            "vida": 25,
            "sorte": 3
        },
        "uniqueAbility": {
            "name": "Semente da Vitalidade",
            "type": "passiva",
            "description": "Recebe +3% de Vida máxima."
        },
        "desc": "Item exclusivo da classe mago_natureza."
    },
    {
        "id": "arma_cajado_da_natureza_viva",
        "name": "Cajado da Natureza Viva",
        "emoji": "🌿",
        "category": "arma",
        "rarity": "comum",
        "classId": "mago_natureza",
        "exclusive": true,
        "effects": {
            "inteligencia": 10,
            "vida": 20
        },
        "uniqueAbility": {
            "name": "Raiz Devastadora",
            "type": "passiva",
            "description": "Ataques têm +5% de dano contra monstros."
        },
        "desc": "Item exclusivo da classe mago_natureza."
    },
    {
        "id": "armadura_manto_da_tempestade",
        "name": "Manto da Tempestade",
        "emoji": "🛡️",
        "category": "armadura",
        "rarity": "comum",
        "classId": "mago_trovao",
        "exclusive": true,
        "effects": {
            "defesa": 5,
            "agilidade": 5
        },
        "uniqueAbility": {
            "name": "Couraça Tempestuosa",
            "type": "passiva",
            "description": "Reduz em 5% o dano de trovão recebido."
        },
        "desc": "Item exclusivo da classe mago_trovao."
    },
    {
        "id": "acessorio_nucleo_do_trovao",
        "name": "Núcleo do Trovão",
        "emoji": "💍",
        "category": "acessorio",
        "rarity": "comum",
        "classId": "mago_trovao",
        "exclusive": true,
        "effects": {
            "agilidade": 4,
            "inteligencia": 4
        },
        "uniqueAbility": {
            "name": "Núcleo Condutor",
            "type": "passiva",
            "description": "Ataques de trovão recebem +5% de precisão."
        },
        "desc": "Item exclusivo da classe mago_trovao."
    },
    {
        "id": "arma_cajado_do_relampago",
        "name": "Cajado do Relâmpago",
        "emoji": "⚡",
        "category": "arma",
        "rarity": "comum",
        "classId": "mago_trovao",
        "exclusive": true,
        "effects": {
            "inteligencia": 11,
            "agilidade": 3
        },
        "uniqueAbility": {
            "name": "Raio Descendente",
            "type": "passiva",
            "description": "O primeiro ataque de trovão causa +12% de dano."
        },
        "desc": "Item exclusivo da classe mago_trovao."
    },
    {
        "id": "armadura_manto_solar",
        "name": "Manto Solar",
        "emoji": "🛡️",
        "category": "armadura",
        "rarity": "comum",
        "classId": "mago_luz",
        "exclusive": true,
        "effects": {
            "defesa": 6,
            "inteligencia": 7
        },
        "uniqueAbility": {
            "name": "Manto Radiante",
            "type": "passiva",
            "description": "Recebe +5% de resistência a efeitos negativos."
        },
        "desc": "Item exclusivo da classe mago_luz."
    },
    {
        "id": "acessorio_fragmento_solar",
        "name": "Fragmento Solar",
        "emoji": "💍",
        "category": "acessorio",
        "rarity": "comum",
        "classId": "mago_luz",
        "exclusive": true,
        "effects": {
            "inteligencia": 4,
            "vida": 25
        },
        "uniqueAbility": {
            "name": "Fragmento da Aurora",
            "type": "passiva",
            "description": "Recebe +5% de precisão."
        },
        "desc": "Item exclusivo da classe mago_luz."
    },
    {
        "id": "arma_cajado_do_primeiro_sol",
        "name": "Cajado do Primeiro Sol",
        "emoji": "☀️",
        "category": "arma",
        "rarity": "comum",
        "classId": "mago_luz",
        "exclusive": true,
        "effects": {
            "inteligencia": 12,
            "precisao": 2
        },
        "uniqueAbility": {
            "name": "Raio Solar",
            "type": "passiva",
            "description": "O primeiro ataque causa +10% de dano."
        },
        "desc": "Item exclusivo da classe mago_luz."
    },
    {
        "id": "armadura_manto_das_trevas",
        "name": "Manto das Trevas",
        "emoji": "🛡️",
        "category": "armadura",
        "rarity": "comum",
        "classId": "mago_sombra",
        "exclusive": true,
        "effects": {
            "defesa": 5,
            "agilidade": 5
        },
        "uniqueAbility": {
            "name": "Manto do Vazio",
            "type": "passiva",
            "description": "Reduz em 5% o dano mágico recebido."
        },
        "desc": "Item exclusivo da classe mago_sombra."
    },
    {
        "id": "acessorio_nucleo_sombrio",
        "name": "Núcleo Sombrio",
        "emoji": "💍",
        "category": "acessorio",
        "rarity": "comum",
        "classId": "mago_sombra",
        "exclusive": true,
        "effects": {
            "agilidade": 4,
            "sorte": 3
        },
        "uniqueAbility": {
            "name": "Núcleo do Crepúsculo",
            "type": "passiva",
            "description": "Recebe +5% de evasão."
        },
        "desc": "Item exclusivo da classe mago_sombra."
    },
    {
        "id": "arma_cajado_do_eclipse",
        "name": "Cajado do Eclipse",
        "emoji": "🌑",
        "category": "arma",
        "rarity": "comum",
        "classId": "mago_sombra",
        "exclusive": true,
        "effects": {
            "inteligencia": 10,
            "agilidade": 4
        },
        "uniqueAbility": {
            "name": "Corte do Eclipse",
            "type": "passiva",
            "description": "Ataques contra alvos acima de 75% da Vida recebem +8% de dano."
        },
        "desc": "Item exclusivo da classe mago_sombra."
    },
    {
        "id": "armadura_armadura_do_rastreador",
        "name": "Armadura do Rastreador",
        "emoji": "🛡️",
        "category": "armadura",
        "rarity": "comum",
        "classId": "arqueiro",
        "exclusive": true,
        "effects": {
            "defesa": 6,
            "agilidade": 6
        },
        "uniqueAbility": {
            "name": "Couro do Rastreador",
            "type": "passiva",
            "description": "Recebe +5% de Defesa contra ataques à distância."
        },
        "desc": "Item exclusivo da classe arqueiro."
    },
    {
        "id": "acessorio_olho_do_cacador",
        "name": "Olho do Caçador",
        "emoji": "💍",
        "category": "acessorio",
        "rarity": "comum",
        "classId": "arqueiro",
        "exclusive": true,
        "effects": {
            "precisao": 6,
            "sorte": 2
        },
        "uniqueAbility": {
            "name": "Olho de Precisão",
            "type": "passiva",
            "description": "Recebe +7% de precisão em ataques à distância."
        },
        "desc": "Item exclusivo da classe arqueiro."
    },
    {
        "id": "arma_arco_do_olho_preciso",
        "name": "Arco do Olho Preciso",
        "emoji": "🏹",
        "category": "arma",
        "rarity": "comum",
        "classId": "arqueiro",
        "exclusive": true,
        "effects": {
            "precisao": 7,
            "agilidade": 5
        },
        "uniqueAbility": {
            "name": "Disparo Perfeito",
            "type": "passiva",
            "description": "O primeiro ataque à distância tem +10% de precisão."
        },
        "desc": "Item exclusivo da classe arqueiro."
    },
    {
        "id": "armadura_armadura_do_silencio",
        "name": "Armadura do Silêncio",
        "emoji": "🛡️",
        "category": "armadura",
        "rarity": "comum",
        "classId": "ladino",
        "exclusive": true,
        "effects": {
            "defesa": 5,
            "agilidade": 8
        },
        "uniqueAbility": {
            "name": "Manto do Sussurro",
            "type": "passiva",
            "description": "O primeiro ataque recebido tem 5% de chance de errar."
        },
        "desc": "Item exclusivo da classe ladino."
    },
    {
        "id": "acessorio_medalhao_das_sombras",
        "name": "Medalhão das Sombras",
        "emoji": "💍",
        "category": "acessorio",
        "rarity": "comum",
        "classId": "ladino",
        "exclusive": true,
        "effects": {
            "agilidade": 4,
            "sorte": 4
        },
        "uniqueAbility": {
            "name": "Medalhão Fantasma",
            "type": "passiva",
            "description": "Recebe +5% de evasão no primeiro turno."
        },
        "desc": "Item exclusivo da classe ladino."
    },
    {
        "id": "arma_adaga_do_silencio",
        "name": "Adaga do Silêncio",
        "emoji": "🗝️",
        "category": "arma",
        "rarity": "comum",
        "classId": "ladino",
        "exclusive": true,
        "effects": {
            "forca": 8,
            "agilidade": 7
        },
        "uniqueAbility": {
            "name": "Golpe Silencioso",
            "type": "passiva",
            "description": "O primeiro ataque causa +10% de dano."
        },
        "desc": "Item exclusivo da classe ladino."
    },
    {
        "id": "armadura_armadura_do_bastiao",
        "name": "Armadura do Bastião",
        "emoji": "🛡️",
        "category": "armadura",
        "rarity": "comum",
        "classId": "guardiao",
        "exclusive": true,
        "effects": {
            "defesa": 12,
            "vida": 50
        },
        "uniqueAbility": {
            "name": "Bastião Absoluto",
            "type": "passiva",
            "description": "Reduz em 8% o dano enquanto acima de 50% da Vida."
        },
        "desc": "Item exclusivo da classe guardiao."
    },
    {
        "id": "acessorio_emblema_do_guardiao",
        "name": "Emblema do Guardião",
        "emoji": "💍",
        "category": "acessorio",
        "rarity": "comum",
        "classId": "guardiao",
        "exclusive": true,
        "effects": {
            "defesa": 5,
            "resistencia": 4
        },
        "uniqueAbility": {
            "name": "Emblema da Sentinela",
            "type": "passiva",
            "description": "Recebe +5% de Defesa após bloquear um ataque."
        },
        "desc": "Item exclusivo da classe guardiao."
    },
    {
        "id": "arma_escudo_do_bastiao",
        "name": "Escudo do Bastião",
        "emoji": "🛡️",
        "category": "arma",
        "rarity": "comum",
        "classId": "guardiao",
        "exclusive": true,
        "effects": {
            "defesa": 9,
            "vida": 35
        },
        "uniqueAbility": {
            "name": "Golpe do Bastião",
            "type": "passiva",
            "description": "Ataques têm +5% de dano enquanto acima de 75% da Vida."
        },
        "desc": "Item exclusivo da classe guardiao."
    },
    {
        "id": "armadura_couraca_da_furia",
        "name": "Couraça da Fúria",
        "emoji": "🛡️",
        "category": "armadura",
        "rarity": "comum",
        "classId": "barbaro",
        "exclusive": true,
        "effects": {
            "defesa": 8,
            "vida": 45
        },
        "uniqueAbility": {
            "name": "Couraça da Fúria",
            "type": "passiva",
            "description": "Abaixo de 50% da Vida, recebe +5% de Defesa."
        },
        "desc": "Item exclusivo da classe barbaro."
    },
    {
        "id": "acessorio_totem_da_furia",
        "name": "Totem da Fúria",
        "emoji": "💍",
        "category": "acessorio",
        "rarity": "comum",
        "classId": "barbaro",
        "exclusive": true,
        "effects": {
            "forca": 5,
            "vida": 20
        },
        "uniqueAbility": {
            "name": "Totem da Fúria",
            "type": "passiva",
            "description": "Abaixo de 50% da Vida, recebe +5% de dano."
        },
        "desc": "Item exclusivo da classe barbaro."
    },
    {
        "id": "arma_machado_da_furia",
        "name": "Machado da Fúria",
        "emoji": "🪓",
        "category": "arma",
        "rarity": "comum",
        "classId": "barbaro",
        "exclusive": true,
        "effects": {
            "forca": 14,
            "agilidade": 2
        },
        "uniqueAbility": {
            "name": "Machado Berserker",
            "type": "passiva",
            "description": "Abaixo de 50% da Vida, ataques causam +10% de dano."
        },
        "desc": "Item exclusivo da classe barbaro."
    },
    {
        "id": "armadura_couraca_do_impacto",
        "name": "Couraça do Impacto",
        "emoji": "🛡️",
        "category": "armadura",
        "rarity": "comum",
        "classId": "lutador",
        "exclusive": true,
        "effects": {
            "defesa": 7,
            "vida": 35
        },
        "uniqueAbility": {
            "name": "Couraça de Combate",
            "type": "passiva",
            "description": "Recebe +5% de Defesa e +3% de resistência."
        },
        "desc": "Item exclusivo da classe lutador."
    },
    {
        "id": "acessorio_bracelete_do_combate",
        "name": "Bracelete do Combate",
        "emoji": "💍",
        "category": "acessorio",
        "rarity": "comum",
        "classId": "lutador",
        "exclusive": true,
        "effects": {
            "forca": 5,
            "agilidade": 5
        },
        "uniqueAbility": {
            "name": "Bracelete do Ritmo",
            "type": "passiva",
            "description": "Após um ataque, recebe +3% de Agilidade por 2 turnos."
        },
        "desc": "Item exclusivo da classe lutador."
    },
    {
        "id": "arma_manoplas_do_impacto",
        "name": "Manoplas do Impacto",
        "emoji": "🥊",
        "category": "arma",
        "rarity": "comum",
        "classId": "lutador",
        "exclusive": true,
        "effects": {
            "forca": 11,
            "agilidade": 5
        },
        "uniqueAbility": {
            "name": "Combo de Impacto",
            "type": "passiva",
            "description": "Após acertar um ataque, o próximo recebe +5% de dano."
        },
        "desc": "Item exclusivo da classe lutador."
    },
    {
        "id": "armadura_armadura_da_forja",
        "name": "Armadura da Forja",
        "emoji": "🛡️",
        "category": "armadura",
        "rarity": "comum",
        "classId": "ferreiro",
        "exclusive": true,
        "effects": {
            "defesa": 10,
            "vida": 40
        },
        "uniqueAbility": {
            "name": "Armadura Temperada",
            "type": "passiva",
            "description": "Recebe +5% de Defesa contra ataques físicos."
        },
        "desc": "Item exclusivo da classe ferreiro."
    },
    {
        "id": "acessorio_nucleo_da_fornalha",
        "name": "Núcleo da Fornalha",
        "emoji": "💍",
        "category": "acessorio",
        "rarity": "comum",
        "classId": "ferreiro",
        "exclusive": true,
        "effects": {
            "forca": 4,
            "resistencia": 5
        },
        "uniqueAbility": {
            "name": "Núcleo da Forja",
            "type": "passiva",
            "description": "Recebe +5% de resistência a efeitos de equipamento."
        },
        "desc": "Item exclusivo da classe ferreiro."
    },
    {
        "id": "arma_martelo_da_forja",
        "name": "Martelo da Forja",
        "emoji": "🔨",
        "category": "arma",
        "rarity": "comum",
        "classId": "ferreiro",
        "exclusive": true,
        "effects": {
            "forca": 12,
            "defesa": 5
        },
        "uniqueAbility": {
            "name": "Martelo Temperado",
            "type": "passiva",
            "description": "Ataques ignoram 5% da Defesa do alvo."
        },
        "desc": "Item exclusivo da classe ferreiro."
    },
    {
        "id": "armadura_armadura_do_rastreador",
        "name": "Armadura do Rastreador",
        "emoji": "🛡️",
        "category": "armadura",
        "rarity": "comum",
        "classId": "cacador",
        "exclusive": true,
        "effects": {
            "defesa": 6,
            "agilidade": 6
        },
        "uniqueAbility": {
            "name": "Armadura do Rastreador",
            "type": "passiva",
            "description": "Contra monstros, recebe +5% de Defesa."
        },
        "desc": "Item exclusivo da classe cacador."
    },
    {
        "id": "acessorio_presa_do_rastreador",
        "name": "Presa do Rastreador",
        "emoji": "💍",
        "category": "acessorio",
        "rarity": "comum",
        "classId": "cacador",
        "exclusive": true,
        "effects": {
            "precisao": 4,
            "sorte": 4
        },
        "uniqueAbility": {
            "name": "Presa do Rastreador",
            "type": "passiva",
            "description": "Recebe +5% de precisão contra monstros."
        },
        "desc": "Item exclusivo da classe cacador."
    },
    {
        "id": "arma_arco_da_cacada",
        "name": "Arco da Caçada",
        "emoji": "🐺",
        "category": "arma",
        "rarity": "comum",
        "classId": "cacador",
        "exclusive": true,
        "effects": {
            "precisao": 8,
            "forca": 7
        },
        "uniqueAbility": {
            "name": "Flecha do Predador",
            "type": "passiva",
            "description": "Contra monstros, o primeiro ataque causa +12% de dano."
        },
        "desc": "Item exclusivo da classe cacador."
    },
    {
        "id": "armadura_armadura_do_sangue_negro",
        "name": "Armadura do Sangue Negro",
        "emoji": "🛡️",
        "category": "armadura",
        "rarity": "comum",
        "classId": "espadachim_sombrio_sangue",
        "exclusive": true,
        "effects": {
            "defesa": 7,
            "vida": 40
        },
        "uniqueAbility": {
            "name": "Couraça Carmesim",
            "type": "passiva",
            "description": "Recebe +5% de Vida máxima."
        },
        "desc": "Item exclusivo da classe espadachim_sombrio_sangue."
    },
    {
        "id": "acessorio_medalhao_carmesim",
        "name": "Medalhão Carmesim",
        "emoji": "💍",
        "category": "acessorio",
        "rarity": "comum",
        "classId": "espadachim_sombrio_sangue",
        "exclusive": true,
        "effects": {
            "forca": 5,
            "agilidade": 4
        },
        "uniqueAbility": {
            "name": "Medalhão Carmesim",
            "type": "passiva",
            "description": "Recebe +5% de dano físico."
        },
        "desc": "Item exclusivo da classe espadachim_sombrio_sangue."
    },
    {
        "id": "arma_lamina_do_sangue_negro",
        "name": "Lâmina do Sangue Negro",
        "emoji": "🩸",
        "category": "arma",
        "rarity": "comum",
        "classId": "espadachim_sombrio_sangue",
        "exclusive": true,
        "effects": {
            "forca": 13,
            "agilidade": 3
        },
        "uniqueAbility": {
            "name": "Lâmina Carmesim",
            "type": "passiva",
            "description": "Ataques têm +8% de dano contra alvos acima de 50% da Vida."
        },
        "desc": "Item exclusivo da classe espadachim_sombrio_sangue."
    },
    {
        "id": "armadura_armadura_do_eter_arcano",
        "name": "Armadura do Éter Arcano",
        "emoji": "🛡️",
        "category": "armadura",
        "rarity": "comum",
        "classId": "espadachim_magico",
        "exclusive": true,
        "effects": {
            "defesa": 7,
            "inteligencia": 5
        },
        "uniqueAbility": {
            "name": "Armadura Arcana",
            "type": "passiva",
            "description": "Recebe +5% de Defesa e +3% de Inteligência."
        },
        "desc": "Item exclusivo da classe espadachim_magico."
    },
    {
        "id": "acessorio_nucleo_arcano",
        "name": "Núcleo Arcano",
        "emoji": "💍",
        "category": "acessorio",
        "rarity": "comum",
        "classId": "espadachim_magico",
        "exclusive": true,
        "effects": {
            "forca": 3,
            "inteligencia": 5
        },
        "uniqueAbility": {
            "name": "Núcleo Arcano",
            "type": "passiva",
            "description": "Recebe +5% de potência mágica."
        },
        "desc": "Item exclusivo da classe espadachim_magico."
    },
    {
        "id": "arma_espada_do_eter_arcano",
        "name": "Espada do Éter Arcano",
        "emoji": "✨",
        "category": "arma",
        "rarity": "comum",
        "classId": "espadachim_magico",
        "exclusive": true,
        "effects": {
            "forca": 9,
            "inteligencia": 8
        },
        "uniqueAbility": {
            "name": "Lâmina Arcana",
            "type": "passiva",
            "description": "Cada ataque alterna entre dano físico e mágico com +5% de potência."
        },
        "desc": "Item exclusivo da classe espadachim_magico."
    },
    {
        "id": "armadura_armadura_da_erupcao",
        "name": "Armadura da Erupção",
        "emoji": "🛡️",
        "category": "armadura",
        "rarity": "comum",
        "classId": "espadachim_flamejante",
        "exclusive": true,
        "effects": {
            "defesa": 8,
            "vida": 35
        },
        "uniqueAbility": {
            "name": "Couraça Magmática",
            "type": "passiva",
            "description": "Reduz em 5% o dano elemental recebido."
        },
        "desc": "Item exclusivo da classe espadachim_flamejante."
    },
    {
        "id": "acessorio_nucleo_vulcanico",
        "name": "Núcleo Vulcânico",
        "emoji": "💍",
        "category": "acessorio",
        "rarity": "comum",
        "classId": "espadachim_flamejante",
        "exclusive": true,
        "effects": {
            "forca": 5,
            "defesa": 3
        },
        "uniqueAbility": {
            "name": "Núcleo Vulcânico",
            "type": "passiva",
            "description": "Ataques físicos recebem +5% de dano."
        },
        "desc": "Item exclusivo da classe espadachim_flamejante."
    },
    {
        "id": "arma_lamina_da_erupcao",
        "name": "Lâmina da Erupção",
        "emoji": "🌋",
        "category": "arma",
        "rarity": "comum",
        "classId": "espadachim_flamejante",
        "exclusive": true,
        "effects": {
            "forca": 14,
            "vida": 15
        },
        "uniqueAbility": {
            "name": "Lâmina Magmática",
            "type": "passiva",
            "description": "O primeiro ataque causa +12% de dano."
        },
        "desc": "Item exclusivo da classe espadachim_flamejante."
    },
    {
        "id": "armadura_armadura_do_inverno_eterno",
        "name": "Armadura do Inverno Eterno",
        "emoji": "🛡️",
        "category": "armadura",
        "rarity": "comum",
        "classId": "espadachim_glacial",
        "exclusive": true,
        "effects": {
            "defesa": 9,
            "vida": 40
        },
        "uniqueAbility": {
            "name": "Armadura Glacial",
            "type": "passiva",
            "description": "Reduz em 5% o dano recebido enquanto acima de 50% da Vida."
        },
        "desc": "Item exclusivo da classe espadachim_glacial."
    },
    {
        "id": "acessorio_cristal_glacial",
        "name": "Cristal Glacial",
        "emoji": "💍",
        "category": "acessorio",
        "rarity": "comum",
        "classId": "espadachim_glacial",
        "exclusive": true,
        "effects": {
            "resistencia": 5,
            "inteligencia": 2
        },
        "uniqueAbility": {
            "name": "Cristal Glacial",
            "type": "passiva",
            "description": "Recebe +5% de resistência elemental."
        },
        "desc": "Item exclusivo da classe espadachim_glacial."
    },
    {
        "id": "arma_espada_do_inverno_eterno",
        "name": "Espada do Inverno Eterno",
        "emoji": "❄️",
        "category": "arma",
        "rarity": "comum",
        "classId": "espadachim_glacial",
        "exclusive": true,
        "effects": {
            "forca": 12,
            "resistencia": 3
        },
        "uniqueAbility": {
            "name": "Espada da Geada",
            "type": "passiva",
            "description": "Ataques de gelo causam +7% de dano."
        },
        "desc": "Item exclusivo da classe espadachim_glacial."
    },
    {
        "id": "armadura_armadura_do_monolito",
        "name": "Armadura do Monólito",
        "emoji": "🛡️",
        "category": "armadura",
        "rarity": "comum",
        "classId": "espadachim_rochoso",
        "exclusive": true,
        "effects": {
            "defesa": 12,
            "vida": 45
        },
        "uniqueAbility": {
            "name": "Couraça Monolítica",
            "type": "passiva",
            "description": "Recebe +7% de Defesa contra ataques físicos."
        },
        "desc": "Item exclusivo da classe espadachim_rochoso."
    },
    {
        "id": "acessorio_fragmento_do_monolito",
        "name": "Fragmento do Monólito",
        "emoji": "💍",
        "category": "acessorio",
        "rarity": "comum",
        "classId": "espadachim_rochoso",
        "exclusive": true,
        "effects": {
            "defesa": 5,
            "resistencia": 4
        },
        "uniqueAbility": {
            "name": "Fragmento do Monólito",
            "type": "passiva",
            "description": "Recebe +5% de Defesa."
        },
        "desc": "Item exclusivo da classe espadachim_rochoso."
    },
    {
        "id": "arma_lamina_do_monolito",
        "name": "Lâmina do Monólito",
        "emoji": "🗿",
        "category": "arma",
        "rarity": "comum",
        "classId": "espadachim_rochoso",
        "exclusive": true,
        "effects": {
            "forca": 12,
            "defesa": 4
        },
        "uniqueAbility": {
            "name": "Lâmina do Monólito",
            "type": "passiva",
            "description": "Ataques têm +8% de dano contra alvos com Defesa maior que a sua."
        },
        "desc": "Item exclusivo da classe espadachim_rochoso."
    },
    {
        "id": "armadura_armadura_da_corrente_celeste",
        "name": "Armadura da Corrente Celeste",
        "emoji": "🛡️",
        "category": "armadura",
        "rarity": "comum",
        "classId": "espadachim_vendaval",
        "exclusive": true,
        "effects": {
            "defesa": 6,
            "agilidade": 7
        },
        "uniqueAbility": {
            "name": "Armadura do Céu",
            "type": "passiva",
            "description": "Recebe +5% de evasão."
        },
        "desc": "Item exclusivo da classe espadachim_vendaval."
    },
    {
        "id": "acessorio_anel_do_vendaval",
        "name": "Anel do Vendaval",
        "emoji": "💍",
        "category": "acessorio",
        "rarity": "comum",
        "classId": "espadachim_vendaval",
        "exclusive": true,
        "effects": {
            "agilidade": 6,
            "precisao": 2
        },
        "uniqueAbility": {
            "name": "Anel do Vendaval",
            "type": "passiva",
            "description": "Recebe +5% de evasão."
        },
        "desc": "Item exclusivo da classe espadachim_vendaval."
    },
    {
        "id": "arma_espada_da_corrente_celeste",
        "name": "Espada da Corrente Celeste",
        "emoji": "🌬️",
        "category": "arma",
        "rarity": "comum",
        "classId": "espadachim_vendaval",
        "exclusive": true,
        "effects": {
            "forca": 10,
            "agilidade": 6
        },
        "uniqueAbility": {
            "name": "Espada Celeste",
            "type": "passiva",
            "description": "Após acertar, recebe +5% de Agilidade por 2 turnos."
        },
        "desc": "Item exclusivo da classe espadachim_vendaval."
    },
    {
        "id": "armadura_armadura_do_relampago",
        "name": "Armadura do Relâmpago",
        "emoji": "🛡️",
        "category": "armadura",
        "rarity": "comum",
        "classId": "espadachim_trovao",
        "exclusive": true,
        "effects": {
            "defesa": 7,
            "agilidade": 6
        },
        "uniqueAbility": {
            "name": "Armadura Condutora",
            "type": "passiva",
            "description": "Reduz em 5% o dano de trovão recebido."
        },
        "desc": "Item exclusivo da classe espadachim_trovao."
    },
    {
        "id": "acessorio_nucleo_tempestuoso",
        "name": "Núcleo Tempestuoso",
        "emoji": "💍",
        "category": "acessorio",
        "rarity": "comum",
        "classId": "espadachim_trovao",
        "exclusive": true,
        "effects": {
            "agilidade": 5,
            "forca": 3
        },
        "uniqueAbility": {
            "name": "Núcleo Tempestuoso",
            "type": "passiva",
            "description": "Recebe +5% de dano elétrico."
        },
        "desc": "Item exclusivo da classe espadachim_trovao."
    },
    {
        "id": "arma_lamina_do_relampago",
        "name": "Lâmina do Relâmpago",
        "emoji": "🌩️",
        "category": "arma",
        "rarity": "comum",
        "classId": "espadachim_trovao",
        "exclusive": true,
        "effects": {
            "forca": 13,
            "agilidade": 4
        },
        "uniqueAbility": {
            "name": "Lâmina Voltaica",
            "type": "passiva",
            "description": "Ataques têm +7% de dano elétrico."
        },
        "desc": "Item exclusivo da classe espadachim_trovao."
    },
    {
        "id": "armadura_armadura_da_mare_profunda",
        "name": "Armadura da Maré Profunda",
        "emoji": "🛡️",
        "category": "armadura",
        "rarity": "comum",
        "classId": "espadachim_aquatico",
        "exclusive": true,
        "effects": {
            "defesa": 8,
            "vida": 40
        },
        "uniqueAbility": {
            "name": "Couraça Abissal",
            "type": "passiva",
            "description": "Recebe +5% de Vida e +3% de Resistência."
        },
        "desc": "Item exclusivo da classe espadachim_aquatico."
    },
    {
        "id": "acessorio_perola_da_mare",
        "name": "Pérola da Maré",
        "emoji": "💍",
        "category": "acessorio",
        "rarity": "comum",
        "classId": "espadachim_aquatico",
        "exclusive": true,
        "effects": {
            "resistencia": 4,
            "vida": 25
        },
        "uniqueAbility": {
            "name": "Pérola da Maré",
            "type": "passiva",
            "description": "Recebe +5% de resistência."
        },
        "desc": "Item exclusivo da classe espadachim_aquatico."
    },
    {
        "id": "arma_espada_da_mare_profunda",
        "name": "Espada da Maré Profunda",
        "emoji": "🫧",
        "category": "arma",
        "rarity": "comum",
        "classId": "espadachim_aquatico",
        "exclusive": true,
        "effects": {
            "forca": 12,
            "resistencia": 3
        },
        "uniqueAbility": {
            "name": "Espada Abissal",
            "type": "passiva",
            "description": "Ataques têm +5% de dano e +3% de precisão."
        },
        "desc": "Item exclusivo da classe espadachim_aquatico."
    },
    {
        "id": "armadura_armadura_da_floresta_viva",
        "name": "Armadura da Floresta Viva",
        "emoji": "🛡️",
        "category": "armadura",
        "rarity": "comum",
        "classId": "espadachim_natural",
        "exclusive": true,
        "effects": {
            "defesa": 8,
            "vida": 45
        },
        "uniqueAbility": {
            "name": "Armadura Verdejante",
            "type": "passiva",
            "description": "Recebe +5% de Vida máxima."
        },
        "desc": "Item exclusivo da classe espadachim_natural."
    },
    {
        "id": "acessorio_broto_ancestral",
        "name": "Broto Ancestral",
        "emoji": "💍",
        "category": "acessorio",
        "rarity": "comum",
        "classId": "espadachim_natural",
        "exclusive": true,
        "effects": {
            "vida": 30,
            "sorte": 3
        },
        "uniqueAbility": {
            "name": "Broto Ancestral",
            "type": "passiva",
            "description": "Recebe +5% de Vida máxima."
        },
        "desc": "Item exclusivo da classe espadachim_natural."
    },
    {
        "id": "arma_lamina_da_floresta_viva",
        "name": "Lâmina da Floresta Viva",
        "emoji": "🍃",
        "category": "arma",
        "rarity": "comum",
        "classId": "espadachim_natural",
        "exclusive": true,
        "effects": {
            "forca": 12,
            "vida": 20
        },
        "uniqueAbility": {
            "name": "Lâmina Verdejante",
            "type": "passiva",
            "description": "Após uma vitória, recupera 3% da Vida máxima."
        },
        "desc": "Item exclusivo da classe espadachim_natural."
    },
    {
        "id": "armadura_armadura_do_primeiro_raio",
        "name": "Armadura do Primeiro Raio",
        "emoji": "🛡️",
        "category": "armadura",
        "rarity": "comum",
        "classId": "espadachim_luminoso",
        "exclusive": true,
        "effects": {
            "defesa": 7,
            "inteligencia": 5
        },
        "uniqueAbility": {
            "name": "Armadura do Amanhecer",
            "type": "passiva",
            "description": "Recebe +5% de resistência a efeitos negativos."
        },
        "desc": "Item exclusivo da classe espadachim_luminoso."
    },
    {
        "id": "acessorio_fragmento_do_amanhecer",
        "name": "Fragmento do Amanhecer",
        "emoji": "💍",
        "category": "acessorio",
        "rarity": "comum",
        "classId": "espadachim_luminoso",
        "exclusive": true,
        "effects": {
            "inteligencia": 4,
            "sorte": 3
        },
        "uniqueAbility": {
            "name": "Fragmento do Amanhecer",
            "type": "passiva",
            "description": "Recebe +5% de precisão e +3% de Inteligência."
        },
        "desc": "Item exclusivo da classe espadachim_luminoso."
    },
    {
        "id": "arma_espada_do_primeiro_raio",
        "name": "Espada do Primeiro Raio",
        "emoji": "🌅",
        "category": "arma",
        "rarity": "comum",
        "classId": "espadachim_luminoso",
        "exclusive": true,
        "effects": {
            "forca": 11,
            "inteligencia": 5
        },
        "uniqueAbility": {
            "name": "Espada do Amanhecer",
            "type": "passiva",
            "description": "O primeiro ataque causa +10% de dano."
        },
        "desc": "Item exclusivo da classe espadachim_luminoso."
    },
    {
        "id": "armadura_armadura_do_eclipse",
        "name": "Armadura do Eclipse",
        "emoji": "🛡️",
        "category": "armadura",
        "rarity": "comum",
        "classId": "espadachim_sombrio",
        "exclusive": true,
        "effects": {
            "defesa": 7,
            "agilidade": 6
        },
        "uniqueAbility": {
            "name": "Armadura Eclipse",
            "type": "passiva",
            "description": "Recebe +5% de evasão."
        },
        "desc": "Item exclusivo da classe espadachim_sombrio."
    },
    {
        "id": "acessorio_fragmento_do_eclipse",
        "name": "Fragmento do Eclipse",
        "emoji": "💍",
        "category": "acessorio",
        "rarity": "comum",
        "classId": "espadachim_sombrio",
        "exclusive": true,
        "effects": {
            "agilidade": 5,
            "sorte": 3
        },
        "uniqueAbility": {
            "name": "Fragmento do Eclipse",
            "type": "passiva",
            "description": "Recebe +5% de evasão e +3% de Sorte."
        },
        "desc": "Item exclusivo da classe espadachim_sombrio."
    },
    {
        "id": "arma_lamina_do_eclipse",
        "name": "Lâmina do Eclipse",
        "emoji": "🌘",
        "category": "arma",
        "rarity": "comum",
        "classId": "espadachim_sombrio",
        "exclusive": true,
        "effects": {
            "forca": 12,
            "agilidade": 5
        },
        "uniqueAbility": {
            "name": "Lâmina do Eclipse",
            "type": "passiva",
            "description": "Ataques têm +6% de dano e +4% de evasão."
        },
        "desc": "Item exclusivo da classe espadachim_sombrio."
    },
    {
        "id": "armadura_manto_da_grande_alquimia",
        "name": "Manto da Grande Alquimia",
        "emoji": "🛡️",
        "category": "armadura",
        "rarity": "comum",
        "classId": "alquimista",
        "exclusive": true,
        "effects": {
            "defesa": 5,
            "inteligencia": 8
        },
        "uniqueAbility": {
            "name": "Manto do Transmutador",
            "type": "passiva",
            "description": "Recebe +5% de Defesa e +3% de Inteligência."
        },
        "desc": "Item exclusivo da classe alquimista."
    },
    {
        "id": "acessorio_nucleo_alquimico",
        "name": "Núcleo Alquímico",
        "emoji": "💍",
        "category": "acessorio",
        "rarity": "comum",
        "classId": "alquimista",
        "exclusive": true,
        "effects": {
            "inteligencia": 5,
            "sorte": 4
        },
        "uniqueAbility": {
            "name": "Núcleo Alquímico",
            "type": "passiva",
            "description": "Consumíveis usados recuperam +5% de seus efeitos."
        },
        "desc": "Item exclusivo da classe alquimista."
    },
    {
        "id": "arma_maleta_da_grande_alquimia",
        "name": "Maleta da Grande Alquimia",
        "emoji": "🧪",
        "category": "arma",
        "rarity": "comum",
        "classId": "alquimista",
        "exclusive": true,
        "effects": {
            "inteligencia": 10,
            "precisao": 3
        },
        "uniqueAbility": {
            "name": "Maleta Transmutadora",
            "type": "passiva",
            "description": "O primeiro consumível usado na batalha recebe +10% de eficácia."
        },
        "desc": "Item exclusivo da classe alquimista."
    }
];
