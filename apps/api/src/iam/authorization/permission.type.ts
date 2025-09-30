import { UsersPermission } from '../../users/users.permission';

export const Permission = {
  ...UsersPermission,
};

export type PermissionType = UsersPermission; // Use as input argument type for the decorator
