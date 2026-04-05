import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { HttpError } from "./errors.js";
import { logger } from "../../config/logger.js";
import {
  serializeHttpError,
  serializeInternalError,
  serializeNotFoundResponse,
  serializeValidationError,
} from "./api-error.dto.js";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json(serializeNotFoundResponse());
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
    return res.status(400).json(serializeValidationError(err));
  }
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json(serializeHttpError(err));
  }
  return res.status(500).json(serializeInternalError());
}
