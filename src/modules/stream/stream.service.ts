import jwt from "jsonwebtoken";
import path from "path";
import { env } from "../../config/env.js";
import { HttpError } from "../common/errors.js";

export interface StreamTokenPayload {
  torrentId: string;
  infoHash: string;
}

export function mintStreamToken(torrentId: string, infoHash: string): string {
  // Cast required: exactOptionalPropertyTypes conflicts with jwt's expiresIn type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign({ torrentId, infoHash } satisfies StreamTokenPayload, env.torrent.streamTokenSecret, {
    expiresIn: env.torrent.streamTokenExpiry,
  } as any);
}

export function verifyStreamToken(token: string): StreamTokenPayload {
  try {
    return jwt.verify(token, env.torrent.streamTokenSecret) as StreamTokenPayload;
  } catch {
    throw HttpError.unauthorized("Invalid or expired stream token.");
  }
}

export interface RangeResult {
  start: number;
  end: number;
  chunkSize: number;
  partial: boolean;
}

export function parseRangeHeader(
  rangeHeader: string | undefined,
  totalSize: number,
): RangeResult {
  if (!rangeHeader) {
    return { start: 0, end: totalSize - 1, chunkSize: totalSize, partial: false };
  }

  const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);
  if (!match) {
    throw HttpError.badRequest("Invalid Range header.");
  }

  const start = match[1] ? parseInt(match[1], 10) : 0;
  const end = match[2] ? parseInt(match[2], 10) : totalSize - 1;

  if (start > end || end >= totalSize) {
    throw HttpError.badRequest("Range not satisfiable.");
  }

  return { start, end, chunkSize: end - start + 1, partial: true };
}

const REMUX_EXTS = new Set([".mkv", ".avi", ".mov"]);

export function needsRemux(filename: string): boolean {
  return REMUX_EXTS.has(path.extname(filename).toLowerCase());
}

export function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".webm") return "video/webm";
  return "video/mp4";
}
