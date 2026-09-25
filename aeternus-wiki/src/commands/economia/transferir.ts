import type { CommandMetadata } from '../../../types/command.ts';

export const metadata: CommandMetadata = {
  name: 'transferir',
  description: 'Transfira coins do seu saldo para outro utilizador com segurança.',
  category: 'Economia',
  status: 'available',
  usage: '/transferir usuario:@utilizador quantia:numero',
  permissions: ['Enviar Mensagens'],
  cooldown: 10,
  examples: [
    {
      userMessage: '/transferir usuario:@Maria quantia:500',
      botResponse: {
        embed: {
          title: '💸 Transferência Realizada',
          description: 'Enviaste **500 coins** para **@Maria** com sucesso!',
          color: '#00FF7F',
          fields: [
            { name: 'Taxa da Transação', value: '0 coins', inline: true },
            { name: 'Novo Saldo', value: '1.250 coins', inline: true }
          ]
        }
      }
    }
  ]
};
