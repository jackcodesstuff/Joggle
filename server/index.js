const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');

// Determine LAN IP at startup
let localIp = 'localhost';
outer: for (const ifaces of Object.values(os.networkInterfaces())) {
  for (const iface of ifaces) {
    if (iface.family === 'IPv4' && !iface.internal) {
      localIp = iface.address;
      break outer;
    }
  }
}

const PORT = process.env.PORT || 3001;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Allow cross-origin requests from CRA dev server
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

// Expose the LAN IP so the React app can build correct QR URLs
app.get('/api/network-ip', (req, res) => {
  res.json({ ip: localIp, port: PORT });
});

// Serve the built React app
app.use(express.static(path.join(__dirname, '../build')));

// rooms: Map<roomId, { players, displaySocketId, seed, settings, gameActive, results }>
const rooms = new Map();

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { players: [], displaySocketId: null, seed: null, settings: null, gameActive: false, results: {} });
  }
  return rooms.get(roomId);
}

function leaveRoom(socket) {
  for (const [roomId, room] of rooms) {
    // If display disconnects, remove room entirely (game is over for everyone)
    if (room.displaySocketId === socket.id) {
      room.displaySocketId = null;
      // Don't delete room — players might still be connected
      continue;
    }
    const idx = room.players.findIndex((p) => p.socketId === socket.id);
    if (idx === -1) continue;
    room.players.splice(idx, 1);
    socket.leave(roomId);
    // If no players left and no display, clean up
    if (room.players.length === 0 && !room.displaySocketId) {
      rooms.delete(roomId);
    } else {
      io.to(roomId).emit('room-update', room.players);
    }
  }
}

io.on('connection', (socket) => {
  // Display screen (TV/PC) registers the room — not a player
  socket.on('display-join', ({ roomId }) => {
    const room = getOrCreateRoom(roomId);
    room.displaySocketId = socket.id;
    socket.join(roomId);
    // Send current player list to display
    socket.emit('room-update', room.players);
    // If a game is already in progress, send its state
    if (room.gameActive && room.seed) {
      socket.emit('game-started', { seed: room.seed, settings: room.settings });
    }
  });

  // Phone player joins a room
  socket.on('join-room', ({ roomId, player }) => {
    if (!rooms.has(roomId)) {
      socket.emit('room-not-found');
      return;
    }
    const room = rooms.get(roomId);
    socket.join(roomId);

    // Replace stale entry for same profile id OR same socket (profile switch).
    // Capture whether this socket was previously the host so we can keep that status.
    const bySocket = room.players.findIndex((p) => p.socketId === socket.id);
    const wasHost  = bySocket >= 0 ? room.players[bySocket].isHost : false;
    if (bySocket >= 0) room.players.splice(bySocket, 1);
    const byId = room.players.findIndex((p) => p.id === player.id);
    if (byId >= 0) room.players.splice(byId, 1);

    // First player to join becomes the host; profile-switching host keeps host status
    const isFirstPlayer = room.players.length === 0;
    room.players.push({ ...player, socketId: socket.id, isHost: isFirstPlayer || wasHost });

    if (isFirstPlayer && !wasHost) {
      socket.emit('you-are-host');
    }

    io.to(roomId).emit('room-update', room.players);

    // Late joiner: if game is in progress, send them current game state
    if (room.gameActive && room.seed) {
      socket.emit('game-in-progress', { seed: room.seed, settings: room.settings });
    }
  });

  // Host starts the game — broadcasts seed + settings to everyone in room
  socket.on('start-game', ({ roomId, seed, settings }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.seed = seed;
    room.settings = settings;
    room.gameActive = true;
    room.results = {};
    io.to(roomId).emit('game-started', { seed, settings });
  });

  // Player submits their end-of-game results
  socket.on('submit-results', ({ roomId, result }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.results[result.id] = result;
    // Broadcast all-results when every current player has submitted
    if (Object.keys(room.results).length >= room.players.length) {
      room.gameActive = false;
      io.to(roomId).emit('all-results', Object.values(room.results));
    }
  });

  // Host wants to go back to lobby (Play Again) — reset game state and inform display
  socket.on('return-to-lobby', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.gameActive = false;
    room.seed = null;
    room.settings = null;
    room.results = {};
    io.to(roomId).emit('return-to-lobby');
  });

  socket.on('leave-room', () => leaveRoom(socket));
  socket.on('disconnect', () => leaveRoom(socket));
});

// Fallback: serve React app for any non-API route
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../build/index.html'));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n🟦  Joggle server is running!\n');
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://${localIp}:${PORT}  ← open this on your computer`);
  console.log('\n   QR codes will point to the Network URL automatically.');
  console.log('   Anyone on the same WiFi can scan and join.\n');
});
