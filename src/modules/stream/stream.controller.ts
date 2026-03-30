import type { Request, Response } from "express";
import ffmpeg from "fluent-ffmpeg";
import { asyncHandler } from "../common/asyncHandler.js";
import { HttpError } from "../common/errors.js";
import { getTorrentById } from "../torrents/torrents.service.js";
import { torrentEngine } from "../../services/torrent/torrentEngine.js";
import {
  mintStreamToken,
  verifyStreamToken,
  parseRangeHeader,
  needsRemux,
  getContentType,
} from "./stream.service.js";

interface FileEntry {
  path: string;
  size: number;
  index: number;
}

// GET /api/torrents/:id/stream
// Returns a short-lived stream token + file list for the torrent.
export const getStreamSession = asyncHandler(async (req: Request, res: Response) => {
  const torrent = await getTorrentById((req as any).params.id);

  const streamToken = mintStreamToken(torrent.id, torrent.infoHash);
  const rawFiles = Array.isArray(torrent.fileList)
    ? (torrent.fileList as unknown as FileEntry[])
    : [];
  const files = rawFiles.map((f) => ({
    index: f.index,
    name: f.path.split("/").pop() ?? f.path,
    path: f.path,
    size: f.size,
  }));

  res.json({ streamToken, files });
});

// GET /api/stream/:streamToken/:fileIndex
// Streams the requested file with Range request support.
// Remuxes mkv/avi/mov → mp4 via FFmpeg (container swap only, no re-encode).
export const streamFile = asyncHandler(async (req: Request, res: Response) => {
  const { streamToken, fileIndex: fileIndexStr } = (req as any).params as {
    streamToken: string;
    fileIndex: string;
  };

  const fileIndex = parseInt(fileIndexStr, 10);
  if (isNaN(fileIndex) || fileIndex < 0) {
    throw HttpError.badRequest("fileIndex must be a non-negative integer.");
  }

  const payload = verifyStreamToken(streamToken);
  const dbTorrent = await getTorrentById(payload.torrentId);

  // Determine the source WebTorrent can use to activate the torrent.
  let source: string | Buffer | undefined;
  if (dbTorrent.torrentFile) {
    source = Buffer.from(dbTorrent.torrentFile as Buffer);
  } else if (dbTorrent.magnetUri) {
    source = dbTorrent.magnetUri;
  }

  // Activate (or retrieve cached) torrent in the engine.
  await torrentEngine.getOrAdd(payload.infoHash, source);

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
      .on("error", (_err: Error) => {
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
