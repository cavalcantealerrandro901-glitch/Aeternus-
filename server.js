const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Aponta direto para o testar.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'testar.html'));
});

let players = {};

io.on('connection', (socket) => {
  socket.on('joinGame', (data) => {
    players[socket.id] = {
      id: socket.id,
      username: data.username || 'Jogador',
      x: Math.floor(Math.random() * 500) + 100,
      y: Math.floor(Math.random() * 300) + 100,
      hp: 100,
      maxHp: 100,
      score: 0,
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`
    };
    io.emit('updatePlayers', players);
  });

  socket.on('move', (data) => {
    const p = players[socket.id];
    if (p && p.hp > 0) {
      p.x += data.dx;
      p.y += data.dy;
      p.x = Math.max(25, Math.min(775, p.x));
      p.y = Math.max(25, Math.min(575, p.y));
      io.emit('playerMoved', p);
    }
  });

  socket.on('attack', () => {
    const attacker = players[socket.id];
    if (!attacker || attacker.hp <= 0) return;

    Object.keys(players).forEach((targetId) => {
      if (targetId !== socket.id) {
        const target = players[targetId];
        const dist = Math.hypot(attacker.x - target.x, attacker.y - target.y);
        if (dist < 65 && target.hp > 0) {
          target.hp -= 25;
          if (target.hp <= 0) {
            target.hp = 0;
            attacker.score += 1;
            setTimeout(() => {
              if (players[targetId]) {
                players[targetId].hp = 100;
                players[targetId].x = Math.floor(Math.random() * 500) + 100;
                players[targetId].y = Math.floor(Math.random() * 300) + 100;
                io.emit('updatePlayers', players);
              }
            }, 3000);
          }
          io.emit('updatePlayers', players);
        }
      }
    });
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('updatePlayers', players);
  });
});

server.listen(3000, () => {
  console.log('\n⚔️ ARENA PVP 2D ONLINE em: http://localhost:3000\n');
});
