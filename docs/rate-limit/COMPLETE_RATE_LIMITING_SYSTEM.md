# Complete Rate Limiting & BackoffStrike System Documentation

## Overview

JuntaTribo now has a **3-layer rate limiting system** designed to protect against abuse while providing excellent UX for legitimate users. This is especially important for your future hotel and flight booking features.

## Architecture

```
Incoming Request
    ↓
┌─────────────────────────────────────────┐
│ Layer 1: LoggingMiddleware             │
│ - Logs all requests                     │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ Layer 2: BackoffStrikeMiddleware       │
│ - Checks if IP has excessive strikes   │
│ - Blocks if violations are too high    │
│ - Exponential backoff (1s → 16min)     │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ Layer 3: IpBackoffMiddleware           │
│ - Basic IP rate limiting                │
│ - General: 100/min, Auth: 5/10sec      │
│ - 3 violations = 30-day block          │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ Layer 4: Throttler (per-route)         │
│ - Fine-grained per-endpoint limits     │
│ - Short: 3/sec                          │
│ - Medium: 20/10sec                      │
│ - Long: 100/min                         │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ ThrottlerExceptionFilter                │
│ - Catches throttler violations          │
│ - Records strikes                        │
│ - Returns consistent error responses    │
└─────────────────────────────────────────┘
```

## How It Works Together

### Scenario 1: Normal User
```
User makes 50 requests/minute to /trips
✅ Layer 2 (BackoffStrike): PASS - No strikes
✅ Layer 3 (IP Backoff): PASS - Only 50/100 requests
✅ Layer 4 (Throttler): PASS - Within limits
→ Request succeeds
```

### Scenario 2: Slightly Aggressive User
```
User makes 110 requests/minute to /trips
✅ Layer 2 (BackoffStrike): PASS - No strikes yet
❌ Layer 3 (IP Backoff): BLOCKED - Exceeded 100/min
→ User gets 429 error
→ BackoffStrike NOT triggered (IP Backoff caught it first)
```

### Scenario 3: Bot Attack
```
Bot makes 200 requests/second to /trips
✅ Layer 2 (BackoffStrike): PASS - First time
✅ Layer 3 (IP Backoff): PASS somehow
❌ Layer 4 (Throttler): BLOCKED - Way over 3/sec
→ ThrottlerException thrown
→ ThrottlerExceptionFilter catches it
→ Strike #1 recorded (1 second block)
→ Bot waits 1 second, tries again
→ Strike #2 recorded (2 second block)
→ Strike #3 recorded (4 second block)
→ Strike #10 recorded (16 minute block)
→ After 24 hours, strikes reset
```

### Scenario 4: Persistent Bot
```
Bot accumulates 10 strikes within 24 hours
✅ Layer 2 (BackoffStrike): BLOCKED - 10 strikes reached
→ Bot blocked for 16 minutes
→ Bot tries again after cooldown
→ Still has strikes, progressively longer blocks
```

## Rate Limits Summary

| Layer | Scope | Limit | Window | Purpose |
|-------|-------|-------|--------|---------|
| **Throttler Short** | Per-route | 3 | 1 second | Prevent button mashing |
| **Throttler Medium** | Per-route | 20 | 10 seconds | Prevent rapid-fire requests |
| **Throttler Long** | Per-route | 100 | 1 minute | General traffic control |
| **IP Backoff (General)** | IP-based | 100 | 1 minute | Basic DDoS protection |
| **IP Backoff (Auth)** | IP-based | 5 | 10 seconds | Brute force protection |
| **BackoffStrike** | IP-based | 10 strikes | 24 hours | Progressive penalties |

## Strike System Details

### Strike Accumulation
- **Trigger**: Whenever a Throttler limit is exceeded
- **Recording**: Automatically by ThrottlerExceptionFilter
- **Storage**: Redis with 24-hour TTL
- **Max Strikes**: 10

### Block Duration (Exponential Backoff)
| Strikes | Block Duration |
|---------|----------------|
| 1 | 1 second |
| 2 | 2 seconds |
| 3 | 4 seconds |
| 4 | 8 seconds |
| 5 | 16 seconds |
| 6 | 32 seconds |
| 7 | 1 minute |
| 8 | 2 minutes |
| 9 | 4 minutes |
| 10 | 8 minutes |

### Strike Reset
- **Automatic**: After 24 hours of no violations
- **Manual**: Via admin endpoint `DELETE /admin/strikes/:ip`

## Configuration

### Environment Variables

```env
# Existing (IP Backoff)
BACKOFF_MAX_REQUESTS=100
BACKOFF_WINDOW_SIZE_MS=60000
AUTH_MAX_REQUESTS=5
AUTH_WINDOW_SIZE_MS=10000
BACKOFF_DURATION_MS=300000
IP_WHITELIST=31.220.50.60,127.0.0.1,::1

# New (Throttler)
THROTTLER_SHORT_TTL=1000
THROTTLER_SHORT_LIMIT=3
THROTTLER_MEDIUM_TTL=10000
THROTTLER_MEDIUM_LIMIT=20
THROTTLER_LONG_TTL=60000
THROTTLER_LONG_LIMIT=100
```

### Recommended Settings for Hotel/Flight Booking

```env
# For search endpoints (lenient)
THROTTLER_LONG_LIMIT=200  # Allow more searches

# For booking endpoints (strict)
# Use @Throttle decorator per-route:
# @Throttle({ short: { limit: 2, ttl: 1000 } })
```

## Admin Endpoints

### Get All Strikes
```bash
curl http://localhost:3000/admin/strikes
```

Response:
```json
{
  "total": 2,
  "strikes": [
    {
      "ip": "10.0.0.1",
      "strikes": 5,
      "lastViolation": "2024-12-03T18:30:00.000Z",
      "isBlocked": true,
      "remainingSeconds": 120
    },
    {
      "ip": "10.0.0.2",
      "strikes": 2,
      "lastViolation": "2024-12-03T17:00:00.000Z",
      "isBlocked": false,
      "remainingSeconds": 0
    }
  ]
}
```

### Get Specific IP Strike Info
```bash
curl http://localhost:3000/admin/strikes/10.0.0.1
```

Response:
```json
{
  "ip": "10.0.0.1",
  "strikes": 5,
  "lastViolation": "2024-12-03T18:30:00.000Z",
  "blockedUntil": "2024-12-03T18:32:00.000Z",
  "isBlocked": true,
  "remainingSeconds": 120,
  "status": "blocked"
}
```

### Reset Strikes for IP
```bash
curl -X DELETE http://localhost:3000/admin/strikes/10.0.0.1
```

**⚠️ TODO**: Add authentication to these endpoints before production!

## Log Examples

### Normal Operation
```
[HTTP] ➡️  GET /trips - 192.168.1.1 - Mozilla/5.0...
[BackoffStrikeMiddleware] Whitelisted IP 127.0.0.1 - bypassing strike check
[IpBackoffMiddleware] ✅ Request from 192.168.1.1 allowed [GENERAL] (45/100)
[HTTP] ⬅️  GET /trips - 200 - 125ms - 192.168.1.1
```

### Strike Recorded
```
[ThrottlerExceptionFilter] 🚫 Throttler: Rate limit exceeded for IP 10.0.0.1 | Strikes: 1
[BackoffStrikeService] 🎯 Strike recorded for IP 10.0.0.1: 1/10 strikes, blocked for 1s
```

### Strike Block
```
[BackoffStrikeMiddleware] ⛔ Blocked IP 10.0.0.1 attempted access (5 strikes, 16s remaining) | Path: /trips
```

### IP Permanent Block (from IP Backoff)
```
[IpBackoffMiddleware] 🔒 PERMANENTLY BLOCKED: IP 10.0.0.1 after 3 violations
[IpBackoffMiddleware] ❌ BLOCKED IP attempting access: 10.0.0.1
```

## Response Examples

### 429 - Rate Limit (Throttler)
```json
{
  "statusCode": 429,
  "message": "Rate limit exceeded. Please slow down.",
  "strikes": 3,
  "maxStrikes": 10,
  "error": "Too Many Requests"
}
```

### 429 - Strike Block
```json
{
  "message": "Too many rate limit violations. Please try again after 16 seconds.",
  "retryAfter": 16,
  "strikes": 5
}
```

### 429 - IP Backoff
```json
{
  "message": "Too many requests. Please try again after 300 seconds.",
  "retryAfter": 300
}
```

### 403 - Permanent Block
```json
{
  "message": "Access denied. This IP has been blocked due to excessive requests."
}
```

## Future: Per-Route Configuration

When you add booking endpoints:

```typescript
@Controller('bookings')
export class BookingsController {
  
  // Search - lenient (users browse a lot)
  @Throttle({ 
    short: { limit: 10, ttl: 1000 },   // 10/sec
    medium: { limit: 50, ttl: 10000 },  // 50/10sec
  })
  @Get('search/hotels')
  async searchHotels(@Query() query: SearchHotelDto) {
    // Search logic
  }
  
  // Hold/Reserve - moderate
  @Throttle({ 
    short: { limit: 3, ttl: 1000 },    // 3/sec
    medium: { limit: 10, ttl: 10000 },  // 10/10sec
  })
  @Post('hold')
  async holdReservation(@Body() data: HoldDto) {
    // Hold logic
  }
  
  // Book/Payment - strict (critical operation)
  @Throttle({ 
    short: { limit: 1, ttl: 1000 },    // 1/sec
    medium: { limit: 3, ttl: 10000 },   // 3/10sec
  })
  @Post('book')
  async bookHotel(@Body() data: BookingDto) {
    // Booking logic
  }
}
```

## Testing

See `/test-rate-limits.sh` for automated testing.

Manual tests:
```bash
# Test basic rate limit
for i in {1..110}; do curl http://localhost:3000/trips; done

# Test strike accumulation
for attempt in {1..5}; do
  for i in {1..150}; do curl -s http://localhost:3000/trips > /dev/null; done
  sleep 1
done

# Check strikes
curl http://localhost:3000/admin/strikes
```

## Monitoring

### Redis Keys
```bash
# View all strike records
redis-cli KEYS "strikes:*"

# View specific IP strikes
redis-cli GET "strikes:10.0.0.1"

# View rate limit data
redis-cli KEYS "rate-limit:*"
```

### Metrics to Watch
1. **Strike accumulation rate** - How many IPs are getting strikes?
2. **Block frequency** - Are legitimate users getting blocked?
3. **Strike reset rate** - Are users learning or persistent bots?
4. **Throttler hits** - Which endpoints are getting hit most?

## Troubleshooting

### Legitimate users getting strikes
1. **Check if limits too strict**: Increase THROTTLER_*_LIMIT values
2. **Whitelist trusted IPs**: Add to IP_WHITELIST
3. **Check shared IPs**: Corporate/VPN users may share IPs

### Bots bypassing system
1. **Check Redis connection**: `redis-cli ping`
2. **Check whitelist**: Remove unnecessary IPs
3. **Lower limits**: Decrease THROTTLER_*_LIMIT values
4. **Add user-based tracking**: Track by user ID + IP

### High Redis memory usage
1. **Check TTLs**: Ensure keys expire properly
2. **Monitor strike records**: Use `redis-cli DBSIZE`
3. **Adjust cooldown**: Reduce 24h cooldown if needed

## Best Practices

### For Development
- Add your IP to whitelist
- Use generous limits
- Test with curl scripts

### For Staging
- Use production-like limits
- Test with realistic traffic patterns
- Monitor strike accumulation

### For Production
- Start conservative, increase gradually
- Monitor logs for false positives
- Keep admin endpoints secured
- Set up alerting for unusual patterns

## Security Considerations

1. **Admin Endpoints**: Add authentication before production
2. **Whitelist**: Keep minimal, review regularly
3. **Redis Security**: Use password, restrict network access
4. **Monitoring**: Set up alerts for mass blocking
5. **Incident Response**: Have plan to quickly unblock legitimate users

## Conclusion

This 3-layer system provides:
- ✅ DDoS protection
- ✅ Brute force prevention
- ✅ Bot mitigation
- ✅ Progressive penalties
- ✅ Good UX for legitimate users
- ✅ Ready for hotel/flight booking launch

Perfect for your growing travel platform!
