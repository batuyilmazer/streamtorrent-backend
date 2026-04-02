import WebTorrent from "webtorrent";
import type { Torrent as WTTorrent, TorrentFile as WTTorrentFile } from "webtorrent";
import { env } from "../../config/env.js";
import { HttpError } from "../../modules/common/errors.js";
import { logger } from "../../config/logger.js";

export interface TorrentHandle {
  infoHash: string;
  torrent: WTTorrent;
  lastAccessedAt: number;
}

const DEFAULT_ANNOUNCE = [
  // Prefer HTTPS trackers (works even when UDP is blocked).
  "https://tracker.opentrackr.org:443/announce",
  "https://tracker.openwebtorrent.com/announce",
  "https://tracker.torrent.eu.org:443/announce",
  "https://tracker1.520.jp:443/announce",
  // Keep a few UDP trackers too (helps on hosts that allow UDP).
  "udp://tracker.opentrackr.org:1337/announce",
  "udp://open.stealth.si:80/announce",
  "udp://tracker.openbittorrent.com:6969/announce",
];

class TorrentEngine {
  private client: WebTorrent;
  private torrents: Map<string, TorrentHandle> = new Map();
  private pending: Map<string, Promise<TorrentHandle>> = new Map();

  constructor() {
    this.client = new WebTorrent({
      maxConns: 50,
      utp: true,
      dht: true,
      tracker: true,
    });

    this.client.on("error", (err: Error) => {
      logger.error({ err }, "[TorrentEngine] client error");
    });

    const cleanupInterval = setInterval(() => {
      const threshold = Date.now() - 30 * 60 * 1000;
      for (const [hash, handle] of this.torrents) {
        if (handle.lastAccessedAt < threshold) {
          this.remove(hash).catch((err) =>
            logger.error({ err, infoHash: hash }, "[TorrentEngine] cleanup error")
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
      logger.warn(
        { maxConcurrent: env.torrent.maxConcurrent },
        "[TorrentEngine] max concurrent torrents reached",
      );
      throw HttpError.serviceUnavailable(
        "Server is at capacity. Try again later.",
      );
    }

    const inProgress = this.pending.get(infoHash);
    if (inProgress) return inProgress;

    const promise = new Promise<TorrentHandle>((resolve, reject) => {
      const sourceType = !source ? "infoHash-magnet" : Buffer.isBuffer(source) ? "torrent-file" : "magnet";
      logger.info({ infoHash, sourceType }, "[TorrentEngine] adding torrent");

      const input: string | Buffer = source ?? `magnet:?xt=urn:btih:${infoHash}`;
      const torrent = this.client.add(input, { private: false, announce: DEFAULT_ANNOUNCE });

      // Log peer discovery progress every 10 seconds
      const progressInterval = setInterval(() => {
        logger.debug(
          {
            infoHash,
            numPeers: torrent.numPeers,
            numTrackers: torrent.announce?.length ?? 0,
            downloaded: torrent.downloaded,
            ready: torrent.ready,
          },
          "[TorrentEngine] waiting for peers"
        );
      }, 10_000);

      torrent.on("warning", (warn: Error | string) => {
        logger.warn({ infoHash, warn: warn instanceof Error ? warn.message : warn }, "[TorrentEngine] torrent warning");
      });

      torrent.on("noPeers", (announceType: string) => {
        logger.warn({ infoHash, announceType }, "[TorrentEngine] no peers found");
      });

      const timer = setTimeout(() => {
        clearInterval(progressInterval);
        torrent.removeAllListeners("ready");
        torrent.removeAllListeners("error");
        logger.error(
          { infoHash, numPeers: torrent.numPeers, sourceType },
          "[TorrentEngine] timed out waiting for peers"
        );
        this.pending.delete(infoHash);
        reject(HttpError.internal("Torrent not ready: timed out waiting for peers."));
      }, 45_000);

      torrent.once("ready", () => {
        clearTimeout(timer);
        clearInterval(progressInterval);
        logger.info(
          { infoHash, name: torrent.name, numFiles: torrent.files.length, numPeers: torrent.numPeers },
          "[TorrentEngine] torrent ready"
        );
        const handle: TorrentHandle = {
          infoHash: torrent.infoHash,
          torrent,
          lastAccessedAt: Date.now(),
        };
        this.torrents.set(torrent.infoHash, handle);
        this.pending.delete(infoHash);
        resolve(handle);
      });

      torrent.once("error", (err: Error) => {
        clearTimeout(timer);
        clearInterval(progressInterval);
        logger.error({ err, infoHash }, "[TorrentEngine] torrent error");
        this.pending.delete(infoHash);
        reject(err);
      });
    });

    this.pending.set(infoHash, promise);
    return promise;
  }

  async waitForPeers(infoHash: string, timeoutMs = 15_000): Promise<void> {
    const handle = this.torrents.get(infoHash);
    if (!handle) throw HttpError.notFound("Torrent not active.");

    if (handle.torrent.numPeers > 0) return;

    await new Promise<void>((resolve, reject) => {
      const t = handle.torrent;
      const timer = setTimeout(() => {
        cleanup();
        reject(HttpError.serviceUnavailable("No peers available for this torrent right now."));
      }, timeoutMs);

      const onWire = () => {
        cleanup();
        resolve();
      };

      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };

      const cleanup = () => {
        clearTimeout(timer);
        (t as any).off("wire", onWire);
        t.off("error", onError);
      };

      // WebTorrent emits "wire" when a peer connection is established,
      // but its TypeScript typings don't currently expose it.
      (t as any).on("wire", onWire);
      t.on("error", onError);
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
          logger.info({ infoHash }, "[TorrentEngine] torrent removed");
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
