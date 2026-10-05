const xp=require('../utils/xp');
const adv=require('../utils/classAdvancement');

let installed=false;
function setup(client){
 if(installed)return;
 installed=true;
 const original=xp.addXp;
 if(!original.__aeternusAdvancement){
  const wrapped=function(userId,amount){
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