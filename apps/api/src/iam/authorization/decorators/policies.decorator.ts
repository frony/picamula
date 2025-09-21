import { SetMetadata } from '@nestjs/common';
import { Policy } from '../policies/interfaces/policy.interface';
// Attach policies to endpoints or controllers
export const POLICIES_KEY = 'policies';
export const Policies = (...policies: Policy[]) =>
  SetMetadata(POLICIES_KEY, policies);
