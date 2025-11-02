export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/authentication/sign-in',
    REGISTER: '/authentication/sign-up',
    LOGOUT: '/authentication/logout',
    REFRESH: '/authentication/refresh-tokens',
    ME: '/users/me', // Users endpoint now handles user data
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
  REFRESH_TOKEN: 'junta_tribo_refresh_token',
  USER_DATA: 'junta_tribo_user',
} as const;
