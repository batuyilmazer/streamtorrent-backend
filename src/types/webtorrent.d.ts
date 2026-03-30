declare module "webtorrent" {
  import { EventEmitter } from "events";
  import type { Readable } from "stream";

  interface TorrentFile {
    name: string;
    path: string;
    length: number;
    offset: number;
    createReadStream(opts?: { start?: number; end?: number }): Readable;
    select(): void;
    deselect(): void;
  }

  interface Torrent extends EventEmitter {
    infoHash: string;
    name: string;
    length: number;
    files: TorrentFile[];
    magnetURI: string;
    torrentFile: Uint8Array;
    announce: string[];
    done: boolean;
    ready: boolean;
    progress: number;
    downloaded: number;
    numPeers: number;
    on(event: "ready", listener: () => void): this;
    on(event: "error", listener: (err: Error) => void): this;
    on(event: "warning", listener: (warn: Error | string) => void): this;
    on(event: "noPeers", listener: (announceType: string) => void): this;
    once(event: "ready", listener: () => void): this;
    once(event: "error", listener: (err: Error) => void): this;
  }

  interface ClientOptions {
    maxConns?: number;
    utp?: boolean;
    dht?: boolean;
    tracker?: boolean;
    lsd?: boolean;
    webSeeds?: boolean;
    nodeId?: string | Uint8Array;
    peerId?: string | Uint8Array;
    storeName?: string;
  }

  interface RemoveOptions {
    destroyStore?: boolean;
  }

  class WebTorrent extends EventEmitter {
    constructor(opts?: ClientOptions);
    add(
      torrentId: string | Uint8Array | Buffer,
      opts?: Record<string, unknown>
    ): Torrent;
    remove(
      infoHash: string,
      opts?: RemoveOptions,
      callback?: (err: Error | null) => void
    ): void;
    destroy(callback?: (err: Error | null) => void): void;
    torrents: Torrent[];
    on(event: "error", listener: (err: Error) => void): this;
  }

  export default WebTorrent;
  export type { Torrent, TorrentFile };
}
