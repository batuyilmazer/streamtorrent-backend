export declare const createUser: (emailRaw: string, passwordRaw: string) => Promise<{
    email: string;
    id: string;
    passwordHash: string;
    emailVerified: boolean;
    isSuspended: boolean;
    failedLoginCount: number;
    lockUntil: Date | null;
    lastLoginAt: Date | null;
    passwordChangedAt: Date | null;
    role: import("@prisma/client").$Enums.Role;
    createdAt: Date;
    updatedAt: Date;
}>;
export declare function verifyUser(emailRaw: string, password: string): Promise<{
    id: string;
    email: string;
}>;
export declare const getUserInfo: (userId: string) => Promise<{
    email: string;
    id: string;
    emailVerified: boolean;
    lastLoginAt: Date | null;
    refreshTokens: {
        deviceId: string;
        createdAt: Date;
        userAgent: string | null;
        ip: string | null;
        expiresAt: Date;
    }[];
}>;
export declare const verifyUserEmail: (userId: string) => Promise<{
    email: string;
    id: string;
    passwordHash: string;
    emailVerified: boolean;
    isSuspended: boolean;
    failedLoginCount: number;
    lockUntil: Date | null;
    lastLoginAt: Date | null;
    passwordChangedAt: Date | null;
    role: import("@prisma/client").$Enums.Role;
    createdAt: Date;
    updatedAt: Date;
}>;
export declare const resetUserPassword: (userId: string, newPassword: string) => Promise<{
    email: string;
    id: string;
    passwordHash: string;
    emailVerified: boolean;
    isSuspended: boolean;
    failedLoginCount: number;
    lockUntil: Date | null;
    lastLoginAt: Date | null;
    passwordChangedAt: Date | null;
    role: import("@prisma/client").$Enums.Role;
    createdAt: Date;
    updatedAt: Date;
}>;
//# sourceMappingURL=users.service.d.ts.map