# Token Refresh Implementation Checklist

## Pre-Deployment Checklist

### ✅ Code Changes
- [ ] Updated `api-client.ts` with automatic refresh logic
- [ ] Updated `use-auth.ts` to handle both tokens
- [ ] Updated `auth-actions.ts` to support token management
- [ ] Added `REFRESH_TOKEN` to `LOCAL_STORAGE_KEYS` in shared package
- [ ] Rebuilt shared package: `cd packages/shared && npm run build`

### ✅ Environment Configuration
- [ ] `JWT_SECRET` is set (backend)
- [ ] `JWT_ACCESS_TOKEN_TTL` is configured (recommended: 900 = 15 minutes)
- [ ] `JWT_REFRESH_TOKEN_TTL` is configured (recommended: 604800 = 7 days)
- [ ] Backend URL is correct in frontend `.env`

### ✅ Backend Verification
- [ ] Authentication service returns both `accessToken` and `refreshToken` on login
- [ ] `/authentication/refresh-tokens` endpoint exists and works
- [ ] Refresh endpoint does NOT require authentication
- [ ] Refresh token validation is working
- [ ] Token rotation is implemented
- [ ] Token reuse detection is functional
- [ ] Database has `refresh_token` table with proper schema

## Testing Checklist

### 1. Login Flow
- [ ] User can log in successfully
- [ ] Both tokens are stored in localStorage:
  - `junta_tribo_token` (access token)
  - `junta_tribo_refresh_token` (refresh token)
- [ ] Console shows: "Token expires in Xs, scheduling refresh in Ys"
- [ ] User data is loaded correctly
- [ ] App redirects to dashboard/home page

**How to Test:**
```bash
# 1. Start app
npm run dev

# 2. Open browser console (F12)
# 3. Login with credentials
# 4. Check localStorage:
localStorage.getItem('junta_tribo_token')
localStorage.getItem('junta_tribo_refresh_token')

# 5. Verify console shows scheduling message
# Expected: "Token expires in 895s, scheduling refresh in 835s"
```

### 2. Automatic Token Refresh
- [ ] Token refresh is triggered automatically before expiration
- [ ] Console shows: "Refreshing access token..."
- [ ] Console shows: "Token refreshed successfully"
- [ ] New tokens are stored in localStorage
- [ ] Next refresh is scheduled automatically
- [ ] User session continues without interruption

**How to Test:**
```bash
# Option A: Wait for scheduled refresh (takes time)
# 1. Login
# 2. Wait for refresh time (check console for schedule)
# 3. Watch console for refresh messages

# Option B: Shorten TTL for testing (faster)
# 1. In backend .env, set:
JWT_ACCESS_TOKEN_TTL=120  # 2 minutes instead of 15
# 2. Restart backend
# 3. Login
# 4. Wait 1 minute
# 5. Should see automatic refresh in console
```

### 3. Manual Token Refresh (on 401 Error)
- [ ] App handles 401 errors gracefully
- [ ] Refresh is triggered automatically on 401
- [ ] Original request is retried after refresh
- [ ] User doesn't see any error

**How to Test:**
```bash
# 1. Login
# 2. In browser console, manually expire token:
localStorage.setItem('junta_tribo_token', 'invalid-token')

# 3. Make an API request (e.g., navigate to trips page)
# 4. Watch console - should see:
#    - "Refreshing access token..."
#    - "Token refreshed successfully"
# 5. Page should load normally without errors
```

### 4. Token Refresh Failure
- [ ] App handles refresh failure gracefully
- [ ] Tokens are cleared from localStorage
- [ ] User is redirected to login page
- [ ] Scheduled refresh timer is cancelled

**How to Test:**
```bash
# 1. Login
# 2. In browser console, invalidate both tokens:
localStorage.setItem('junta_tribo_token', 'invalid')
localStorage.setItem('junta_tribo_refresh_token', 'invalid')

# 3. Make an API request
# 4. Should see:
#    - "Token refresh failed: [error]"
#    - Redirect to /login
#    - localStorage cleared
```

### 5. Logout Flow
- [ ] Logout API call succeeds
- [ ] All tokens are cleared from localStorage
- [ ] Scheduled refresh timer is cancelled
- [ ] User is redirected to login page
- [ ] Refresh tokens are revoked in database

**How to Test:**
```bash
# 1. Login
# 2. Verify tokens exist:
localStorage.getItem('junta_tribo_token')
localStorage.getItem('junta_tribo_refresh_token')

# 3. Click logout
# 4. Verify tokens are gone:
localStorage.getItem('junta_tribo_token')  # Should be null
localStorage.getItem('junta_tribo_refresh_token')  # Should be null

# 5. Check console - no more refresh scheduling messages
# 6. User should be at /login
```

### 6. Session Persistence
- [ ] User remains logged in after page reload
- [ ] Tokens persist in localStorage
- [ ] Refresh timer is re-scheduled after reload
- [ ] User data is restored from storage

**How to Test:**
```bash
# 1. Login
# 2. Note current tokens in localStorage
# 3. Refresh page (F5 or Cmd+R)
# 4. Verify:
#    - Still logged in
#    - Same tokens in localStorage
#    - Console shows new refresh scheduled
#    - User data still present
```

### 7. Multiple Tabs
- [ ] Login in one tab updates all tabs
- [ ] Logout in one tab logs out all tabs
- [ ] Token refresh in one tab updates all tabs

**How to Test:**
```bash
# 1. Open app in two browser tabs
# 2. Login in tab 1
# 3. Check tab 2 - should see login state
# 4. In tab 1 console:
localStorage.getItem('junta_tribo_token')
# 5. In tab 2 console:
localStorage.getItem('junta_tribo_token')
# Should match
```

### 8. Token Security
- [ ] Tokens are not logged to console (except in dev mode)
- [ ] Tokens are properly validated on backend
- [ ] Token reuse is detected and handled
- [ ] Old refresh tokens are revoked after use
- [ ] HTTPS is used in production

**How to Test:**
```bash
# Test token rotation:
# 1. Login and note refresh token
const token1 = localStorage.getItem('junta_tribo_refresh_token')

# 2. Wait for automatic refresh
# 3. Check refresh token again
const token2 = localStorage.getItem('junta_tribo_refresh_token')

# 4. Verify tokens are different
console.assert(token1 !== token2, 'Token should have rotated')

# Test token reuse detection (in backend):
# 1. Use refresh token to get new tokens
# 2. Try using the OLD refresh token again
# 3. Should fail and revoke all tokens in family
```

## Performance Testing

### 9. Network Performance
- [ ] Token refresh doesn't cause noticeable delay
- [ ] Multiple concurrent requests share same refresh promise
- [ ] No duplicate refresh requests

**How to Test:**
```bash
# 1. Open Network tab in DevTools
# 2. Trigger a token refresh (manually expire token)
# 3. Make multiple API requests quickly
# 4. Check Network tab:
#    - Should see only ONE /refresh-tokens request
#    - Original requests should retry after refresh
```

### 10. Memory Leaks
- [ ] Timer is cleaned up on logout
- [ ] Timer is cleaned up on component unmount
- [ ] No memory leaks after multiple login/logout cycles

**How to Test:**
```bash
# 1. Open Chrome DevTools > Memory tab
# 2. Take heap snapshot
# 3. Login and logout 10 times
# 4. Take another heap snapshot
# 5. Compare - should not show significant memory increase
```

## Edge Cases

### 11. Expired Refresh Token
- [ ] App handles expired refresh token gracefully
- [ ] User is redirected to login
- [ ] Clear error message shown (optional)

**How to Test:**
```bash
# Backend: Temporarily set refresh token TTL to 30 seconds
JWT_REFRESH_TOKEN_TTL=30

# 1. Login
# 2. Wait 31 seconds
# 3. Make any API request or wait for scheduled refresh
# 4. Should redirect to login with appropriate message
```

### 12. Network Offline
- [ ] App handles network errors gracefully
- [ ] Doesn't spam refresh requests when offline
- [ ] Retries when connection is restored

**How to Test:**
```bash
# 1. Login
# 2. Open DevTools > Network tab
# 3. Set to "Offline"
# 4. Wait for scheduled refresh time
# 5. App should handle gracefully (no crashes)
# 6. Set back to "Online"
# 7. Should recover and refresh token
```

### 13. Clock Skew
- [ ] App handles small clock differences between client/server
- [ ] Token expiration is calculated correctly

**How to Test:**
```bash
# 1. Change system clock forward 5 minutes
# 2. Login
# 3. Verify refresh still scheduled correctly
# 4. Change clock back to correct time
# 5. Verify app still functions
```

### 14. Concurrent Login Sessions
- [ ] User can login from multiple devices
- [ ] Each session has independent tokens
- [ ] Logout from one device doesn't affect others (unless explicitly revoked)

**How to Test:**
```bash
# 1. Login from browser 1
# 2. Login from browser 2 (different browser or incognito)
# 3. Verify both sessions work independently
# 4. Logout from browser 1
# 5. Verify browser 2 still works
```

## Production Readiness

### 15. Security Checklist
- [ ] HTTPS is enforced in production
- [ ] Tokens are not exposed in URLs
- [ ] Sensitive data is not logged in production
- [ ] CORS is properly configured
- [ ] Rate limiting is in place for refresh endpoint
- [ ] Token secrets are stored securely (environment variables)
- [ ] Database refresh tokens are properly indexed

### 16. Monitoring
- [ ] Log token refresh successes
- [ ] Log token refresh failures
- [ ] Alert on unusual token refresh patterns
- [ ] Track token reuse attempts
- [ ] Monitor refresh endpoint performance

**Suggested Logging:**
```typescript
// On refresh success
logger.info('Token refreshed', { userId, timestamp })

// On refresh failure
logger.error('Token refresh failed', { userId, error, timestamp })

// On token reuse detected
logger.warn('Token reuse detected', { userId, familyId, ip })
```

### 17. Error Handling
- [ ] User-friendly error messages
- [ ] Proper error codes from backend
- [ ] Graceful degradation on failure
- [ ] No sensitive information in error messages

### 18. Documentation
- [ ] Team is trained on new system
- [ ] Documentation is up to date
- [ ] Troubleshooting guide is available
- [ ] Migration guide for existing users (if needed)

## Post-Deployment Verification

### Day 1
- [ ] Monitor error rates
- [ ] Check token refresh success rate
- [ ] Verify no increase in failed logins
- [ ] Check for memory leaks in production

### Week 1
- [ ] Analyze token refresh patterns
- [ ] Check for any token reuse attempts
- [ ] Verify session persistence across devices
- [ ] Monitor user feedback

### Month 1
- [ ] Review token expiration settings
- [ ] Analyze refresh token rotation
- [ ] Check database performance (refresh_token table)
- [ ] Consider adjustments to TTL values

## Rollback Plan

If issues occur in production:

1. **Immediate Rollback:**
   ```bash
   # Revert frontend changes
   git revert <commit-hash>
   npm run build
   npm run deploy
   ```

2. **Temporary Fix:**
   - Increase access token TTL to reduce refresh frequency
   - Disable automatic refresh (manual refresh on 401 only)

3. **Communication:**
   - Notify users of temporary issues
   - Provide ETA for resolution
   - Document issues encountered

## Success Criteria

✅ **The implementation is successful if:**
- [ ] Users can login and stay logged in
- [ ] Token refresh happens automatically without user noticing
- [ ] No increase in authentication errors
- [ ] Session persists across page reloads
- [ ] Logout works properly
- [ ] No memory leaks or performance issues
- [ ] Security features (rotation, reuse detection) work
- [ ] Error handling is graceful
- [ ] Team can support and troubleshoot the system

## Support Resources

- **Full Documentation:** `TOKEN_REFRESH_GUIDE.md`
- **Quick Start:** `QUICK_START_TOKEN_REFRESH.md`
- **Visual Diagrams:** `TOKEN_REFRESH_DIAGRAMS.md`
- **Code Location:**
  - Frontend: `apps/web/src/lib/api-client.ts`
  - Auth Hook: `apps/web/src/hooks/use-auth.ts`
  - Backend: `apps/api/src/iam/authentication/`

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Token not refreshing | Check backend returns both tokens on login |
| 401 errors on every request | Verify refresh endpoint doesn't require auth |
| Infinite refresh loop | Check token expiration times are correct |
| Memory leaks | Ensure timers are cleaned up on logout |
| Session lost on refresh | Check localStorage persistence |
| Multiple refresh requests | Verify refresh promise is shared |

---

**Date Completed:** _______________
**Tested By:** _______________
**Approved By:** _______________
**Deployed On:** _______________
