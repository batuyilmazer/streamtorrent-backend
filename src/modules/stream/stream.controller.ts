import type { Request, Response } from "express";
import ffmpeg from "fluent-ffmpeg";
import { asyncHandler } from "../common/asyncHandler.js";
import { HttpError } from "../common/errors.js";
import { getTorrentById } from "../torrents/torrents.service.js";
import { torrentEngine } from "../../services/torrent/torrentEngine.js";
import { prisma } from "../../config/db.js";
import {
  mintStreamToken,
  verifyStreamToken,
  parseRangeHeader,
  needsRemux,
  getContentType,
} from "./stream.service.js";
import { logger } from "../../config/logger.js";
import { env } from "../../config/env.js";
import { maxTorrentBytes } from "../common/torrentLimits.js";
import {
  serializeStreamSession,
  serializeTorrentFileList,
} from "../common/torrent.serializers.js";

type StreamSessionParams = { id: string };
type StreamFileParams = { streamToken: string; fileIndex: string };

// GET /api/torrents/:id/stream
// Returns a short-lived stream token + file list for the torrent.
// For magnet-only torrents with unresolved metadata, activates the engine
// and waits for peer metadata before returning.
export const getStreamSession = asyncHandler(async (req: Request, res: Response) => {
  const torrent = await getTorrentById((req as Request<StreamSessionParams>).params.id);

  let rawFiles = serializeTorrentFileList(torrent.fileList);

  if (rawFiles.length === 0 && torrent.magnetUri) {
    const handle = await torrentEngine.getOrAdd(torrent.infoHash, torrent.magnetUri);
    const resolvedLen = BigInt(handle.torrent.length);
    const maxBytes = maxTorrentBytes();
    if (resolvedLen > maxBytes) {
      throw HttpError.badRequest(
        `Torrent exceeds the ${env.torrent.maxSizeGb} GB size limit.`,
      );
    }
    rawFiles = handle.torrent.files.map((f, i) => ({
      path: f.path,
      size: Number(f.length),
      index: i,
    }));
    await prisma.torrent.update({
      where: { id: torrent.id },
      data: {
        name: handle.torrent.name,
        size: BigInt(handle.torrent.length),
        fileList: rawFiles as any,
        lastSeenAt: new Date(),
      },
    });
  }

  const streamToken = mintStreamToken(torrent.id, torrent.infoHash);
  res.json(serializeStreamSession(streamToken, rawFiles));
});

// GET /api/stream/:streamToken/:fileIndex
// Streams the requested file with Range request support.
// Remuxes mkv/avi/mov → mp4 via FFmpeg (container swap only, no re-encode).
export const streamFile = asyncHandler(async (req: Request, res: Response) => {
  const { streamToken, fileIndex: fileIndexStr } = (req as Request<StreamFileParams>).params;

  const fileIndex = parseInt(fileIndexStr, 10);
  if (isNaN(fileIndex) || fileIndex < 0) {
    throw HttpError.badRequest("fileIndex must be a non-negative integer.");
  }

  const payload = verifyStreamToken(streamToken);
  const dbTorrent = await getTorrentById(payload.torrentId);

  const streamFiles = serializeTorrentFileList(dbTorrent.fileList);
  if (streamFiles.length === 0) {
    throw HttpError.badRequest(
      "Torrent metadata is not ready yet. Request a stream session first to resolve the file list.",
    );
  }
  if (fileIndex >= streamFiles.length) {
    throw HttpError.badRequest(
      `Invalid fileIndex. Torrent has ${streamFiles.length} file(s).`,
    );
  }

  // Determine the source WebTorrent can use to activate the torrent.
  let source: string | Buffer | undefined;
  if (dbTorrent.torrentFile) {
    source = Buffer.from(dbTorrent.torrentFile as Buffer);
  } else if (dbTorrent.magnetUri) {
    source = dbTorrent.magnetUri;
  }

  logger.info(
    {
      torrentId: payload.torrentId,
      infoHash: payload.infoHash,
      fileIndex,
      range: req.headers.range,
      hasFile: !!dbTorrent.torrentFile,
      hasMagnet: !!dbTorrent.magnetUri,
    },
    "[Stream] request received"
  );

  // Activate (or retrieve cached) torrent in the engine.
  await torrentEngine.getOrAdd(payload.infoHash, source);
  await torrentEngine.waitForPeers(payload.infoHash);

  // Resolve the specific file and prioritise its download.
  const wtFile = torrentEngine.getFile(payload.infoHash, fileIndex);
  wtFile.select();

  const filename = wtFile.name;

  if (needsRemux(filename)) {
    // FFmpeg remux: container-swap only (no transcoding).
    // movflags frag_keyframe+empty_moov enables streaming without seeking.
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Accept-Ranges", "none");

    const inputStream = wtFile.createReadStream();

    ffmpeg(inputStream)
      .outputOptions([
        "-c:v copy",
        "-c:a copy",
        "-movflags frag_keyframe+empty_moov",
        "-f mp4",
      ])
      .on("error", (err: Error) => {
        logger.error(
          {
            err,
            torrentId: payload.torrentId,
            infoHash: payload.infoHash,
            fileIndex,
          },
          "[Stream] FFmpeg remux error",
        );
        if (!res.headersSent) res.status(500).end();
        else res.end();
      })
      .pipe(res as any, { end: true });
  } else {
    // Direct streaming with HTTP Range support.
    const totalSize = wtFile.length;
    const { start, end, chunkSize, partial } = parseRangeHeader(
      req.headers.range,
      totalSize,
    );

    const headers: Record<string, string | number> = {
      "Content-Type": getContentType(filename),
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
    };

    if (partial) {
      headers["Content-Range"] = `bytes ${start}-${end}/${totalSize}`;
    }

    res.writeHead(partial ? 206 : 200, headers);

    const readStream = wtFile.createReadStream({ start, end });
    readStream.on("error", () => res.end());
    readStream.pipe(res);
  }
});
