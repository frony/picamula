import crypto from 'crypto';

// Generate or use existing HMAC key
function getHmacKey(): string {
  let hmacKey = process.env.ALTCHA_HMAC_KEY;
  
  if (!hmacKey) {
    // Generate a random key for this session (development only)
    hmacKey = crypto.randomBytes(32).toString('hex');
    
    // Store it in process.env for this session
    process.env.ALTCHA_HMAC_KEY = hmacKey;
  }
  
  return hmacKey;
}

/**
 * Verify ALTCHA payload on the server
 * Manually implements verification to avoid browser API issues
 */
export async function verifyAltchaPayload(payload: string): Promise<boolean> {
  if (!payload) {
    return false;
  }

  const hmacKey = getHmacKey();

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

/**
 * Get the HMAC key for challenge generation
 */
export function getAltchaHmacKey(): string {
  return getHmacKey();
}
