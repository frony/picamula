import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticationGuard } from './authentication.guard';
import { Reflector } from '@nestjs/core';
import { AccessTokenGuard } from '../access-token/access-token.guard';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

describe('AuthenticationGuard', () => {
  let guard: AuthenticationGuard;

  // Mock Implementation of ExecutionContext
  const context: ExecutionContext = {
    switchToHttp: () => ({
      getRequest: () => ({}), // Mock request object
      getResponse: () => ({}), // Mock response object
    }),
    getHandler: () => jest.fn(), // Mock handler
    getClass: () => jest.fn(), // Mock class
  } as unknown as ExecutionContext;

  const mockAccessTokenGuard = {
    canActivate: jest.fn(() => Promise.resolve(true)),
  };
  const mockApiKeyGuard = { canActivate: jest.fn(() => Promise.resolve(true)) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationGuard,
        Reflector,
        {
          provide: AccessTokenGuard,
          useValue: mockAccessTokenGuard,
          // useValue: { canActivate: jest.fn(() => Promise.resolve(true)) },
        },
        {
          provide: ApiKeyGuard,
          useValue: mockApiKeyGuard,
          // useValue: { canActivate: jest.fn(() => Promise.resolve(true)) },
        },
      ],
    }).compile();

    guard = module.get<AuthenticationGuard>(AuthenticationGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined(); // Check that the guard is instantiated correctly
  });

  it('should activate when AccessTokenGuard returns true', async () => {
    // const context = {} as ExecutionContext; // Mock ExecutionContext, implement if necessary
    const result = await guard.canActivate(context);
    expect(result).toBe(true); // Check if canActivate returns true
  });

  it('should throw UnauthorizedException if no guards return true', async () => {
    // Make all guards return false
    mockAccessTokenGuard.canActivate.mockResolvedValueOnce(false);
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    ); // Ensure it throws
  });
});
