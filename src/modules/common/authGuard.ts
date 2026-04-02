import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
const { TokenExpiredError } = jwt;
import { verify2faToken, verifyAccessToken } from "../auth/jwt.js";
import { HttpError } from "./errors.js";
import { createHash } from "crypto";
import { prisma } from "../../config/db.js";

export function authGuard(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) throw HttpError.unauthorized("No token provided.", "NO_TOKEN");
  try {
    const payload = verifyAccessToken(token);
    (req as any).user = {
      id: payload.sub,
    };
    next();
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      throw HttpError.unauthorized("Access token expired.", "TOKEN_EXPIRED");
    }
    throw HttpError.unauthorized("Invalid access token.", "INVALID_TOKEN");
  }
}

export function optionalAuthGuard(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    (req as any).user = { id: payload.sub };
  } catch {
    // Invalid token — proceed without user context
  }
  next();
}

export function twoFactorAuthGuard(scope: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = req.body?.token as string;
    try {
      if (!token) throw HttpError.unauthorized("No 2FA token provided.");
      const payload = verify2faToken(token);

      const userId = (req as any).user.id;
      if (payload.sub !== userId) {
        throw HttpError.unauthorized("This token wasn't issued for you.");
      }
      if (payload.scope !== scope) {
        throw HttpError.unauthorized("This token wasn't issued for this action.");
      }

      const tokenHash = createHash("sha256").update(token).digest("hex");
      const existingToken = await prisma.expiredTwoFactorToken.findUnique({
        where: { tokenHash },
      });

      if (existingToken) {
        throw HttpError.unauthorized("Token used.");
      }

      await prisma.expiredTwoFactorToken.create({
        data: {
          userId: payload.sub,
          tokenHash,
          usedAt: new Date(),
          expiresAt: new Date(payload.exp * 1000),
        },
      });

      next();
    } catch (err) {
      if (err instanceof HttpError) throw err;
      throw HttpError.unauthorized("Two factor authentication failed.");
    }
  };
}
