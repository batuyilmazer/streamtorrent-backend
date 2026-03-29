import dotenv from "dotenv";
dotenv.config();
function req(name) {
    const v = process.env[name];
    if (!v)
        throw new Error(`Missing env: ${name}`);
    return v;
}
export const env = {
    port: Number(req("PORT")),
    jwt: {
        secret: req("JWT_SECRET"),
        accessExpiresMin: Number(req("JWT_ACCESS_EXPIRES_MIN")),
        twoFactorExpiresMin: Number(req("JWT_TWO_FACTOR_EXPIRES_MIN")),
    },
    refresh: {
        expireDays: Number(req("REFRESH_EXPIRES_DAYS")),
    },
    spaces: {
        key: req("DO_SPACES_KEY"),
        secret: req("DO_SPACES_SECRET"),
        endpoint: req("DO_SPACES_ENDPOINT"), // e.g. https://ams3.digitaloceanspaces.com
        region: req("DO_SPACES_REGION"), // e.g. ams3
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
};
//# sourceMappingURL=env.js.map