import type { Request, Response } from "express";
import * as collectionsService from "./collections.service.js";
import {
  readBody,
  readParams,
  requireUserId,
} from "../common/requestContext.js";
import type {
  AddCollectionItemInput,
  CollectionIdParams,
  RemoveItemParams,
} from "./collections.validators.js";

function compactObject<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, field]) => field !== undefined),
  ) as Partial<T>;
}

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
  const userId = requireUserId(req);
  const collection = await collectionsService.createCollection(
    userId,
    compactObject(readBody<Record<string, unknown>>(req)) as {
      name: string;
      description?: string;
      isPublic?: boolean;
    },
  );
  res.status(201).json({ collection });
}

export async function list(req: Request, res: Response) {
  const userId = requireUserId(req);
  const collections = await collectionsService.listByUser(userId);
  res.json({ collections });
}

export async function getById(req: Request, res: Response) {
  const userId = req.user?.id;
  const { id } = readParams<CollectionIdParams>(req);
  const collection = await collectionsService.getById(id, userId);
  res.json({ collection: serializeCollection(collection as unknown as Record<string, unknown>) });
}

export async function update(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { id } = readParams<CollectionIdParams>(req);
  const collection = await collectionsService.updateCollection(
    id,
    userId,
    compactObject(readBody<Record<string, unknown>>(req)) as {
      name?: string;
      description?: string | null;
      isPublic?: boolean;
    },
  );
  res.json({ collection });
}

export async function deleteCollection(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { id } = readParams<CollectionIdParams>(req);
  await collectionsService.deleteCollection(id, userId);
  res.json({ msg: "Deleted." });
}

export async function addItem(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { id } = readParams<CollectionIdParams>(req);
  const { torrentId } = readBody<AddCollectionItemInput>(req);
  const item = await collectionsService.addItem(id, userId, torrentId);
  res.status(201).json({ item: serializeItem(item as unknown as Record<string, unknown>) });
}

export async function removeItem(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { id, torrentId } = readParams<RemoveItemParams>(req);
  await collectionsService.removeItem(id, userId, torrentId);
  res.json({ msg: "Removed." });
}
