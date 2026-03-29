export declare function issueRefreshToken(userId: string, ua?: string, ip?: string, deviceId?: string): Promise<{
    raw: string;
    jti: `${string}-${string}-${string}-${string}-${string}`;
    expiresAt: Date;
    deviceId: string;
}>;
export declare function verifyAndRotate(oldRaw: string, deviceId: string, ua?: string, ip?: string): Promise<{
    userId: string;
    newRaw: string;
    newJti: `${string}-${string}-${string}-${string}-${string}`;
    expiresAt: Date;
}>;
export declare const revokeActiveTokensForDevice: (userId: string, deviceId: string) => Promise<void>;
export declare function revokeByRaw(raw: string): Promise<void>;
export declare const revokeAll: (userId: string) => Promise<void>;
//# sourceMappingURL=refresh.d.ts.map