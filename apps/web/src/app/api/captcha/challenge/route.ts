import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Mark this route as dynamic (not static)
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Cache the HMAC key for 5 minutes to avoid excessive API calls
let cachedKey: string | null = null;
let cacheExpiry: number = 0;

async function getAltchaHmacKey(): Promise<string> {
  const now = Date.now();
  
  // Return cached key if still valid
  if (cachedKey && now < cacheExpiry) {
    return cachedKey;
  }
  
  // Fetch key from backend
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
  const response = await fetch(`${apiUrl}/authentication/altcha/key`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch ALTCHA key from backend');
  }
  
  const data = await response.json();
  
  // Cache for 5 minutes
  cachedKey = data.key;
  cacheExpiry = now + (5 * 60 * 1000);
  
  return data.key;
}

export async function GET() {
  try {
    const hmacKey = await getAltchaHmacKey();

    // Create challenge manually (altcha's createChallenge logic)
    const algorithm = 'SHA-256';
    const maxNumber = 100000;
    const saltLength = 12;
    
    // Generate random salt
    const salt = crypto.randomBytes(saltLength).toString('hex');
    
    // Generate random number
    const number = Math.floor(Math.random() * maxNumber);
    
    // Create challenge string
    const challengeString = salt + number;
    
    // Hash it
    const hash = crypto.createHash('sha256').update(challengeString).digest('hex');
    
    // Create HMAC signature
    const signature = crypto
      .createHmac('sha256', hmacKey)
      .update(hash)
      .digest('hex');
    
    const challenge = {
      algorithm: 'SHA-256',
      challenge: hash,
      maxnumber: maxNumber,
      salt: salt,
      signature: signature,
    };

    return NextResponse.json(challenge);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create challenge' },
      { status: 500 }
    );
  }
}
