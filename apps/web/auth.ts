import NextAuth, { type DefaultSession } from "next-auth";
import authConfig from "@/auth.config";
import { jwtDecode } from "jwt-decode";
import { apiClient } from "@/lib/api-client";

declare module "next-auth" {
  /**
   * Extend the default session user with custom fields
   */
  interface User {
    refreshToken?: string;
  }
  interface Session {
    user: {
      id?: string;
      role?: string;
      permissions?: string[];
    } & DefaultSession["user"];
    accessToken: string;
    refreshToken?: string;
  }
}

// JWT Payload Type
interface JWTPayload {
  sub: string;
  email?: string;
  name?: string;
  role?: string;
  permissions?: string[];
  iat: number;
  exp: number;
  aud?: string;
  iss?: string;
  [key: string]: any;
}

// Use separate TTLs for access and refresh tokens
const accessTokenTtl = parseInt(process.env.JWT_ACCESS_TOKEN_TTL ?? '3600', 10);
const refreshTokenTtl = parseInt(process.env.JWT_REFRESH_TOKEN_TTL ?? '86400', 10);

export const {
  handlers,
  signIn,
  signOut,
  auth
} = NextAuth({
  pages: {
    signIn: '/login',
    error: '/login'
  },
  callbacks: {
    async signIn({ user }) {
      // Allow all sign-ins that pass credential validation
      return true;
    },
    async jwt({ token, user, account, trigger }) {
      // On initial sign-in with account and user
      if (account && user) {
        // On initial sign-in, decode and store token info
        const accessToken = (user as any).accessToken;
        const refreshToken = (user as any).refreshToken;
        
        try {
          const tokenDecoded = jwtDecode<JWTPayload>(accessToken);
          if (tokenDecoded) {
            token.sub = tokenDecoded.sub;
            token.email = tokenDecoded.email;
            token.name = tokenDecoded.name;
            token.iat = tokenDecoded.iat;
            token.exp = tokenDecoded.exp;
            token.role = tokenDecoded.role;
            token.permissions = tokenDecoded.permissions;
            token.accessToken = accessToken;
            token.refreshToken = refreshToken;
          }
        } catch (decodeError) {
          console.error('Failed to decode token:', decodeError);
          throw decodeError;
        }
        return token;
      }
      
      // If no session exists yet, return empty token
      if (!token.sub) {
        return token;
      }
      
      // Check if token needs refresh (with 5-minute buffer before expiry)
      const REFRESH_BUFFER = 5 * 60 * 1000; // 5 minutes in milliseconds
      const shouldRefresh = !token.exp || (Date.now() >= (token.exp * 1000) - REFRESH_BUFFER);
      
      if (!shouldRefresh) {
        // Token is still valid and not near expiry
        return token;
      }
      
      // Token expired or about to expire, try to refresh
      try {
        console.log('Token expiring soon, attempting refresh...');
        const responseTokens = await apiClient.post<{ accessToken: string; refreshToken?: string }>(
          "/authentication/refresh-tokens", 
          { refreshToken: token.refreshToken },
          { skipAuth: true }
        );
        
        if (!responseTokens || !responseTokens.accessToken) {
          console.error('Refresh failed: No access token in response');
          return {}; // Clear token to force re-login
        }

        const accessToken = responseTokens.accessToken;
        const tokenDecoded = jwtDecode<JWTPayload>(accessToken);
        
        if (!tokenDecoded) {
          console.error('Failed to decode refreshed token');
          return {};
        }

        token.sub = tokenDecoded.sub;
        token.email = tokenDecoded.email;
        token.name = tokenDecoded.name;
        token.role = tokenDecoded.role;
        token.iat = tokenDecoded.iat;
        token.exp = tokenDecoded.exp;
        token.permissions = tokenDecoded.permissions;
        token.accessToken = accessToken;
        
        // Update refresh token if provided
        if (responseTokens.refreshToken) {
          token.refreshToken = responseTokens.refreshToken;
        }
        
        console.log('Token refreshed successfully, expires:', new Date(tokenDecoded.exp * 1000));
        return token;
      } catch (error) {
        console.error('Token refresh failed:', error);
        return {}; // Clear token to force re-login
      }
    },
    async session({ token, session }) {
      // Only attach token info if user is logged in
      if (token.sub && session.user) {
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.id = token.sub as string;
        session.user.role = token.role as string;
        session.user.permissions = token.permissions as string[];
        session.accessToken = token.accessToken as string;
        session.refreshToken = token.refreshToken as string;
      }
      return session;
    }
  },
  session: {
    strategy: "jwt",
    maxAge: refreshTokenTtl, // Session lasts as long as refresh token (24 hours)
    updateAge: Math.floor(accessTokenTtl / 2), // Check and refresh every 30 minutes (half of access token TTL)
  },
  jwt: {
    maxAge: refreshTokenTtl, // JWT cookie lasts as long as refresh token
  },
  ...authConfig
});
