export declare class HttpError extends Error {
    readonly statusCode: number;
    readonly message: string;
    readonly code: string;
    constructor(statusCode: number, message: string, code: string);
    static badRequest(message?: string, code?: string): HttpError;
    static conflict(message?: string, code?: string): HttpError;
    static unauthorized(message?: string, code?: string): HttpError;
    static forbidden(message?: string, code?: string): HttpError;
    static notFound(message?: string, code?: string): HttpError;
    static internal(message?: string): HttpError;
}
//# sourceMappingURL=errors.d.ts.map