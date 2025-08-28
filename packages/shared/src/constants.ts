export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
  },
  USERS: {
    BASE: '/users',
    ME: '/users/me',
  },
  TRIPS: {
    BASE: '/trips',
    UPCOMING: '/trips/upcoming',
  },
} as const;

export const TRIP_STATUS_LABELS = {
  planning: 'Planning',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
} as const;

export const LOCAL_STORAGE_KEYS = {
  AUTH_TOKEN: 'junta_tribo_token',
  USER_DATA: 'junta_tribo_user',
} as const;
