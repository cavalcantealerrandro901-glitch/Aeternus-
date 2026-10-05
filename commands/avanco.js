const {SlashCommandBuilder,EmbedBuilder,ActionRowBuilder,ButtonBuilder,ButtonStyle}=require('discord.js');
const adv=require('../utils/classAdvancement');
module.exports={
 name:'avanco',aliases:['avanço','classeavanco','avançarclasse'],description:'Ver e resgatar o avanço da classe',
 data:new SlashCommandBuilder().setName('avanco').setDescription('Ver sua missão de avanço de classe'),
 async execute(message){
  const m=adv.get(message.author.id);
  if(!m)return message.reply('🧬 Você ainda não tem uma missão de avanço disponível.');
  return message.reply({embeds:[new EmbedBuilder().setColor(0x8b5cf6).setTitle('🧬 Avanço de Classe').setDescription(adv.missionText(m))],components:m.completed&&!m.claimed?[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('avanco:claim:'+message.author.id).setLabel('Resgatar avanço').setEmoji('🧬').setStyle(ButtonStyle.Success))]:[]});
 },
 async executeSlash(interaction){const m=adv.get(interaction.user.id);if(!m)return interaction.reply({content:'🧬 Você ainda não tem uma missão de avanço disponível.',ephemeral:true});return interaction.reply({embeds:[new EmbedBuilder().setColor(0x8b5cf6).setTitle('🧬 Avanço de Classe').setDescription(adv.missionText(m))],components:m.completed&&!m.claimed?[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('avanco:claim:'+interaction.user.id).setLabel('Resgatar avanço').setEmoji('🧬').setStyle(ButtonStyle.Success))]:[],ephemeral:true})},
 async handleComponent(i){
  if(!i.customId.startsWith('avanco:claim:'))return;
  const id=i.customId.split(':')[2];
  if(i.user.id!==id)return i.reply({content:'Só o dono pode resgatar este avanço.',ephemeral:true});
  const r=adv.claim(id);if(!r.ok)return i.reply({content:'❌ '+r.error,ephemeral:true});
  const a=r.reward.attributes,items=(r.reward.items||[]).map(x=>x.emoji+' '+x.name).join(', ')||'Nenhum novo item compatível disponível.';
  const abs=(r.reward.abilities||[]).map(x=>x.emoji+' '+x.name).join(', ')||'Nenhuma habilidade nova disponível nesta classe.';
  return i.update({content:'✅ **Avanço de classe concluído!**',embeds:[new EmbedBuilder().setColor(0x22c55e).setTitle('🧬 Classe avançada').setDescription('Sua classe avançou para o estágio **'+r.reward.tier+'**.\n\n📈 Atributos: **+'+a.amount+'** em '+a.keys.join(', ')+'\n🎒 Novo item: '+items+'\n✨ Nova habilidade disponível: '+abs)],components:[]});
 }
};