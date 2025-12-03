// Note types
export interface Note {
  id: string;
  content: string;
  date: Date;
  tripId: number;  // Changed from string to number
  author: User;
  authorId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNoteDto {
  content: string;
  date: string;
}

export interface UpdateNoteDto {
  content?: string;
  date?: string;
}

// Todo Item types
export enum TodoStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
}

export interface TodoItem {
  id: number;
  title: string;
  status: TodoStatus;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTodoItemDto {
  title: string;
}

export interface UpdateTodoItemDto {
  status: TodoStatus;
}

// User types
export interface User {
  id: number; // Changed to number for IAM
  firstName: string;
  lastName: string;
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
  firstName: string;
  lastName: string;
  password: string;
  phone?: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

// Media file types
export enum MediaFileType {
  IMAGE = 'image',
  VIDEO = 'video',
}

export interface MediaFile {
  id: number;
  key: string;
  url: string;
  type: MediaFileType;
  originalName?: string;
  mimeType?: string;
  size?: number;
  order: number;
  width?: number;
  height?: number;
  duration?: number;
  thumbnailKey?: string;
  tripId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMediaFileDto {
  key: string;
  url: string;
  type: MediaFileType;
  originalName?: string;
  mimeType?: string;
  size?: number;
  order?: number;
  width?: number;
  height?: number;
  duration?: number;
  thumbnailKey?: string;
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
  id: number;        // Changed from string to number
  slug: string;      // NEW: Public identifier for URLs
  title: string;
  description?: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  status: TripStatus;
  budget?: number;
  participants?: string[];
  itinerary?: any[];
  notes?: Note[];
  mediaFiles?: MediaFile[];
  owner: User;
  ownerId: number;
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
  mediaFiles?: CreateMediaFileDto[];
}

// Auth types
export interface LoginDto {
  email: string;
  password: string;
  tfaCode?: string; // Optional 2FA code
}

export interface RegisterDto {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  phone?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
}

export interface SignUpResponse {
  firstName: string;
  lastName: string;
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
