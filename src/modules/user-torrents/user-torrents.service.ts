import { prisma } from "../../config/db.js";
import { HttpError } from "../common/errors.js";

export async function saveTorrent(userId: string, torrentId: string) {
  const torrent = await prisma.torrent.findUnique({ where: { id: torrentId } });
  if (!torrent) throw HttpError.notFound("Torrent not found.");

  try {
    return await prisma.userTorrent.create({
      data: { userId, torrentId },
      include: { torrent: true },
    });
  } catch (err: any) {
    if (err.code === "P2002") {
      // Already saved — return existing record
      const existing = await prisma.userTorrent.findUnique({
        where: { userId_torrentId: { userId, torrentId } },
        include: { torrent: true },
      });
      if (!existing) throw HttpError.notFound("Saved torrent record not found.");
      return existing;
    }
    throw err;
  }
}

export async function removeTorrent(userId: string, torrentId: string) {
  await prisma.userTorrent.deleteMany({ where: { userId, torrentId } });
}

export async function listByUser(userId: string) {
  return prisma.userTorrent.findMany({
    where: { userId },
    include: { torrent: true },
    orderBy: { savedAt: "desc" },
  });
}
