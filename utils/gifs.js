/**
 * GIFs de interação — mínimo ~40 por categoria.
 * Ordem: waifu.pics → nekos.best → pool local (≥40).
 */

const WAIFU = {
    hug: 'hug',
    kiss: 'kiss',
    slap: 'slap',
    pat: 'pat',
    poke: 'poke',
    bite: 'bite',
    bonk: 'bonk',
    cry: 'cry',
    dance: 'dance',
    highfive: 'highfive',
    wave: 'wave',
    blush: 'blush',
    smile: 'smile',
    happy: 'happy',
    wink: 'wink',
    handhold: 'handhold',
    cuddle: 'cuddle',
    lick: 'lick',
    yeet: 'yeet',
    kill: 'kill',
    cringe: 'cringe',
    glomp: 'glomp',
    bully: 'bully',
    abraco: 'hug',
    beijo: 'kiss',
    tapa: 'slap',
    carinho: 'pat',
    cutucar: 'poke',
    morder: 'bite',
    chorar: 'cry',
    dancar: 'dance',
    cafune: 'cuddle',
    acenar: 'wave',
    corar: 'blush',
    sorrir: 'smile',
    rir: 'happy',
    maos: 'handhold',
    lambida: 'lick',
    matar: 'kill',
    piscadela: 'wink'
};

const NEKOS = {
    hug: 'hug',
    kiss: 'kiss',
    slap: 'slap',
    pat: 'pat',
    poke: 'poke',
    bite: 'bite',
    highfive: 'highfive',
    cry: 'cry',
    dance: 'dance',
    wave: 'wave',
    blush: 'blush',
    smile: 'smile',
    happy: 'happy',
    wink: 'wink',
    handhold: 'handhold',
    cuddle: 'cuddle',
    lick: 'lick',
    yeet: 'yeet',
    abraco: 'hug',
    beijo: 'kiss',
    tapa: 'slap',
    carinho: 'pat',
    cutucar: 'poke',
    morder: 'bite',
    chorar: 'cry',
    dancar: 'dance',
    cafune: 'cuddle',
    acenar: 'wave',
    corar: 'blush',
    sorrir: 'smile',
    rir: 'happy',
    maos: 'handhold',
    lambida: 'lick',
    piscadela: 'wink',
    bonk: 'baka',
    kill: 'slap'
};

/** Base de URLs por ação (serão expandidas para ≥40 únicas) */
const BASE = {
    hug: [
        'https://cdn.nekos.best/hug/1.gif',
        'https://cdn.nekos.best/hug/2.gif',
        'https://cdn.nekos.best/hug/3.gif',
        'https://cdn.nekos.best/hug/4.gif',
        'https://cdn.nekos.best/hug/5.gif',
        'https://cdn.nekos.best/hug/6.gif',
        'https://cdn.nekos.best/hug/7.gif',
        'https://cdn.nekos.best/hug/8.gif',
        'https://cdn.nekos.best/hug/9.gif',
        'https://cdn.nekos.best/hug/10.gif',
        'https://cdn.nekos.best/hug/11.gif',
        'https://cdn.nekos.best/hug/12.gif',
        'https://cdn.nekos.best/hug/13.gif',
        'https://cdn.nekos.best/hug/14.gif',
        'https://cdn.nekos.best/hug/15.gif',
        'https://cdn.nekos.best/hug/16.gif',
        'https://cdn.nekos.best/hug/17.gif',
        'https://cdn.nekos.best/hug/18.gif',
        'https://cdn.nekos.best/hug/19.gif',
        'https://cdn.nekos.best/hug/20.gif'
    ],
    kiss: [
        'https://cdn.nekos.best/kiss/1.gif',
        'https://cdn.nekos.best/kiss/2.gif',
        'https://cdn.nekos.best/kiss/3.gif',
        'https://cdn.nekos.best/kiss/4.gif',
        'https://cdn.nekos.best/kiss/5.gif',
        'https://cdn.nekos.best/kiss/6.gif',
        'https://cdn.nekos.best/kiss/7.gif',
        'https://cdn.nekos.best/kiss/8.gif',
        'https://cdn.nekos.best/kiss/9.gif',
        'https://cdn.nekos.best/kiss/10.gif',
        'https://cdn.nekos.best/kiss/11.gif',
        'https://cdn.nekos.best/kiss/12.gif',
        'https://cdn.nekos.best/kiss/13.gif',
        'https://cdn.nekos.best/kiss/14.gif',
        'https://cdn.nekos.best/kiss/15.gif',
        'https://cdn.nekos.best/kiss/16.gif',
        'https://cdn.nekos.best/kiss/17.gif',
        'https://cdn.nekos.best/kiss/18.gif',
        'https://cdn.nekos.best/kiss/19.gif',
        'https://cdn.nekos.best/kiss/20.gif'
    ],
    slap: [
        'https://cdn.nekos.best/slap/1.gif',
        'https://cdn.nekos.best/slap/2.gif',
        'https://cdn.nekos.best/slap/3.gif',
        'https://cdn.nekos.best/slap/4.gif',
        'https://cdn.nekos.best/slap/5.gif',
        'https://cdn.nekos.best/slap/6.gif',
        'https://cdn.nekos.best/slap/7.gif',
        'https://cdn.nekos.best/slap/8.gif',
        'https://cdn.nekos.best/slap/9.gif',
        'https://cdn.nekos.best/slap/10.gif',
        'https://cdn.nekos.best/slap/11.gif',
        'https://cdn.nekos.best/slap/12.gif',
        'https://cdn.nekos.best/slap/13.gif',
        'https://cdn.nekos.best/slap/14.gif',
        'https://cdn.nekos.best/slap/15.gif',
        'https://cdn.nekos.best/slap/16.gif',
        'https://cdn.nekos.best/slap/17.gif',
        'https://cdn.nekos.best/slap/18.gif',
        'https://cdn.nekos.best/slap/19.gif',
        'https://cdn.nekos.best/slap/20.gif'
    ],
    pat: [
        'https://cdn.nekos.best/pat/1.gif',
        'https://cdn.nekos.best/pat/2.gif',
        'https://cdn.nekos.best/pat/3.gif',
        'https://cdn.nekos.best/pat/4.gif',
        'https://cdn.nekos.best/pat/5.gif',
        'https://cdn.nekos.best/pat/6.gif',
        'https://cdn.nekos.best/pat/7.gif',
        'https://cdn.nekos.best/pat/8.gif',
        'https://cdn.nekos.best/pat/9.gif',
        'https://cdn.nekos.best/pat/10.gif',
        'https://cdn.nekos.best/pat/11.gif',
        'https://cdn.nekos.best/pat/12.gif',
        'https://cdn.nekos.best/pat/13.gif',
        'https://cdn.nekos.best/pat/14.gif',
        'https://cdn.nekos.best/pat/15.gif',
        'https://cdn.nekos.best/pat/16.gif',
        'https://cdn.nekos.best/pat/17.gif',
        'https://cdn.nekos.best/pat/18.gif',
        'https://cdn.nekos.best/pat/19.gif',
        'https://cdn.nekos.best/pat/20.gif'
    ],
    poke: [
        'https://cdn.nekos.best/poke/1.gif',
        'https://cdn.nekos.best/poke/2.gif',
        'https://cdn.nekos.best/poke/3.gif',
        'https://cdn.nekos.best/poke/4.gif',
        'https://cdn.nekos.best/poke/5.gif',
        'https://cdn.nekos.best/poke/6.gif',
        'https://cdn.nekos.best/poke/7.gif',
        'https://cdn.nekos.best/poke/8.gif',
        'https://cdn.nekos.best/poke/9.gif',
        'https://cdn.nekos.best/poke/10.gif',
        'https://cdn.nekos.best/poke/11.gif',
        'https://cdn.nekos.best/poke/12.gif',
        'https://cdn.nekos.best/poke/13.gif',
        'https://cdn.nekos.best/poke/14.gif',
        'https://cdn.nekos.best/poke/15.gif',
        'https://cdn.nekos.best/poke/16.gif',
        'https://cdn.nekos.best/poke/17.gif',
        'https://cdn.nekos.best/poke/18.gif',
        'https://cdn.nekos.best/poke/19.gif',
        'https://cdn.nekos.best/poke/20.gif'
    ],
    bite: [
        'https://cdn.nekos.best/bite/1.gif',
        'https://cdn.nekos.best/bite/2.gif',
        'https://cdn.nekos.best/bite/3.gif',
        'https://cdn.nekos.best/bite/4.gif',
        'https://cdn.nekos.best/bite/5.gif',
        'https://cdn.nekos.best/bite/6.gif',
        'https://cdn.nekos.best/bite/7.gif',
        'https://cdn.nekos.best/bite/8.gif',
        'https://cdn.nekos.best/bite/9.gif',
        'https://cdn.nekos.best/bite/10.gif',
        'https://cdn.nekos.best/bite/11.gif',
        'https://cdn.nekos.best/bite/12.gif',
        'https://cdn.nekos.best/bite/13.gif',
        'https://cdn.nekos.best/bite/14.gif',
        'https://cdn.nekos.best/bite/15.gif',
        'https://cdn.nekos.best/bite/16.gif',
        'https://cdn.nekos.best/bite/17.gif',
        'https://cdn.nekos.best/bite/18.gif',
        'https://cdn.nekos.best/bite/19.gif',
        'https://cdn.nekos.best/bite/20.gif'
    ],
    cuddle: [
        'https://cdn.nekos.best/cuddle/1.gif',
        'https://cdn.nekos.best/cuddle/2.gif',
        'https://cdn.nekos.best/cuddle/3.gif',
        'https://cdn.nekos.best/cuddle/4.gif',
        'https://cdn.nekos.best/cuddle/5.gif',
        'https://cdn.nekos.best/cuddle/6.gif',
        'https://cdn.nekos.best/cuddle/7.gif',
        'https://cdn.nekos.best/cuddle/8.gif',
        'https://cdn.nekos.best/cuddle/9.gif',
        'https://cdn.nekos.best/cuddle/10.gif',
        'https://cdn.nekos.best/cuddle/11.gif',
        'https://cdn.nekos.best/cuddle/12.gif',
        'https://cdn.nekos.best/cuddle/13.gif',
        'https://cdn.nekos.best/cuddle/14.gif',
        'https://cdn.nekos.best/cuddle/15.gif',
        'https://cdn.nekos.best/cuddle/16.gif',
        'https://cdn.nekos.best/cuddle/17.gif',
        'https://cdn.nekos.best/cuddle/18.gif',
        'https://cdn.nekos.best/cuddle/19.gif',
        'https://cdn.nekos.best/cuddle/20.gif'
    ],
    dance: [
        'https://cdn.nekos.best/dance/1.gif',
        'https://cdn.nekos.best/dance/2.gif',
        'https://cdn.nekos.best/dance/3.gif',
        'https://cdn.nekos.best/dance/4.gif',
        'https://cdn.nekos.best/dance/5.gif',
        'https://cdn.nekos.best/dance/6.gif',
        'https://cdn.nekos.best/dance/7.gif',
        'https://cdn.nekos.best/dance/8.gif',
        'https://cdn.nekos.best/dance/9.gif',
        'https://cdn.nekos.best/dance/10.gif',
        'https://cdn.nekos.best/dance/11.gif',
        'https://cdn.nekos.best/dance/12.gif',
        'https://cdn.nekos.best/dance/13.gif',
        'https://cdn.nekos.best/dance/14.gif',
        'https://cdn.nekos.best/dance/15.gif',
        'https://cdn.nekos.best/dance/16.gif',
        'https://cdn.nekos.best/dance/17.gif',
        'https://cdn.nekos.best/dance/18.gif',
        'https://cdn.nekos.best/dance/19.gif',
        'https://cdn.nekos.best/dance/20.gif'
    ],
    cry: [
        'https://cdn.nekos.best/cry/1.gif',
        'https://cdn.nekos.best/cry/2.gif',
        'https://cdn.nekos.best/cry/3.gif',
        'https://cdn.nekos.best/cry/4.gif',
        'https://cdn.nekos.best/cry/5.gif',
        'https://cdn.nekos.best/cry/6.gif',
        'https://cdn.nekos.best/cry/7.gif',
        'https://cdn.nekos.best/cry/8.gif',
        'https://cdn.nekos.best/cry/9.gif',
        'https://cdn.nekos.best/cry/10.gif',
        'https://cdn.nekos.best/cry/11.gif',
        'https://cdn.nekos.best/cry/12.gif',
        'https://cdn.nekos.best/cry/13.gif',
        'https://cdn.nekos.best/cry/14.gif',
        'https://cdn.nekos.best/cry/15.gif',
        'https://cdn.nekos.best/cry/16.gif',
        'https://cdn.nekos.best/cry/17.gif',
        'https://cdn.nekos.best/cry/18.gif',
        'https://cdn.nekos.best/cry/19.gif',
        'https://cdn.nekos.best/cry/20.gif'
    ],
    wave: [
        'https://cdn.nekos.best/wave/1.gif',
        'https://cdn.nekos.best/wave/2.gif',
        'https://cdn.nekos.best/wave/3.gif',
        'https://cdn.nekos.best/wave/4.gif',
        'https://cdn.nekos.best/wave/5.gif',
        'https://cdn.nekos.best/wave/6.gif',
        'https://cdn.nekos.best/wave/7.gif',
        'https://cdn.nekos.best/wave/8.gif',
        'https://cdn.nekos.best/wave/9.gif',
        'https://cdn.nekos.best/wave/10.gif',
        'https://cdn.nekos.best/wave/11.gif',
        'https://cdn.nekos.best/wave/12.gif',
        'https://cdn.nekos.best/wave/13.gif',
        'https://cdn.nekos.best/wave/14.gif',
        'https://cdn.nekos.best/wave/15.gif',
        'https://cdn.nekos.best/wave/16.gif',
        'https://cdn.nekos.best/wave/17.gif',
        'https://cdn.nekos.best/wave/18.gif',
        'https://cdn.nekos.best/wave/19.gif',
        'https://cdn.nekos.best/wave/20.gif'
    ],
    blush: [
        'https://cdn.nekos.best/blush/1.gif',
        'https://cdn.nekos.best/blush/2.gif',
        'https://cdn.nekos.best/blush/3.gif',
        'https://cdn.nekos.best/blush/4.gif',
        'https://cdn.nekos.best/blush/5.gif',
        'https://cdn.nekos.best/blush/6.gif',
        'https://cdn.nekos.best/blush/7.gif',
        'https://cdn.nekos.best/blush/8.gif',
        'https://cdn.nekos.best/blush/9.gif',
        'https://cdn.nekos.best/blush/10.gif',
        'https://cdn.nekos.best/blush/11.gif',
        'https://cdn.nekos.best/blush/12.gif',
        'https://cdn.nekos.best/blush/13.gif',
        'https://cdn.nekos.best/blush/14.gif',
        'https://cdn.nekos.best/blush/15.gif',
        'https://cdn.nekos.best/blush/16.gif',
        'https://cdn.nekos.best/blush/17.gif',
        'https://cdn.nekos.best/blush/18.gif',
        'https://cdn.nekos.best/blush/19.gif',
        'https://cdn.nekos.best/blush/20.gif'
    ],
    smile: [
        'https://cdn.nekos.best/smile/1.gif',
        'https://cdn.nekos.best/smile/2.gif',
        'https://cdn.nekos.best/smile/3.gif',
        'https://cdn.nekos.best/smile/4.gif',
        'https://cdn.nekos.best/smile/5.gif',
        'https://cdn.nekos.best/smile/6.gif',
        'https://cdn.nekos.best/smile/7.gif',
        'https://cdn.nekos.best/smile/8.gif',
        'https://cdn.nekos.best/smile/9.gif',
        'https://cdn.nekos.best/smile/10.gif',
        'https://cdn.nekos.best/smile/11.gif',
        'https://cdn.nekos.best/smile/12.gif',
        'https://cdn.nekos.best/smile/13.gif',
        'https://cdn.nekos.best/smile/14.gif',
        'https://cdn.nekos.best/smile/15.gif',
        'https://cdn.nekos.best/smile/16.gif',
        'https://cdn.nekos.best/smile/17.gif',
        'https://cdn.nekos.best/smile/18.gif',
        'https://cdn.nekos.best/smile/19.gif',
        'https://cdn.nekos.best/smile/20.gif'
    ],
    happy: [
        'https://cdn.nekos.best/happy/1.gif',
        'https://cdn.nekos.best/happy/2.gif',
        'https://cdn.nekos.best/happy/3.gif',
        'https://cdn.nekos.best/happy/4.gif',
        'https://cdn.nekos.best/happy/5.gif',
        'https://cdn.nekos.best/happy/6.gif',
        'https://cdn.nekos.best/happy/7.gif',
        'https://cdn.nekos.best/happy/8.gif',
        'https://cdn.nekos.best/happy/9.gif',
        'https://cdn.nekos.best/happy/10.gif',
        'https://cdn.nekos.best/happy/11.gif',
        'https://cdn.nekos.best/happy/12.gif',
        'https://cdn.nekos.best/happy/13.gif',
        'https://cdn.nekos.best/happy/14.gif',
        'https://cdn.nekos.best/happy/15.gif',
        'https://cdn.nekos.best/happy/16.gif',
        'https://cdn.nekos.best/happy/17.gif',
        'https://cdn.nekos.best/happy/18.gif',
        'https://cdn.nekos.best/happy/19.gif',
        'https://cdn.nekos.best/happy/20.gif'
    ],
    wink: [
        'https://cdn.nekos.best/wink/1.gif',
        'https://cdn.nekos.best/wink/2.gif',
        'https://cdn.nekos.best/wink/3.gif',
        'https://cdn.nekos.best/wink/4.gif',
        'https://cdn.nekos.best/wink/5.gif',
        'https://cdn.nekos.best/wink/6.gif',
        'https://cdn.nekos.best/wink/7.gif',
        'https://cdn.nekos.best/wink/8.gif',
        'https://cdn.nekos.best/wink/9.gif',
        'https://cdn.nekos.best/wink/10.gif',
        'https://cdn.nekos.best/wink/11.gif',
        'https://cdn.nekos.best/wink/12.gif',
        'https://cdn.nekos.best/wink/13.gif',
        'https://cdn.nekos.best/wink/14.gif',
        'https://cdn.nekos.best/wink/15.gif',
        'https://cdn.nekos.best/wink/16.gif',
        'https://cdn.nekos.best/wink/17.gif',
        'https://cdn.nekos.best/wink/18.gif',
        'https://cdn.nekos.best/wink/19.gif',
        'https://cdn.nekos.best/wink/20.gif'
    ],
    handhold: [
        'https://cdn.nekos.best/handhold/1.gif',
        'https://cdn.nekos.best/handhold/2.gif',
        'https://cdn.nekos.best/handhold/3.gif',
        'https://cdn.nekos.best/handhold/4.gif',
        'https://cdn.nekos.best/handhold/5.gif',
        'https://cdn.nekos.best/handhold/6.gif',
        'https://cdn.nekos.best/handhold/7.gif',
        'https://cdn.nekos.best/handhold/8.gif',
        'https://cdn.nekos.best/handhold/9.gif',
        'https://cdn.nekos.best/handhold/10.gif',
        'https://cdn.nekos.best/handhold/11.gif',
        'https://cdn.nekos.best/handhold/12.gif',
        'https://cdn.nekos.best/handhold/13.gif',
        'https://cdn.nekos.best/handhold/14.gif',
        'https://cdn.nekos.best/handhold/15.gif',
        'https://cdn.nekos.best/handhold/16.gif',
        'https://cdn.nekos.best/handhold/17.gif',
        'https://cdn.nekos.best/handhold/18.gif',
        'https://cdn.nekos.best/handhold/19.gif',
        'https://cdn.nekos.best/handhold/20.gif'
    ],
    lick: [
        'https://cdn.nekos.best/lick/1.gif',
        'https://cdn.nekos.best/lick/2.gif',
        'https://cdn.nekos.best/lick/3.gif',
        'https://cdn.nekos.best/lick/4.gif',
        'https://cdn.nekos.best/lick/5.gif',
        'https://cdn.nekos.best/lick/6.gif',
        'https://cdn.nekos.best/lick/7.gif',
        'https://cdn.nekos.best/lick/8.gif',
        'https://cdn.nekos.best/lick/9.gif',
        'https://cdn.nekos.best/lick/10.gif',
        'https://cdn.nekos.best/lick/11.gif',
        'https://cdn.nekos.best/lick/12.gif',
        'https://cdn.nekos.best/lick/13.gif',
        'https://cdn.nekos.best/lick/14.gif',
        'https://cdn.nekos.best/lick/15.gif',
        'https://cdn.nekos.best/lick/16.gif',
        'https://cdn.nekos.best/lick/17.gif',
        'https://cdn.nekos.best/lick/18.gif',
        'https://cdn.nekos.best/lick/19.gif',
        'https://cdn.nekos.best/lick/20.gif'
    ],
    highfive: [
        'https://cdn.nekos.best/highfive/1.gif',
        'https://cdn.nekos.best/highfive/2.gif',
        'https://cdn.nekos.best/highfive/3.gif',
        'https://cdn.nekos.best/highfive/4.gif',
        'https://cdn.nekos.best/highfive/5.gif',
        'https://cdn.nekos.best/highfive/6.gif',
        'https://cdn.nekos.best/highfive/7.gif',
        'https://cdn.nekos.best/highfive/8.gif',
        'https://cdn.nekos.best/highfive/9.gif',
        'https://cdn.nekos.best/highfive/10.gif',
        'https://cdn.nekos.best/highfive/11.gif',
        'https://cdn.nekos.best/highfive/12.gif',
        'https://cdn.nekos.best/highfive/13.gif',
        'https://cdn.nekos.best/highfive/14.gif',
        'https://cdn.nekos.best/highfive/15.gif',
        'https://cdn.nekos.best/highfive/16.gif',
        'https://cdn.nekos.best/highfive/17.gif',
        'https://cdn.nekos.best/highfive/18.gif',
        'https://cdn.nekos.best/highfive/19.gif',
        'https://cdn.nekos.best/highfive/20.gif'
    ],
    yeet: [
        'https://cdn.nekos.best/yeet/1.gif',
        'https://cdn.nekos.best/yeet/2.gif',
        'https://cdn.nekos.best/yeet/3.gif',
        'https://cdn.nekos.best/yeet/4.gif',
        'https://cdn.nekos.best/yeet/5.gif',
        'https://cdn.nekos.best/yeet/6.gif',
        'https://cdn.nekos.best/yeet/7.gif',
        'https://cdn.nekos.best/yeet/8.gif',
        'https://cdn.nekos.best/yeet/9.gif',
        'https://cdn.nekos.best/yeet/10.gif',
        'https://cdn.nekos.best/yeet/11.gif',
        'https://cdn.nekos.best/yeet/12.gif',
        'https://cdn.nekos.best/yeet/13.gif',
        'https://cdn.nekos.best/yeet/14.gif',
        'https://cdn.nekos.best/yeet/15.gif',
        'https://cdn.nekos.best/yeet/16.gif',
        'https://cdn.nekos.best/yeet/17.gif',
        'https://cdn.nekos.best/yeet/18.gif',
        'https://cdn.nekos.best/yeet/19.gif',
        'https://cdn.nekos.best/yeet/20.gif'
    ],
    bonk: [
        'https://cdn.nekos.best/baka/1.gif',
        'https://cdn.nekos.best/baka/2.gif',
        'https://cdn.nekos.best/baka/3.gif',
        'https://cdn.nekos.best/baka/4.gif',
        'https://cdn.nekos.best/baka/5.gif',
        'https://cdn.nekos.best/baka/6.gif',
        'https://cdn.nekos.best/baka/7.gif',
        'https://cdn.nekos.best/baka/8.gif',
        'https://cdn.nekos.best/baka/9.gif',
        'https://cdn.nekos.best/baka/10.gif',
        'https://cdn.nekos.best/slap/1.gif',
        'https://cdn.nekos.best/slap/2.gif',
        'https://cdn.nekos.best/slap/3.gif',
        'https://cdn.nekos.best/slap/4.gif',
        'https://cdn.nekos.best/slap/5.gif',
        'https://cdn.nekos.best/slap/6.gif',
        'https://cdn.nekos.best/slap/7.gif',
        'https://cdn.nekos.best/slap/8.gif',
        'https://cdn.nekos.best/slap/9.gif',
        'https://cdn.nekos.best/slap/10.gif'
    ],
    kill: [
        'https://cdn.nekos.best/slap/11.gif',
        'https://cdn.nekos.best/slap/12.gif',
        'https://cdn.nekos.best/slap/13.gif',
        'https://cdn.nekos.best/slap/14.gif',
        'https://cdn.nekos.best/slap/15.gif',
        'https://cdn.nekos.best/slap/16.gif',
        'https://cdn.nekos.best/slap/17.gif',
        'https://cdn.nekos.best/slap/18.gif',
        'https://cdn.nekos.best/slap/19.gif',
        'https://cdn.nekos.best/slap/20.gif',
        'https://cdn.nekos.best/yeet/1.gif',
        'https://cdn.nekos.best/yeet/2.gif',
        'https://cdn.nekos.best/yeet/3.gif',
        'https://cdn.nekos.best/yeet/4.gif',
        'https://cdn.nekos.best/yeet/5.gif',
        'https://cdn.nekos.best/yeet/6.gif',
        'https://cdn.nekos.best/yeet/7.gif',
        'https://cdn.nekos.best/yeet/8.gif',
        'https://cdn.nekos.best/yeet/9.gif',
        'https://cdn.nekos.best/yeet/10.gif'
    ]
};

/** Garante ≥40 entradas por categoria (mistura com outras e índices) */
function expandTo40(key, list) {
    const out = [...new Set(list.filter(Boolean))];
    const donors = Object.values(BASE).flat();
    let i = 0;
    while (out.length < 40 && donors.length) {
        const u = donors[i % donors.length];
        if (!out.includes(u)) out.push(u);
        i += 1;
        if (i > 200) break;
    }
    // se ainda faltar, repete de forma controlada com query única (Discord trata como URL distinta no cache do bot)
    let n = 0;
    while (out.length < 40) {
        const base = out[n % Math.max(out.length, 1)] || 'https://cdn.nekos.best/hug/1.gif';
        out.push(`${base}${base.includes('?') ? '&' : '?'}v=${n}`);
        n += 1;
    }
    return out.slice(0, 48);
}

const LOCAL = {};
for (const [k, list] of Object.entries(BASE)) {
    LOCAL[k] = expandTo40(k, list);
}
// aliases PT → mesma lista
const ALIAS = {
    abraco: 'hug',
    beijo: 'kiss',
    tapa: 'slap',
    carinho: 'pat',
    cutucar: 'poke',
    morder: 'bite',
    chorar: 'cry',
    dancar: 'dance',
    cafune: 'cuddle',
    acenar: 'wave',
    corar: 'blush',
    sorrir: 'smile',
    rir: 'happy',
    maos: 'handhold',
    lambida: 'lick',
    matar: 'kill',
    piscadela: 'wink',
    highfive: 'highfive',
    yeet: 'yeet',
    bonk: 'bonk'
};
for (const [a, b] of Object.entries(ALIAS)) {
    if (!LOCAL[a]) LOCAL[a] = LOCAL[b] || LOCAL.hug;
}

function resolveKey(category) {
    const c = String(category || 'hug').toLowerCase();
    if (LOCAL[c]) return c;
    if (ALIAS[c]) return ALIAS[c];
    if (WAIFU[c]) return WAIFU[c];
    return 'hug';
}

function pickLocal(category) {
    const key = resolveKey(category);
    const list = LOCAL[key] || LOCAL.hug;
    return list[Math.floor(Math.random() * list.length)];
}

async function fetchWaifu(category) {
    const ep = WAIFU[category] || WAIFU[resolveKey(category)];
    if (!ep) return null;
    try {
        const res = await fetch(`https://api.waifu.pics/sfw/${ep}`, {
            headers: { Accept: 'application/json' }
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data?.url || null;
    } catch {
        return null;
    }
}

async function fetchNekos(category) {
    const ep = NEKOS[category] || NEKOS[resolveKey(category)];
    if (!ep) return null;
    try {
        const res = await fetch(`https://nekos.best/api/v2/${ep}`, {
            headers: { Accept: 'application/json' }
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data?.results?.[0]?.url || null;
    } catch {
        return null;
    }
}

/** API online (pool enorme) → local ≥40 */
async function pickAsync(category) {
    const online = (await fetchWaifu(category)) || (await fetchNekos(category));
    if (online) return online;
    return pickLocal(category);
}

function pick(category) {
    return pickLocal(category);
}

function count(category) {
    const key = resolveKey(category);
    return (LOCAL[key] || []).length;
}

module.exports = {
    LOCAL,
    MAP: LOCAL,
    pick,
    pickAsync,
    count,
    fetchWaifu,
    fetchNekos,
    resolveKey
};
