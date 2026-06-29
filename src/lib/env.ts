import { z } from "zod";

const envSchema = z.object({
  APP_NAME: z.string().default("Clipku Streaming"),
  APP_URL: z.string().url(),
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  CLIPKU_API_BASE_URL: z.string().url(),
  CLIPKU_API_TIMEOUT: z.coerce.number().default(30),
  CLIPKU_API_CACHE: z.coerce.boolean().default(true),
  CLIPKU_API_CACHE_TTL: z.coerce.number().default(3600),
  PAYMENT_PROVIDER: z.string().default("pakasir"),
  PAKASIR_API_KEY: z.string().optional(),
  PAKASIR_SLUG: z.string().optional(),
  MIDTRANS_SERVER_KEY: z.string().optional(),
  MIDTRANS_CLIENT_KEY: z.string().optional(),
  XENDIT_SECRET_KEY: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  CLOUDFLARE_TURNSTILE_SITE_KEY: z.string().optional(),
  CLOUDFLARE_TURNSTILE_SECRET_KEY: z.string().optional(),
  MAIL_HOST: z.string().optional(),
  MAIL_PORT: z.coerce.number().optional(),
  MAIL_USERNAME: z.string().optional(),
  MAIL_PASSWORD: z.string().optional(),
  MAIL_FROM_ADDRESS: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ Invalid environment variables:");
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    throw new Error("Invalid environment variables. Check server logs.");
  }
  return parsed.data;
}

export const env = validateEnv();
