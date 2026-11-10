import { z } from "zod";
export const config = z
  .object({
    DATABASE_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url().default("http://localhost:4100"),
    APP_ORIGIN: z.url().default("http://localhost:5173"),
    PORT: z.coerce.number().int().min(1024).max(65535).default(4100),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  })
  .parse(process.env);
