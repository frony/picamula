'use server';

import { apiClient } from '@/lib/api-client';
import type { User, UpdateUserDto } from '@junta-tribo/shared';

interface ActionResult {
  success: boolean;
  error?: string;
  data?: any;
}

// Fetch all users
export async function fetchUsers(): Promise<ActionResult> {
  try {
    const users = await apiClient.get<User[]>('/users');

    return {
      success: true,
      data: users
    };
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch users'
    };
  }
}

// Fetch user by ID
export async function fetchUserById(id: number): Promise<ActionResult> {
  try {
    const user = await apiClient.get<User>(`/users/${id}`);

    return {
      success: true,
      data: user
    };
  } catch (error: any) {
    console.error('Error fetching user:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch user'
    };
  }
}

// Update user profile (current user)
export async function updateUserProfile(data: UpdateUserDto): Promise<ActionResult> {
  try {
    const user = await apiClient.patch<User>('/users/me', data);

    return {
      success: true,
      data: user
    };
  } catch (error: any) {
    console.error('Error updating user profile:', error);

    if (error.status === 403) {
      return {
        success: false,
        error: 'You do not have permission to update this profile'
      };
    }

    if (error.status === 401) {
      return {
        success: false,
        error: 'Authentication required. Please log in again.'
      };
    }

    return {
      success: false,
      error: error.message || 'Failed to update profile'
    };
  }
}

// Update user by ID (admin function)
export async function updateUser(id: number, data: UpdateUserDto): Promise<ActionResult> {
  try {
    const user = await apiClient.patch<User>(`/users/${id}`, data);

    return {
      success: true,
      data: user
    };
  } catch (error: any) {
    console.error('Error updating user:', error);

    if (error.status === 403) {
      return {
        success: false,
        error: 'You do not have permission to update users. Admin access required.'
      };
    }

    if (error.status === 401) {
      return {
        success: false,
        error: 'Authentication required. Please log in again.'
      };
    }

    return {
      success: false,
      error: error.message || 'Failed to update user'
    };
  }
}

// Deactivate user profile (current user)
export async function deactivateUserProfile(): Promise<ActionResult> {
  try {
    const user = await apiClient.delete<User>('/users/me');

    // Note: Session cleanup is handled by NextAuth on the client side

    return {
      success: true,
      data: user
    };
  } catch (error: any) {
    console.error('Error deactivating user profile:', error);

    if (error.status === 401) {
      return {
        success: false,
        error: 'Authentication required. Please log in again.'
      };
    }

    return {
      success: false,
      error: error.message || 'Failed to deactivate profile'
    };
  }
}

// Delete user by ID (admin function)
export async function deleteUser(id: number): Promise<ActionResult> {
  try {
    await apiClient.delete(`/users/${id}`);

    return {
      success: true
    };
  } catch (error: any) {
    console.error('Error deleting user:', error);

    if (error.status === 403) {
      return {
        success: false,
        error: 'You do not have permission to delete users. Admin access required.'
      };
    }

    if (error.status === 401) {
      return {
        success: false,
        error: 'Authentication required. Please log in again.'
      };
    }

    return {
      success: false,
      error: error.message || 'Failed to delete user'
    };
  }
}
