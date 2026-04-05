import type { File, Prisma, Torrent } from "@prisma/client";
import type {
  CollectionDto,
  CollectionItemDto,
  CollectionItemRecord,
  CollectionRecord,
  ConfirmUploadResponseDto,
  DownloadUrlResponseDto,
  FileDto,
  InitUploadResponseDto,
  StreamFileDto,
  StreamSessionDto,
  TorrentDto,
  TorrentFileDto,
  UserTorrentDto,
  UserTorrentRecord,
} from "./torrent.dto.js";

function readNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function serializeTorrentFileList(fileList: Prisma.JsonValue): TorrentFileDto[] {
  if (!Array.isArray(fileList)) return [];

  return fileList.map((entry, index) => {
    const record =
      entry && typeof entry === "object" && !Array.isArray(entry)
        ? (entry as Record<string, unknown>)
        : {};
    const path = readString(record.path, `file_${index}`);

    return {
      path,
      size: readNumber(record.size),
      index:
        record.index !== undefined ? readNumber(record.index) : index,
    };
  });
}

export function serializeTorrent(torrent: Torrent): TorrentDto {
  return {
    ...torrent,
    size: String(torrent.size),
    fileList: serializeTorrentFileList(torrent.fileList),
  };
}

export function serializeUserTorrent(userTorrent: UserTorrentRecord): UserTorrentDto {
  return {
    ...userTorrent,
    torrent: serializeTorrent(userTorrent.torrent),
  };
}

export function serializeCollectionItem(item: CollectionItemRecord): CollectionItemDto {
  return {
    ...item,
    torrent: serializeTorrent(item.torrent),
  };
}

export function serializeCollection(collection: CollectionRecord): CollectionDto {
  const result: CollectionDto = {
    id: collection.id,
    userId: collection.userId,
    name: collection.name,
    description: collection.description,
    isPublic: collection.isPublic,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
  };

  if (collection._count) {
    result._count = collection._count;
  }

  if (Array.isArray(collection.items)) {
    result.items = collection.items.map(serializeCollectionItem);
  }

  return result;
}

export function serializeStreamFiles(files: TorrentFileDto[]): StreamFileDto[] {
  return files.map((file) => ({
    ...file,
    name: file.path.split("/").pop() ?? file.path,
  }));
}

export function serializeStreamSession(
  streamToken: string,
  files: TorrentFileDto[],
): StreamSessionDto {
  return {
    streamToken,
    files: serializeStreamFiles(files),
  };
}

export function serializeFile(file: File): FileDto {
  return { ...file };
}

export function serializeInitUploadResponse(
  url: string,
  key: string,
): InitUploadResponseDto {
  return { url, key };
}

export function serializeConfirmUploadResponse(
  file: File,
  publicUrl: string,
): ConfirmUploadResponseDto {
  return {
    file: serializeFile(file),
    publicUrl,
  };
}

export function serializeDownloadUrlResponse(
  url: string,
  key: string,
): DownloadUrlResponseDto {
  return { url, key };
}
