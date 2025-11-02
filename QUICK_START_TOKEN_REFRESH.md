# Token Refresh - Quick Start Guide

## What Changed

Your JuntaTribo app now has **automatic token refresh** that:
- ✅ Refreshes access tokens automatically before they expire
- ✅ Handles token refresh on 401 errors
- ✅ Manages both access and refresh tokens
- ✅ Cleans up properly on logout

## Files Modified

### Frontend
1. **`apps/web/src/lib/api-client.ts`** - Added automatic token refresh logic
2. **`apps/web/src/hooks/use-auth.ts`** - Updated to handle both tokens
3. **`apps/web/src/actions/auth-actions.ts`** - Simplified server actions
4. **`packages/shared/src/constants.ts`** - Added REFRESH_TOKEN key

### Backend
No changes needed! Your backend already supports token refresh.

## How It Works

### On Login
```typescript
const { accessToken, refreshToken } = await login(credentials)
// Both tokens stored automatically
// Refresh scheduled before access token expires
```

### Automatic Refresh
```
Access token expires in 15 minutes
   ↓
Refresh scheduled for 14 minutes
   ↓
New tokens obtained automatically
   ↓
Process repeats
```

### On 401 Error
```
API request → 401 error
   ↓
Refresh token used to get new access token
   ↓
Original request retried with new token
   ↓
Success!
```

### On Logout
```typescript
await logout()
// Tokens cleared
// Scheduled refresh cancelled
// Redirected to login
```

## Testing Your Implementation

### 1. Test Login
```bash
# Start your app
npm run dev

# Login and check console for:
"Token expires in Xs, scheduling refresh in Ys"
```

### 2. Test Automatic Refresh
```bash
# Wait for scheduled refresh (watch console)
# You should see:
"Refreshing access token..."
"Token refreshed successfully"
```

### 3. Test 401 Handling
```bash
# In browser console:
localStorage.removeItem('junta_tribo_token')

# Make any API request
# Should automatically refresh and retry
```

### 4. Test Logout
```bash
# Logout and verify:
# - Tokens cleared from localStorage
# - No scheduled refresh in console
# - Redirected to login
```

## Configuration

### Environment Variables (.env)
```bash
# Backend configuration
JWT_SECRET=your-secret-key
JWT_ACCESS_TOKEN_TTL=900        # 15 minutes (in seconds)
JWT_REFRESH_TOKEN_TTL=604800    # 7 days (in seconds)
```

### Adjust Refresh Timing
In `api-client.ts`, line ~51:
```typescript
// Default: Refresh 1 minute before expiry
const refreshTime = Math.max(0, timeUntilExpiry - 60000)

// For testing: Refresh 30 seconds before expiry
const refreshTime = Math.max(0, timeUntilExpiry - 30000)
```

## Common Issues

### Issue: Token not refreshing
**Solution:** Check that backend returns both tokens on login:
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

### Issue: Getting logged out frequently
**Solution:** Check your access token TTL isn't too short:
```bash
# .env
JWT_ACCESS_TOKEN_TTL=900  # Should be at least 300 (5 minutes)
```

### Issue: Infinite refresh loop
**Solution:** Ensure refresh endpoint doesn't require authentication:
```typescript
// In your backend authentication controller
@Post('refresh-tokens')
@Public() // or equivalent decorator
async refreshTokens() { ... }
```

## Console Messages to Expect

### Success Messages
```
Token expires in 895s, scheduling refresh in 835s
Refreshing access token...
Token refreshed successfully
```

### Error Messages
```
Token refresh failed: [error]
Scheduled token refresh failed: [error]
```

## Quick Commands

```bash
# Rebuild shared package after changes
cd packages/shared && npm run build

# Restart frontend dev server
cd apps/web && npm run dev

# Check tokens in browser console
localStorage.getItem('junta_tribo_token')
localStorage.getItem('junta_tribo_refresh_token')

# Clear tokens manually (for testing)
localStorage.clear()
```

## Security Notes

⚠️ **Important for Production:**
1. Use HTTPS to prevent token interception
2. Consider moving to httpOnly cookies instead of localStorage
3. Implement token blacklisting for immediate revocation
4. Monitor for unusual token refresh patterns
5. Set appropriate CORS policies

## Need More Details?

See the full guide: [`TOKEN_REFRESH_GUIDE.md`](./TOKEN_REFRESH_GUIDE.md)

## Questions?

Common scenarios:

**Q: Do I need to do anything in my components?**  
A: No! Token refresh is automatic. Just use `useAuth()` as before.

**Q: What if a user has an old access token?**  
A: It will automatically refresh on the next API call or when it expires.

**Q: Can users be logged out forcefully?**  
A: Yes, revoke their refresh tokens in the database and they'll be logged out on next API call.

**Q: What happens if the refresh token expires?**  
A: User will be redirected to login page automatically.

## Summary

✅ **No changes needed in your components**  
✅ **Tokens refresh automatically**  
✅ **Better user experience (no interruptions)**  
✅ **More secure (token rotation)**  
✅ **Backend was already ready**  

Just login and everything works automatically! 🎉
