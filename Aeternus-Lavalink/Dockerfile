FROM ghcr.io/lavalink-devs/lavalink:4-alpine

COPY application.yml /opt/Lavalink/application.yml

ENV _JAVA_OPTIONS="-Xms96m -Xmx384m -XX:+UseSerialGC -XX:MaxMetaspaceSize=96m"

EXPOSE 2333
