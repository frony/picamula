# Automatic Token Refresh Implementation

This document explains how automatic token refresh is implemented in the JuntaTribo application.

## Overview

The token refresh system automatically refreshes the access token before it expires, ensuring users stay authenticated without interruption. The system uses JWT tokens with a two-token approach:

- **Access Token**: Short-lived token (e.g., 15 minutes) used for API authentication
- **Refresh Token**: Long-lived token (e.g., 7 days) used to obtain new access tokens

## Architecture

### Frontend Components

#### 1. API Client (`apps/web/src/lib/api-client.ts`)

The `ApiClient` class is a singleton that handles all API requests and automatic token refresh:

**Key Features:**
- **Automatic Token Scheduling**: Decodes the access token to determine expiration time and schedules a refresh 1 minute before expiry
- **Token Refresh**: Uses the refresh token to obtain a new access token and refresh token
- **Request Retry**: Automatically retries failed requests after refreshing the token
- **Token Storage**: Manages both access and refresh tokens in localStorage

**Key Methods:**
```typescript
// Stores tokens and schedules automatic refresh
setTokens(accessToken: string, refreshToken: string)

// Clears tokens and cancels scheduled refresh
clearTokens()

// Refreshes the access token using the refresh token (called automatically)
private async refreshAccessToken(): Promise<AuthResponse>

// Schedules the next token refresh (called automatically)
private scheduleTokenRefresh()
```

#### 2. Auth Hook (`apps/web/src/hooks/use-auth.ts`)

The `useAuth` hook manages authentication state using Zustand:

**Updated to handle both tokens:**
```typescript
interface AuthState {
  token: string | null          // Access token
  refreshToken: string | null   // Refresh token
  login: (credentials) => Promise<void>
  logout: () => Promise<void>
  updateTokens: (accessToken, refreshToken) => void
}
```

**Login Flow:**
1. User submits credentials
2. Backend returns both access and refresh tokens
3. Hook calls `apiClient.setTokens()` to store tokens and schedule refresh
4. User data is fetched and stored

**Logout Flow:**
1. API logout request
2. Hook calls `apiClient.clearTokens()` to clear tokens and cancel scheduled refresh
3. State is reset

### Backend Components

#### 1. Authentication Service (`apps/api/src/iam/authentication/authentication.service.ts`)

**Token Generation:**
```typescript
async generateTokens(user, ipAddress?, userAgent?): Promise<{
  accessToken: string;
  refreshToken: string;
}>
```

- Generates both access and refresh tokens
- Stores refresh token in database with metadata (IP, user agent)
- Implements token rotation for security

**Token Refresh:**
```typescript
async refreshTokens(
  refreshTokenDto: RefreshTokenDto,
  ipAddress?: string,
  userAgent?: string
)
```

- Validates the refresh token
- Detects token reuse (security feature)
- Rotates tokens (issues new refresh token)
- Returns new access and refresh tokens

## Token Refresh Flow

### Automatic Refresh (Before Expiration)

```
1. User logs in
   ↓
2. ApiClient stores tokens and schedules refresh
   ↓
3. ApiClient decodes access token to get expiration
   ↓
4. Timer set to refresh 1 minute before expiry
   ↓
5. Timer triggers → refreshAccessToken()
   ↓
6. POST /authentication/refresh-tokens with refresh token
   ↓
7. Backend validates and returns new tokens
   ↓
8. ApiClient stores new tokens and schedules next refresh
```

### Manual Refresh (On 401 Error)

```
1. API request fails with 401 Unauthorized
   ↓
2. ApiClient.request() catches 401 error
   ↓
3. Calls refreshAccessToken()
   ↓
4. If refresh succeeds:
   - Retries original request with new token
   ↓
5. If refresh fails:
   - Clears tokens
   - Redirects to login
```

## Configuration

### JWT Configuration (`apps/api/src/iam/config/jwt.config.ts`)

```typescript
export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET,
  audience: process.env.JWT_TOKEN_AUDIENCE,
  issuer: process.env.JWT_TOKEN_ISSUER,
  accessTokenTtl: parseInt(process.env.JWT_ACCESS_TOKEN_TTL || '900', 10),  // 15 minutes
  refreshTokenTtl: parseInt(process.env.JWT_REFRESH_TOKEN_TTL || '604800', 10), // 7 days
}))
```

### Local Storage Keys (`packages/shared/src/constants.ts`)

```typescript
export const LOCAL_STORAGE_KEYS = {
  AUTH_TOKEN: 'junta_tribo_token',           // Access token
  REFRESH_TOKEN: 'junta_tribo_refresh_token', // Refresh token
  USER_DATA: 'junta_tribo_user',             // User data
} as const
```

## Security Features

### 1. Token Rotation
Every time a refresh token is used, a new refresh token is issued. This limits the window of opportunity if a refresh token is compromised.

### 2. Token Reuse Detection
The backend detects if a refresh token is used multiple times, which indicates potential theft. When detected:
- The entire token family is revoked
- User must re-authenticate

### 3. Token Families
Each refresh token belongs to a "family" that can be tracked and revoked together if suspicious activity is detected.

### 4. IP and User Agent Tracking
The backend stores IP address and user agent with each refresh token, enabling security auditing.

## Usage Examples

### In Components

```typescript
import { useAuth } from '@/hooks/use-auth'

function MyComponent() {
  const { login, logout, isAuthenticated } = useAuth()

  // Login - tokens are automatically managed
  const handleLogin = async () => {
    await login({ email: 'user@example.com', password: 'password' })
    // Tokens are stored and refresh is scheduled automatically
  }

  // Logout - tokens are automatically cleared
  const handleLogout = async () => {
    await logout()
    // Tokens are cleared and scheduled refresh is cancelled
  }

  return <div>...</div>
}
```

### Direct API Calls

```typescript
import { apiClient } from '@/lib/api-client'

// API calls automatically include the access token
const trips = await apiClient.get('/trips')

// If token expires, it's automatically refreshed and request retried
```

## Troubleshooting

### Token not refreshing automatically

**Check:**
1. Verify tokens are stored correctly in localStorage
2. Check browser console for refresh scheduling logs
3. Ensure backend is returning both access and refresh tokens on login

### Getting 401 errors frequently

**Possible causes:**
1. Access token TTL is too short
2. System time is incorrect (JWT uses timestamps)
3. Backend JWT secret changed
4. Refresh token expired (requires re-login)

### Tokens not clearing on logout

**Check:**
1. Verify `apiClient.clearTokens()` is being called
2. Check localStorage is being cleared
3. Ensure scheduled refresh timer is being cancelled

## Best Practices

1. **Never expose refresh tokens** - Keep them in httpOnly cookies in production if possible
2. **Short access token TTL** - 15 minutes or less
3. **Longer refresh token TTL** - 7 days to 30 days
4. **Implement token blacklisting** - For immediate revocation when needed
5. **Monitor token usage** - Track refresh patterns for anomaly detection
6. **Secure token storage** - Use httpOnly cookies in production instead of localStorage

## Testing

### Manual Testing

1. **Test automatic refresh:**
   - Login
   - Wait until 1 minute before token expiry
   - Check console for refresh logs
   - Verify new token is stored

2. **Test 401 handling:**
   - Login
   - Manually delete access token from localStorage
   - Make an API request
   - Should automatically refresh and retry

3. **Test logout:**
   - Login
   - Logout
   - Verify tokens are cleared
   - Verify scheduled refresh is cancelled

### Automated Testing

```typescript
// Example test for token refresh
describe('Token Refresh', () => {
  it('should automatically refresh token before expiration', async () => {
    // Mock short-lived token
    const shortToken = createMockToken({ exp: Math.floor(Date.now() / 1000) + 120 })
    
    apiClient.setTokens(shortToken, 'refresh-token')
    
    // Wait for refresh (should happen at 60 seconds)
    await new Promise(resolve => setTimeout(resolve, 61000))
    
    // Verify new token was stored
    const newToken = localStorage.getItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN)
    expect(newToken).not.toBe(shortToken)
  })

  it('should retry request after refreshing token on 401', async () => {
    // Mock API to return 401 first, then success
    const mockFetch = jest.fn()
      .mockResolvedValueOnce({ status: 401, ok: false })
      .mockResolvedValueOnce({ status: 200, ok: true, json: async () => ({ data: 'success' }) })

    global.fetch = mockFetch

    const result = await apiClient.get('/test-endpoint')
    
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(result).toEqual({ data: 'success' })
  })
})
```

## Migration Guide

If you're upgrading from a system that didn't have automatic refresh:

### 1. Update Backend (if needed)
Ensure your authentication service returns both tokens:
```typescript
// Before
return { accessToken }

// After
return { accessToken, refreshToken }
```

### 2. Update Frontend Constants
Add refresh token key to constants:
```typescript
export const LOCAL_STORAGE_KEYS = {
  AUTH_TOKEN: 'junta_tribo_token',
  REFRESH_TOKEN: 'junta_tribo_refresh_token',  // Add this
  USER_DATA: 'junta_tribo_user',
}
```

### 3. Update Auth Hook
Replace token storage with `apiClient.setTokens()`:
```typescript
// Before
localStorage.setItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN, accessToken)

// After
apiClient.setTokens(accessToken, refreshToken)
```

### 4. Update Logout
Replace token clearing with `apiClient.clearTokens()`:
```typescript
// Before
localStorage.removeItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN)

// After
apiClient.clearTokens()
```

### 5. Test Thoroughly
- Test login flow
- Test token refresh (both automatic and on 401)
- Test logout
- Test session persistence across page reloads

## Monitoring and Debugging

### Console Logs
The ApiClient logs useful information for debugging:

```javascript
// When scheduling refresh
"Token expires in 895s, scheduling refresh in 835s"

// When refreshing
"Refreshing access token..."
"Token refreshed successfully"

// On errors
"Token refresh failed: [error details]"
```

### Checking Token Status
You can decode tokens in the browser console:
```javascript
// Decode access token
const token = localStorage.getItem('junta_tribo_token')
const payload = JSON.parse(atob(token.split('.')[1]))
console.log('Token expires at:', new Date(payload.exp * 1000))
```

### Redis/Database Inspection
Check stored refresh tokens in the backend:
```sql
-- PostgreSQL example
SELECT * FROM refresh_token WHERE user_id = 123 AND revoked = false;
```

## Performance Considerations

1. **Single Refresh Promise**: Multiple concurrent requests that trigger refresh will share the same refresh promise, preventing duplicate refresh calls

2. **Timer Cleanup**: Timers are properly cleaned up on logout to prevent memory leaks

3. **Minimal Token Decoding**: Token is only decoded once when scheduling refresh, not on every request

## Future Enhancements

1. **HttpOnly Cookies**: Move to httpOnly cookies for better security
2. **Silent Refresh**: Use a hidden iframe for completely silent token refresh
3. **Token Versioning**: Add version numbers to detect stale tokens
4. **Multi-device Management**: Add UI to view and revoke sessions from other devices
5. **Refresh Token Rotation Policies**: Make rotation policies configurable
6. **Token Analytics**: Track token usage patterns for security insights

## Resources

- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OAuth 2.0 Token Refresh](https://oauth.net/2/grant-types/refresh-token/)
- [OWASP JWT Security](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
