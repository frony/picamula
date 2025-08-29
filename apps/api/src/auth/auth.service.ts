import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { email: user.email, sub: user.id };
    const accessToken = this.jwtService.sign(payload);

    // Store session in Redis
    await this.cacheManager.set(
      `session:${user.id}`,
      JSON.stringify({ userId: user.id, email: user.email }),
      7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    );

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new UnauthorizedException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 12);
    const createUserDto: CreateUserDto = {
      ...registerDto,
      password: hashedPassword,
    };

    const user = await this.usersService.create(createUserDto);
    const { password, ...result } = user;

    const payload = { email: result.email, sub: result.id };
    const accessToken = this.jwtService.sign(payload);

    // Store session in Redis
    await this.cacheManager.set(
      `session:${result.id}`,
      JSON.stringify({ userId: result.id, email: result.email }),
      7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    );

    return {
      access_token: accessToken,
      user: {
        id: result.id,
        email: result.email,
        firstName: result.firstName,
        lastName: result.lastName,
        avatar: result.avatar,
      },
    };
  }

  async logout(userId: string) {
    await this.cacheManager.del(`session:${userId}`);
    return { message: 'Logged out successfully' };
  }

  async validateSession(userId: string): Promise<boolean> {
    const session = await this.cacheManager.get(`session:${userId}`);
    return !!session;
  }
}
