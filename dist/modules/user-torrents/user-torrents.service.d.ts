export declare function saveTorrent(userId: string, torrentId: string): Promise<({
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
    userId: string;
    torrentId: string;
    savedAt: Date;
}) | null>;
export declare function removeTorrent(userId: string, torrentId: string): Promise<void>;
export declare function listByUser(userId: string): Promise<({
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
    userId: string;
    torrentId: string;
    savedAt: Date;
})[]>;
//# sourceMappingURL=user-torrents.service.d.ts.map