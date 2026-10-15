import { createWriteStream } from 'node:fs';
import { mkdir, unlink, stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type {
  StorageDriver,
  PutObjectOptions,
  PutObjectResult,
} from './storage-driver.interface.js';

export class LocalDiskStorageDriver implements StorageDriver {
  private readonly uploadDir: string;
  private readonly publicUrlPrefix: string;

  constructor(uploadDir = './uploads', publicUrlPrefix = '/uploads') {
    this.uploadDir = path.resolve(process.cwd(), uploadDir);
    this.publicUrlPrefix = publicUrlPrefix.replace(/\/+$/, '');
  }

  normalizeKey(rawKeyOrPath: string): string {
    return rawKeyOrPath
      .replace(/\\/g, '/')
      .replace(/^https?:\/\/[^/]+/, '')
      .replace(new RegExp(`^${this.publicUrlPrefix}/+`), '')
      .replace(/^\/media\/+/, '')
      .replace(/^\/+/, '');
  }

  private resolveSafePath(key: string): string {
    const cleanKey = this.normalizeKey(key);
    const sanitizedKey = path.normalize(cleanKey).replace(/^(\.\.(\/|\\|$))+/, '');
    const absolutePath = path.resolve(this.uploadDir, sanitizedKey);

    if (!absolutePath.startsWith(this.uploadDir + path.sep) && absolutePath !== this.uploadDir) {
      throw new Error(`Acceso no permitido fuera del directorio de uploads: ${key}`);
    }

    return absolutePath;
  }

  async putObject(options: PutObjectOptions): Promise<PutObjectResult> {
    const canonicalKey = this.normalizeKey(options.key);
    const destinationPath = this.resolveSafePath(canonicalKey);
    const directory = path.dirname(destinationPath);

    await mkdir(directory, { recursive: true });

    const sourceStream =
      options.body instanceof Readable ? options.body : Readable.from(options.body);
    const writeStream = createWriteStream(destinationPath);

    try {
      await pipeline(sourceStream, writeStream, {
        ...(options.signal ? { signal: options.signal } : {}),
      });
    } catch (error) {
      await unlink(destinationPath).catch(() => {});
      throw error;
    }

    const fileStats = await stat(destinationPath);

    return {
      key: canonicalKey,
      url: this.getUrl(canonicalKey),
      sizeBytes: Number(fileStats.size),
    };
  }

  async deleteObject(key: string): Promise<void> {
    const filePath = this.resolveSafePath(key);
    try {
      await unlink(filePath);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  getUrl(key: string): string {
    const cleanKey = this.normalizeKey(key);
    return `${this.publicUrlPrefix}/${cleanKey}`;
  }
}
