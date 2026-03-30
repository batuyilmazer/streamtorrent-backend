interface FileEntry {
    path: string;
    size: number;
    index: number;
}
export declare function parseTorrentBuffer(buffer: Buffer): Promise<{
    infoHash: string;
    name: string;
    size: bigint;
    fileList: FileEntry[];
    torrentFile: Buffer<ArrayBufferLike>;
}>;
export declare function parseMagnetString(magnetUri: string): Promise<{
    infoHash: string;
    name: string;
    size: bigint;
    fileList: FileEntry[];
    magnetUri: string;
}>;
export declare function upsertTorrent(data: Awaited<ReturnType<typeof parseTorrentBuffer>> | Awaited<ReturnType<typeof parseMagnetString>>): Promise<{
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
}>;
export declare function getTorrentById(id: string): Promise<{
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
}>;
export {};
//# sourceMappingURL=torrents.service.d.ts.map