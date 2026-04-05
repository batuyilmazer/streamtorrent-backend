import type { NextFunction, Request, Response } from "express";
import type { ZodError } from "zod";
import type { HttpError } from "./errors.js";

export interface ApiErrorDetailDto {
  path: Array<string | number>;
  message: string;
}

export interface ApiErrorResponseDto {
  error: string;
  message?: string;
  details?: ApiErrorDetailDto[];
}

export function serializeNotFoundResponse() {
  return { error: "NOT_FOUND" } satisfies ApiErrorResponseDto;
}

export function serializeValidationError(error: ZodError) {
  return {
    error: "VALIDATION_ERROR",
    details: error.issues.map((issue) => ({
      path: issue.path.filter(
        (segment): segment is string | number =>
          typeof segment === "string" || typeof segment === "number",
      ),
      message: issue.message,
    })),
  } satisfies ApiErrorResponseDto;
}

export function serializeHttpError(error: HttpError) {
  return {
    error: error.code,
    message: error.message,
  } satisfies ApiErrorResponseDto;
}

export function serializeInternalError() {
  return { error: "INTERNAL_SERVER_ERROR" } satisfies ApiErrorResponseDto;
}

export type ErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => void;
