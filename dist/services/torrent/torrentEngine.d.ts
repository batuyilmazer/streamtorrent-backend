import type { Torrent as WTTorrent, TorrentFile as WTTorrentFile } from "webtorrent";
export interface TorrentHandle {
    infoHash: string;
    torrent: WTTorrent;
    lastAccessedAt: number;
}
declare class TorrentEngine {
    private client;
    private torrents;
    private pending;
    constructor();
    getOrAdd(infoHash: string, source?: string | Buffer): Promise<TorrentHandle>;
    waitForPeers(infoHash: string, timeoutMs?: number): Promise<void>;
    getFile(infoHash: string, fileIndex: number): WTTorrentFile;
    remove(infoHash: string): Promise<void>;
    activeCount(): number;
}
export declare const torrentEngine: TorrentEngine;
export {};
//# sourceMappingURL=torrentEngine.d.ts.map