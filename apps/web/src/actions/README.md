# API Actions

This directory contains domain-specific action files that provide a scalable and maintainable way to interact with the API. The structure is inspired by the Band_And_Fan project and follows modern patterns for API management.

## Structure

- `auth-actions.ts` - Authentication related actions (login, register, logout, etc.)
- `users-actions.ts` - User management actions (CRUD operations)
- `trips-actions.ts` - Trip management actions (CRUD operations)
- `notes-actions.ts` - Note management actions (CRUD operations)
- `index.ts` - Barrel export for easy importing

## Usage

### New Code (Recommended)

Use the action functions directly:

```typescript
import { loginUser, fetchTrips, createNote } from '@/actions';

// Login
const result = await loginUser({ email: 'user@example.com', password: 'password' });
if (result.success) {
  // Handle success
} else {
  // Handle error
  console.error(result.error);
}

// Fetch trips
const tripsResult = await fetchTrips('upcoming');
if (tripsResult.success) {
  const trips = tripsResult.data;
}

// Create note
const noteResult = await createNote('trip-id', {
  title: 'My Note',
  content: 'Note content'
});
```

### Legacy Code (Backward Compatibility)

The old API structure is still available for backward compatibility:

```typescript
import { authApi, tripsApi, notesApi } from '@/lib/api';

// These still work but are deprecated
const response = await authApi.login({ email: 'user@example.com', password: 'password' });
const trips = await tripsApi.getAll('upcoming');
```

## Benefits

1. **Scalability**: Each domain has its own file, making it easy to add new endpoints
2. **Error Handling**: Consistent error handling across all actions
3. **Type Safety**: Full TypeScript support with proper interfaces
4. **Server Actions**: All actions are marked with 'use server' for Next.js App Router compatibility
5. **Maintainability**: Clear separation of concerns and easy to test
6. **Backward Compatibility**: Existing code continues to work without changes

## Migration Guide

To migrate from the old API structure to the new actions:

1. Replace direct API calls with action functions
2. Handle the `ActionResult` response format instead of raw API responses
3. Use the `success` and `error` properties to handle responses
4. Access data through the `data` property when `success` is true

## Adding New Actions

To add new actions:

1. Create a new action file in this directory (e.g., `new-domain-actions.ts`)
2. Follow the same pattern as existing files
3. Export the functions from `index.ts`
4. Use the `ActionResult` interface for consistent response handling
