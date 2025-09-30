import { Policy } from './policies/interfaces/policy.interface';
import { Injectable } from '@nestjs/common';
import { PolicyHandler } from './policies/interfaces/policy-handler.interface';
import { ActiveUserData } from '../interfaces/active-user-data.interface';
import { PolicyHandlerStorage } from './policies/policy-handler.storage';

export class FrameworkContributorPolicy implements Policy {
  name = 'FrameworkContributor';
}

@Injectable()
export class FrameworkContributorPolicyHandler
  implements PolicyHandler<FrameworkContributorPolicy>
{
  constructor(private readonly policyHandlerStorage: PolicyHandlerStorage) {
    this.policyHandlerStorage.add(FrameworkContributorPolicy, this);
  }
  async handle(
    policy: FrameworkContributorPolicy,
    user: ActiveUserData,
  ): Promise<void> {
    const isContributor = user.email.endsWith('@yahoo.com');
    if (!isContributor) {
      throw new Error('User is not contributor');
    }
  }
}
