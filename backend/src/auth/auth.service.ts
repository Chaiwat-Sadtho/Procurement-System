import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { plainToInstance } from 'class-transformer';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CacheService } from '../cache/cache.service';
import { CacheKeys, CacheTtl } from '../cache/cache-keys';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly cache: CacheService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    if (dto.departmentId == null) {
      throw new BadRequestException('departmentId is required');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      middleName: dto.middleName ?? null,
      lastName: dto.lastName,
      departmentId: dto.departmentId,
    });
    try {
      const saved = await this.userRepository.save(user);
      return this.signToken(saved);
    } catch (err) {
      if (err instanceof QueryFailedError && (err as { code?: string }).code === '23503') {
        throw new BadRequestException(`Department ${dto.departmentId} not found`);
      }
      throw err;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: dto.email })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    return this.signToken(user);
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id: userId })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepository.save(user);
    return { message: 'Password changed successfully' };
  }

  async getProfile(userId: number): Promise<User> {
    const cached = await this.cache.getOrSet(
      CacheKeys.authMe(userId),
      CacheTtl.AUTH_ME,
      async () => {
        const user = await this.userRepository.findOne({
          where: { id: userId },
          relations: { department: true },
        });
        if (!user) {
          throw new UnauthorizedException('User not found');
        }
        return user;
      },
    );
    // A cache hit comes back JSON-deserialized (plain object): the @Expose() fullName
    // getter and Date types are lost, so ClassSerializerInterceptor would drop fullName.
    // Rebuild the User instance so the response shape is identical on hit and miss.
    // (cast to object so plainToInstance picks the single-object overload, not the array one)
    return cached instanceof User ? cached : plainToInstance(User, cached as object);
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.middleName !== undefined) user.middleName = dto.middleName ?? null;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    await this.userRepository.save(user);
    // del before getProfile so the re-read repopulates the cache with fresh data
    await this.cache.del(CacheKeys.authMe(userId));
    return this.getProfile(userId);
  }

  private signToken(user: User) {
    return {
      access_token: this.jwtService.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
      }),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        fullName: [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' '),
      },
    };
  }
}
