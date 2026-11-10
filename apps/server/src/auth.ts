import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { config } from "./config.js";
import { db } from "./db.js";
import * as schema from "./schema.js";
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  secret: config.BETTER_AUTH_SECRET,
  baseURL: config.BETTER_AUTH_URL,
  trustedOrigins: [config.APP_ORIGIN, config.BETTER_AUTH_URL],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    autoSignIn: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: false },
  },
  user: {
    additionalFields: {
      role: {
        type: ["student", "founder"],
        defaultValue: "student",
        input: false,
      },
      studentId: { type: "string", required: false, input: false },
    },
  },
  advanced: {
    useSecureCookies: config.NODE_ENV === "production",
    defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
  },
  rateLimit: { enabled: true, window: 60, max: 60 },
});
