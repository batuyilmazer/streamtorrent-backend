import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { HttpError } from "./errors.js";
import { logger } from "../../config/logger.js";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: "NOT_FOUND" });
}

export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof HttpError && err.statusCode < 500) {
    logger.warn({ statusCode: err.statusCode, code: err.code, path: req.path }, err.message);
  } else {
    logger.error({ err, path: req.path, method: req.method }, "Unhandled error");
  }
  if (err instanceof ZodError) {
    const zodErr = err as ZodError;
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      details: zodErr.issues.map((i) => ({ path: i.path, message: i.message })),
    });
  }
  if (err instanceof HttpError) {
    return res
      .status(err.statusCode)
      .json({ error: err.code, message: err.message });
  }
  return res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
}
