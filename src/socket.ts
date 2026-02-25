import { io, Socket } from 'socket.io-client';

// Determine where the Socket.IO server is:
// - Dev (CRA on :3000): server is on :3001, same hostname
// - Prod (Express on :3001): same origin
// - Phone (loaded from LAN IP on any port): same hostname but port 3001
function getServerUrl(): string {
  const { protocol, hostname, port } = window.location;
  if (port === '3000') {
    // CRA dev server — socket server is on port 3001
    return `${protocol}//${hostname}:3001`;
  }
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${hostname}:3001`;
  }
  // Phone or any non-localhost client — assume server is on port 3001 same host
  return `${protocol}//${hostname}:3001`;
}

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(getServerUrl(), {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
