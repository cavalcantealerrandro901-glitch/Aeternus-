const xp=require('../utils/xp');
const adv=require('../utils/classAdvancement');

let installed=false;
function setup(client){
 if(installed)return;
 installed=true;
 const original=xp.addXp;
 if(!original.__aeternusAdvancement){
  const wrapped=function(userId,amount){
   // Se o usuário tem missão de avanço pendente (não resgatada), não ganha XP
   if(adv.hasPending(userId)){
    const cur=xp.get(userId);
    return { ...cur, leveled:0, levelsGained:0, oldLevel:cur.level, gained:0, blocked:true };
   }
   const res=original(userId,amount);
   try{adv.onXpResult(client,userId,res)}catch(e){console.error('[classAdvancement]',e.message)}
   return res;
  };
  wrapped.__aeternusAdvancement=true;
  xp.addXp=wrapped;
 }
 client.classAdvancement=adv;
}
module.exports={name:'classAdvancement',setup};
