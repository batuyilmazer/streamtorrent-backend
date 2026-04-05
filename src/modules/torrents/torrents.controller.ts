import type { Request, Response } from "express";
import { HttpError } from "../common/errors.js";
import { env } from "../../config/env.js";
import { maxTorrentBytes } from "../common/torrentLimits.js";
import {
  getTorrentById,
  parseMagnetString,
  parseTorrentBuffer,
  upsertTorrent,
} from "./torrents.service.js";
import type { MagnetInput } from "./torrents.validators.js";
import { readBody } from "../common/requestContext.js";
import { serializeTorrent } from "../common/torrent.serializers.js";

export async function upload(req: Request, res: Response) {
  const buffer = req.body as Buffer;
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw HttpError.badRequest("No torrent file provided.");
  }

  const data = await parseTorrentBuffer(buffer);
  const maxBytes = maxTorrentBytes();
  if (data.size > maxBytes) {
    throw HttpError.badRequest(
      `Torrent exceeds the ${env.torrent.maxSizeGb} GB size limit.`,
    );
  }
  const torrent = await upsertTorrent(data);
  res.status(201).json({ torrent: serializeTorrent(torrent) });
}

export async function magnet(req: Request, res: Response) {
  const { magnetUri } = readBody<MagnetInput>(req);
  const data = await parseMagnetString(magnetUri);
  const torrent = await upsertTorrent(data);
  res.status(201).json({ torrent: serializeTorrent(torrent) });
}

export async function getById(req: Request, res: Response) {
  const id = req.params.id as string;
  const torrent = await getTorrentById(id);
  res.json({ torrent: serializeTorrent(torrent) });
}
