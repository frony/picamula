import { SetMetadata } from '@nestjs/common';
import { PermissionType } from '../permission.type';

/**
 * Indicates which permissions are required
 * in order to access an annotated endpoint
 */
export const PERMISSION_KEYS = 'permissions';
export const Permissions = (...permissions: PermissionType[]) =>
  SetMetadata(PERMISSION_KEYS, permissions);
