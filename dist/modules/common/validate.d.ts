import type { Request, Response, NextFunction } from "express";
import type { ZodTypeAny, ZodType } from "zod";
export declare function validateBody<T extends ZodType<any, any, any>>(schema: T): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare function validateQuery<T extends ZodTypeAny>(schema: T): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare function validateParams<T extends ZodTypeAny>(schema: T): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=validate.d.ts.map