import * as crypto from 'crypto';

/**
 * ALTCHA HMAC Key Manager - Backend Only
 * 
 * Manages the HMAC key for ALTCHA CAPTCHA verification.
 * Key is stored in memory and can be overridden via ALTCHA_HMAC_KEY env var
 */

// In-memory cache for the key (survives for the session)
let cachedKey: string | null = null;

/**
 * Get or generate the HMAC key
 * 
 * Priority:
 * 1. Environment variable ALTCHA_HMAC_KEY (if set)
 * 2. Generate new key and cache it for the session
 */
export function getAltchaHmacKey(): string {
  // 1. Check environment variable first
  if (process.env.ALTCHA_HMAC_KEY) {
    return process.env.ALTCHA_HMAC_KEY;
  }
  
  // 2. Check cache
  if (cachedKey) {
    return cachedKey;
  }
  
  // 3. Generate new key and cache it
  const newKey = crypto.randomBytes(32).toString('hex');
  cachedKey = newKey;
  
  // Store in process.env for consistency across the app
  process.env.ALTCHA_HMAC_KEY = newKey;
  
  return newKey;
}

/**
 * Verify ALTCHA payload
 * Validates both the HMAC signature and the challenge solution
 */
export async function verifyAltchaPayload(payload: string): Promise<boolean> {
  if (!payload) {
    return false;
  }

  const hmacKey = getAltchaHmacKey();

  try {
    // Parse the base64 payload
    const decoded = Buffer.from(payload, 'base64').toString('utf-8');
    const data = JSON.parse(decoded);
    
    const { algorithm, challenge, number, salt, signature } = data;
    
    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', hmacKey)
      .update(challenge)
      .digest('hex');
    
    if (signature !== expectedSignature) {
      return false;
    }
    
    // Verify the solution
    const hash = crypto
      .createHash(algorithm.toLowerCase().replace('-', ''))
      .update(salt + number)
      .digest('hex');
    
    if (hash !== challenge) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}
