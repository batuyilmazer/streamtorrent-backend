import type { Request, Response, NextFunction } from "express";
import type { ZodSchema, ZodTypeAny } from "zod";

function makeHandler<TSchema extends ZodTypeAny>(
  schema: TSchema,
  getData: (req: Request) => unknown,
  setData: (req: Request, data: unknown) => void,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = (schema as ZodSchema).safeParse(getData(req));
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "validation_error", details: parsed.error.issues });
    }
    setData(req, parsed.data);
    next();
  };
}

export function validateBody<TSchema extends ZodTypeAny>(schema: TSchema) {
  return makeHandler(schema, (req) => req.body, (req, data) => {
    req.body = data;
  });
}

export function validateQuery<T extends ZodTypeAny>(schema: T) {
  return makeHandler(schema, (req) => req.query, (req, data) => {
    req.validatedQuery = data;
  });
}

export function validateParams<T extends ZodTypeAny>(schema: T) {
  return makeHandler(schema, (req) => req.params, (req, data) => {
    req.params = data as Request["params"];
  });
}
