import type { Request, Response } from "express";
import { env } from "../../config/env.js";

export const REFRESH_COOKIE = "refreshToken";
export const DEVICE_COOKIE = "deviceId";

function isSecureRequest(req: Request): boolean {
  if (req.secure) return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (typeof forwardedProto === "string") {
    return forwardedProto.split(",")[0]?.trim() === "https";
  }
  return false;
}

function resolveCookieSameSite(req: Request): "lax" | "none" {
  if (env.authCookie.sameSite) return env.authCookie.sameSite;
  return isSecureRequest(req) ? "none" : "lax";
}

function sessionCookieShape(req: Request): {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax" | "none";
  path: string;
  domain?: string;
} {
  const sameSite = resolveCookieSameSite(req);
  const secure = sameSite === "none" ? true : isSecureRequest(req);
  return {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
    ...(env.authCookie.domain ? { domain: env.authCookie.domain } : {}),
  };
}

function cookieOptions(req: Request) {
  return {
    ...sessionCookieShape(req),
    maxAge: env.refresh.expireDays * 24 * 60 * 60 * 1000,
  };
}

export function setSessionCookies(
  req: Request,
  res: Response,
  refreshToken: string,
  deviceId: string,
) {
  const opts = cookieOptions(req);
  res.cookie(REFRESH_COOKIE, refreshToken, opts);
  res.cookie(DEVICE_COOKIE, deviceId, opts);
}

export function clearSessionCookies(req: Request, res: Response) {
  const opts = sessionCookieShape(req);
  res.clearCookie(REFRESH_COOKIE, opts);
  res.clearCookie(DEVICE_COOKIE, opts);
}

export function readRefreshToken(req: Request): string | undefined {
  const fromBody =
    typeof req.body === "object" && req.body !== null && "refreshToken" in req.body
      ? req.body.refreshToken
      : undefined;
  const fromCookie = req.cookies?.[REFRESH_COOKIE];
  return typeof fromBody === "string"
    ? fromBody
    : typeof fromCookie === "string"
      ? fromCookie
      : undefined;
}

export function readDeviceId(req: Request): string | undefined {
  const fromBody =
    typeof req.body === "object" && req.body !== null && "deviceId" in req.body
      ? req.body.deviceId
      : undefined;
  const fromCookie = req.cookies?.[DEVICE_COOKIE];
  return typeof fromBody === "string"
    ? fromBody
    : typeof fromCookie === "string"
      ? fromCookie
      : undefined;
}
