# Aeternus — Bot Discord

**Wiki oficial (jogadores):** após o deploy, acesse `/wiki` ou use `O.wiki` no Discord.

# Aeternus — Bot Discord

Bot + painel web. **Todos os dados de jogo ficam no MongoDB** (não dependem do disco do servidor).

## Deploy no Render

1. Crie um cluster grátis no [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Network Access → permita `0.0.0.0/0` (ou os IPs do Render).
3. Database Access → usuário com senha.
4. Connect → copie a URI `mongodb+srv://...`.
5. No [Render](https://render.com): **New → Web Service** → conecte o repositório GitHub.
6. Build: `npm install` · Start: `npm start`
7. Environment:
   - `TOKEN` — token do bot Discord
   - `MONGO_URI` — URI do Atlas
   - `CLIENT_ID` — Application ID
   - `OWNER_ID` — seu Discord user ID
   - `REQUIRE_MONGO=1`
   - `ALLOW_LOCAL_DATA=0`
8. Health check path: `/health`

Opcional: use o arquivo `render.yaml` (Blueprint).

## VPS / Termius (SSH)

1. Conecte no servidor pelo **Termius** (SSH).
2. Instale Node 18+ e clone o repo.
3. Copie `.env.example` → `.env` e preencha `TOKEN` + `MONGO_URI`.
4. `npm install && npm start` (ou `pm2 start index.js --name aeternus`).

O banco continua sendo o **mesmo MongoDB Atlas** — Render e VPS compartilham os dados.

## O que vai pro Mongo

Coleção `aeternus_store` (documentos por arquivo lógico):

- `players.json` — perfis
- `xp.json` — níveis/atributos
- `ability_loadouts.json` — loadouts
- `custom_classes.json` — classes custom
- economia, arena, settings, etc.

Backups em `aeternus_backups`.

## Comandos úteis

```bash
npm start          # sobe bot + painel
npm run slash      # registra slash commands
```

## Variáveis

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| TOKEN / DISCORD_TOKEN | sim | Token do bot |
| MONGO_URI | sim (Render) | Connection string MongoDB |
| CLIENT_ID | recomendado | Application ID |
| OWNER_ID | recomendado | Dono (DM de erros) |
| GUILD_ID | opcional | Slash só neste servidor |
| PORT | auto no Render | Porta do painel |
| REQUIRE_MONGO | `1` no Render | Encerra se Mongo falhar |
| ALLOW_LOCAL_DATA | `0` no Render | Desliga cache em disco |

## Termux (Android)

O bot roda no [Termux](https://termux.dev) usando o **mesmo MongoDB Atlas** do Render.

```bash
pkg update -y
pkg install -y nodejs-lts git
git clone <seu-repo> aeternus
cd aeternus
bash scripts/termux-setup.sh
nano .env          # TOKEN + MONGO_URI
npm start
```

### Observações Termux

| Item | Detalhe |
|------|---------|
| Node | Use `nodejs-lts` (18+) |
| MongoDB | **Não** instale Mongo no celular — use Atlas |
| `sharp` | Opcional (card de perfil). Se falhar o install, o bot sobe sem ele |
| Porta | `HOST=0.0.0.0` e `PORT=10000` (painel local) |
| Background | `npm i -g pm2` → `pm2 start index.js --name aeternus` |
| Dados | Tudo no Mongo — igual Render e VPS |

Variáveis mínimas no `.env`:

```
TOKEN=seu_token
MONGO_URI=mongodb+srv://...
CLIENT_ID=
OWNER_ID=
HOST=0.0.0.0
PORT=10000
REQUIRE_MONGO=1
ALLOW_LOCAL_DATA=0
```

Wake-lock (evita o Android matar o processo):

```bash
termux-wake-lock
npm start
```

