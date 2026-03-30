import WebTorrent from "webtorrent";
import type { Torrent as WTTorrent, TorrentFile as WTTorrentFile } from "webtorrent";
import { env } from "../../config/env.js";
import { HttpError } from "../../modules/common/errors.js";

export interface TorrentHandle {
  infoHash: string;
  torrent: WTTorrent;
  lastAccessedAt: number;
}

class TorrentEngine {
  private client: WebTorrent;
  private torrents: Map<string, TorrentHandle> = new Map();

  constructor() {
    this.client = new WebTorrent({
      maxConns: 50,
      utp: false,
      dht: true,
      tracker: true,
    });

    this.client.on("error", (err: Error) => {
      console.error("[TorrentEngine] client error:", err);
    });

    const cleanupInterval = setInterval(() => {
      const threshold = Date.now() - 30 * 60 * 1000;
      for (const [hash, handle] of this.torrents) {
        if (handle.lastAccessedAt < threshold) {
          this.remove(hash).catch((err) =>
            console.error(`[TorrentEngine] cleanup error for ${hash}:`, err)
          );
        }
      }
    }, 5 * 60 * 1000);

    cleanupInterval.unref();
  }

  getOrAdd(infoHash: string, source?: string | Buffer): Promise<TorrentHandle> {
    const existing = this.torrents.get(infoHash);
    if (existing) {
      existing.lastAccessedAt = Date.now();
      return Promise.resolve(existing);
    }

    if (this.activeCount() >= env.torrent.maxConcurrent) {
      throw HttpError.internal(
        `Max concurrent torrents (${env.torrent.maxConcurrent}) reached.`
      );
    }

    return new Promise((resolve, reject) => {
      const input: string | Buffer = source ?? `magnet:?xt=urn:btih:${infoHash}`;

      const torrent = this.client.add(input, { private: false });

      const timer = setTimeout(() => {
        torrent.removeAllListeners("ready");
        torrent.removeAllListeners("error");
        reject(HttpError.internal("Torrent not ready: timed out waiting for peers."));
      }, 45_000);

      torrent.once("ready", () => {
        clearTimeout(timer);
        const handle: TorrentHandle = {
          infoHash: torrent.infoHash,
          torrent,
          lastAccessedAt: Date.now(),
        };
        this.torrents.set(torrent.infoHash, handle);
        resolve(handle);
      });

      torrent.once("error", (err: Error) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  getFile(infoHash: string, fileIndex: number): WTTorrentFile {
    const handle = this.torrents.get(infoHash);
    if (!handle) throw HttpError.notFound("Torrent not active.");

    const files = handle.torrent.files;
    if (fileIndex < 0 || fileIndex >= files.length) {
      throw HttpError.badRequest(
        `Invalid fileIndex ${fileIndex}. Torrent has ${files.length} file(s).`
      );
    }

    handle.lastAccessedAt = Date.now();
    return files[fileIndex]!;
  }

  remove(infoHash: string): Promise<void> {
    const handle = this.torrents.get(infoHash);
    if (!handle) return Promise.resolve();

    return new Promise((resolve, reject) => {
      this.client.remove(
        infoHash,
        { destroyStore: true },
        (err: Error | null) => {
          if (err) return reject(err);
          this.torrents.delete(infoHash);
          resolve();
        }
      );
    });
  }

  activeCount(): number {
    return this.torrents.size;
  }
}

export const torrentEngine = new TorrentEngine();
