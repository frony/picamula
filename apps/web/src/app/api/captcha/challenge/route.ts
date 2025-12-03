import { NextResponse } from 'next/server';
import { getAltchaHmacKey } from '@/lib/altcha';
import crypto from 'crypto';

// Mark this route as dynamic (not static)
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const hmacKey = getAltchaHmacKey();

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
