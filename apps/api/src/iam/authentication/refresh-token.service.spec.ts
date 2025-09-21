import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshTokenService, RefreshTokenReuseError, RefreshTokenExpiredError } from './refresh-token.service';
import { RefreshToken } from './entities/refresh-token.entity';

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;
  let repository: Repository<RefreshToken>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<RefreshTokenService>(RefreshTokenService);
    repository = module.get<Repository<RefreshToken>>(getRepositoryToken(RefreshToken));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTokenFamily', () => {
    it('should create a new refresh token family', async () => {
      const userId = 1;
      const tokenId = 'test-token-id';
      const expiresAt = new Date(Date.now() + 3600000);
      const ipAddress = '192.168.1.1';
      const userAgent = 'Mozilla/5.0';

      const mockToken = {
        id: 1,
        tokenId,
        familyId: 'family-id',
        userId,
        expiresAt,
        createdAt: new Date(),
        isRevoked: false,
        createdFromIp: ipAddress,
        userAgent,
      };

      mockRepository.create.mockReturnValue(mockToken);
      mockRepository.save.mockResolvedValue(mockToken);

      const result = await service.createTokenFamily(userId, tokenId, expiresAt, ipAddress, userAgent);

      expect(mockRepository.create).toHaveBeenCalledWith({
        tokenId,
        familyId: expect.any(String),
        userId,
        expiresAt,
        createdFromIp: ipAddress,
        userAgent,
      });
      expect(mockRepository.save).toHaveBeenCalledWith(mockToken);
      expect(result).toEqual(mockToken);
    });
  });

  describe('validateToken', () => {
    it('should validate a valid token', async () => {
      const userId = 1;
      const tokenId = 'test-token-id';
      const mockToken = {
        id: 1,
        tokenId,
        userId,
        expiresAt: new Date(Date.now() + 3600000),
        isRevoked: false,
      };

      mockRepository.findOne.mockResolvedValue(mockToken);

      const result = await service.validateToken(userId, tokenId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { tokenId, userId },
      });
      expect(result).toEqual(mockToken);
    });

    it('should throw error for non-existent token', async () => {
      const userId = 1;
      const tokenId = 'non-existent-token';

      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.validateToken(userId, tokenId)).rejects.toThrow('Invalid refresh token');
    });

    it('should throw error for revoked token', async () => {
      const userId = 1;
      const tokenId = 'revoked-token';
      const mockToken = {
        id: 1,
        tokenId,
        userId,
        expiresAt: new Date(Date.now() + 3600000),
        isRevoked: true,
      };

      mockRepository.findOne.mockResolvedValue(mockToken);

      await expect(service.validateToken(userId, tokenId)).rejects.toThrow(RefreshTokenReuseError);
    });

    it('should throw error for expired token', async () => {
      const userId = 1;
      const tokenId = 'expired-token';
      const mockToken = {
        id: 1,
        tokenId,
        userId,
        expiresAt: new Date(Date.now() - 3600000), // Expired
        isRevoked: false,
      };

      mockRepository.findOne.mockResolvedValue(mockToken);

      await expect(service.validateToken(userId, tokenId)).rejects.toThrow(RefreshTokenExpiredError);
    });
  });

  describe('rotateToken', () => {
    it('should rotate token successfully', async () => {
      const userId = 1;
      const oldTokenId = 'old-token-id';
      const newTokenId = 'new-token-id';
      const expiresAt = new Date(Date.now() + 3600000);
      const familyId = 'family-id';

      const oldToken = {
        id: 1,
        tokenId: oldTokenId,
        familyId,
        userId,
        expiresAt: new Date(Date.now() + 3600000),
        isRevoked: false,
      };

      const newToken = {
        id: 2,
        tokenId: newTokenId,
        familyId,
        userId,
        expiresAt,
        isRevoked: false,
      };

      mockRepository.findOne.mockResolvedValue(oldToken);
      mockRepository.create.mockReturnValue(newToken);
      mockRepository.save.mockResolvedValue(newToken);

      const result = await service.rotateToken(userId, oldTokenId, newTokenId, expiresAt);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { tokenId: oldTokenId, userId },
      });
      expect(oldToken.isRevoked).toBe(true);
      expect(mockRepository.save).toHaveBeenCalledWith(oldToken);
      expect(mockRepository.create).toHaveBeenCalledWith({
        tokenId: newTokenId,
        familyId,
        userId,
        expiresAt,
        createdFromIp: undefined,
        userAgent: undefined,
      });
      expect(result).toEqual({
        newToken,
        familyId,
      });
    });
  });

  describe('revokeAllUserTokens', () => {
    it('should revoke all tokens for a user', async () => {
      const userId = 1;

      mockRepository.update.mockResolvedValue({ affected: 3 });

      await service.revokeAllUserTokens(userId);

      expect(mockRepository.update).toHaveBeenCalledWith(
        { userId, isRevoked: false },
        { isRevoked: true },
      );
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should clean up expired tokens', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 5 });

      const result = await service.cleanupExpiredTokens();

      expect(mockRepository.delete).toHaveBeenCalledWith({
        expiresAt: expect.any(Object), // LessThan(new Date())
      });
      expect(result).toBe(5);
    });
  });
}); 