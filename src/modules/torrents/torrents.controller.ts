import type { Request, Response } from "express";
import { HttpError } from "../common/errors.js";
import {
  getTorrentById,
  parseMagnetString,
  parseTorrentBuffer,
  upsertTorrent,
} from "./torrents.service.js";

export async function upload(req: Request, res: Response) {
  const buffer = req.body as Buffer;
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw HttpError.badRequest("No torrent file provided.");
  }

  const data = await parseTorrentBuffer(buffer);
  const torrent = await upsertTorrent(data);
  res.status(201).json({ torrent });
}

export async function magnet(req: Request, res: Response) {
  const { magnetUri } = (req as any).body;
  const data = await parseMagnetString(magnetUri);
  const torrent = await upsertTorrent(data);
  res.status(201).json({ torrent });
}

export async function getById(req: Request, res: Response) {
  const id = req.params.id as string;
  const torrent = await getTorrentById(id);
  res.json({ torrent });
}
