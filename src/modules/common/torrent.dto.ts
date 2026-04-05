import type { Collection, CollectionItem, File, Torrent, UserTorrent } from "@prisma/client";

export interface TorrentFileDto {
  path: string;
  size: number;
  index: number;
}

export interface StreamFileDto extends TorrentFileDto {
  name: string;
}

export type TorrentDto = Omit<Torrent, "size" | "fileList"> & {
  size: string;
  fileList: TorrentFileDto[];
};

export type UserTorrentRecord = UserTorrent & {
  torrent: Torrent;
};

export type UserTorrentDto = Omit<UserTorrentRecord, "torrent"> & {
  torrent: TorrentDto;
};

export type CollectionItemRecord = CollectionItem & {
  torrent: Torrent;
};

export type CollectionItemDto = Omit<CollectionItemRecord, "torrent"> & {
  torrent: TorrentDto;
};

export type CollectionRecord = Collection & {
  items?: CollectionItemRecord[];
  _count?: { items: number };
};

export type CollectionDto = Omit<CollectionRecord, "items"> & {
  items?: CollectionItemDto[];
};

export interface StreamSessionDto {
  streamToken: string;
  files: StreamFileDto[];
}

export type FileDto = File;

export interface InitUploadResponseDto {
  url: string;
  key: string;
}

export interface ConfirmUploadResponseDto {
  file: FileDto;
  publicUrl: string;
}

export interface DownloadUrlResponseDto {
  url: string;
  key: string;
}

export interface DeleteFileResponseDto {
  success: true;
  message: string;
}

export interface ApiMessageResponseDto {
  msg: string;
}
