const store=require('./store');
const xp=require('./xp');
const player=require('./player');
const classes=require('./classes');
const items=require('./items');
const abilities=require('./abilities');
const FILE='class_advancement.json';
/** Prazo para concluir a missão de avanço (7 dias) */
const MISSION_DURATION_MS=7*24*60*60*1000;
const RARITIES=[['comum','Comum'],['incomum','Incomum'],['rara','Rara'],['epica','Épica'],['lendaria','Lendária'],['mitica','Mítica']];
function all(){return store.load(FILE,{})||{}}
function save(d){store.save(FILE,d)}
function milestone(level){const n=Math.floor(Number(level)||0);return n>=20&&n%20===0?n:null}
function choose(a){return a.length?a[Math.floor(Math.random()*a.length)]:null}
function sources(){const out={monsters:[],bosses:[],regions:[],floors:[]};try{const s=require('./dungeon').getMissionSources?.()||{};for(const k of Object.keys(out))out[k]=[...new Set((s[k]||[]).filter(Boolean).map(String))]}catch(_){}return out}
function formatLeft(ms){
  if(ms<=0)return'expirado';
  const d=Math.floor(ms/86400000);
  const h=Math.floor((ms%86400000)/3600000);
  const m=Math.floor((ms%3600000)/60000);
  if(d>0)return d+'d '+h+'h';
  if(h>0)return h+'h '+m+'m';
  return m+'m';
}
function generateMission(userId,targetLevel){
  const s=sources(),c=[];
  if(s.monsters.length)c.push(()=>({type:'monster_quantity',target:3+Math.floor(Math.random()*8)}));
  if(s.monsters.length)c.push(()=>({type:'monster_specific',target:1+Math.floor(Math.random()*2),monster:choose(s.monsters)}));
  if(s.bosses.length)c.push(()=>({type:'boss',target:1,monster:choose(s.bosses)}));
  if(s.floors.length)c.push(()=>({type:'dungeon_floor',target:Number(choose(s.floors))||1}));
  if(s.regions.length&&s.monsters.length)c.push(()=>({type:'region_monster',target:2+Math.floor(Math.random()*6),region:choose(s.regions)}));
  c.push(()=>({type:'pvp_win',target:1+Math.floor(Math.random()*4)}));
  const m=choose(c)(),r=choose(RARITIES)||RARITIES[0];
  const d={monster_quantity:'Derrote **'+m.target+' monstros** da masmorra.',monster_specific:'Derrote **'+m.target+'x '+m.monster+'**.',boss:'Derrote o **Boss '+m.monster+'**.',dungeon_floor:'Conclua o **piso '+m.target+'** da masmorra.',region_monster:'Derrote **'+m.target+' monstros** da região **'+m.region+'**.',pvp_win:'Vença **'+m.target+' batalhas** na Arena PvP.'};
  const now=Date.now();
  return{
    id:'adv_'+now.toString(36)+'_'+Math.random().toString(36).slice(2,7),
    userId:String(userId),
    targetLevel,
    rarity:r[0],
    rarityName:r[1],
    ...m,
    description:d[m.type],
    progress:0,
    completed:false,
    claimed:false,
    expired:false,
    createdAt:now,
    expiresAt:now+MISSION_DURATION_MS
  };
}
function getRaw(id){return all()[String(id)]||null}
/** Expira missão vencida: libera XP e impede resgate. */
function expireIfNeeded(id){
  const d=all(),k=String(id),m=d[k];
  if(!m||m.claimed||m.expired)return m||null;
  const exp=Number(m.expiresAt)||0;
  // Missões antigas sem expiresAt: dá o prazo a partir de createdAt
  const deadline=exp||((Number(m.createdAt)||0)+MISSION_DURATION_MS);
  if(deadline&&Date.now()>deadline){
    m.expired=true;
    m.claimed=true; // libera hasPending / XP
    m.expiredAt=Date.now();
    if(!m.expiresAt)m.expiresAt=deadline;
    d[k]=m;
    save(d);
  }
  return m;
}
function get(id){return expireIfNeeded(id)}
/** Retorna true se o usuário tem missão de avanço pendente (não resgatada e não expirada). */
function hasPending(id){
  const m=get(id);
  return !!(m&&!m.claimed&&!m.expired);
}
function ensureForLevel(id,level){
  const t=milestone(level);
  if(!t)return null;
  const d=all(),k=String(id);
  const cur=expireIfNeeded(k);
  if(cur&&!cur.claimed&&!cur.expired)return cur;
  if(cur&&Number(cur.targetLevel)===t&&cur.claimed&&!cur.expired)return cur;
  d[k]=generateMission(k,t);
  save(d);
  return d[k];
}
function matches(m,e){
  if(m.type==='pvp_win')return e.type==='pvp_win';
  if(m.type==='dungeon_floor')return e.type==='dungeon_floor'&&Number(e.floor||0)>=Number(m.target||0);
  if(m.type==='boss')return e.type==='monster_defeated'&&e.boss&&String(e.name||'')===String(m.monster||'');
  if(m.type==='monster_specific')return e.type==='monster_defeated'&&!e.boss&&String(e.name||'')===String(m.monster||'');
  if(m.type==='region_monster')return e.type==='monster_defeated'&&!e.boss&&String(e.region||'')===String(m.region||'');
  return m.type==='monster_quantity'&&e.type==='monster_defeated'&&!e.boss;
}
function recordEvent(id,e){
  const d=all(),k=String(id);
  expireIfNeeded(k);
  const m=d[k];
  if(!m||m.completed||m.claimed||m.expired||!matches(m,e))return{ok:false,mission:m||null};
  m.progress=m.type==='dungeon_floor'?m.target:Math.min(m.target,(m.progress||0)+(Number(e.amount)||1));
  if(m.progress>=m.target)m.completed=true;
  d[k]=m;
  save(d);
  return{ok:true,completed:m.completed,mission:{...m}};
}
function rewardFor(id,m){
  const p=player.get(id);
  if(!p)return{ok:false,error:'Perfil não encontrado.'};
  const xd=xp.all(),cur=xd[id]||{};
  cur.attrs=cur.attrs&&typeof cur.attrs==='object'?cur.attrs:{};
  const cls=classes.getClass(p.classId),custom=cls?.advancementRewards?.default||{},amount=Math.max(1,Math.floor(Number(custom.attributeGain)||2));
  const keys=(custom.attributes||[]).filter(k=>xp.ATTR_KEYS.includes(k)).slice(0,2),chosen=keys.length?keys:[...xp.ATTR_KEYS].sort(()=>Math.random()-.5).slice(0,2);
  for(const k of chosen)cur.attrs[k]=(Number(cur.attrs[k])||0)+amount;
  xd[id]=cur;
  store.save('xp.json',xd);
  const equipmentUpgrades=[];
  try{
    const pd=player.all(),raw=pd[id],eq=raw?.equipped||{};
    for(const slot of ['armadura','acessorio']){
      const it=eq[slot];
      if(!it?.effects)continue;
      const key=['defesa','vida','resistencia','inteligencia','sorte'][Math.floor(Math.random()*5)];
      it.effects[key]=(Number(it.effects[key])||0)+amount;
      equipmentUpgrades.push({slot,item:it.name||it.id,attribute:key,amount});
      break;
    }
    if(raw)player.save(pd);
  }catch(_){}
  const newItems=[],owned=new Set((p.inventory||[]).map(x=>String(x.id||''))),candidate=items.listItems({classId:cls?.id}).find(x=>x.category!=='arma'&&!owned.has(String(x.id)));
  if(candidate){
    const it=items.instantiateItem(candidate.id,{advancementTier:Math.floor(m.targetLevel/20)});
    if(it&&player.addItem(id,it))newItems.push(it);
  }
  const available=abilities.listByKind('active',id)||[],load=abilities.loadLoadout(id),used=new Set((load.active||[]).filter(Boolean)),next=available.find(a=>!used.has(a.id));
  return{ok:true,reward:{attributes:{keys:chosen,amount},equipment:equipmentUpgrades,items:newItems.map(x=>({id:x.id,name:x.name,emoji:x.emoji})),abilities:next?[{id:next.id,name:next.name,emoji:next.emoji}]:[]}};
}
function claim(id){
  const d=all(),k=String(id);
  expireIfNeeded(k);
  const m=d[k];
  if(!m)return{ok:false,error:'Nenhum avanço disponível.'};
  if(m.expired)return{ok:false,error:'Esta missão de avanço **expirou**. O prazo era de 7 dias.'};
  if(!m.completed)return{ok:false,error:'A missão ainda não foi concluída.'};
  if(m.claimed)return{ok:false,error:'Este avanço já foi resgatado.'};
  const r=rewardFor(k,m);
  if(!r.ok)return r;
  m.claimed=true;
  m.claimedAt=Date.now();
  d[k]=m;
  save(d);
  return{ok:true,mission:m,reward:r.reward};
}
function missionText(m){
  if(!m)return'Nenhuma missão de avanço disponível.';
  if(m.expired)return'🧬 **AVANÇO DE CLASSE · Nv.'+m.targetLevel+'**\n\n⏰ Esta missão **expirou** (prazo de 7 dias). O XP foi liberado, mas não há recompensa de avanço.';
  const left=formatLeft((Number(m.expiresAt)||0)-Date.now());
  let t='🧬 **AVANÇO DE CLASSE · Nv.'+m.targetLevel+'**\nRaridade: **'+m.rarityName+'**\n\n'+m.description+'\n\nProgresso: **'+Math.min(m.progress||0,m.target)+'/'+m.target+'**\n⏰ Prazo: **'+left+'** restantes (máx. 7 dias)';
  if(m.completed)t+='\n\n✅ **Missão concluída. Use O.avanco para resgatar.**';
  else t+='\n\n⚠️ **Você não ganha mais XP até concluir e resgatar esta missão.**';
  return t;
}
function onXpResult(client,id,res){
  const gained=res?.levelsGained??res?.leveled??0;
  if(!gained)return;
  const oldLv=Number(res.oldLevel)||0;
  const newLv=Number(res.level)||0;
  for(let lv=oldLv+1;lv<=newLv;lv++){
    const t=milestone(lv);
    if(!t)continue;
    const m=ensureForLevel(id,lv);
    if(!m||m.expired)continue;
    const text=missionText(m)+'\n\n⚠️ **Seu ganho de XP foi congelado até você concluir e resgatar o avanço (prazo: 7 dias).**\nUse `O.avanco` para ver a missão.';
    client.users.fetch(id).then(u=>u.send(text)).catch(()=>{});
  }
}
function notifyCommand(id){
  const m=get(id);
  if(!m||m.claimed||m.expired)return null;
  return'🧬 **Avanço de classe disponível!** Você alcançou o **nível '+m.targetLevel+'**. '+(m.completed?'Sua missão foi concluída. Use O.avanco para resgatar.':'Complete sua Missão de Avanço em até **7 dias**. **XP congelado até resgatar.**');
}
module.exports={all,get,hasPending,ensureForLevel,generateMission,recordEvent,claim,missionText,onXpResult,notifyCommand,sources,MISSION_DURATION_MS};
