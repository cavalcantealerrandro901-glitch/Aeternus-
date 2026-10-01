const fs=require('fs'); const path=require('path');
const FILE=path.join(__dirname,'..','data','rpg_ai.json');
const CLASSES={guerreiro:{hp:120,atk:15,def:12,emoji:'⚔️'},mago:{hp:80,atk:22,def:6,emoji:'🔮'},arqueiro:{hp:95,atk:18,def:8,emoji:'🏹'},ninja:{hp:90,atk:20,def:7,emoji:'🥷'},paladino:{hp:110,atk:14,def:14,emoji:'🛡️'},necromante:{hp:85,atk:21,def:7,emoji:'💀'}};
function load(){try{if(fs.existsSync(FILE))return JSON.parse(fs.readFileSync(FILE,'utf8'));}catch(_){}return{};}
function save(db){try{const d=path.dirname(FILE);if(!fs.existsSync(d))fs.mkdirSync(d,{recursive:true});fs.writeFileSync(FILE,JSON.stringify(db,null,2));}catch(_){}}
module.exports=function register({registerTool}){
  registerTool({name:'criar_classe',description:'Classe RPG',async handler(args,runtime){
    const name=String(args.classe||args.class||args.nome||args.query||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/criar classe\s*/,'');
    const key=Object.keys(CLASSES).find(k=>name.includes(k));
    const base=CLASSES[key]; if(!base) return {error:'Classes: '+Object.keys(CLASSES).join(', ')};
    const db=load(); db[runtime.userId]={class:key,level:1,xp:0,...base,createdAt:Date.now()}; save(db);
    return {ok:true,text:base.emoji+' Classe **'+key+'**! HP '+base.hp+' ATK '+base.atk+' DEF '+base.def};
  }});
  registerTool({name:'ficha_rpg',description:'Ficha',async handler(_a,runtime){
    const p=load()[runtime.userId]; if(!p) return {ok:true,text:'Sem ficha. Use criar_classe ninja.'};
    return {ok:true,text:'Ficha: **'+p.class+'** Nv.'+p.level+' XP '+p.xp+' HP '+p.hp+' ATK '+p.atk+' DEF '+p.def};
  }});
  registerTool({name:'rpg_treino',description:'Treino XP',async handler(_a,runtime){
    const db=load(); const p=db[runtime.userId]; if(!p) return {error:'Crie uma classe primeiro.'};
    const gain=10+Math.floor(Math.random()*25); p.xp+=gain;
    while(p.xp>=p.level*50){p.xp-=p.level*50;p.level++;p.hp+=5;p.atk+=2;p.def+=1;}
    save(db); return {ok:true,text:'Treino +'+gain+' XP. Nivel '+p.level};
  }});
  registerTool({name:'listar_classes',description:'Lista classes',async handler(){
    return {ok:true,text:Object.entries(CLASSES).map(([k,v])=>v.emoji+' **'+k+'** HP'+v.hp).join('\n')};
  }});
};
