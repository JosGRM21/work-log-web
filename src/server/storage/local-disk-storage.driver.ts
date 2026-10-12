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
    this.publicUrlPrefix = publicUrlPrefix;
  }

  private resolveSafePath(key: string): string {
    const sanitizedKey = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, '');
    const absolutePath = path.resolve(this.uploadDir, sanitizedKey);

    if (!absolutePath.startsWith(this.uploadDir)) {
      throw new Error(`Acceso no permitido fuera del directorio de uploads: ${key}`);
    }

    return absolutePath;
  }

  async putObject(options: PutObjectOptions): Promise<PutObjectResult> {
    const destinationPath = this.resolveSafePath(options.key);
    const directory = path.dirname(destinationPath);

    await mkdir(directory, { recursive: true });

    if (options.body instanceof Readable) {
      const writeStream = createWriteStream(destinationPath);
      await pipeline(options.body, writeStream);
    } else {
      const stream = Readable.from(options.body);
      const writeStream = createWriteStream(destinationPath);
      await pipeline(stream, writeStream);
    }

    const fileStats = await stat(destinationPath);

    return {
      key: options.key,
      url: this.getUrl(options.key),
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
    const cleanKey = key.replace(/\\/g, '/').replace(/^\/+/, '');
    return `${this.publicUrlPrefix}/${cleanKey}`;
  }
}
