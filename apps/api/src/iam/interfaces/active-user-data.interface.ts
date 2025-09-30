import { Role } from '../../users/enums/role.enum';
import { PermissionType } from '../authorization/permission.type';

export interface ActiveUserData {
  /**
   * The subject of the token.
   * The value of this property is the user ID that granted this token
   */
  sub: number;

  /**
   * The subject's (user) name
   */
  name?: string;

  /**
   * The subject's (user) email
   */
  email: string;

  /**
   * The subject's (user) role
   */
  role: Role;

  /**
   * The subject's (user) permissions
   * NOTE: Adding both Role and permissions
   * won't make much sense in production.
   * Using it here for testing.
   * It would be a many-to-many relationship between
   * the users and the permissions table
   */
  permissions: PermissionType[];
}
