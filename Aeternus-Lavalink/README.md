# Aeternus Lavalink

Instância Lavalink enxuta para o Aeternus, preparada para hospedagem com poucos recursos.

## Características

- Lavalink 4 com imagem Alpine.
- Apenas YouTube habilitado por meio do YouTube Source Plugin.
- Fontes e filtros desnecessários desativados.
- JVM limitada para reduzir o consumo de memória.
- Porta aceita a variável `PORT`.
- Senha definida pela variável `LAVALINK_SERVER_PASSWORD`.
- Logs de requisição desativados para reduzir I/O.

## Variáveis

```env
PORT=2333
LAVALINK_SERVER_PASSWORD=uma-senha-forte
```

Não coloque a senha diretamente no GitHub.

## Recursos

A configuração usa o plugin oficial `dev.lavalink.youtube:youtube-plugin:1.18.2` e desativa a fonte YouTube integrada, conforme a documentação do projeto.

## Conexão do Aeternus

Depois de publicar o serviço, use no bot:

- Host: domínio/endereço fornecido pela hospedagem
- Porta: porta pública do serviço
- Password: o mesmo valor de `LAVALINK_SERVER_PASSWORD`
- Secure: `true` se a hospedagem fornecer HTTPS/WSS; caso contrário, `false`

O endereço final depende da URL que a Discloud fornecer ao serviço.
