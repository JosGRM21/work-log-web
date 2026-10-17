import type { Readable } from 'node:stream';

export interface PutObjectOptions {
  key: string;
  body: Buffer | Uint8Array | Readable;
  mimeType: string;
  contentLength?: number;
  signal?: AbortSignal;
}

export interface PutObjectResult {
  key: string;
  url: string;
  sizeBytes: number;
}

export interface StorageObjectInfo {
  key: string;
  lastModified?: Date;
  sizeBytes?: number;
}

export interface StorageDriver {
  putObject(options: PutObjectOptions): Promise<PutObjectResult>;
  deleteObject(key: string): Promise<void>;
  getUrl(key: string): string;
  normalizeKey(rawKeyOrPath: string): string;
  listObjects(prefix: string): Promise<StorageObjectInfo[]>;
  createPresignedUploadUrl?(options: {
    key: string;
    mimeType: string;
    maxSizeBytes: number;
  }): Promise<{ uploadUrl: string; key: string }>;
}
