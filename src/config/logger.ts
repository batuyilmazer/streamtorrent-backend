import pino from "pino";
import { env } from "./env.js";

export const logger = pino({
  level: env.logLevel ?? (env.nodeEnv === "production" ? "info" : "debug"),
  base: { service: "streamtorrent-backend" },
  timestamp: pino.stdTimeFunctions.isoTime,
});
