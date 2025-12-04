# Backoff and Rate Limiting System

This backend implements a sophisticated IP-based rate limiting and backoff system to protect against abuse and denial of service attacks.

## Overview

The system uses Redis-backed middleware to track request patterns and enforce rate limits. It includes:

1. **Dual Rate Limiting**: Different limits for general routes vs. authentication routes
2. **Progressive Backoff**: Temporary blocking with increasing penalties
3. **Permanent Blocking**: IPs that repeatedly violate limits get blocked long-term
4. **IP Whitelisting**: Specific IPs can bypass all rate limiting

## Configuration

All configuration is done through environment variables in your `.env` file:

### General Routes (Browsing, API calls, etc.)
```env
BACKOFF_MAX_REQUESTS=100          # Max requests allowed
BACKOFF_WINDOW_SIZE_MS=60000      # Time window (1 minute)
```

### Authentication Routes (Sign-in, Sign-up, etc.)
```env
AUTH_MAX_REQUESTS=5               # Strict limit for auth attempts
AUTH_WINDOW_SIZE_MS=10000         # Short window (10 seconds)
```

### Backoff Settings
```env
BACKOFF_DURATION_MS=300000        # Backoff period (5 minutes)
```

### IP Whitelist
```env
IP_WHITELIST=127.0.0.1,::1,YOUR_SERVER_IP
```

## How It Works

### 1. Request Tracking
- Every request is tracked with a timestamp
- Timestamps are stored in Redis with automatic expiration
- Only recent requests (within the time window) are counted

### 2. Rate Limit Enforcement
When a request comes in:
- System checks if IP is whitelisted (bypass if yes)
- Determines if route is authentication-related
- Counts requests in the current time window
- Blocks if limit exceeded

### 3. Progressive Backoff
When limits are exceeded:

**First Violation**:
- 5-minute timeout
- Clear request history
- Warning logged

**Second Violation**:
- Another 5-minute timeout
- Warning logged with count

**Third Violation**:
- Permanent block (30 days)
- Error logged with IP

### 4. Route-Specific Limits

**General Routes** (100 req/min):
- `/trips/*`
- `/todos/*`
- `/notes/*`
- `/users/*`
- etc.

**Authentication Routes** (5 req/10sec):
- `/auth/sign-in`
- `/auth/sign-up`
- `/authentication/*`
- `/login`
- `/register`

## Monitoring

The system provides detailed logging:

```
✅ Request from 192.168.1.1 allowed [GENERAL] (45/100) | Path: /trips
🚨 RATE LIMIT EXCEEDED [AUTH]: IP 10.0.0.1 | Count: 1/3 | Path: /auth/sign-in
⏸️  BACKOFF INITIATED: IP 10.0.0.1 until 2024-01-15T10:30:00.000Z
🔒 PERMANENTLY BLOCKED: IP 10.0.0.2 after 3 violations
```

## Response Codes

- **200 OK**: Request allowed
- **429 Too Many Requests**: Rate limit exceeded, includes `retryAfter` in response
- **403 Forbidden**: IP permanently blocked

Example 429 response:
```json
{
  "message": "Too many requests. Please try again after 300 seconds.",
  "retryAfter": 300
}
```

## Best Practices

### For Development
1. Add your dev machine IP to `IP_WHITELIST`
2. Add localhost addresses: `127.0.0.1,::1`
3. Use generous limits during testing

### For Production
1. Start with conservative limits
2. Monitor logs for legitimate users hitting limits
3. Adjust limits based on actual usage patterns
4. Keep authentication limits strict (5-10 attempts)
5. Whitelist your monitoring tools and CI/CD servers

### Recommended Production Values
```env
# General routes - allow normal browsing
BACKOFF_MAX_REQUESTS=100
BACKOFF_WINDOW_SIZE_MS=60000

# Authentication - strict to prevent brute force
AUTH_MAX_REQUESTS=5
AUTH_WINDOW_SIZE_MS=10000

# Backoff - not too harsh, but protective
BACKOFF_DURATION_MS=300000

# Whitelist your infrastructure
IP_WHITELIST=YOUR_SERVER_IP,YOUR_MONITORING_IP
```

## Testing

To test the rate limiting:

```bash
# Test general rate limit (should take >100 requests to trigger)
for i in {1..110}; do
  curl http://localhost:3000/trips
done

# Test auth rate limit (should trigger after 5 requests)
for i in {1..10}; do
  curl -X POST http://localhost:3000/auth/sign-in \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done
```

## Troubleshooting

### "IP blocked" but I'm a legitimate user
1. Check if your IP changed (dynamic IP)
2. Contact admin to remove block
3. Consider using a whitelist

### Rate limits too strict
1. Increase `BACKOFF_MAX_REQUESTS`
2. Increase `BACKOFF_WINDOW_SIZE_MS`
3. Add your IP to whitelist for testing

### Rate limits not working
1. Check Redis is running
2. Verify environment variables are loaded
3. Check logs for middleware errors

## Redis Keys

The system uses these Redis key patterns:
- `rate-limit:GENERAL:requests:{IP}` - Request timestamps for general routes
- `rate-limit:AUTH:requests:{IP}` - Request timestamps for auth routes
- `rate-limit:backoff:{IP}` - Backoff expiration timestamp
- `rate-limit:backoff-count:{IP}` - Number of violations (24hr TTL)
- `rate-limit:blocked:{IP}` - Permanent block flag (30 day TTL)

## Security Considerations

1. **IP Spoofing**: System uses `X-Forwarded-For` header - ensure your reverse proxy is configured correctly
2. **Distributed Attacks**: Single IP blocks won't stop DDoS from many IPs
3. **Legitimate Users**: Consider geographic IP ranges that might share NAT
4. **Backoff Duration**: Too short = ineffective, too long = frustrated users

## Future Improvements

Potential enhancements:
- User-based rate limiting (in addition to IP)
- Different limits for authenticated vs. anonymous users
- Geographic-based rules
- Automatic whitelist for verified users
- Admin dashboard for managing blocks
