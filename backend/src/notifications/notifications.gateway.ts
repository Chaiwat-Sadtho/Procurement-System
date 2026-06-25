import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { User } from '../users/entities/user.entity';
import { NOTIFICATION_NEW_EVENT, NotificationDto } from './notification-events';

type SocketUser = { id: number; role: User['role']; departmentId: number | null };
type NextFn = (err?: Error) => void;

// CORS is governed centrally by RedisIoAdapter.createIOServer (reads CORS_ORIGIN).
@WebSocketGateway({ namespace: '/notifications' })
export class NotificationsGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger('NotificationsGateway');

  constructor(
    private readonly jwt: JwtService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  afterInit(server: Server): void {
    // Reject unauthenticated handshakes BEFORE connection → client gets `connect_error`.
    server.use((socket, next) => {
      void this.authenticate(socket, next);
    });
  }

  // Mirrors JwtStrategy.validate: verify token → load user → require isActive.
  async authenticate(socket: Socket, next: NextFn): Promise<void> {
    try {
      const fromAuth = (socket.handshake.auth as { token?: string } | undefined)?.token;
      const fromHeader = socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');
      const token = fromAuth ?? fromHeader;
      if (!token) return next(new Error('Unauthorized'));

      const payload = this.jwt.verify<{ sub: number }>(token);
      const user = await this.users.findOne({ where: { id: payload.sub } });
      if (!user || !user.isActive) return next(new Error('Unauthorized'));

      (socket.data as { user?: SocketUser }).user = {
        id: user.id,
        role: user.role,
        departmentId: user.departmentId,
      };
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  }

  handleConnection(client: Socket): void {
    const user = (client.data as { user?: SocketUser }).user;
    if (!user) {
      client.disconnect();
      return;
    }
    void client.join(`user:${user.id}`);
  }

  emitToUser(userId: number, dto: NotificationDto): void {
    this.server.to(`user:${userId}`).emit(NOTIFICATION_NEW_EVENT, dto);
  }
}
