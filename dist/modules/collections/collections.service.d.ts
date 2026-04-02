export declare function createCollection(userId: string, data: {
    name: string;
    description?: string;
    isPublic?: boolean;
}): Promise<{
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    isPublic: boolean;
    description: string | null;
}>;
export declare function listByUser(userId: string): Promise<({
    _count: {
        items: number;
    };
} & {
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    isPublic: boolean;
    description: string | null;
})[]>;
export declare function getById(id: string, userId?: string): Promise<{
    items: ({
        torrent: {
            name: string;
            id: string;
            createdAt: Date;
            size: bigint;
            infoHash: string;
            magnetUri: string | null;
            torrentFile: import("@prisma/client/runtime/library").Bytes | null;
            fileList: import("@prisma/client/runtime/library").JsonValue;
            isAdminPinned: boolean;
            addedBy: string | null;
            lastSeenAt: Date;
        };
    } & {
        id: string;
        torrentId: string;
        addedAt: Date;
        collectionId: string;
    })[];
} & {
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    isPublic: boolean;
    description: string | null;
}>;
export declare function updateCollection(id: string, userId: string, data: {
    name?: string;
    description?: string | null;
    isPublic?: boolean;
}): Promise<{
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    isPublic: boolean;
    description: string | null;
}>;
export declare function deleteCollection(id: string, userId: string): Promise<void>;
export declare function addItem(collectionId: string, userId: string, torrentId: string): Promise<({
    torrent: {
        name: string;
        id: string;
        createdAt: Date;
        size: bigint;
        infoHash: string;
        magnetUri: string | null;
        torrentFile: import("@prisma/client/runtime/library").Bytes | null;
        fileList: import("@prisma/client/runtime/library").JsonValue;
        isAdminPinned: boolean;
        addedBy: string | null;
        lastSeenAt: Date;
    };
} & {
    id: string;
    torrentId: string;
    addedAt: Date;
    collectionId: string;
}) | null>;
export declare function removeItem(collectionId: string, userId: string, torrentId: string): Promise<void>;
//# sourceMappingURL=collections.service.d.ts.map