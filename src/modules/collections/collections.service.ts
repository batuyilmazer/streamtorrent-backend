import { Prisma } from "@prisma/client";
import { prisma } from "../../config/db.js";
import { HttpError } from "../common/errors.js";
import type {
  CreateCollectionInput,
  UpdateCollectionInput,
} from "./collections.validators.js";

export async function createCollection(
  userId: string,
  data: CreateCollectionInput,
) {
  return prisma.collection.create({
    data: {
      userId,
      name: data.name,
      description: data.description ?? null,
      isPublic: data.isPublic ?? false,
    },
  });
}

export async function listByUser(userId: string) {
  return prisma.collection.findMany({
    where: { userId },
    include: { _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getById(id: string, userId?: string) {
  const collection = await prisma.collection.findUnique({
    where: { id },
    include: {
      items: {
        include: { torrent: true },
        orderBy: { addedAt: "desc" },
      },
    },
  });

  if (!collection) throw HttpError.notFound("Collection not found.");

  if (!collection.isPublic && collection.userId !== userId) {
    throw HttpError.notFound("Collection not found.");
  }

  return collection;
}

async function verifyOwnership(id: string, userId: string) {
  const collection = await prisma.collection.findUnique({ where: { id } });
  if (!collection) throw HttpError.notFound("Collection not found.");
  if (collection.userId !== userId) throw HttpError.forbidden("Not the collection owner.");
  return collection;
}

export async function updateCollection(
  id: string,
  userId: string,
  data: UpdateCollectionInput,
) {
  await verifyOwnership(id, userId);
  const updateData: Prisma.CollectionUpdateInput = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;
  return prisma.collection.update({ where: { id }, data: updateData });
}

export async function deleteCollection(id: string, userId: string) {
  await verifyOwnership(id, userId);
  await prisma.collection.delete({ where: { id } });
}

export async function addItem(collectionId: string, userId: string, torrentId: string) {
  await verifyOwnership(collectionId, userId);

  const torrent = await prisma.torrent.findUnique({ where: { id: torrentId } });
  if (!torrent) throw HttpError.notFound("Torrent not found.");

  try {
    return await prisma.collectionItem.create({
      data: { collectionId, torrentId },
      include: { torrent: true },
    });
  } catch (err: any) {
    if (err.code === "P2002") {
      const existing = await prisma.collectionItem.findUnique({
        where: { collectionId_torrentId: { collectionId, torrentId } },
        include: { torrent: true },
      });
      if (!existing) throw HttpError.notFound("Collection item not found.");
      return existing;
    }
    throw err;
  }
}

export async function removeItem(collectionId: string, userId: string, torrentId: string) {
  await verifyOwnership(collectionId, userId);
  await prisma.collectionItem.deleteMany({ where: { collectionId, torrentId } });
}
