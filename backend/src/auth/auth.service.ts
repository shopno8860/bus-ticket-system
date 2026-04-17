import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';

type SafeUser = Omit<User, 'passwordHash' | 'refreshTokenHash'>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email is already in use');
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        fullName: registerDto.fullName,
        email: registerDto.email.toLowerCase(),
        passwordHash,
        phoneNumber: registerDto.phoneNumber,
        role: UserRole.USER,
      },
    });

    return this.buildAuthResponse(user);
  }

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.buildAuthResponse(user);
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user?.refreshTokenHash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.refreshTokenHash,
    );

    if (!refreshTokenMatches) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.buildAuthResponse(user);
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });

    return {
      message: 'Logged out successfully',
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.sanitizeUser(user);
  }

  async validateAccessTokenUser(payload: AuthenticatedUser) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid access token');
    }

    return {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
  }

  private async buildAuthResponse(user: User) {
    const tokens = await this.generateTokens(user);
    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash },
    });

    return {
      user: this.sanitizeUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  private async generateTokens(user: User) {
    const payload: AuthenticatedUser = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessTokenExpiresIn = this.configService.getOrThrow<string>(
      'JWT_ACCESS_EXPIRES_IN',
    ) as import('ms').StringValue;
    const refreshTokenExpiresIn = this.configService.getOrThrow<string>(
      'JWT_REFRESH_EXPIRES_IN',
    ) as import('ms').StringValue;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: accessTokenExpiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshTokenExpiresIn,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: User): SafeUser {
    const { passwordHash, refreshTokenHash, ...safeUser } = user;
    void passwordHash;
    void refreshTokenHash;

    return safeUser;
  }
}
