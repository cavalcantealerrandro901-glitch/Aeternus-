import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  integrations: [
    starlight({
      title: 'Aeternus Wiki',
      social: {
        github: 'https://github.com/seu-usuario/aeternus',
        discord: 'https://discord.gg/seu-servidor',
      },
      customCss: ['./src/styles/custom.css'],
      sidebar: [
        {
          label: '🚀 Começando',
          items: [
            { label: 'Visão Geral', link: '/comecando/introducao/' },
          ],
        },
        {
          label: '📖 Comandos',
          items: [
            {
              label: '💰 Economia',
              autogenerate: { directory: 'comandos/economia' },
            },
            {
              label: '🎵 Música',
              autogenerate: { directory: 'comandos/musica' },
            },
            {
              label: '🛡️ Administração',
              autogenerate: { directory: 'comandos/administracao' },
            },
          ],
        },
        {
          label: '👨‍💻 Desenvolvedores',
          items: [
            { label: 'API REST', link: '/desenvolvedores/api/' },
            { label: 'Webhooks & Eventos', link: '/desenvolvedores/webhooks/' },
          ],
        },
        {
          label: '📊 Monitoramento',
          items: [
            { label: 'Status do Sistema', link: '/status/' },
            { label: 'Changelog', link: '/changelog/' },
          ],
        },
        {
          label: '🆘 Ajuda',
          items: [
            { label: 'Central de Suporte', link: '/suporte/' },
          ],
        },
      ],
    }),
  ],
});
