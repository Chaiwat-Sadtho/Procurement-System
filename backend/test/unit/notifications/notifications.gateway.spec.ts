import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { NotificationsGateway } from '@app/notifications/notifications.gateway';
import { User, UserRole } from '@app/users/entities/user.entity';
import { NotificationType } from '@app/notifications/entities/notification.entity';
import type { NotificationDto } from '@app/notifications/notification-events';

type NextFn = (err?: Error) => void;

const activeUser = { id: 7, role: UserRole.MANAGER, departmentId: 1, isActive: true } as User;

function makeSocket(token?: string) {
  return {
    handshake: { auth: token ? { token } : {}, headers: {} as Record<string, string> },
    data: {} as { user?: { id: number } },
    join: jest.fn(),
    disconnect: jest.fn(),
  };
}

describe('NotificationsGateway', () => {
  let gateway: NotificationsGateway;
  let jwt: { verify: jest.Mock };
  let users: { findOne: jest.Mock };

  beforeEach(() => {
    jwt = { verify: jest.fn() };
    users = { findOne: jest.fn() };
    gateway = new NotificationsGateway(
      jwt as unknown as JwtService,
      users as unknown as Repository<User>,
    );
  });

  describe('authenticate (socket middleware)', () => {
    it('valid token + active user → attaches data and calls next() with no error', async () => {
      jwt.verify.mockReturnValue({ sub: 7 });
      users.findOne.mockResolvedValue(activeUser);
      const socket = makeSocket('good-token');
      const next: NextFn = jest.fn();

      await gateway.authenticate(socket as never, next);

      expect(jwt.verify).toHaveBeenCalledWith('good-token');
      expect(socket.data.user).toEqual({ id: 7, role: UserRole.MANAGER, departmentId: 1 });
      expect(next).toHaveBeenCalledWith();
    });

    it('missing token → next(Unauthorized)', async () => {
      const socket = makeSocket(undefined);
      const next = jest.fn();
      await gateway.authenticate(socket as never, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Unauthorized' }));
      expect(socket.data.user).toBeUndefined();
    });

    it('invalid token (verify throws) → next(Unauthorized)', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('bad');
      });
      const socket = makeSocket('bad');
      const next = jest.fn();
      await gateway.authenticate(socket as never, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Unauthorized' }));
    });

    it('inactive/missing user → next(Unauthorized)', async () => {
      jwt.verify.mockReturnValue({ sub: 7 });
      users.findOne.mockResolvedValue({ ...activeUser, isActive: false });
      const socket = makeSocket('good');
      const next = jest.fn();
      await gateway.authenticate(socket as never, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Unauthorized' }));
    });

    it('token from Authorization header (no auth.token) -> accepted, Bearer stripped', async () => {
      jwt.verify.mockReturnValue({ sub: 7 });
      users.findOne.mockResolvedValue(activeUser);
      const socket = makeSocket(undefined);
      (socket.handshake.headers as Record<string, string>).authorization = 'Bearer header-token';
      const next: NextFn = jest.fn();
      await gateway.authenticate(socket as never, next);
      expect(jwt.verify).toHaveBeenCalledWith('header-token');
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('handleConnection', () => {
    it('joins the per-user room from authenticated socket data', () => {
      const socket = makeSocket();
      socket.data.user = { id: 7 };
      gateway.handleConnection(socket as never);
      expect(socket.join).toHaveBeenCalledWith('user:7');
    });

    it('disconnects when no user data (defensive)', () => {
      const socket = makeSocket();
      gateway.handleConnection(socket as never);
      expect(socket.disconnect).toHaveBeenCalled();
      expect(socket.join).not.toHaveBeenCalled();
    });
  });

  describe('emitToUser', () => {
    it('emits notification:new to the user room', () => {
      const emit = jest.fn();
      const to = jest.fn().mockReturnValue({ emit });
      gateway.server = { to } as never;
      const dto: NotificationDto = {
        id: 1,
        title: 'T',
        message: 'M',
        type: NotificationType.PR_SUBMITTED,
        isRead: false,
        referenceId: 10,
        referenceType: 'PurchaseRequest',
        createdAt: new Date(),
      };
      gateway.emitToUser(7, dto);
      expect(to).toHaveBeenCalledWith('user:7');
      expect(emit).toHaveBeenCalledWith('notification:new', dto);
    });
  });
});
