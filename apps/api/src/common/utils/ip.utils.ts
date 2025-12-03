import { Request } from 'express';

/**
 * Extract the real client IP address from the request
 * Handles various proxy headers and configurations
 */
export function getClientIp(req: Request): string {
  // Check for common proxy headers (in order of preference)
  const forwardedFor = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  const cfConnectingIp = req.headers['cf-connecting-ip']; // Cloudflare
  
  // x-forwarded-for can contain multiple IPs, take the first one (original client)
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) 
      ? forwardedFor[0].split(',') 
      : forwardedFor.split(',');
    return ips[0].trim();
  }
  
  // Try other headers
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }
  
  if (cfConnectingIp) {
    return Array.isArray(cfConnectingIp) ? cfConnectingIp[0] : cfConnectingIp;
  }
  
  // Fallback to connection remote address
  return req.socket.remoteAddress || req.ip || 'unknown';
}

/**
 * Normalize IPv6 addresses to IPv4 when possible
 */
export function normalizeIp(ip: string): string {
  // Handle IPv4-mapped IPv6 addresses (::ffff:192.168.1.1)
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  
  // Handle localhost variations
  if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') {
    return '127.0.0.1';
  }
  
  return ip;
}
