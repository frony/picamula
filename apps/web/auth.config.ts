import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { apiClient } from "@/lib/api-client";
import { jwtDecode } from "jwt-decode";

// Login validation schema
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export default {
  providers: [
    Credentials({
      async authorize(credentials) {
        try {
          console.log('NextAuth authorize called with credentials:', { email: credentials?.email });
          
          const validatedFields = LoginSchema.safeParse(credentials);
          if (!validatedFields.success) {
            console.log('Credentials validation failed');
            return null;
          }

          const { email, password } = validatedFields.data;
          
          console.log('Making authentication request to backend...');
          // Include captchaToken if present
          const data = await apiClient.post<{ accessToken: string; refreshToken: string }>(
            "/authentication/sign-in", 
            { 
              email, 
              password,
              captchaToken: credentials.captchaToken // Pass through captcha token
            }, 
            { skipAuth: true }
          );
          console.log('Authentication response received:', !!data);

          if (!data || !data.accessToken) {
            console.log('No data or access token in response');
            return null;
          }

          // Decode the JWT to get user info
          const decoded: any = jwtDecode(data.accessToken);
          const user = {
            id: decoded.sub,
            email: decoded.email,
            name: decoded.name || decoded.email,
            role: decoded.role,
            permissions: decoded.permissions,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken, // Backend now returns this in body
          };

          if (user && user.email && user.id) {
            console.log('User authenticated successfully:', { email: user.email, role: user.role });
            return user;
          }
          console.log('User object missing required fields');
          return null;
        } catch (error) {
          console.error('Authentication error:', error);
          if (error instanceof Error) {
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
          }
          return null;
        }
      }
    })
  ]
} satisfies NextAuthConfig;
