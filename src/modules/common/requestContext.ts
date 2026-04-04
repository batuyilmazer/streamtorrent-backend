import type { Request } from "express";
import { HttpError } from "./errors.js";

export interface AuthenticatedUser {
  id: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      validatedQuery?: unknown;
    }
  }
}

export function requireUser(req: Request): AuthenticatedUser {
  if (!req.user) {
    throw HttpError.unauthorized("Authentication required.", "NO_TOKEN");
  }
  return req.user;
}

export function requireUserId(req: Request): string {
  return requireUser(req).id;
}

export function readBody<T>(req: Request): T {
  return req.body as T;
}

export function readParams<T>(req: Request): T {
  return req.params as T;
}

export function readValidatedQuery<T>(req: Request): T {
  return req.validatedQuery as T;
}
