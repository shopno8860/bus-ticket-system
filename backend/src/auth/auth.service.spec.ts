import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let jwtService: { signAsync: jest.Mock };
  let configService: { getOrThrow: jest.Mock };
  let mailService: { sendResetPasswordEmail: jest.Mock };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    jwtService = {
      signAsync: jest.fn(),
    };
    configService = {
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, string> = {
          JWT_ACCESS_SECRET: 'access-secret',
          JWT_REFRESH_SECRET: 'refresh-secret',
          JWT_ACCESS_EXPIRES_IN: '15m',
          JWT_REFRESH_EXPIRES_IN: '7d',
        };

        return values[key];
      }),
    };
    mailService = {
      sendResetPasswordEmail: jest.fn(),
    };

    service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
      mailService as unknown as MailService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('registers a new user with role USER and hashed password', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'user-1',
      fullName: 'Alice Doe',
      email: 'alice@example.com',
      passwordHash: 'stored-hash',
      phoneNumber: null,
      role: UserRole.USER,
      refreshTokenHash: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prisma.user.update.mockResolvedValue({});
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');
    (bcrypt.hash as jest.Mock)
      .mockResolvedValueOnce('password-hash')
      .mockResolvedValueOnce('refresh-hash');

    const result = await service.register({
      fullName: 'Alice Doe',
      email: 'Alice@Example.com',
      password: 'password123',
      phoneNumber: undefined,
    });

    expect(prisma.user.create).toHaveBeenCalledTimes(1);
    const createCalls = prisma.user.create.mock.calls as Array<[unknown]>;
    const createCallArg = createCalls[0]?.[0] as
      | {
          data: {
            email: string;
            passwordHash: string;
            role: UserRole;
          };
        }
      | undefined;
    expect(createCallArg).toBeDefined();
    expect(createCallArg?.data.email).toBe('alice@example.com');
    expect(createCallArg?.data.passwordHash).toBe('password-hash');
    expect(createCallArg?.data.role).toBe(UserRole.USER);
    expect(result.user).toEqual(
      expect.objectContaining({
        email: 'alice@example.com',
        role: UserRole.USER,
      }),
    );
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.user).not.toHaveProperty('refreshTokenHash');
  });

  it('rejects duplicate registration', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

    await expect(
      service.register({
        fullName: 'Alice Doe',
        email: 'alice@example.com',
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('logs in with valid credentials', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      fullName: 'Alice Doe',
      email: 'alice@example.com',
      passwordHash: 'stored-password-hash',
      phoneNumber: null,
      role: UserRole.USER,
      refreshTokenHash: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prisma.user.update.mockResolvedValue({});
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
    (bcrypt.hash as jest.Mock).mockResolvedValueOnce('refresh-hash');

    const result = await service.login({
      email: 'alice@example.com',
      password: 'password123',
    });

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
  });

  it('rejects invalid login credentials', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      fullName: 'Alice Doe',
      email: 'alice@example.com',
      passwordHash: 'stored-password-hash',
      phoneNumber: null,
      role: UserRole.USER,
      refreshTokenHash: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

    await expect(
      service.login({
        email: 'alice@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rotates refresh tokens when the provided token is valid', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      fullName: 'Alice Doe',
      email: 'alice@example.com',
      passwordHash: 'stored-password-hash',
      phoneNumber: null,
      role: UserRole.USER,
      refreshTokenHash: 'stored-refresh-hash',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prisma.user.update.mockResolvedValue({});
    jwtService.signAsync
      .mockResolvedValueOnce('new-access-token')
      .mockResolvedValueOnce('new-refresh-token');
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
    (bcrypt.hash as jest.Mock).mockResolvedValueOnce('new-refresh-hash');

    const result = await service.refreshTokens('user-1', 'old-refresh-token');

    expect(result.accessToken).toBe('new-access-token');
    expect(result.refreshToken).toBe('new-refresh-token');
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { refreshTokenHash: 'new-refresh-hash' },
      }),
    );
  });

  it('rejects invalid refresh tokens', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      fullName: 'Alice Doe',
      email: 'alice@example.com',
      passwordHash: 'stored-password-hash',
      phoneNumber: null,
      role: UserRole.USER,
      refreshTokenHash: 'stored-refresh-hash',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

    await expect(
      service.refreshTokens('user-1', 'bad-refresh-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('clears refresh token state on logout', async () => {
    prisma.user.update.mockResolvedValue({});

    const result = await service.logout('user-1');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { refreshTokenHash: null },
    });
    expect(result).toEqual({ message: 'Logged out successfully' });
  });
});
