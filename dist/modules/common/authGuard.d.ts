import { type Request, type Response, type NextFunction } from "express";
export declare function authGuard(req: Request, res: Response, next: NextFunction): void;
export declare function optionalAuthGuard(req: Request, res: Response, next: NextFunction): void;
export declare function twoFactorAuthGuard(scope: string): (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=authGuard.d.ts.map