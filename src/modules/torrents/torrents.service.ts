import parseTorrent from "parse-torrent";
import path from "path";
import { prisma } from "../../config/db.js";
import { HttpError } from "../common/errors.js";

interface FileEntry {
  path: string;
  size: number;
  index: number;
}

export async function parseTorrentBuffer(buffer: Buffer) {
  let parsed: any;
  try {
    parsed = await parseTorrent(buffer);
  } catch {
    throw HttpError.badRequest("Invalid .torrent file.");
  }

  if (!parsed?.infoHash) throw HttpError.badRequest("Invalid .torrent file.");

  const fileList: FileEntry[] = (parsed.files ?? []).map(
    (f: any, i: number) => {
      const rawPath: string = f.path ?? f.name ?? `file_${i}`;
      // Normalize and reject any path containing traversal sequences.
      const normalized = path.posix.normalize(rawPath).replace(/\\/g, "/");
      if (normalized.startsWith("..") || normalized.startsWith("/")) {
        throw HttpError.badRequest("Torrent contains invalid file paths.");
      }
      return { path: normalized, size: Number(f.length ?? 0), index: i };
    },
  );

  return {
    infoHash: parsed.infoHash as string,
    name: (parsed.name as string) ?? "Unknown",
    size: BigInt(Number(parsed.length ?? 0)),
    fileList,
    torrentFile: buffer,
  };
}

export async function parseMagnetString(magnetUri: string) {
  let parsed: any;
  try {
    parsed = await parseTorrent(magnetUri);
  } catch {
    throw HttpError.badRequest("Invalid magnet URI.");
  }

  if (!parsed?.infoHash) throw HttpError.badRequest("Invalid magnet URI.");

  return {
    infoHash: parsed.infoHash as string,
    name: (parsed.name as string) ?? "Unknown",
    size: BigInt(0),
    fileList: [] as FileEntry[],
    magnetUri,
  };
}

type UpsertInput =
  | ReturnType<typeof parseTorrentBuffer> extends Promise<infer T>
    ? T
    : never
  | ReturnType<typeof parseMagnetString> extends Promise<infer T>
    ? T
    : never;

export async function upsertTorrent(
  data: Awaited<ReturnType<typeof parseTorrentBuffer>> | Awaited<ReturnType<typeof parseMagnetString>>,
) {
  return prisma.torrent.upsert({
    where: { infoHash: data.infoHash },
    update: { lastSeenAt: new Date() },
    create: {
      infoHash: data.infoHash,
      name: data.name,
      magnetUri: "magnetUri" in data ? (data.magnetUri ?? null) : null,
      torrentFile: "torrentFile" in data ? (data.torrentFile ?? null) : null,
      size: data.size,
      fileList: data.fileList as any,
    },
  });
}

export async function getTorrentById(id: string) {
  const torrent = await prisma.torrent.findUnique({ where: { id } });
  if (!torrent) throw HttpError.notFound("Torrent not found.");
  return torrent;
}
