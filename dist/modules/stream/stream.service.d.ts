export interface StreamTokenPayload {
    torrentId: string;
    infoHash: string;
}
export declare function mintStreamToken(torrentId: string, infoHash: string): string;
export declare function verifyStreamToken(token: string): StreamTokenPayload;
export interface RangeResult {
    start: number;
    end: number;
    chunkSize: number;
    partial: boolean;
}
export declare function parseRangeHeader(rangeHeader: string | undefined, totalSize: number): RangeResult;
export declare function needsRemux(filename: string): boolean;
export declare function getContentType(filename: string): string;
//# sourceMappingURL=stream.service.d.ts.map