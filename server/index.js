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

// rooms: Map<roomId, { players, activePlayers, displaySocketId, seed, settings, gameActive, results }>
const rooms = new Map();

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      players: [], activePlayers: new Set(),
      displaySocketId: null, seed: null, settings: null,
      gameActive: false, results: {},
    });
  }
  return rooms.get(roomId);
}

function leaveRoom(socket) {
  for (const [roomId, room] of rooms) {
    // If display disconnects, clear its slot but keep the room
    if (room.displaySocketId === socket.id) {
      room.displaySocketId = null;
      continue;
    }
    const idx = room.players.findIndex((p) => p.socketId === socket.id);
    if (idx === -1) continue;
    const leavingId = room.players[idx].id;
    const wasHost   = room.players[idx].isHost === true;
    room.players.splice(idx, 1);

    if (room.gameActive) {
      room.activePlayers.delete(leavingId);
    } else {
      socket.leave(roomId);
    }

    if (room.players.length === 0 && !room.displaySocketId && !room.gameActive) {
      rooms.delete(roomId);
      continue;
    }

    // Host left: promote next player, reset game state, return everyone to lobby
    if (wasHost && room.players.length > 0) {
      room.players[0].isHost = true;
      const newHostSocketId = room.players[0].socketId;
      const newHostSocket   = io.sockets.sockets.get(newHostSocketId);
      room.gameActive    = false;
      room.activePlayers = new Set();
      room.seed          = null;
      room.settings      = null;
      room.results       = {};
      if (newHostSocket) newHostSocket.emit('you-are-host');
      io.to(roomId).except(newHostSocketId).emit('return-to-lobby');
      io.to(roomId).emit('room-update', room.players);
      continue;
    }

    // Normal (non-host) player left
    io.to(roomId).emit('room-update', room.players);

    if (room.gameActive) {
      if (room.activePlayers.size === 0) {
        room.gameActive = false;
        room.activePlayers = new Set();
        io.to(roomId).emit('return-to-lobby');
      } else if (Object.keys(room.results).length >= room.activePlayers.size) {
        room.gameActive = false;
        room.activePlayers = new Set();
        io.to(roomId).emit('all-results', Object.values(room.results));
      }
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

    // Only join the socket.io room if not already subscribed.
    // Players who backed out of a game stay subscribed so they receive game-started.
    const alreadySubscribed = socket.rooms.has(roomId);
    if (!alreadySubscribed) socket.join(roomId);

    // Replace stale entry for same profile id OR same socket (profile switch).
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

    // Only send game-in-progress to genuine new joiners, not players returning to lobby
    // after pressing back (they stayed subscribed but weren’t in activePlayers).
    if (room.gameActive && room.seed && !alreadySubscribed) {
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
    // Snapshot which players are actively playing so back-outs don’t block results
    room.activePlayers = new Set(room.players.map(p => p.id));
    io.to(roomId).emit('game-started', { seed, settings });
  });

  // Player submits their end-of-game results
  socket.on('submit-results', ({ roomId, result }) => {
    const room = rooms.get(roomId);
    if (!room || !room.gameActive) return;  // ignore stale submits after host-left reset
    room.results[result.id] = result;
    // Compare against activePlayers (snapshot at game-start) so back-outs don’t block
    const activeCount = room.activePlayers.size || room.players.length;
    if (Object.keys(room.results).length >= activeCount) {
      room.gameActive = false;
      room.activePlayers = new Set();
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
