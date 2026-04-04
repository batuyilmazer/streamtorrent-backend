import dotenv from "dotenv";

dotenv.config();

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  logLevel: process.env.LOG_LEVEL,
  port: Number(req("PORT")),

  jwt: {
    secret: req("JWT_SECRET"),
    accessExpiresMin: Number(req("JWT_ACCESS_EXPIRES_MIN")),
    twoFactorExpiresMin: Number(req("JWT_TWO_FACTOR_EXPIRES_MIN")),
  },

  refresh: {
    expireDays: Number(req("REFRESH_EXPIRES_DAYS")),
  },

  /** Session cookies: cross-origin SPA→API fetches need SameSite=None on HTTPS. Override via AUTH_COOKIE_SAMESITE=lax if needed. */
  authCookie: {
    domain: process.env.AUTH_COOKIE_DOMAIN?.trim() || undefined,
    sameSite:
      process.env.AUTH_COOKIE_SAMESITE === "lax"
        ? ("lax" as const)
        : process.env.AUTH_COOKIE_SAMESITE === "none"
          ? ("none" as const)
          : undefined,
  },

  spaces: {
    key: req("DO_SPACES_KEY"),
    secret: req("DO_SPACES_SECRET"),
    endpoint: req("DO_SPACES_ENDPOINT"), // e.g. https://ams3.digitaloceanspaces.com
    region: req("DO_SPACES_REGION"),     // e.g. ams3
    bucket: req("DO_SPACES_BUCKET"),
    cdnEndpoint: process.env.DO_SPACES_CDN_ENDPOINT, // Optional
  },

  smtp: {
    host: req("SMTP_HOST"),
    port: Number(req("SMTP_PORT")),
    user: req("SMTP_USER"),
    pass: req("SMTP_PASS"),
    from: req("SMTP_FROM"),
    secure: process.env.SMTP_SECURE === "true", // false for port 587 (STARTTLS)
  },

  redis: {
    url: req("REDIS_URL"),
  },

  admin: {
    email: req("ADMIN_EMAIL"),
    password: req("ADMIN_PASSWORD"),
  },

  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),

  torrent: {
    maxConcurrent: Number(process.env.MAX_CONCURRENT_TORRENTS ?? "20"),
    maxSizeGb: Number(process.env.MAX_TORRENT_SIZE_GB ?? "10"),
    streamTokenSecret: req("STREAM_TOKEN_SECRET"),
    streamTokenExpiry: process.env.STREAM_TOKEN_EXPIRY ?? "1h",
  },
};
