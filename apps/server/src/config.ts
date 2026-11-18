import { z } from "zod";
export const configSchema = z
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
  .superRefine((value, ctx) => {
    if (value.NODE_ENV !== "production") return;
    const issue = (message: string) => ctx.addIssue({ code: "custom", message });
    for (const key of ["APP_ORIGIN", "BETTER_AUTH_URL"] as const) {
      const url = new URL(value[key]);
      if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash)
        issue(`${key} must be an HTTPS origin`);
    }
    if (value.APP_ORIGIN !== value.BETTER_AUTH_URL)
      issue("Production requires one public origin for web and API");
    if (/replace|example|integration|development/i.test(value.BETTER_AUTH_SECRET) || new Set(value.BETTER_AUTH_SECRET).size < 12)
      issue("Production requires an independently generated random auth secret");
    const database = decodeURIComponent(new URL(value.DATABASE_URL).pathname).slice(1);
    if (!database || /demo|browser|test/i.test(database))
      issue("Production requires a dedicated non-fixture database");
  });
export const config = configSchema.parse(process.env);
