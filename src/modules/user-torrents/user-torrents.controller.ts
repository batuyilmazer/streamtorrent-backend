import type { Request, Response } from "express";
import * as userTorrentsService from "./user-torrents.service.js";

function serializeTorrent(obj: Record<string, unknown>) {
  return {
    ...obj,
    size: obj.size !== undefined ? String(obj.size) : obj.size,
  };
}

function serializeUserTorrent(ut: Record<string, unknown>) {
  const result = { ...ut };
  if (result.torrent) {
    result.torrent = serializeTorrent(result.torrent as Record<string, unknown>);
  }
  return result;
}

export async function save(req: Request, res: Response) {
  const userId = (req as any).user.id as string;
  const torrentId = req.params.torrentId as string;
  const userTorrent = await userTorrentsService.saveTorrent(userId, torrentId);
  res.status(201).json({ userTorrent: serializeUserTorrent(userTorrent as Record<string, unknown>) });
}

export async function remove(req: Request, res: Response) {
  const userId = (req as any).user.id as string;
  const torrentId = req.params.torrentId as string;
  await userTorrentsService.removeTorrent(userId, torrentId);
  res.json({ msg: "Removed." });
}

export async function list(req: Request, res: Response) {
  const userId = (req as any).user.id as string;
  const items = await userTorrentsService.listByUser(userId);
  res.json({
    userTorrents: items.map((ut) => serializeUserTorrent(ut as unknown as Record<string, unknown>)),
  });
}
