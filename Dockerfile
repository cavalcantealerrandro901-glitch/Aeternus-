# Aeternus — Discord bot (Node.js)
FROM node:20-bookworm-slim

ENV NODE_ENV=production \
    DEBIAN_FRONTEND=noninteractive

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force

COPY . .

ENV PORT=10000
EXPOSE 10000

RUN useradd -m -u 1001 aeternus \
  && chown -R aeternus:aeternus /app
USER aeternus

CMD ["node", "index.js"]
