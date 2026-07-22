import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

// Connects to the /notifications namespace on the current origin. WebSocket-only: without the
// long-polling handshake, nginx needs no sticky sessions.
export function connectNotificationSocket(token: string): Socket {
  if (socket?.connected) return socket
  if (socket) {
    socket.disconnect()
    socket = null
  }
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
