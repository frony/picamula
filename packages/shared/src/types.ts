// User types
export interface User {
  id: number; // Changed to number for IAM
  name: string; // IAM uses 'name' instead of firstName/lastName
  email: string;
  phone?: string;
  role: string;
  isVerified: boolean;
  isTfaEnabled: boolean;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  email: string;
  name: string; // Changed to match IAM
  password: string;
  phone?: string;
}

export interface UpdateUserDto {
  name?: string;
  phone?: string;
}

// Trip types
export enum TripStatus {
  PLANNING = 'planning',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface Trip {
  id: string;
  title: string;
  description?: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  status: TripStatus;
  budget?: number;
  participants?: string[];
  itinerary?: any[];
  notes?: { content: string; date: string }[];
  owner: User;
  ownerId: number; // Changed to number
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTripDto {
  title: string;
  description?: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  status?: TripStatus;
  budget?: number;
  participants?: string[];
  itinerary?: any[];
}

export interface UpdateTripDto {
  title?: string;
  description?: string;
  destination?: string;
  startDate?: Date;
  endDate?: Date;
  status?: TripStatus;
  budget?: number;
  participants?: string[];
  itinerary?: any[];
}

// Auth types
export interface LoginDto {
  email: string;
  password: string;
  tfaCode?: string; // Optional 2FA code
}

export interface RegisterDto {
  email: string;
  name: string; // Changed to match IAM
  password: string;
  phone?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
}

export interface SignUpResponse {
  name: string;
  email: string;
  permissions: string[];
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
