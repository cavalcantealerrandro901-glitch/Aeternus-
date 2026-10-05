const classes = require('../utils/classes');
const player = require('../utils/player');

const EXCLUSIVES = [
  { classId:'ceifador_negro', owner:'1483097258944630897', gear:[
    {id:'foice_grande',name:'Foice Grande',emoji:'🪓',category:'arma',rarity:'mitica',classId:'ceifador_negro',effects:{forca:900,agilidade:650,dano:850}},
    {id:'manto_negro_armadura',name:'Manto Negro',emoji:'🧥',category:'armadura',rarity:'lendaria',classId:'ceifador_negro',effects:{defesa:800,agilidade:500,vida:750}},
    {id:'dado_da_morte',name:'Dado da Morte',emoji:'🎲',category:'acessorio',rarity:'mitica',classId:'ceifador_negro',effects:{sorte:700,forca:600,critico:550}}
  ]},
  { classId:'l_detetive_arcano', owner:'1460227733023096875', gear:[
    {id:'olho_infinito_absoluto',name:'Olho do Infinito Absoluto',emoji:'👁️',category:'arma',rarity:'cosmica',classId:'l_detetive_arcano',effects:{percepcao:900,precisao:800,deteccao:700}},
    {id:'escudo_deducao_cosmica_suprema',name:'Escudo da Dedução Cósmica Suprema',emoji:'🛡️',category:'armadura',rarity:'cosmica',classId:'l_detetive_arcano',effects:{defesa:1200,resistencia:1000,reflexo:900,danoRetorno:950}},
    {id:'reliquia_verdade_absoluta',name:'Relíquia da Verdade Absoluta',emoji:'🕯️',category:'acessorio',rarity:'cosmica',classId:'l_detetive_arcano',effects:{investigacao:1100,inteligencia:950,penetracao:900}}
  ]},
  { classId:'arcanjo_do_veu', owner:'1393079977410428968', gear:[
    {id:'espada_do_ceu',name:'Espada do Céu',emoji:'⚔️',category:'arma',rarity:'lendaria',classId:'arcanjo_do_veu',effects:{forca:850,inteligencia:800,dano:900}},
    {id:'armadura_do_veu',name:'Armadura do Véu',emoji:'🛡️',category:'armadura',rarity:'lendaria',classId:'arcanjo_do_veu',effects:{defesa:900,vida:850,resistencia:800,damageReduction:0.3}},
    {id:'colar_da_ressurreicao',name:'Colar da Ressurreição',emoji:'📿',category:'acessorio',rarity:'lendaria',classId:'arcanjo_do_veu',effects:{vidaPerKillPct:0.01,reviveOnce:true,reviveHpPct:0.1,vida:600,sorte:500}}
  ]},
  { classId:'deus_criador', owner:String(process.env.OWNER_ID||process.env.BOT_OWNER_ID||process.env.ADMIN_ID||'1483097258944630897'), gear:[
    {id:'cetro_da_genese',name:'Cetro da Gênese',emoji:'🪄',category:'arma',rarity:'mitica',classId:'deus_criador',effects:{inteligencia:1000,forca:850,dano:950,precisao:700}},
    {id:'manto_cosmico',name:'Manto Cósmico',emoji:'🧥',category:'armadura',rarity:'mitica',classId:'deus_criador',effects:{defesa:900,vida:850,resistencia:750,agilidade:600}},
    {id:'orbe_do_arquiteto',name:'Orbe do Arquiteto',emoji:'🔮',category:'acessorio',rarity:'mitica',classId:'deus_criador',effects:{inteligencia:950,sorte:800,manaBonus:0.2,precisao:700}}
  ]}
];

function grantGear(userId, gearList) {
  if (!player.get(userId)) return false;
  const ids = new Set(player.getInventory(userId,'todos').map(i=>String(i.id)));
  for (const g of gearList) {
    if (!ids.has(String(g.id))) { player.addItem(userId,{...g}); ids.add(String(g.id)); }
  }
  return true;
}

function setup() {
  try {
    const data=player.all();
    if (typeof classes.enforceExclusiveOwners==='function') classes.enforceExclusiveOwners(data);
    player.save(data);
    for (const ex of EXCLUSIVES) {
      const owner=String(ex.owner);
      if (!player.has(owner)) continue;
      player.update(owner,{classId:ex.classId,class:ex.classId});
      grantGear(owner,ex.gear);
      console.log('[exclusiveClass] itens conferidos → '+ex.classId+' / '+owner);
    }
  } catch(e) { console.warn('[exclusiveClass]',e.message); }
}
module.exports={setup,EXCLUSIVES,grantGear};
