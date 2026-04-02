import type { Request, Response } from "express";
import * as collectionsService from "./collections.service.js";

function serializeTorrent(obj: Record<string, unknown>) {
  return {
    ...obj,
    size: obj.size !== undefined ? String(obj.size) : obj.size,
  };
}

function serializeItem(item: Record<string, unknown>) {
  const result = { ...item };
  if (result.torrent) {
    result.torrent = serializeTorrent(result.torrent as Record<string, unknown>);
  }
  return result;
}

function serializeCollection(collection: Record<string, unknown>) {
  const result = { ...collection };
  if (Array.isArray(result.items)) {
    result.items = (result.items as Record<string, unknown>[]).map(serializeItem);
  }
  return result;
}

export async function create(req: Request, res: Response) {
  const userId = (req as any).user.id as string;
  const collection = await collectionsService.createCollection(userId, req.body);
  res.status(201).json({ collection });
}

export async function list(req: Request, res: Response) {
  const userId = (req as any).user.id as string;
  const collections = await collectionsService.listByUser(userId);
  res.json({ collections });
}

export async function getById(req: Request, res: Response) {
  const userId = (req as any).user?.id as string | undefined;
  const id = req.params.id as string;
  const collection = await collectionsService.getById(id, userId);
  res.json({ collection: serializeCollection(collection as unknown as Record<string, unknown>) });
}

export async function update(req: Request, res: Response) {
  const userId = (req as any).user.id as string;
  const id = req.params.id as string;
  const collection = await collectionsService.updateCollection(id, userId, req.body);
  res.json({ collection });
}

export async function deleteCollection(req: Request, res: Response) {
  const userId = (req as any).user.id as string;
  const id = req.params.id as string;
  await collectionsService.deleteCollection(id, userId);
  res.json({ msg: "Deleted." });
}

export async function addItem(req: Request, res: Response) {
  const userId = (req as any).user.id as string;
  const id = req.params.id as string;
  const item = await collectionsService.addItem(id, userId, req.body.torrentId);
  res.status(201).json({ item: serializeItem(item as unknown as Record<string, unknown>) });
}

export async function removeItem(req: Request, res: Response) {
  const userId = (req as any).user.id as string;
  const id = req.params.id as string;
  const torrentId = req.params.torrentId as string;
  await collectionsService.removeItem(id, userId, torrentId);
  res.json({ msg: "Removed." });
}
