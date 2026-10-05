/* Habilidades e atributos das 30 classes Comuns. */
module.exports = {
    "guerreiro": {
        "a": [
            "Golpe Poderoso",
            "Investida Brutal",
            "Corte Ascendente",
            "Rugido de Batalha"
        ],
        "p": [
            "Pele de Ferro",
            "Postura de Combate",
            "Vontade de Ferro"
        ],
        "b": {
            "forca": 8,
            "defesa": 6,
            "agilidade": 2,
            "vida": 5
        },
        "ab": [
            {
                "dano": 18,
                "precisao": 95,
                "mana": 10
            },
            {
                "dano": 24,
                "velocidade": 8,
                "mana": 14
            },
            {
                "dano": 30,
                "penetracao": 12,
                "mana": 18
            },
            {
                "dano": 10,
                "forca": 12,
                "defesa": 8,
                "mana": 12
            }
        ],
        "pb": [
            {
                "defesa": 8,
                "resistencia": 6
            },
            {
                "forca": 6,
                "defesa": 5
            },
            {
                "vida": 8,
                "resistencia": 8
            }
        ]
    },
    "mago": {
        "a": [
            "Míssil Arcano",
            "Explosão Arcana",
            "Prisão Mística",
            "Sobrecarga Arcana"
        ],
        "p": [
            "Mente Arcana",
            "Fluxo de Mana",
            "Concentração"
        ],
        "b": {
            "inteligencia": 10,
            "agilidade": 3,
            "defesa": 2,
            "vida": 2
        },
        "ab": [
            {
                "dano": 20,
                "precisao": 96,
                "mana": 10
            },
            {
                "dano": 28,
                "area": 10,
                "mana": 18
            },
            {
                "dano": 12,
                "controle": 14,
                "mana": 16
            },
            {
                "dano": 36,
                "penetracao": 10,
                "mana": 25
            }
        ],
        "pb": [
            {
                "inteligencia": 8,
                "mana": 10
            },
            {
                "mana": 12,
                "resistencia": 5
            },
            {
                "precisao": 7,
                "dano": 5
            }
        ]
    },
    "mago_fogo": {
        "a": [
            "Chama Explosiva",
            "Lança Ígnea",
            "Muralha de Fogo",
            "Inferno"
        ],
        "p": [
            "Núcleo Flamejante",
            "Pele Incandescente",
            "Combustão Arcana"
        ],
        "b": {
            "inteligencia": 9,
            "forca": 3,
            "agilidade": 2,
            "vida": 2
        },
        "ab": [
            {
                "dano": 24,
                "precisao": 94,
                "mana": 12
            },
            {
                "dano": 30,
                "penetracao": 8,
                "mana": 17
            },
            {
                "dano": 18,
                "controle": 12,
                "mana": 16
            },
            {
                "dano": 45,
                "area": 15,
                "mana": 30
            }
        ],
        "pb": [
            {
                "dano": 8,
                "inteligencia": 6
            },
            {
                "resistencia": 8,
                "defesa": 4
            },
            {
                "dano": 10,
                "precisao": 4
            }
        ]
    },
    "mago_gelo": {
        "a": [
            "Lança de Gelo",
            "Prisão Congelante",
            "Tempestade Glacial",
            "Zero Absoluto"
        ],
        "p": [
            "Núcleo Glacial",
            "Frieza Arcana",
            "Cristalização"
        ],
        "b": {
            "inteligencia": 9,
            "defesa": 3,
            "resistencia": 5,
            "vida": 2
        },
        "ab": [
            {
                "dano": 20,
                "precisao": 96,
                "mana": 12
            },
            {
                "dano": 14,
                "controle": 18,
                "mana": 18
            },
            {
                "dano": 34,
                "area": 12,
                "mana": 25
            },
            {
                "dano": 48,
                "controle": 20,
                "mana": 34
            }
        ],
        "pb": [
            {
                "resistencia": 9,
                "defesa": 5
            },
            {
                "inteligencia": 7,
                "controle": 6
            },
            {
                "defesa": 6,
                "vida": 5
            }
        ]
    },
    "mago_terra": {
        "a": [
            "Lança Rochosa",
            "Muralha de Pedra",
            "Abalo Sísmico",
            "Colosso Terrestre"
        ],
        "p": [
            "Corpo Mineral",
            "Núcleo Denso",
            "Fortaleza Natural"
        ],
        "b": {
            "inteligencia": 7,
            "defesa": 8,
            "vida": 6,
            "resistencia": 5
        },
        "ab": [
            {
                "dano": 19,
                "precisao": 94,
                "mana": 10
            },
            {
                "defesa": 16,
                "controle": 8,
                "mana": 15
            },
            {
                "dano": 32,
                "area": 12,
                "mana": 22
            },
            {
                "dano": 42,
                "defesa": 15,
                "mana": 30
            }
        ],
        "pb": [
            {
                "defesa": 10,
                "resistencia": 8
            },
            {
                "vida": 8,
                "defesa": 5
            },
            {
                "resistencia": 9,
                "dano": 4
            }
        ]
    },
    "mago_vento": {
        "a": [
            "Lâmina de Vento",
            "Passo do Vendaval",
            "Ciclone",
            "Fúria dos Céus"
        ],
        "p": [
            "Corpo Leve",
            "Correnteza Aérea",
            "Instinto do Vendaval"
        ],
        "b": {
            "inteligencia": 8,
            "agilidade": 8,
            "precisao": 4,
            "vida": 2
        },
        "ab": [
            {
                "dano": 19,
                "precisao": 97,
                "mana": 10
            },
            {
                "dano": 14,
                "velocidade": 18,
                "mana": 12
            },
            {
                "dano": 30,
                "area": 10,
                "mana": 20
            },
            {
                "dano": 40,
                "velocidade": 16,
                "mana": 28
            }
        ],
        "pb": [
            {
                "agilidade": 9,
                "evasao": 7
            },
            {
                "agilidade": 7,
                "precisao": 6
            },
            {
                "evasao": 8,
                "velocidade": 6
            }
        ]
    },
    "mago_agua": {
        "a": [
            "Lança d'Água",
            "Maré Protetora",
            "Prisão Abissal",
            "Tsunami"
        ],
        "p": [
            "Fluxo Vital",
            "Pele Aquática",
            "Reserva das Marés"
        ],
        "b": {
            "inteligencia": 8,
            "vida": 7,
            "resistencia": 5,
            "defesa": 3
        },
        "ab": [
            {
                "dano": 18,
                "precisao": 96,
                "mana": 10
            },
            {
                "defesa": 14,
                "vida": 8,
                "mana": 14
            },
            {
                "dano": 16,
                "controle": 18,
                "mana": 18
            },
            {
                "dano": 44,
                "area": 16,
                "mana": 30
            }
        ],
        "pb": [
            {
                "vida": 9,
                "resistencia": 6
            },
            {
                "defesa": 6,
                "resistencia": 8
            },
            {
                "mana": 10,
                "vida": 5
            }
        ]
    },
    "mago_natureza": {
        "a": [
            "Raiz Perfurante",
            "Espinhos Vivos",
            "Cura Natural",
            "Ira da Floresta"
        ],
        "p": [
            "Vitalidade Natural",
            "Crescimento",
            "Pacto Verde"
        ],
        "b": {
            "inteligencia": 7,
            "vida": 8,
            "resistencia": 4,
            "defesa": 4
        },
        "ab": [
            {
                "dano": 18,
                "controle": 8,
                "mana": 10
            },
            {
                "dano": 25,
                "area": 10,
                "mana": 16
            },
            {
                "vida": 15,
                "resistencia": 8,
                "mana": 15
            },
            {
                "dano": 38,
                "area": 18,
                "mana": 28
            }
        ],
        "pb": [
            {
                "vida": 10,
                "resistencia": 6
            },
            {
                "vida": 7,
                "defesa": 5
            },
            {
                "dano": 6,
                "vida": 6
            }
        ]
    },
    "mago_trovao": {
        "a": [
            "Raio Condutor",
            "Descarga",
            "Tempestade Elétrica",
            "Julgamento do Trovão"
        ],
        "p": [
            "Núcleo Elétrico",
            "Condutor Arcano",
            "Reflexo Voltaico"
        ],
        "b": {
            "inteligencia": 9,
            "agilidade": 6,
            "precisao": 5,
            "vida": 2
        },
        "ab": [
            {
                "dano": 22,
                "precisao": 98,
                "mana": 11
            },
            {
                "dano": 28,
                "penetracao": 10,
                "mana": 17
            },
            {
                "dano": 36,
                "area": 14,
                "mana": 25
            },
            {
                "dano": 50,
                "precisao": 96,
                "mana": 34
            }
        ],
        "pb": [
            {
                "dano": 9,
                "precisao": 7
            },
            {
                "agilidade": 7,
                "mana": 5
            },
            {
                "evasao": 6,
                "agilidade": 6
            }
        ]
    },
    "mago_luz": {
        "a": [
            "Raio Solar",
            "Luz Restauradora",
            "Lança Radiante",
            "Aurora Divina"
        ],
        "p": [
            "Aura Solar",
            "Pureza",
            "Brilho Interior"
        ],
        "b": {
            "inteligencia": 9,
            "vida": 5,
            "resistencia": 6,
            "precisao": 4
        },
        "ab": [
            {
                "dano": 21,
                "precisao": 97,
                "mana": 10
            },
            {
                "vida": 16,
                "resistencia": 7,
                "mana": 14
            },
            {
                "dano": 31,
                "penetracao": 8,
                "mana": 19
            },
            {
                "dano": 45,
                "area": 14,
                "mana": 30
            }
        ],
        "pb": [
            {
                "resistencia": 8,
                "vida": 6
            },
            {
                "precisao": 7,
                "resistencia": 6
            },
            {
                "inteligencia": 7,
                "vida": 5
            }
        ]
    },
    "mago_sombra": {
        "a": [
            "Lâmina Sombria",
            "Passo das Trevas",
            "Correntes do Vazio",
            "Eclipse Total"
        ],
        "p": [
            "Manto Sombrio",
            "Presença do Vazio",
            "Predador Noturno"
        ],
        "b": {
            "inteligencia": 8,
            "agilidade": 7,
            "precisao": 3,
            "resistencia": 4
        },
        "ab": [
            {
                "dano": 21,
                "precisao": 96,
                "mana": 10
            },
            {
                "dano": 14,
                "evasao": 15,
                "mana": 13
            },
            {
                "dano": 26,
                "controle": 16,
                "mana": 20
            },
            {
                "dano": 44,
                "penetracao": 15,
                "mana": 31
            }
        ],
        "pb": [
            {
                "evasao": 9,
                "agilidade": 7
            },
            {
                "resistencia": 7,
                "evasao": 5
            },
            {
                "dano": 7,
                "agilidade": 6
            }
        ]
    },
    "arqueiro": {
        "a": [
            "Tiro Preciso",
            "Flecha Perfurante",
            "Chuva de Flechas",
            "Disparo do Caçador"
        ],
        "p": [
            "Olho de Águia",
            "Passo Leve",
            "Mira Fria"
        ],
        "b": {
            "precisao": 10,
            "agilidade": 8,
            "forca": 5,
            "vida": 2
        },
        "ab": [
            {
                "dano": 20,
                "precisao": 99,
                "mana": 8
            },
            {
                "dano": 28,
                "penetracao": 16,
                "mana": 12
            },
            {
                "dano": 25,
                "area": 15,
                "mana": 18
            },
            {
                "dano": 40,
                "precisao": 98,
                "mana": 25
            }
        ],
        "pb": [
            {
                "precisao": 10,
                "agilidade": 5
            },
            {
                "evasao": 8,
                "agilidade": 7
            },
            {
                "precisao": 8,
                "dano": 5
            }
        ]
    },
    "ladino": {
        "a": [
            "Golpe Oculto",
            "Passo Sombrio",
            "Lâmina Dupla",
            "Execução Silenciosa"
        ],
        "p": [
            "Furtividade",
            "Reflexos Rápidos",
            "Oportunista"
        ],
        "b": {
            "agilidade": 10,
            "precisao": 7,
            "forca": 6,
            "sorte": 4
        },
        "ab": [
            {
                "dano": 22,
                "precisao": 97,
                "mana": 8
            },
            {
                "dano": 12,
                "evasao": 18,
                "mana": 12
            },
            {
                "dano": 30,
                "velocidade": 10,
                "mana": 15
            },
            {
                "dano": 45,
                "penetracao": 18,
                "mana": 25
            }
        ],
        "pb": [
            {
                "evasao": 10,
                "agilidade": 8
            },
            {
                "agilidade": 8,
                "precisao": 6
            },
            {
                "dano": 9,
                "sorte": 6
            }
        ]
    },
    "guardiao": {
        "a": [
            "Golpe do Escudo",
            "Muralha Viva",
            "Provocação",
            "Bastião Supremo"
        ],
        "p": [
            "Fortaleza",
            "Guardião Nato",
            "Última Defesa"
        ],
        "b": {
            "defesa": 12,
            "vida": 10,
            "resistencia": 7,
            "forca": 4
        },
        "ab": [
            {
                "dano": 15,
                "defesa": 10,
                "mana": 6
            },
            {
                "defesa": 22,
                "resistencia": 12,
                "mana": 12
            },
            {
                "controle": 14,
                "defesa": 10,
                "mana": 10
            },
            {
                "defesa": 30,
                "vida": 20,
                "mana": 24
            }
        ],
        "pb": [
            {
                "defesa": 12,
                "vida": 8
            },
            {
                "resistencia": 10,
                "defesa": 7
            },
            {
                "defesa": 8,
                "vida": 10
            }
        ]
    },
    "barbaro": {
        "a": [
            "Golpe Furioso",
            "Investida Selvagem",
            "Ruptura",
            "Fúria Berserker"
        ],
        "p": [
            "Fúria Natural",
            "Pele Grossa",
            "Instinto Selvagem"
        ],
        "b": {
            "forca": 12,
            "vida": 9,
            "defesa": 5,
            "agilidade": 4
        },
        "ab": [
            {
                "dano": 25,
                "precisao": 92,
                "mana": 7
            },
            {
                "dano": 32,
                "velocidade": 10,
                "mana": 12
            },
            {
                "dano": 38,
                "penetracao": 18,
                "mana": 18
            },
            {
                "dano": 52,
                "forca": 18,
                "mana": 26
            }
        ],
        "pb": [
            {
                "forca": 10,
                "dano": 6
            },
            {
                "vida": 10,
                "defesa": 5
            },
            {
                "forca": 8,
                "agilidade": 5
            }
        ]
    },
    "lutador": {
        "a": [
            "Soco de Impacto",
            "Sequência Rápida",
            "Contra-Ataque",
            "Punho Absoluto"
        ],
        "p": [
            "Corpo Treinado",
            "Ritmo de Combate",
            "Reflexo Marcial"
        ],
        "b": {
            "forca": 9,
            "agilidade": 9,
            "defesa": 5,
            "vida": 5
        },
        "ab": [
            {
                "dano": 20,
                "precisao": 97,
                "mana": 6
            },
            {
                "dano": 27,
                "velocidade": 14,
                "mana": 11
            },
            {
                "dano": 18,
                "reflexo": 15,
                "mana": 12
            },
            {
                "dano": 43,
                "penetracao": 14,
                "mana": 24
            }
        ],
        "pb": [
            {
                "forca": 7,
                "defesa": 5
            },
            {
                "agilidade": 9,
                "velocidade": 7
            },
            {
                "evasao": 6,
                "forca": 6
            }
        ]
    },
    "ferreiro": {
        "a": [
            "Golpe Temperado",
            "Martelo Sísmico",
            "Forja de Guerra",
            "Martelo Supremo"
        ],
        "p": [
            "Corpo de Ferreiro",
            "Armadura Reforçada",
            "Mestre da Forja"
        ],
        "b": {
            "forca": 8,
            "defesa": 9,
            "vida": 8,
            "resistencia": 6
        },
        "ab": [
            {
                "dano": 22,
                "precisao": 94,
                "mana": 6
            },
            {
                "dano": 31,
                "area": 8,
                "mana": 14
            },
            {
                "defesa": 14,
                "forca": 10,
                "mana": 12
            },
            {
                "dano": 44,
                "defesa": 16,
                "mana": 24
            }
        ],
        "pb": [
            {
                "forca": 7,
                "resistencia": 7
            },
            {
                "defesa": 10,
                "vida": 6
            },
            {
                "defesa": 8,
                "dano": 5
            }
        ]
    },
    "cacador": {
        "a": [
            "Flecha Predadora",
            "Rastro Mortal",
            "Armadilha de Caça",
            "Disparo do Predador"
        ],
        "p": [
            "Rastreador Nato",
            "Instinto de Caça",
            "Caçador de Monstros"
        ],
        "b": {
            "precisao": 9,
            "agilidade": 8,
            "forca": 6,
            "sorte": 5
        },
        "ab": [
            {
                "dano": 22,
                "precisao": 98,
                "mana": 8
            },
            {
                "dano": 26,
                "penetracao": 12,
                "mana": 12
            },
            {
                "dano": 16,
                "controle": 16,
                "mana": 14
            },
            {
                "dano": 42,
                "precisao": 99,
                "mana": 25
            }
        ],
        "pb": [
            {
                "precisao": 9,
                "agilidade": 6
            },
            {
                "sorte": 8,
                "precisao": 6
            },
            {
                "dano": 10,
                "precisao": 5
            }
        ]
    },
    "espadachim_sombrio_sangue": {
        "a": [
            "Corte Carmesim",
            "Dança do Sangue",
            "Lâmina Vampírica",
            "Ruptura Negra"
        ],
        "p": [
            "Sangue de Guerra",
            "Aura Carmesim",
            "Predador Carmesim"
        ],
        "b": {
            "forca": 11,
            "agilidade": 6,
            "vida": 8,
            "defesa": 4
        },
        "ab": [
            {
                "dano": 24,
                "precisao": 95,
                "mana": 8
            },
            {
                "dano": 32,
                "velocidade": 10,
                "mana": 14
            },
            {
                "dano": 36,
                "vida": 8,
                "mana": 18
            },
            {
                "dano": 48,
                "penetracao": 16,
                "mana": 27
            }
        ],
        "pb": [
            {
                "forca": 8,
                "vida": 7
            },
            {
                "dano": 8,
                "agilidade": 6
            },
            {
                "dano": 7,
                "forca": 7
            }
        ]
    },
    "espadachim_magico": {
        "a": [
            "Corte Arcano",
            "Lâmina Elemental",
            "Ruptura Mística",
            "Espada do Éter"
        ],
        "p": [
            "Fluxo Híbrido",
            "Lâmina Encantada",
            "Equilíbrio Arcano"
        ],
        "b": {
            "forca": 7,
            "inteligencia": 8,
            "agilidade": 4,
            "defesa": 4
        },
        "ab": [
            {
                "dano": 23,
                "precisao": 96,
                "mana": 10
            },
            {
                "dano": 30,
                "inteligencia": 10,
                "mana": 15
            },
            {
                "dano": 34,
                "penetracao": 14,
                "mana": 20
            },
            {
                "dano": 46,
                "forca": 10,
                "inteligencia": 12,
                "mana": 28
            }
        ],
        "pb": [
            {
                "forca": 6,
                "inteligencia": 7
            },
            {
                "dano": 7,
                "inteligencia": 6
            },
            {
                "defesa": 5,
                "mana": 8
            }
        ]
    },
    "espadachim_flamejante": {
        "a": [
            "Corte Flamejante",
            "Avanço Vulcânico",
            "Lâmina Incandescente",
            "Erupção da Espada"
        ],
        "p": [
            "Sangue Vulcânico",
            "Armadura Magmática",
            "Fúria Incandescente"
        ],
        "b": {
            "forca": 10,
            "vida": 7,
            "defesa": 5,
            "inteligencia": 3
        },
        "ab": [
            {
                "dano": 25,
                "precisao": 95,
                "mana": 8
            },
            {
                "dano": 32,
                "velocidade": 8,
                "mana": 13
            },
            {
                "dano": 38,
                "penetracao": 10,
                "mana": 18
            },
            {
                "dano": 50,
                "area": 14,
                "mana": 28
            }
        ],
        "pb": [
            {
                "dano": 8,
                "vida": 6
            },
            {
                "defesa": 8,
                "resistencia": 7
            },
            {
                "forca": 8,
                "dano": 7
            }
        ]
    },
    "espadachim_glacial": {
        "a": [
            "Corte Glacial",
            "Passo Congelante",
            "Lâmina do Inverno",
            "Geada Eterna"
        ],
        "p": [
            "Sangue Frio",
            "Armadura Glacial",
            "Coração de Gelo"
        ],
        "b": {
            "forca": 9,
            "defesa": 7,
            "vida": 7,
            "resistencia": 6
        },
        "ab": [
            {
                "dano": 23,
                "precisao": 96,
                "mana": 8
            },
            {
                "dano": 20,
                "controle": 12,
                "mana": 13
            },
            {
                "dano": 35,
                "penetracao": 10,
                "mana": 18
            },
            {
                "dano": 48,
                "controle": 18,
                "mana": 27
            }
        ],
        "pb": [
            {
                "resistencia": 9,
                "defesa": 6
            },
            {
                "defesa": 7,
                "vida": 6
            },
            {
                "dano": 7,
                "resistencia": 7
            }
        ]
    },
    "espadachim_rochoso": {
        "a": [
            "Corte Monolítico",
            "Passo de Pedra",
            "Ruptura Rochosa",
            "Colosso de Pedra"
        ],
        "p": [
            "Pele Rochosa",
            "Peso do Monólito",
            "Vontade de Pedra"
        ],
        "b": {
            "forca": 9,
            "defesa": 11,
            "vida": 9,
            "resistencia": 8
        },
        "ab": [
            {
                "dano": 25,
                "precisao": 93,
                "mana": 8
            },
            {
                "defesa": 18,
                "velocidade": -3,
                "mana": 10
            },
            {
                "dano": 38,
                "penetracao": 18,
                "mana": 19
            },
            {
                "dano": 47,
                "defesa": 18,
                "mana": 27
            }
        ],
        "pb": [
            {
                "defesa": 11,
                "resistencia": 8
            },
            {
                "defesa": 10,
                "agilidade": -2
            },
            {
                "vida": 9,
                "resistencia": 9
            }
        ]
    },
    "espadachim_vendaval": {
        "a": [
            "Corte do Vendaval",
            "Passo Celeste",
            "Dança das Lâminas",
            "Tempestade Cortante"
        ],
        "p": [
            "Corpo Celeste",
            "Velocidade do Vento",
            "Instinto Aéreo"
        ],
        "b": {
            "forca": 8,
            "agilidade": 10,
            "precisao": 5,
            "defesa": 3
        },
        "ab": [
            {
                "dano": 22,
                "precisao": 97,
                "mana": 8
            },
            {
                "dano": 15,
                "velocidade": 20,
                "mana": 12
            },
            {
                "dano": 32,
                "velocidade": 14,
                "mana": 17
            },
            {
                "dano": 46,
                "area": 12,
                "mana": 26
            }
        ],
        "pb": [
            {
                "agilidade": 10,
                "evasao": 7
            },
            {
                "agilidade": 9,
                "velocidade": 7
            },
            {
                "evasao": 8,
                "precisao": 6
            }
        ]
    },
    "espadachim_trovao": {
        "a": [
            "Corte Voltaico",
            "Passo Relâmpago",
            "Lâmina Trovejante",
            "Tempestade da Lâmina"
        ],
        "p": [
            "Sangue Condutor",
            "Reflexo Elétrico",
            "Carga Tempestuosa"
        ],
        "b": {
            "forca": 10,
            "agilidade": 8,
            "precisao": 4,
            "defesa": 3
        },
        "ab": [
            {
                "dano": 25,
                "precisao": 97,
                "mana": 8
            },
            {
                "dano": 18,
                "velocidade": 20,
                "mana": 12
            },
            {
                "dano": 36,
                "penetracao": 12,
                "mana": 18
            },
            {
                "dano": 49,
                "area": 13,
                "mana": 28
            }
        ],
        "pb": [
            {
                "dano": 8,
                "agilidade": 7
            },
            {
                "evasao": 8,
                "agilidade": 8
            },
            {
                "dano": 7,
                "precisao": 7
            }
        ]
    },
    "espadachim_aquatico": {
        "a": [
            "Corte da Maré",
            "Passo Fluido",
            "Lâmina Abissal",
            "Tsunami da Espada"
        ],
        "p": [
            "Corpo Fluido",
            "Maré Protetora",
            "Pressão Abissal"
        ],
        "b": {
            "forca": 9,
            "defesa": 6,
            "vida": 8,
            "resistencia": 6
        },
        "ab": [
            {
                "dano": 23,
                "precisao": 96,
                "mana": 8
            },
            {
                "dano": 17,
                "evasao": 15,
                "mana": 11
            },
            {
                "dano": 37,
                "penetracao": 14,
                "mana": 19
            },
            {
                "dano": 48,
                "area": 15,
                "mana": 27
            }
        ],
        "pb": [
            {
                "agilidade": 7,
                "evasao": 7
            },
            {
                "defesa": 8,
                "resistencia": 7
            },
            {
                "dano": 8,
                "penetracao": 6
            }
        ]
    },
    "espadachim_natural": {
        "a": [
            "Corte Verdejante",
            "Raízes da Lâmina",
            "Regeneração Natural",
            "Fúria da Floresta"
        ],
        "p": [
            "Vitalidade Verde",
            "Casca Viva",
            "Espírito da Floresta"
        ],
        "b": {
            "forca": 9,
            "vida": 10,
            "defesa": 6,
            "resistencia": 5
        },
        "ab": [
            {
                "dano": 22,
                "precisao": 96,
                "mana": 8
            },
            {
                "dano": 27,
                "controle": 12,
                "mana": 14
            },
            {
                "vida": 14,
                "resistencia": 10,
                "mana": 15
            },
            {
                "dano": 46,
                "area": 16,
                "mana": 28
            }
        ],
        "pb": [
            {
                "vida": 10,
                "resistencia": 7
            },
            {
                "defesa": 8,
                "vida": 7
            },
            {
                "vida": 8,
                "dano": 6
            }
        ]
    },
    "espadachim_luminoso": {
        "a": [
            "Corte Radiante",
            "Passo Solar",
            "Lâmina da Aurora",
            "Julgamento Luminoso"
        ],
        "p": [
            "Aura Radiante",
            "Pureza da Lâmina",
            "Espírito Solar"
        ],
        "b": {
            "forca": 8,
            "inteligencia": 7,
            "defesa": 5,
            "vida": 5
        },
        "ab": [
            {
                "dano": 23,
                "precisao": 97,
                "mana": 8
            },
            {
                "dano": 16,
                "velocidade": 12,
                "mana": 12
            },
            {
                "dano": 35,
                "penetracao": 10,
                "mana": 18
            },
            {
                "dano": 48,
                "area": 14,
                "mana": 27
            }
        ],
        "pb": [
            {
                "resistencia": 8,
                "inteligencia": 6
            },
            {
                "precisao": 8,
                "dano": 5
            },
            {
                "vida": 7,
                "resistencia": 6
            }
        ]
    },
    "espadachim_sombrio": {
        "a": [
            "Corte do Eclipse",
            "Passo das Sombras",
            "Lâmina do Crepúsculo",
            "Eclipse da Lâmina"
        ],
        "p": [
            "Manto do Eclipse",
            "Predador das Sombras",
            "Véu Sombrio"
        ],
        "b": {
            "forca": 9,
            "agilidade": 8,
            "precisao": 4,
            "resistencia": 4
        },
        "ab": [
            {
                "dano": 24,
                "precisao": 96,
                "mana": 8
            },
            {
                "dano": 16,
                "evasao": 17,
                "mana": 12
            },
            {
                "dano": 35,
                "penetracao": 15,
                "mana": 18
            },
            {
                "dano": 49,
                "area": 12,
                "mana": 28
            }
        ],
        "pb": [
            {
                "evasao": 9,
                "agilidade": 8
            },
            {
                "dano": 8,
                "agilidade": 6
            },
            {
                "resistencia": 7,
                "evasao": 6
            }
        ]
    },
    "alquimista": {
        "a": [
            "Bomba Alquímica",
            "Elixir de Combate",
            "Névoa Corrosiva",
            "Transmutação Suprema"
        ],
        "p": [
            "Conhecimento Alquímico",
            "Mistura Instável",
            "Mestre dos Elixires"
        ],
        "b": {
            "inteligencia": 9,
            "sorte": 7,
            "defesa": 4,
            "vida": 4
        },
        "ab": [
            {
                "dano": 22,
                "area": 10,
                "mana": 10
            },
            {
                "forca": 10,
                "defesa": 8,
                "mana": 14
            },
            {
                "dano": 28,
                "controle": 12,
                "mana": 18
            },
            {
                "dano": 42,
                "area": 16,
                "mana": 28
            }
        ],
        "pb": [
            {
                "inteligencia": 8,
                "sorte": 6
            },
            {
                "dano": 7,
                "resistencia": 5
            },
            {
                "inteligencia": 7,
                "mana": 8
            }
        ]
    }
};
