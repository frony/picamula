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

const ttl = parseInt(process.env.JWT_ACCESS_TOKEN_TTL ?? '3600', 10);

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
      
      // Check if token is still valid
      if (token.exp && typeof token.exp === 'number' && Date.now() < token.exp * 1000) {
        // Token is still valid
        return token;
      }
      
      // Token expired, try to refresh
      try {
        console.log('Token expired, attempting refresh...');
        const responseTokens = await apiClient.post<{ accessToken: string; refreshToken?: string }>(
          "/authentication/refresh-tokens", 
          { refreshToken: token.refreshToken },
          { skipAuth: true }
        );
        
        const accessToken = responseTokens.accessToken;
        
        if (!accessToken) {
          throw new Error('No access token in refresh response');
        }

        const tokenDecoded = jwtDecode<JWTPayload>(accessToken);
        if (tokenDecoded) {
          token.sub = tokenDecoded.sub;
          token.email = tokenDecoded.email;
          token.name = tokenDecoded.name;
          token.role = tokenDecoded.role;
          token.iat = tokenDecoded.iat;
          token.exp = tokenDecoded.exp;
          token.permissions = tokenDecoded.permissions;
          token.accessToken = accessToken;
          if (responseTokens.refreshToken) {
            token.refreshToken = responseTokens.refreshToken;
          }
        }
        
        console.log('Token refreshed successfully');
        return token;
      } catch (error) {
        console.error('Token refresh failed:', error);
        // If refresh fails, clear the token
        return {};
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
    maxAge: ttl,
    updateAge: ttl,
  },
  jwt: {
    maxAge: ttl,
  },
  ...authConfig
});
