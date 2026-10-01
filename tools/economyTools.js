const fs = require('fs'); const path = require('path');
const FILE = path.join(__dirname, '..', 'data', 'economy_ai.json');
function load(){ try{ if(fs.existsSync(FILE)) return JSON.parse(fs.readFileSync(FILE,'utf8')); }catch(_){} return {}; }
function save(db){ try{ const d=path.dirname(FILE); if(!fs.existsSync(d)) fs.mkdirSync(d,{recursive:true}); fs.writeFileSync(FILE, JSON.stringify(db,null,2)); }catch(_){} }
function wallet(db,id){ if(!db[id]) db[id]={coins:100,lastDaily:0}; return db[id]; }
module.exports = function register({ registerTool }) {
  registerTool({ name: 'saldo', description: 'Saldo', async handler(_a, runtime) {
    const db=load(); const w=wallet(db,runtime.userId); save(db);
    return { ok:true, text: 'Seu saldo: **'+w.coins+'** moedas.' };
  }});
  registerTool({ name: 'daily', description: 'Daily', async handler(_a, runtime) {
    const db=load(); const w=wallet(db,runtime.userId); const now=Date.now();
    if(now-(w.lastDaily||0)<20*3600*1000) return { ok:true, text: 'Daily ja resgatado. Aguarde.' };
    const gain=50+Math.floor(Math.random()*100); w.coins+=gain; w.lastDaily=now; save(db);
    return { ok:true, text: 'Daily +**'+gain+'**. Total **'+w.coins+'**.' };
  }});
  registerTool({ name: 'transferir', description: 'Transferir', async handler(args, runtime) {
    const to=String(args.usuario||args.to||'').replace(/[<@!>]/g,''); const amount=Math.floor(Number(args.valor||args.amount||0));
    if(!to||amount<=0) return { error: 'Use transferir com usuario e valor.' };
    const db=load(); const from=wallet(db,runtime.userId); if(from.coins<amount) return { error: 'Saldo insuficiente.' };
    const dest=wallet(db,to); from.coins-=amount; dest.coins+=amount; save(db);
    return { ok:true, text: 'Transferiu **'+amount+'** para <@'+to+'>.' };
  }});
  registerTool({ name: 'rank_economia', description: 'Rank', async handler() {
    const db=load(); const top=Object.entries(db).map(([id,w])=>({id,coins:w.coins||0})).sort((a,b)=>b.coins-a.coins).slice(0,10);
    if(!top.length) return { ok:true, text: 'Rank vazio.' };
    return { ok:true, text: 'Rank:\n'+top.map((t,i)=>(i+1)+'. <@'+t.id+'> — **'+t.coins+'**').join('\n') };
  }});
};
