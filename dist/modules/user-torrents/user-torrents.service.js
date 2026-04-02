import { prisma } from "../../config/db.js";
import { HttpError } from "../common/errors.js";
export async function saveTorrent(userId, torrentId) {
    const torrent = await prisma.torrent.findUnique({ where: { id: torrentId } });
    if (!torrent)
        throw HttpError.notFound("Torrent not found.");
    try {
        return await prisma.userTorrent.create({
            data: { userId, torrentId },
            include: { torrent: true },
        });
    }
    catch (err) {
        if (err.code === "P2002") {
            // Already saved — return existing record
            return prisma.userTorrent.findUnique({
                where: { userId_torrentId: { userId, torrentId } },
                include: { torrent: true },
            });
        }
        throw err;
    }
}
export async function removeTorrent(userId, torrentId) {
    await prisma.userTorrent.deleteMany({ where: { userId, torrentId } });
}
export async function listByUser(userId) {
    return prisma.userTorrent.findMany({
        where: { userId },
        include: { torrent: true },
        orderBy: { savedAt: "desc" },
    });
}
//# sourceMappingURL=user-torrents.service.js.map