import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

// Connect to the /notifications namespace on the current origin (dev: Vite proxies
// /socket.io → :3000; prod: nginx upgrades /socket.io → backend_pool). WS-only so no
// long-polling handshake → nginx needs no sticky sessions.
export function connectNotificationSocket(token: string): Socket {
  if (socket?.connected) return socket
  socket = io('/notifications', {
    transports: ['websocket'],
    auth: { token },
    autoConnect: true,
    reconnection: true,
  })
  return socket
}

export function getNotificationSocket(): Socket | null {
  return socket
}

export function disconnectNotificationSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
