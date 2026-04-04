import type { Request, Response } from "express";
import * as userTorrentsService from "./user-torrents.service.js";
import { readParams, requireUserId } from "../common/requestContext.js";
import type { TorrentIdParams } from "./user-torrents.validators.js";

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
  const userId = requireUserId(req);
  const { torrentId } = readParams<TorrentIdParams>(req);
  const userTorrent = await userTorrentsService.saveTorrent(userId, torrentId);
  res.status(201).json({ userTorrent: serializeUserTorrent(userTorrent as Record<string, unknown>) });
}

export async function remove(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { torrentId } = readParams<TorrentIdParams>(req);
  await userTorrentsService.removeTorrent(userId, torrentId);
  res.json({ msg: "Removed." });
}

export async function list(req: Request, res: Response) {
  const userId = requireUserId(req);
  const items = await userTorrentsService.listByUser(userId);
  res.json({
    userTorrents: items.map((ut) => serializeUserTorrent(ut as unknown as Record<string, unknown>)),
  });
}
