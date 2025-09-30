import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import jwtConfig from '../../../config/jwt.config';
import { REQUEST_USER_KEY } from '../../../iam.constants';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // switchToHttp gives access to the native in-flight
    // Request, Response and Next objects
    // For GraphQL you need to use the wrapper GraphQL Execution Context here
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException();
    }
    try {
      const payload = await this.jwtService.verifyAsync(
        token,
        this.jwtConfiguration,
      );
      /**
       * payload = {
       *   sub: 1, // The user ID that granted this token
       *   email: 'mfrony@yahoo.com', // Extra data provided when generating the token
       *   iat: 1701292997, //
       *   exp: 1701296597, // expiration timestamp of the token
       *   aud: 'localhost:3001', // audience we passed when generating the token
       *   iss: 'localhost:3001'
       * }
       */
      // Assign the payload to the request.user property
      // so we can access the user object later on
      // in our endpoints or subsequent guards
      request[REQUEST_USER_KEY] = payload;
    } catch (error) {
      throw new UnauthorizedException();
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
