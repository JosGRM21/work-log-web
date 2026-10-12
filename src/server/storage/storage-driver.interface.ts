import type { Readable } from 'node:stream';

export interface PutObjectOptions {
  key: string;
  body: Buffer | Uint8Array | Readable;
  mimeType: string;
  contentLength?: number;
}

export interface PutObjectResult {
  key: string;
  url: string;
  sizeBytes: number;
}

export interface StorageDriver {
  putObject(options: PutObjectOptions): Promise<PutObjectResult>;
  deleteObject(key: string): Promise<void>;
  getUrl(key: string): string;
}
