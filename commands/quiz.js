const { EmbedBuilder } = require('discord.js');
const eter = require('../utils/eter');

/** @type {Map<string, object>} */
const sessions = new Map();

const TIME_MS = 30_000;
const NEXT_DELAY_MS = 10_000;
const REWARD_MIN = 400;
const REWARD_MAX = 1800;

const CATEGORIES = {
    matematica: {
        name: 'Matemática',
        emoji: '📐',
        aliases: ['mat', 'math', 'matematica', 'cálculo', 'calculo']
    },
    geral: {
        name: 'Conhecimentos gerais',
        emoji: '🌍',
        aliases: ['geral', 'gk', 'conhecimentos', 'misc']
    },
    esportes: {
        name: 'Esportes',
        emoji: '⚽',
        aliases: ['esporte', 'esportes', 'sport', 'sports', 'futebol']
    },
    ciencias: {
        name: 'Ciências',
        emoji: '🔬',
        aliases: ['ciencia', 'ciências', 'ciencias', 'science']
    },
    historia: {
        name: 'História',
        emoji: '📜',
        aliases: ['historia', 'história', 'history']
    },
    geografia: {
        name: 'Geografia',
        emoji: '🗺️',
        aliases: ['geo', 'geografia', 'geography']
    },
    anime: {
        name: 'Anime & Games',
        emoji: '🎮',
        aliases: ['anime', 'manga', 'games', 'game', 'otaku']
    },
    tecnologia: {
        name: 'Tecnologia',
        emoji: '💻',
        aliases: ['tech', 'tecnologia', 'ti', 'informatica', 'informática']
    },
    portugues: {
        name: 'Português',
        emoji: '📚',
        aliases: ['portugues', 'português', 'gramatica', 'gramática', 'lingua', 'língua']
    },
    literatura: {
        name: 'Literatura',
        emoji: '✒️',
        aliases: ['literatura', 'livros', 'literatura brasileira']
    },
    musica: {
        name: 'Música',
        emoji: '🎵',
        aliases: ['musica', 'música', 'music']
    },
    cinema: {
        name: 'Cinema & Séries',
        emoji: '🎬',
        aliases: ['cinema', 'filmes', 'filme', 'series', 'séries', 'tv']
    },
    natureza: {
        name: 'Natureza & Animais',
        emoji: '🌿',
        aliases: ['natureza', 'animais', 'animal', 'fauna', 'flora']
    },
    logica: {
        name: 'Lógica',
        emoji: '🧩',
        aliases: ['logica', 'lógica', 'raciocinio', 'raciocínio', 'enigmas']
    }
};

const BANK = {
    matematica: [
        { q: 'Quanto é 15 × 4?', a: ['60'] },
        { q: 'Quanto é 12 × 12?', a: ['144'] },
        { q: 'Raiz quadrada de 81?', a: ['9', 'nove'] },
        { q: 'Quanto é 7 × 8?', a: ['56'] },
        { q: 'Quanto é 100 ÷ 4?', a: ['25'] },
        { q: 'Quanto é 9² (9 ao quadrado)?', a: ['81'] },
        { q: 'Quanto é 5! (fatorial de 5)?', a: ['120'] },
        { q: 'Quanto é 2³ (2 ao cubo)?', a: ['8', 'oito'] },
        { q: 'Quanto é 50% de 90?', a: ['45'] },
        { q: 'Quanto é 3/4 de 40?', a: ['30'] },
        { q: 'Soma dos ângulos internos de um triângulo (em graus)?', a: ['180'] },
        { q: 'Quantos lados tem um hexágono?', a: ['6', 'seis'] },
        { q: 'Quanto é 11 × 11?', a: ['121'] },
        { q: 'Quanto é 25 × 4?', a: ['100'] },
        { q: 'Quanto é 1 + 2 + 3 + 4 + 5?', a: ['15'] }
    ],
    geral: [
        { q: 'Qual é a capital do Brasil?', a: ['brasilia', 'brasília'] },
        { q: 'Qual é o maior oceano do planeta?', a: ['pacifico', 'pacífico'] },
        { q: 'Quantos continentes existem (modelo tradicional)?', a: ['7', 'sete'] },
        { q: 'Qual idioma é falado em Portugal?', a: ['portugues', 'português'] },
        { q: 'Em que país fica a Torre Eiffel?', a: ['franca', 'frança', 'france'] },
        { q: 'Qual é o animal conhecido como rei da selva?', a: ['leao', 'leão'] },
        { q: 'Quantos dias tem um ano bissexto?', a: ['366'] },
        { q: 'Qual é a cor do céu em um dia ensolarado (geralmente)?', a: ['azul'] },
        { q: 'Qual instrumento tem teclas pretas e brancas?', a: ['piano', 'teclado'] },
        { q: 'Qual é o oposto de frio?', a: ['quente', 'calor'] },
        { q: 'Quantos minutos tem uma hora?', a: ['60', 'sessenta'] },
        { q: 'Qual metal é representado pelo símbolo Au?', a: ['ouro'] }
    ],
    esportes: [
        { q: 'Quantos jogadores um time de futebol tem em campo?', a: ['11', 'onze'] },
        { q: 'Em que esporte se usa uma raquete e uma peteca?', a: ['badminton'] },
        { q: 'Quantos sets são necessários para vencer um jogo de vôlei (melhor de 5)?', a: ['3', 'tres', 'três'] },
        { q: 'Qual país venceu a Copa do Mundo de 2002?', a: ['brasil'] },
        { q: 'Em que esporte Michael Jordan ficou famoso?', a: ['basquete', 'basketball', 'nba'] },
        { q: 'Quantos pontos vale um try no rugby (sem conversão)?', a: ['5', 'cinco'] },
        { q: 'Qual esporte é praticado em Wimbledon?', a: ['tenis', 'tênis'] },
        { q: 'Em que esporte se grita "strike"?', a: ['boliche', 'bowling', 'beisebol', 'baseball'] },
        { q: 'Quantos rounds tem uma luta padrão de boxe olímpico moderno (aprox.)?', a: ['3', 'tres', 'três'] },
        { q: 'Qual esporte usa um taco e uma bola pequena branca nos greens?', a: ['golfe', 'golf'] },
        { q: 'Em futebol, quantos tempos oficiais tem uma partida?', a: ['2', 'dois'] },
        { q: 'Qual país é famoso pelo sumô?', a: ['japao', 'japão'] }
    ],
    ciencias: [
        { q: 'Qual planeta é conhecido como Planeta Vermelho?', a: ['marte'] },
        { q: 'Qual é o símbolo químico da água?', a: ['h2o'] },
        { q: 'Qual gás os humanos precisam para respirar?', a: ['oxigenio', 'oxigênio', 'o2'] },
        { q: 'Qual é o maior planeta do Sistema Solar?', a: ['jupiter', 'júpiter'] },
        { q: 'A velocidade da luz no vácuo é cerca de 300 mil km por…?', a: ['segundo', 'seg'] },
        { q: 'Quantos cromossomos tem um ser humano (pares × 2)?', a: ['46'] },
        { q: 'Qual é a estrela mais próxima da Terra?', a: ['sol'] },
        { q: 'H2SO4 é a fórmula de qual ácido comum?', a: ['sulfurico', 'sulfúrico', 'acido sulfurico', 'ácido sulfúrico'] },
        { q: 'Qual órgão bombeia sangue no corpo?', a: ['coracao', 'coração'] },
        { q: 'Qual partícula tem carga negativa no átomo?', a: ['eletron', 'elétron'] }
    ],
    historia: [
        { q: 'Em que ano o Brasil foi descoberto pelos portugueses (oficial)?', a: ['1500'] },
        { q: 'Quem foi o primeiro presidente dos EUA?', a: ['washington', 'george washington'] },
        { q: 'A Segunda Guerra Mundial terminou em que ano?', a: ['1945'] },
        { q: 'Qual muro caiu em 1989?', a: ['berlim', 'muro de berlim'] },
        { q: 'Quem pintou a Mona Lisa?', a: ['leonardo da vinci', 'da vinci', 'leonardo'] },
        { q: 'Qual império construiu o Coliseu?', a: ['romano', 'roma', 'imperio romano', 'império romano'] },
        { q: 'Em que século ocorreu a Revolução Francesa (número)?', a: ['18', 'xviii'] },
        { q: 'Quem foi conhecido como o Rei do Pop?', a: ['michael jackson', 'jackson'] },
        { q: 'Qual nave levou o homem à Lua em 1969 (Apollo…)?', a: ['11', 'apollo 11', 'apollo11'] },
        { q: 'Qual país colonizou o Brasil?', a: ['portugal'] }
    ],
    geografia: [
        { q: 'Qual é o maior país do mundo em área?', a: ['russia', 'rússia'] },
        { q: 'Qual é o rio mais longo do mundo (disputado com Amazonas)?', a: ['nilo', 'amazonas'] },
        { q: 'Qual deserto é o maior quente do mundo?', a: ['saara', 'saará', 'sahara'] },
        { q: 'Qual é a capital da Argentina?', a: ['buenos aires'] },
        { q: 'Em que continente fica o Egito?', a: ['africa', 'áfrica'] },
        { q: 'Qual oceano banha o litoral leste do Brasil?', a: ['atlantico', 'atlântico'] },
        { q: 'Qual é a capital do Japão?', a: ['toquio', 'tóquio', 'tokyo'] },
        { q: 'Qual montanha é a mais alta do mundo?', a: ['everest', 'monte everest'] },
        { q: 'Qual é o menor continente?', a: ['oceania', 'australia', 'austrália'] },
        { q: 'Qual país tem formato de bota na Europa?', a: ['italia', 'itália'] }
    ],
    anime: [
        { q: 'Quem é o protagonista de Naruto?', a: ['naruto', 'naruto uzumaki'] },
        { q: 'Em Pokémon, qual é o número 25 da Pokédex nacional?', a: ['pikachu'] },
        { q: 'Qual anime tem o pirate Monkey D. Luffy?', a: ['one piece'] },
        { q: 'Em Dragon Ball, qual é a transformação dourada mais famosa do Goku?', a: ['super saiyajin', 'super sayajin', 'ssj', 'super saiyan'] },
        { q: 'Qual jogo tem o personagem Master Chief?', a: ['halo'] },
        { q: 'Em Minecraft, qual minério é roxo do End?', a: ['quartzo do end', 'end stone', 'purpur', 'shulker'] },
        { q: 'Qual anime se passa em uma escola de heróis com Midoriya?', a: ['boku no hero', 'my hero academia', 'bnha', 'hero academia'] },
        { q: 'Quem criou o Mario?', a: ['miyamoto', 'shigeru miyamoto', 'nintendo'] },
        { q: 'Em Free Fire / BGs, como se chama a queda do mapa?', a: ['zona', 'gas', 'gás', 'safe'] },
        { q: 'Qual console da Sony veio depois do PS4?', a: ['ps5', 'playstation 5'] }
    ],
    tecnologia: [
        { q: 'O que significa a sigla CPU?', a: ['unidade central de processamento', 'central processing unit', 'processador'] },
        { q: 'Qual empresa criou o Windows?', a: ['microsoft'] },
        { q: 'Qual linguagem é famosa por usar indentacão obrigatória?', a: ['python'] },
        { q: 'O que significa WWW?', a: ['world wide web'] },
        { q: 'Qual empresa fabricou o iPhone?', a: ['apple'] },
        { q: 'HTML é principalmente usada para…?', a: ['sites', 'paginas', 'páginas', 'web', 'estrutura de paginas', 'estrutura'] },
        { q: 'Qual símbolo inicia a maioria dos comentários de uma linha em JavaScript?', a: ['//'] },
        { q: 'Git é uma ferramenta de…?', a: ['versao', 'versão', 'controle de versao', 'controle de versão', 'versionamento'] },
        { q: 'Quantos bits tem 1 byte?', a: ['8', 'oito'] },
        { q: 'Qual navegador é feito pela Google?', a: ['chrome', 'google chrome'] }
    ]
};

// Geradores de perguntas: além do banco fixo, estas categorias criam
// variações novas a cada rodada, evitando um quiz com fim prático.
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function generatedQuestion(catId) {
    switch (catId) {
        case 'matematica': {
            const type = randInt(1, 6);
            if (type === 1) {
                const a = randInt(2, 99), b = randInt(2, 99);
                return { q: `Quanto é ${a} × ${b}?`, a: [String(a * b)] };
            }
            if (type === 2) {
                const b = randInt(2, 30), result = randInt(2, 40), a = b * result;
                return { q: `Quanto é ${a} ÷ ${b}?`, a: [String(result)] };
            }
            if (type === 3) {
                const n = randInt(2, 30);
                return { q: `Quanto é ${n}² (${n} ao quadrado)?`, a: [String(n * n)] };
            }
            if (type === 4) {
                const p = randInt(5, 95), n = randInt(20, 500);
                const base = Math.floor((n * p) / 100);
                return { q: `Quanto é ${p}% de ${n}?`, a: [String(base)] };
            }
            if (type === 5) {
                const a = randInt(1, 40), b = randInt(1, 40), c = randInt(1, 40);
                return { q: `Quanto é ${a} + ${b} + ${c}?`, a: [String(a + b + c)] };
            }
            const n = randInt(2, 20);
            return { q: `Quanto é ${n}³ (${n} ao cubo)?`, a: [String(n ** 3)] };
        }
        case 'geral': {
            const facts = [
                ['Qual é a capital do Chile?', ['santiago']],
                ['Qual é a capital do Canadá?', ['ottawa']],
                ['Qual é a capital da Austrália?', ['canberra']],
                ['Qual é a capital da Alemanha?', ['berlim', 'berlin']],
                ['Qual é a capital da Itália?', ['roma', 'rome']],
                ['Qual é a capital da Espanha?', ['madrid']],
                ['Qual é a capital do México?', ['cidade do mexico', 'cidade do méxico']],
                ['Qual é a capital da Colômbia?', ['bogota', 'bogotá']],
                ['Qual é a capital do Peru?', ['lima']],
                ['Qual é a capital do Uruguai?', ['montevideu', 'montevideo']],
                ['Qual é a capital do Paraguai?', ['assuncao', 'assunção']],
                ['Qual é a capital da Coreia do Sul?', ['seul', 'seoul']],
                ['Qual é a capital da China?', ['pequim', 'beijing']],
                ['Qual é a capital da Índia?', ['nova delhi', 'new delhi']],
                ['Qual é a capital da Noruega?', ['oslo']],
                ['Qual é a capital da Suécia?', ['estocolmo', 'stockholm']],
                ['Qual é a capital da Grécia?', ['atenas', 'athens']],
                ['Qual é a capital da Turquia?', ['ancara', 'ankara']]
            ];
            const [q, a] = facts[randInt(0, facts.length - 1)];
            return { q, a };
        }
        case 'portugues': {
            const items = [
                ['Qual é o plural de “cidadão”?', ['cidadaos', 'cidadãos']],
                ['Qual é o antônimo de “generoso”?', ['egoista', 'egoísta']],
                ['Qual é o sinônimo de “rápido”?', ['veloz']],
                ['Qual é o aumentativo de “casa”?', ['casarão', 'casarao']],
                ['Qual é o diminutivo de “flor”?', ['florzinha']],
                ['Qual é a classe gramatical de “feliz” em “ela está feliz”?', ['adjetivo']],
                ['Qual é a classe gramatical de “rapidamente”?', ['adverbio', 'advérbio']],
                ['Qual é o plural de “papel”?', ['papeis', 'papéis']],
                ['Qual é o plural de “animal”?', ['animais']],
                ['Qual é o contrário de “aceitar”?', ['recusar']],
                ['Qual é o feminino de “ator”?', ['atriz']],
                ['Qual é o coletivo de “peixes”?', ['cardume']]
            ];
            const [q, a] = items[randInt(0, items.length - 1)];
            return { q, a };
        }
        case 'literatura': {
            const items = [
                ['Quem escreveu “Dom Casmurro”?', ['machado de assis', 'machado']],
                ['Quem escreveu “O Cortiço”?', ['aluísio azevedo', 'aluisio azevedo']],
                ['Quem escreveu “Vidas Secas”?', ['graciliano ramos']],
                ['Quem escreveu “Iracema”?', ['jose de alencar', 'josé de alencar']],
                ['Quem escreveu “O Alienista”?', ['machado de assis', 'machado']],
                ['Quem escreveu “Grande Sertão: Veredas”?', ['guimaraes rosa', 'guimarães rosa']],
                ['Quem escreveu “A Hora da Estrela”?', ['clarice lispector']],
                ['Quem escreveu “Capitães da Areia”?', ['jorge amado']]
            ];
            return items[randInt(0, items.length - 1)].slice().map((x) => x);
        }
        case 'musica': {
            const items = [
                ['Qual instrumento possui cordas e é tocado com arco?', ['violino']],
                ['Quantas cordas tem um violão tradicional?', ['6', 'seis']],
                ['Qual instrumento é conhecido por ter teclas e pedais?', ['piano']],
                ['Como se chama a pessoa que rege uma orquestra?', ['maestro', 'maestrina']],
                ['Qual é o nome da velocidade de uma música?', ['andamento', 'tempo']],
                ['Como se chama o conjunto de cinco linhas da escrita musical?', ['pentagrama']],
                ['Qual instrumento de sopro é feito tradicionalmente de metal e tem bocal?', ['trompete']],
                ['Qual é o nome da pessoa que compõe músicas?', ['compositor', 'compositora']]
            ];
            return items[randInt(0, items.length - 1)].slice().map((x) => x);
        }
        case 'cinema': {
            const items = [
                ['Qual personagem vive em Gotham City e combate o crime?', ['batman']],
                ['Qual filme apresenta o personagem Jack Sparrow?', ['piratas do caribe', 'piratas do caribe']],
                ['Qual é o nome do ogro protagonista de uma famosa animação da DreamWorks?', ['shrek']],
                ['Qual saga apresenta a escola Hogwarts?', ['harry potter']],
                ['Qual personagem é conhecido por usar um escudo com uma estrela?', ['capitao america', 'capitão américa']],
                ['Qual é o nome do brinquedo cowboy de Toy Story?', ['woody']],
                ['Qual personagem da Pixar é um robô que compacta lixo?', ['wall-e', 'wall e']],
                ['Em qual cidade fictícia vive o Superman?', ['metropolis', 'metrópolis']]
            ];
            return items[randInt(0, items.length - 1)].slice().map((x) => x);
        }
        case 'natureza': {
            const items = [
                ['Qual é o maior animal terrestre?', ['elefante africano', 'elefante']],
                ['Qual é o maior animal conhecido do planeta?', ['baleia azul']],
                ['Qual mamífero é famoso por botar ovos?', ['ornitorrinco']],
                ['Qual é o processo pelo qual plantas produzem alimento usando luz?', ['fotossintese', 'fotossíntese']],
                ['Qual é o animal terrestre mais rápido?', ['guepardo', 'chita']],
                ['Qual é o maior felino do mundo?', ['tigre']],
                ['Qual ave é conhecida por não voar e viver na Antártida?', ['pinguim']],
                ['Como se chama a transformação de lagarta em borboleta?', ['metamorfose']]
            ];
            return items[randInt(0, items.length - 1)].slice().map((x) => x);
        }
        case 'logica': {
            const type = randInt(1, 4);
            if (type === 1) {
                const start = randInt(1, 20), step = randInt(2, 10);
                const answer = start + step * 3;
                return { q: `Complete a sequência: ${start}, ${start + step}, ${start + step * 2}, ?`, a: [String(answer)] };
            }
            if (type === 2) {
                const n = randInt(2, 12);
                return { q: `Se há ${n} caixas com 2 objetos em cada uma, quantos objetos há ao todo?`, a: [String(n * 2)] };
            }
            if (type === 3) {
                const a = randInt(3, 12), b = randInt(3, 12);
                return { q: `Um número somado a ${a} resulta em ${a + b}. Qual é o número?`, a: [String(b)] };
            }
            const a = randInt(2, 9), b = randInt(2, 9);
            return { q: `Se A = ${a} e B = ${b}, quanto vale A × B + A?`, a: [String(a * b + a)] };
        }
        default:
            return null;
    }
}

const WIN_PHRASES = [
    '🔥 **{user}** mandou bem!',
    '⚡ Resposta relâmpago de **{user}**!',
    '🏆 **{user}** pontuou!',
    '🧠 Cérebro ligado: **{user}** acertou!',
    '✨ **{user}** não perdoa!',
    '🚀 **{user}** voou na resposta!'
];

const END_PHRASES = [
    'Quiz encerrado! Vejam quem brilhou:',
    'Acabou o tempo. Ranking final:',
    'Fim de jogo! Placar oficial:',
    'Silêncio no estúdio… resultados:'
];

function norm(s) {
    return String(s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function resolveCategory(input) {
    const t = norm(input);
    if (!t) return 'geral';
    for (const [id, meta] of Object.entries(CATEGORIES)) {
        if (id === t || meta.aliases.some((a) => norm(a) === t)) return id;
    }
    return null;
}

function pickQuestion(catId, used) {
    const pool = BANK[catId] || BANK.geral;

    // Categorias com geração dinâmica têm um número praticamente ilimitado
    // de combinações. O texto da pergunta é usado para evitar repetições.
    if (typeof generatedQuestion === 'function') {
        for (let attempt = 0; attempt < 30; attempt += 1) {
            const generated = generatedQuestion(catId);
            if (generated && generated.q && generated.a?.length) {
                const key = `${catId}:generated:${generated.q}`;
                if (!used.has(key)) {
                    used.add(key);
                    return generated;
                }
            }
        }
    }

    const available = pool.filter((_, i) => !used.has(`${catId}:${i}`));
    const list = available.length ? available : pool;
    if (!available.length) used.clear();
    const item = list[Math.floor(Math.random() * list.length)];
    const idx = pool.indexOf(item);
    if (idx >= 0) used.add(`${catId}:${idx}`);
    return item;
}

function rewardAmount() {
    return REWARD_MIN + Math.floor(Math.random() * (REWARD_MAX - REWARD_MIN + 1));
}

function scoreLines(scores) {
    const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    if (!sorted.length) return '_Ninguém pontuou desta vez._';
    return sorted
        .slice(0, 15)
        .map(([id, pts], i) => {
            const medal = ['🥇', '🥈', '🥉'][i] || `**${i + 1}.**`;
            return `${medal} <@${id}> — **${pts}** ponto${pts === 1 ? '' : 's'}`;
        })
        .join('\n');
}

function questionEmbed(session, item) {
    const meta = CATEGORIES[session.catId];
    return new EmbedBuilder()
        .setColor(0xa78bfa)
        .setTitle(`${meta.emoji} Quiz · ${meta.name}`)
        .setDescription(
            [
                `**Pergunta ${session.round}**`,
                '',
                `### ${item.q}`,
                '',
                `⏱️ **${TIME_MS / 1000}s** para responder neste canal`,
                `🎁 Acerto: ${eter.format(session.reward)}`,
                '',
                '_Qualquer pessoa do canal pode responder. Erros são ignorados._',
                '_O quiz só termina quando o tempo esgota sem acerto (ou com `O.quiz parar`)._'
            ].join('\n')
        )
        .setFooter({
            text: `Canal exclusivo · ${session.round > 1 ? 'Nova pergunta' : 'Quiz iniciado'}`
        })
        .setTimestamp();
}

async function endSession(channel, session, reason) {
    if (session.collector) {
        try {
            session.collector.stop('end');
        } catch (_) {}
    }
    sessions.delete(channel.id);

    const phrase = END_PHRASES[Math.floor(Math.random() * END_PHRASES.length)];
    const meta = CATEGORIES[session.catId];

    let topBonus = '';
    const sorted = [...session.scores.entries()].sort((a, b) => b[1] - a[1]);
    if (sorted.length && sorted[0][1] > 0) {
        const [winnerId, pts] = sorted[0];
        const bonus = 500 + pts * 200;
        try {
            eter.add(winnerId, bonus, { reason: 'quiz_top' });
        } catch (_) {}
        topBonus = `\n\n🏆 <@${winnerId}> levou **+${bonus.toLocaleString('pt-BR')} éter** de bônus pelo 1º lugar!`;
    }

    const emb = new EmbedBuilder()
        .setColor(0xfbbf24)
        .setTitle(`${meta.emoji} Fim do quiz · ${meta.name}`)
        .setDescription(
            [
                phrase,
                reason === 'timeout'
                    ? `_Tempo esgotado na pergunta ${session.round} · ${session.round} pergunta(s) no total._`
                    : reason === 'stop'
                      ? `_Quiz interrompido após ${session.round} pergunta(s)._`
                      : '',
                '',
                '**Ranking da partida**',
                scoreLines(session.scores),
                topBonus
            ]
                .filter(Boolean)
                .join('\n')
        )
        .setFooter({ text: 'Use O.quiz [categoria] para jogar de novo' })
        .setTimestamp();

    await channel.send({ embeds: [emb] }).catch(() => {});
}

function startCollector(channel, session) {
    if (session.collector) {
        try {
            session.collector.stop('replace');
        } catch (_) {}
    }

    const collector = channel.createMessageCollector({
        filter: (m) => !m.author.bot && m.channel.id === channel.id,
        time: TIME_MS
    });
    session.collector = collector;
    session.answered = false;

    collector.on('collect', async (m) => {
        if (session.answered) return;
        if (!sessions.has(channel.id)) return;

        const text = norm(m.content);
        if (!text) return;

        const ok = session.answers.some((a) => {
            const na = norm(a);
            return text === na || text.includes(na);
        });

        // erro → silêncio total
        if (!ok) return;

        session.answered = true;
        collector.stop('win');

        const prev = session.scores.get(m.author.id) || 0;
        session.scores.set(m.author.id, prev + 1);

        try {
            eter.add(m.author.id, session.reward, { reason: 'quiz' });
        } catch (_) {}

        const phrase = WIN_PHRASES[Math.floor(Math.random() * WIN_PHRASES.length)].replace(
            '{user}',
            `${m.author}`
        );

        await channel
            .send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x34d399)
                        .setDescription(
                            [
                                phrase,
                                '',
                                `✅ Resposta: **${session.answers[0]}**`,
                                `🎁 +**${session.reward.toLocaleString('pt-BR')}** éter`,
                                `📊 Pontos de ${m.author}: **${prev + 1}**`,
                                '',
                                `⏳ Próxima pergunta em **${NEXT_DELAY_MS / 1000}s**…`
                            ].join('\n')
                        )
                ]
            })
            .catch(() => {});

        // sem limite: sempre agenda a próxima até o tempo esgotar em alguma rodada
        setTimeout(async () => {
            if (!sessions.has(channel.id)) return;
            session.round += 1;
            session.reward = rewardAmount();
            const item = pickQuestion(session.catId, session.used);
            session.answers = item.a;
            session.currentQ = item.q;

            await channel.send({ embeds: [questionEmbed(session, item)] }).catch(() => {});
            startCollector(channel, session);
        }, NEXT_DELAY_MS);
    });

    collector.on('end', async (_, reason) => {
        if (reason === 'win' || reason === 'replace' || reason === 'end') return;
        if (!sessions.has(channel.id)) return;
        if (!session.answered) {
            await channel
                .send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x94a3b8)
                            .setDescription(
                                `⏰ Ninguém acertou a tempo.\nResposta: **${session.answers[0]}**`
                            )
                    ]
                })
                .catch(() => {});
            await endSession(channel, session, 'timeout');
        }
    });
}

function helpEmbed() {
    const cats = Object.entries(CATEGORIES)
        .map(([id, m]) => `${m.emoji} \`${id}\` — ${m.name}`)
        .join('\n');
    return new EmbedBuilder()
        .setColor(0xa78bfa)
        .setTitle('🧠 Quiz Aeternus')
        .setDescription(
            [
                '**Como jogar**',
                '`O.quiz [categoria]` — inicia no canal atual',
                '`O.quiz parar` — encerra o quiz deste canal',
                '',
                '**Categorias**',
                cats,
                '',
                '**Regras**',
                `• Só contam respostas **neste canal**`,
                `• Qualquer um pode responder`,
                `• Acerto: marca o vencedor, espera **10s** e manda **nova** pergunta`,
                `• Erro: o bot **não fala nada**`,
                `• **Sem limite de perguntas** — continua enquanto acertarem`,
                `• Sem acerto em **${TIME_MS / 1000}s** → ranking final`
            ].join('\n')
        );
}

module.exports = {
    name: 'quiz',
    aliases: ['trivia', 'perguntas'],
    description: 'Quiz por categoria com ranking no canal (ilimitado até o tempo)',

    async execute(message, args) {
        const sub = norm(args[0] || '');

        if (!sub || sub === 'help' || sub === 'ajuda') {
            return message.reply({ embeds: [helpEmbed()] });
        }

        if (['parar', 'stop', 'end', 'fim', 'cancelar'].includes(sub)) {
            const session = sessions.get(message.channel.id);
            if (!session) {
                return message.reply('❌ Não há quiz ativo neste canal.');
            }
            await endSession(message.channel, session, 'stop');
            return;
        }

        if (sessions.has(message.channel.id)) {
            return message.reply(
                '❌ Já existe um quiz neste canal. Use `O.quiz parar` ou espere o tempo esgotar.'
            );
        }

        const catId = resolveCategory(sub);
        if (!catId) {
            return message.reply(
                `❌ Categoria desconhecida: \`${args[0]}\`. Use \`O.quiz ajuda\` para ver a lista.`
            );
        }

        const used = new Set();
        const item = pickQuestion(catId, used);
        const session = {
            catId,
            channelId: message.channel.id,
            scores: new Map(),
            used,
            round: 1,
            reward: rewardAmount(),
            answers: item.a,
            currentQ: item.q,
            answered: false,
            collector: null
        };
        sessions.set(message.channel.id, session);

        const meta = CATEGORIES[catId];
        await message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x22d3ee)
                    .setTitle(`${meta.emoji} Quiz iniciado · ${meta.name}`)
                    .setDescription(
                        [
                            `Por **${message.author.username}** neste canal.`,
                            `**Sem limite** de perguntas · **${TIME_MS / 1000}s** por pergunta`,
                            'Continua enquanto alguém acertar a tempo.',
                            'Acertos dão éter · erros são silenciosos',
                            '',
                            '_Boa sorte!_'
                        ].join('\n')
                    )
            ]
        });

        await message.channel.send({ embeds: [questionEmbed(session, item)] });
        startCollector(message.channel, session);
    }
};
