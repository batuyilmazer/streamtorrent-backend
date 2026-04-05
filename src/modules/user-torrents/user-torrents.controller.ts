import type { Request, Response } from "express";
import * as userTorrentsService from "./user-torrents.service.js";
import { readParams, requireUserId } from "../common/requestContext.js";
import type { TorrentIdParams } from "./user-torrents.validators.js";
import { serializeUserTorrent } from "../common/torrent.serializers.js";

export async function save(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { torrentId } = readParams<TorrentIdParams>(req);
  const userTorrent = await userTorrentsService.saveTorrent(userId, torrentId);
  res.status(201).json({ userTorrent: serializeUserTorrent(userTorrent) });
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
    userTorrents: items.map(serializeUserTorrent),
  });
}
