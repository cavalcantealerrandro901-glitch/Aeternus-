# Aeternus — Node + voz (@discordjs/voice, FFmpeg, yt-dlp)
FROM node:20-bookworm-slim

ENV NODE_ENV=production \
    DEBIAN_FRONTEND=noninteractive \
    FFMPEG_PATH=/usr/bin/ffmpeg \
    YTDLP_PATH=/usr/local/bin/yt-dlp \
    YTDLP_NO_DOWNLOAD=1

WORKDIR /app

# Sistema: FFmpeg, Python, certs, libs nativas
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    ca-certificates \
    curl \
    git \
    build-essential \
    python3-dev \
    libtool \
    autoconf \
    automake \
    pkg-config \
    libsodium-dev \
  && rm -rf /var/lib/apt/lists/*

# yt-dlp (binário oficial)
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
      -o /usr/local/bin/yt-dlp \
  && chmod a+rx /usr/local/bin/yt-dlp \
  && yt-dlp --version \
  && ffmpeg -version | head -1

COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force

COPY . .

ENV PORT=10000
EXPOSE 10000

RUN useradd -m -u 1001 aeternus \
  && chown -R aeternus:aeternus /app
USER aeternus

CMD ["node", "index.js"]
