import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * NextAuth route handler.
 * Only HTTP verb exports are permitted in Next.js 15 route files — the full
 * authOptions configuration lives in src/lib/auth.ts.
 */
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
