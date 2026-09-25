import fs from 'fs';
import path from 'path';

const COMMANDS_DIR = path.resolve('src/commands');
const OUTPUT_DIR = path.resolve('src/content/docs/comandos');

function ensureDirExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function generateMDX(metadata) {
  const example = metadata.examples?.[0] || {};
  const embed = example.botResponse?.embed || {};

  return `---
title: /${metadata.name}
description: ${metadata.description}
---

import StatusBadge from '../../../../components/StatusBadge.astro';
import CopyButton from '../../../../components/CopyButton.astro';
import DiscordMessage from '../../../../components/DiscordMessage.astro';

<StatusBadge status="${metadata.status}" />

${metadata.description}

### 📋 Copiar Comando

<CopyButton command="${metadata.usage}" />

### ⚙️ Informações

| Propriedade | Valor |
| :--- | :--- |
| **Categoria** | ${metadata.category} |
| **Cooldown** | ${metadata.cooldown ? `${metadata.cooldown} segundos` : 'Nenhum'} |
| **Permissões** | ${metadata.permissions?.join(', ') || 'Nenhuma'} |

---

### 💡 Exemplo de Uso

<DiscordMessage 
  userCommand="${example.userMessage || metadata.usage}"
  botTitle="${embed.title || ''}"
  botDescription="${embed.description || ''}"
  color="${embed.color || '#5865f2'}"
  fields={${JSON.stringify(embed.fields || [])}}
/>
`;
}

async function sync() {
  console.log('🔄 A analisar comandos do Aeternus...');
  
  if (!fs.existsSync(COMMANDS_DIR)) {
    console.log('⚠️ Pasta src/commands não encontrada. A ignorar geração dinâmica.');
    return;
  }

  const categories = fs.readdirSync(COMMANDS_DIR);

  for (const category of categories) {
    const categoryPath = path.join(COMMANDS_DIR, category);
    if (!fs.statSync(categoryPath).isDirectory()) continue;

    const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.ts') || f.endsWith('.js'));

    for (const file of files) {
      const filePath = path.join(categoryPath, file);
      
      // Importa dinamicamente os metadados do comando
      const module = await import(`file://${filePath}`);
      const metadata = module.metadata;

      if (metadata && metadata.name) {
        const targetDir = path.join(OUTPUT_DIR, category.toLowerCase());
        ensureDirExists(targetDir);

        const mdxContent = generateMDX(metadata);
        const targetFile = path.join(targetDir, `${metadata.name}.mdx`);

        fs.writeFileSync(targetFile, mdxContent, 'utf-8');
        console.log(`✅ Gerada página para: /${metadata.name} -> ${targetFile}`);
      }
    }
  }

  console.log('🎉 Sincronização da Wiki concluída com sucesso!');
}

sync().catch(console.error);
