import type { Request, Response, NextFunction } from "express";
export declare function notFoundHandler(_req: Request, res: Response): void;
export declare function globalErrorHandler(err: Error, req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>>;
//# sourceMappingURL=errorHandlers.d.ts.map