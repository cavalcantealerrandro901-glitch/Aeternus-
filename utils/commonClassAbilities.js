/* Habilidades das 30 classes Comuns: 4 ativas, 5 passivas e 3 únicas por classe. */
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
            "Vontade de Ferro",
            "Tenacidade",
            "Contra-Impacto"
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
            },
            {
                "defesa": 5,
                "vida": 4
            },
            {
                "forca": 5,
                "resistencia": 4
            }
        ],
        "u": [
            "Mestre da Lâmina",
            "Último Bastião",
            "Golpe do Campeão"
        ],
        "ub": [
            {
                "dano": 8,
                "forca": 6,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 20
            },
            {
                "dano": 10,
                "forca": 4,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 40
            },
            {
                "dano": 12,
                "forca": 4,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 60
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
            "Concentração",
            "Clareza Arcana",
            "Reserva Etérea"
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
            },
            {
                "inteligencia": 6,
                "precisao": 4
            },
            {
                "mana": 8,
                "resistencia": 3
            }
        ],
        "u": [
            "Arquimago",
            "Domínio Arcano",
            "Apogeu Mágico"
        ],
        "ub": [
            {
                "dano": 8,
                "forca": 6,
                "inteligencia": 6,
                "precisao": 5,
                "mana": 0,
                "nivel": 20
            },
            {
                "dano": 10,
                "forca": 4,
                "inteligencia": 6,
                "precisao": 5,
                "mana": 0,
                "nivel": 40
            },
            {
                "dano": 12,
                "forca": 4,
                "inteligencia": 6,
                "precisao": 5,
                "mana": 0,
                "nivel": 60
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
            "Combustão Arcana",
            "Brasas Eternas",
            "Fúria Ígnea"
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
            },
            {
                "dano": 7,
                "inteligencia": 5
            },
            {
                "dano": 5,
                "resistencia": 5
            }
        ],
        "u": [
            "Coração do Inferno",
            "Senhor das Chamas",
            "Cataclismo Ígneo"
        ],
        "ub": [
            {
                "dano": 8,
                "forca": 6,
                "inteligencia": 6,
                "precisao": 5,
                "mana": 0,
                "nivel": 20
            },
            {
                "dano": 10,
                "forca": 4,
                "inteligencia": 6,
                "precisao": 5,
                "mana": 0,
                "nivel": 40
            },
            {
                "dano": 12,
                "forca": 4,
                "inteligencia": 6,
                "precisao": 5,
                "mana": 0,
                "nivel": 60
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
            "Cristalização",
            "Frio Profundo",
            "Manto de Geada"
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
            },
            {
                "resistencia": 7,
                "defesa": 4
            },
            {
                "controle": 5,
                "vida": 4
            }
        ],
        "u": [
            "Senhor do Inverno",
            "Coração Glacial",
            "Era Congelada"
        ],
        "ub": [
            {
                "dano": 8,
                "forca": 6,
                "inteligencia": 6,
                "precisao": 5,
                "mana": 0,
                "nivel": 20
            },
            {
                "dano": 10,
                "forca": 4,
                "inteligencia": 6,
                "precisao": 5,
                "mana": 0,
                "nivel": 40
            },
            {
                "dano": 12,
                "forca": 4,
                "inteligencia": 6,
                "precisao": 5,
                "mana": 0,
                "nivel": 60
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
            "Fortaleza Natural",
            "Peso da Montanha",
            "Pele de Granito"
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
            },
            {
                "defesa": 7,
                "vida": 5
            },
            {
                "resistencia": 6,
                "defesa": 4
            }
        ],
        "u": [
            "Senhor da Terra",
            "Titã de Pedra",
            "Continente Vivo"
        ],
        "ub": [
            {
                "dano": 8,
                "forca": 6,
                "inteligencia": 6,
                "precisao": 5,
                "mana": 0,
                "nivel": 20
            },
            {
                "dano": 10,
                "forca": 4,
                "inteligencia": 6,
                "precisao": 5,
                "mana": 0,
                "nivel": 40
            },
            {
                "dano": 12,
                "forca": 4,
                "inteligencia": 6,
                "precisao": 5,
                "mana": 0,
                "nivel": 60
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
            "Instinto do Vendaval",
            "Passos Leves",
            "Fluxo do Ar"
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
            },
            {
                "agilidade": 7,
                "evasao": 5
            },
            {
                "agilidade": 6,
                "velocidade": 5
            }
        ],
        "u": [
            "Mestre dos Ventos",
            "Soberano Celeste",
            "Tempestade Eterna"
        ],
        "ub": [
            {
                "dano": 8,
                "forca": 6,
                "inteligencia": 6,
                "precisao": 5,
                "mana": 0,
                "nivel": 20
            },
            {
                "dano": 10,
                "forca": 4,
                "inteligencia": 6,
                "precisao": 5,
                "mana": 0,
                "nivel": 40
            },
            {
                "dano": 12,
                "forca": 4,
                "inteligencia": 6,
                "precisao": 5,
                "mana": 0,
                "nivel": 60
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
            "Reserva das Marés",
            "Corrente Vital",
            "Maré Serena"
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
            },
            {
                "vida": 7,
                "resistencia": 5
            },
            {
                "defesa": 5,
                "mana": 7
            }
        ],
        "u": [
            "Senhor das Marés",
            "Abismo Vivo",
            "Dilúvio Primordial"
        ],
        "ub": [
            {
                "dano": 8,
                "forca": 6,
                "inteligencia": 6,
                "precisao": 5,
                "mana": 0,
                "nivel": 20
            },
            {
                "dano": 10,
                "forca": 4,
                "inteligencia": 6,
                "precisao": 5,
                "mana": 0,
                "nivel": 40
            },
            {
                "dano": 12,
                "forca": 4,
                "inteligencia": 6,
                "precisao": 5,
                "mana": 0,
                "nivel": 60
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
            "Pacto Verde",
            "Regeneração Verde",
            "Raízes Antigas"
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
            },
            {
                "vida": 8,
                "resistencia": 5
            },
            {
                "vida": 6,
                "dano": 4
            }
        ],
        "u": [
            "Avatar da Floresta",
            "Vida Ancestral",
            "Domínio Verde"
        ],
        "ub": [
            {
                "dano": 8,
                "forca": 6,
                "inteligencia": 6,
                "precisao": 5,
                "mana": 0,
                "nivel": 20
            },
            {
                "dano": 10,
                "forca": 4,
                "inteligencia": 6,
                "precisao": 5,
                "mana": 0,
                "nivel": 40
            },
            {
                "dano": 12,
                "forca": 4,
                "inteligencia": 6,
                "precisao": 5,
                "mana": 0,
                "nivel": 60
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
            "Reflexo Voltaico",
            "Carga Estática",
            "Reflexo do Raio"
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
            },
            {
                "agilidade": 6,
                "precisao": 5
            },
            {
                "dano": 6,
                "evasao": 5
            }
        ],
        "u": [
            "Senhor do Trovão",
            "Céu Tempestuoso",
            "Raio Primordial"
        ],
        "ub": [
            {
                "dano": 8,
                "forca": 6,
                "inteligencia": 6,
                "precisao": 5,
                "mana": 0,
                "nivel": 20
            },
            {
                "dano": 10,
                "forca": 4,
                "inteligencia": 6,
                "precisao": 5,
                "mana": 0,
                "nivel": 40
            },
            {
                "dano": 12,
                "forca": 4,
                "inteligencia": 6,
                "precisao": 5,
                "mana": 0,
                "nivel": 60
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
            "Brilho Interior",
            "Radiação Benigna",
            "Fé Solar"
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
            },
            {
                "resistencia": 6,
                "vida": 5
            },
            {
                "inteligencia": 6,
                "precisao": 4
            }
        ],
        "u": [
            "Avatar da Luz",
            "Sol Eterno",
            "Julgamento Solar"
        ],
        "ub": [
            {
                "dano": 8,
                "forca": 6,
                "inteligencia": 6,
                "precisao": 5,
                "mana": 0,
                "nivel": 20
            },
            {
                "dano": 10,
                "forca": 4,
                "inteligencia": 6,
                "precisao": 5,
                "mana": 0,
                "nivel": 40
            },
            {
                "dano": 12,
                "forca": 4,
                "inteligencia": 6,
                "precisao": 5,
                "mana": 0,
                "nivel": 60
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
            "Predador Noturno",
            "Véu Profundo",
            "Instinto Noturno"
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
            },
            {
                "evasao": 7,
                "resistencia": 5
            },
            {
                "agilidade": 6,
                "dano": 5
            }
        ],
        "u": [
            "Senhor das Sombras",
            "Abismo Sombrio",
            "Eclipse Absoluto"
        ],
        "ub": [
            {
                "dano": 8,
                "forca": 6,
                "inteligencia": 6,
                "precisao": 5,
                "mana": 0,
                "nivel": 20
            },
            {
                "dano": 10,
                "forca": 4,
                "inteligencia": 6,
                "precisao": 5,
                "mana": 0,
                "nivel": 40
            },
            {
                "dano": 12,
                "forca": 4,
                "inteligencia": 6,
                "precisao": 5,
                "mana": 0,
                "nivel": 60
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
            "Mira Fria",
            "Mão Firme",
            "Caçador Nato"
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
            },
            {
                "precisao": 7,
                "agilidade": 5
            },
            {
                "dano": 5,
                "precisao": 6
            }
        ],
        "u": [
            "Olho do Mestre",
            "Flecha Suprema",
            "Caçador Perfeito"
        ],
        "ub": [
            {
                "dano": 8,
                "forca": 6,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 20
            },
            {
                "dano": 10,
                "forca": 4,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 40
            },
            {
                "dano": 12,
                "forca": 4,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 60
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
            "Oportunista",
            "Passo Silencioso",
            "Golpe Oportuno"
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
            },
            {
                "agilidade": 7,
                "evasao": 6
            },
            {
                "dano": 7,
                "sorte": 5
            }
        ],
        "u": [
            "Mestre do Silêncio",
            "Sombra Absoluta",
            "Execução Perfeita"
        ],
        "ub": [
            {
                "dano": 8,
                "forca": 6,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 20
            },
            {
                "dano": 10,
                "forca": 4,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 40
            },
            {
                "dano": 12,
                "forca": 4,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 60
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
            "Última Defesa",
            "Escudo Vivo",
            "Muralha Interior"
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
            },
            {
                "defesa": 7,
                "vida": 6
            },
            {
                "resistencia": 7,
                "defesa": 5
            }
        ],
        "u": [
            "Guardião Supremo",
            "Bastião Eterno",
            "Muralha Absoluta"
        ],
        "ub": [
            {
                "dano": 8,
                "forca": 6,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 20
            },
            {
                "dano": 10,
                "forca": 4,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 40
            },
            {
                "dano": 12,
                "forca": 4,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 60
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
            "Instinto Selvagem",
            "Adrenalina",
            "Resistência Selvagem"
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
            },
            {
                "forca": 7,
                "dano": 5
            },
            {
                "vida": 7,
                "resistencia": 5
            }
        ],
        "u": [
            "Fúria Suprema",
            "Berserker Ancestral",
            "Força Selvagem"
        ],
        "ub": [
            {
                "dano": 8,
                "forca": 6,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 20
            },
            {
                "dano": 10,
                "forca": 4,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 40
            },
            {
                "dano": 12,
                "forca": 4,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 60
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
            "Reflexo Marcial",
            "Disciplina Marcial",
            "Fôlego de Combate"
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
            },
            {
                "agilidade": 7,
                "defesa": 4
            },
            {
                "vida": 6,
                "forca": 5
            }
        ],
        "u": [
            "Mestre Marcial",
            "Punho Supremo",
            "Corpo Perfeito"
        ],
        "ub": [
            {
                "dano": 8,
                "forca": 6,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 20
            },
            {
                "dano": 10,
                "forca": 4,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 40
            },
            {
                "dano": 12,
                "forca": 4,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 60
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
            "Mestre da Forja",
            "Metal Vivo",
            "Forja Resistente"
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
            },
            {
                "defesa": 7,
                "resistencia": 6
            },
            {
                "forca": 6,
                "vida": 5
            }
        ],
        "u": [
            "Mestre da Forja",
            "Forja Ancestral",
            "Arsenal Perfeito"
        ],
        "ub": [
            {
                "dano": 8,
                "forca": 6,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 20
            },
            {
                "dano": 10,
                "forca": 4,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 40
            },
            {
                "dano": 12,
                "forca": 4,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 60
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
            "Caçador de Monstros",
            "Rastreador Perfeito",
            "Predador Nato"
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
            },
            {
                "precisao": 7,
                "dano": 5
            },
            {
                "sorte": 6,
                "agilidade": 5
            }
        ],
        "u": [
            "Mestre Rastreador",
            "Predador Supremo",
            "Caçada Perfeita"
        ],
        "ub": [
            {
                "dano": 8,
                "forca": 6,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 20
            },
            {
                "dano": 10,
                "forca": 4,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 40
            },
            {
                "dano": 12,
                "forca": 4,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 60
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
            "Predador Carmesim",
            "Frenesi Carmesim",
            "Sede de Batalha"
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
            },
            {
                "forca": 7,
                "dano": 6
            },
            {
                "vida": 6,
                "agilidade": 5
            }
        ],
        "u": [
            "Rei Carmesim",
            "Sangue Ancestral",
            "Dança da Morte"
        ],
        "ub": [
            {
                "dano": 8,
                "forca": 6,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 20
            },
            {
                "dano": 10,
                "forca": 4,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 40
            },
            {
                "dano": 12,
                "forca": 4,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 60
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
            "Equilíbrio Arcano",
            "Sintonia Arcana",
            "Lâmina Equilibrada"
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
            },
            {
                "inteligencia": 6,
                "forca": 5
            },
            {
                "dano": 5,
                "mana": 6
            }
        ],
        "u": [
            "Mestre do Éter",
            "Lâmina Suprema",
            "Equilíbrio Perfeito"
        ],
        "ub": [
            {
                "dano": 8,
                "forca": 6,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 20
            },
            {
                "dano": 10,
                "forca": 4,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 40
            },
            {
                "dano": 12,
                "forca": 4,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 60
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
            "Fúria Incandescente",
            "Brasa Viva",
            "Sangue Vulcânico"
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
            },
            {
                "dano": 7,
                "forca": 5
            },
            {
                "vida": 6,
                "resistencia": 5
            }
        ],
        "u": [
            "Rei da Lava",
            "Coração Vulcânico",
            "Erupção Suprema"
        ],
        "ub": [
            {
                "dano": 8,
                "forca": 6,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 20
            },
            {
                "dano": 10,
                "forca": 4,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 40
            },
            {
                "dano": 12,
                "forca": 4,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 60
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
            "Coração de Gelo",
            "Frio Absoluto",
            "Geada Persistente"
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
            },
            {
                "resistencia": 7,
                "defesa": 5
            },
            {
                "controle": 5,
                "dano": 5
            }
        ],
        "u": [
            "Rei do Inverno",
            "Gelo Absoluto",
            "Era Glacial"
        ],
        "ub": [
            {
                "dano": 8,
                "forca": 6,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 20
            },
            {
                "dano": 10,
                "forca": 4,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 40
            },
            {
                "dano": 12,
                "forca": 4,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 60
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
            "Vontade de Pedra",
            "Fundação de Pedra",
            "Peso Titânico"
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
            },
            {
                "defesa": 8,
                "resistencia": 6
            },
            {
                "vida": 7,
                "agilidade": -1
            }
        ],
        "u": [
            "Titã do Monólito",
            "Corpo de Montanha",
            "Impacto Primordial"
        ],
        "ub": [
            {
                "dano": 8,
                "forca": 6,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 20
            },
            {
                "dano": 10,
                "forca": 4,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 40
            },
            {
                "dano": 12,
                "forca": 4,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 60
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
            "Instinto Aéreo",
            "Corrente Favorável",
            "Passo do Céu"
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
            },
            {
                "agilidade": 7,
                "evasao": 5
            },
            {
                "velocidade": 7,
                "precisao": 5
            }
        ],
        "u": [
            "Mestre Celeste",
            "Lâmina do Céu",
            "Tempestade Suprema"
        ],
        "ub": [
            {
                "dano": 8,
                "forca": 6,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 20
            },
            {
                "dano": 10,
                "forca": 4,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 40
            },
            {
                "dano": 12,
                "forca": 4,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 60
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
            "Carga Tempestuosa",
            "Carga Elétrica",
            "Reflexo Trovejante"
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
            },
            {
                "agilidade": 7,
                "dano": 5
            },
            {
                "precisao": 6,
                "evasao": 5
            }
        ],
        "u": [
            "Rei do Relâmpago",
            "Lâmina Voltaica Suprema",
            "Tempestade Primordial"
        ],
        "ub": [
            {
                "dano": 8,
                "forca": 6,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 20
            },
            {
                "dano": 10,
                "forca": 4,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 40
            },
            {
                "dano": 12,
                "forca": 4,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 60
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
            "Pressão Abissal",
            "Fluxo Profundo",
            "Pressão das Marés"
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
            },
            {
                "resistencia": 7,
                "vida": 5
            },
            {
                "dano": 5,
                "defesa": 5
            }
        ],
        "u": [
            "Rei das Marés",
            "Lâmina Abissal Suprema",
            "Oceano Primordial"
        ],
        "ub": [
            {
                "dano": 8,
                "forca": 6,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 20
            },
            {
                "dano": 10,
                "forca": 4,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 40
            },
            {
                "dano": 12,
                "forca": 4,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 60
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
            "Espírito da Floresta",
            "Broto Eterno",
            "Casca Natural"
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
            },
            {
                "vida": 8,
                "resistencia": 5
            },
            {
                "defesa": 6,
                "vida": 6
            }
        ],
        "u": [
            "Rei da Floresta",
            "Lâmina Ancestral",
            "Avatar Verdejante"
        ],
        "ub": [
            {
                "dano": 8,
                "forca": 6,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 20
            },
            {
                "dano": 10,
                "forca": 4,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 40
            },
            {
                "dano": 12,
                "forca": 4,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 60
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
            "Espírito Solar",
            "Luz Interior",
            "Bênção Solar"
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
            },
            {
                "resistencia": 6,
                "inteligencia": 5
            },
            {
                "vida": 6,
                "dano": 5
            }
        ],
        "u": [
            "Rei da Aurora",
            "Lâmina Solar Suprema",
            "Luz Primordial"
        ],
        "ub": [
            {
                "dano": 8,
                "forca": 6,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 20
            },
            {
                "dano": 10,
                "forca": 4,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 40
            },
            {
                "dano": 12,
                "forca": 4,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 60
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
            "Véu Sombrio",
            "Sombra Persistente",
            "Instinto do Eclipse"
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
            },
            {
                "evasao": 7,
                "agilidade": 6
            },
            {
                "dano": 6,
                "resistencia": 5
            }
        ],
        "u": [
            "Rei do Eclipse",
            "Lâmina do Vazio",
            "Noite Primordial"
        ],
        "ub": [
            {
                "dano": 8,
                "forca": 6,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 20
            },
            {
                "dano": 10,
                "forca": 4,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 40
            },
            {
                "dano": 12,
                "forca": 4,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 60
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
            "Mestre dos Elixires",
            "Reação Perfeita",
            "Catalisador"
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
            },
            {
                "inteligencia": 7,
                "sorte": 5
            },
            {
                "mana": 7,
                "dano": 4
            }
        ],
        "u": [
            "Mestre da Transmutação",
            "Alquimia Ancestral",
            "Pedra Filosofal"
        ],
        "ub": [
            {
                "dano": 8,
                "forca": 6,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 20
            },
            {
                "dano": 10,
                "forca": 4,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 40
            },
            {
                "dano": 12,
                "forca": 4,
                "inteligencia": 3,
                "precisao": 5,
                "mana": 0,
                "nivel": 60
            }
        ]
    }
};
