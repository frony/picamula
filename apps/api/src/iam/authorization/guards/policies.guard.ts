import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Type,
} from '@nestjs/common';
// import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { POLICIES_KEY } from '../decorators/policies.decorator';
import { Policy } from '../policies/interfaces/policy.interface';
import { ActiveUserData } from '../../interfaces/active-user-data.interface';
import { REQUEST_USER_KEY } from '../../iam.constants';
import { PolicyHandlerStorage } from '../policies/policy-handler.storage';

// This Policies Guard runs context-specific policies
// for a given operation
@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly policyHandlerStorage: PolicyHandlerStorage,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policies = this.reflector.getAllAndOverride<Policy[]>(POLICIES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (policies) {
      const user: ActiveUserData = context.switchToHttp().getRequest()[
        REQUEST_USER_KEY
      ];
      await Promise.all(
        policies.map((policy) => {
          const policyHandler = this.policyHandlerStorage.get(
            policy.constructor as Type,
          );
          return policyHandler.handle(policy, user);
        }),
      ).catch((error) => {
        throw new ForbiddenException(error.message);
      });
    }
    return true;
  }
}
