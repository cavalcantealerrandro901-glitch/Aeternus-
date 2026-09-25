export type CommandStatus = 'available' | 'in_dev' | 'disabled';
export type CommandCategory = 'Economia' | 'Entretenimento' | 'Progressão' | 'Administração' | 'Música';

export interface CommandExample {
  userMessage: string;
  botResponse: {
    content?: string;
    embed?: {
      title?: string;
      description?: string;
      color?: string;
      fields?: Array<{ name: string; value: string; inline?: boolean }>;
    };
  };
}

export interface CommandMetadata {
  name: string;
  description: string;
  category: CommandCategory;
  status: CommandStatus;
  usage: string;
  permissions?: string[];
  cooldown?: number;
  examples: CommandExample[];
}
