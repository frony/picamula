import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { randomUUID } from 'crypto';

export class RefreshTokenReuseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RefreshTokenReuseError';
  }
}

export class RefreshTokenExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RefreshTokenExpiredError';
  }
}

@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);

  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  /**
   * Create a new refresh token family
   */
  async createTokenFamily(
    userId: number,
    tokenId: string,
    expiresAt: Date,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<RefreshToken> {
    const familyId = randomUUID();
    
    const refreshToken = this.refreshTokenRepository.create({
      tokenId,
      familyId,
      userId,
      expiresAt,
      createdFromIp: ipAddress,
      userAgent,
    });

    return await this.refreshTokenRepository.save(refreshToken);
  }

  /**
   * Rotate refresh token - invalidate old and create new
   */
  async rotateToken(
    userId: number,
    oldTokenId: string,
    newTokenId: string,
    expiresAt: Date,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ newToken: RefreshToken; familyId: string }> {
    // Find the old token
    const oldToken = await this.refreshTokenRepository.findOne({
      where: { tokenId: oldTokenId, userId },
    });

    if (!oldToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (oldToken.isRevoked) {
      throw new RefreshTokenReuseError('Refresh token has been revoked');
    }

    if (oldToken.expiresAt < new Date()) {
      throw new RefreshTokenExpiredError('Refresh token has expired');
    }

    // Revoke the old token
    oldToken.isRevoked = true;
    await this.refreshTokenRepository.save(oldToken);

    // Create new token in the same family
    const newToken = this.refreshTokenRepository.create({
      tokenId: newTokenId,
      familyId: oldToken.familyId,
      userId,
      expiresAt,
      createdFromIp: ipAddress,
      userAgent,
    });

    const savedNewToken = await this.refreshTokenRepository.save(newToken);

    return {
      newToken: savedNewToken,
      familyId: oldToken.familyId,
    };
  }

  /**
   * Validate refresh token
   */
  async validateToken(userId: number, tokenId: string): Promise<RefreshToken> {
    const token = await this.refreshTokenRepository.findOne({
      where: { tokenId, userId },
    });

    if (!token) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (token.isRevoked) {
      throw new RefreshTokenReuseError('Refresh token has been revoked');
    }

    if (token.expiresAt < new Date()) {
      throw new RefreshTokenExpiredError('Refresh token has expired');
    }

    return token;
  }

  /**
   * Revoke all tokens for a user (logout)
   */
  async revokeAllUserTokens(userId: number): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true },
    );
  }

  /**
   * Revoke specific token
   */
  async revokeToken(userId: number, tokenId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, tokenId },
      { isRevoked: true },
    );
  }

  /**
   * Revoke entire token family (security measure)
   */
  async revokeTokenFamily(userId: number, familyId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, familyId },
      { isRevoked: true },
    );
  }

  /**
   * Get active tokens for user
   */
  async getUserActiveTokens(userId: number): Promise<RefreshToken[]> {
    return await this.refreshTokenRepository.find({
      where: {
        userId,
        isRevoked: false,
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Clean up expired tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.refreshTokenRepository.delete({
      expiresAt: LessThan(new Date()),
    });
    return result.affected || 0;
  }

  /**
   * Detect potential token reuse
   */
  async detectTokenReuse(userId: number, familyId: string): Promise<boolean> {
    const familyTokens = await this.refreshTokenRepository.find({
      where: { userId, familyId },
      order: { createdAt: 'DESC' },
    });

    // If we have more than one active token in the family, it might be reuse
    const activeTokens = familyTokens.filter(
      token => !token.isRevoked && token.expiresAt > new Date(),
    );

    return activeTokens.length > 1;
  }
} 