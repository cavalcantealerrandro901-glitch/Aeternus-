#!/bin/bash

# Configurações do Git
BRANCH="main"

echo "🚀 Auto-Push ativado no Termux!"
echo "📡 Monitorando alterações nos arquivos..."

# Monitora as pastas de código por edições/criações
while inotifywait -r -e modify,create,delete --exclude 'node_modules|\.git|data' ./commands ./systems ./utils ./index.js; do
    echo "⚡ Alteração detectada! Enviando para o GitHub..."
    
    git add .
    git commit -m "Auto-update: $(date +'%Y-%m-%d %H:%M:%S')"
    git push origin $BRANCH
    
    echo "✅ Alterações enviadas com sucesso!"
    echo "-------------------------------------"
done
