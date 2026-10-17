import {
  S3Client,
  DeleteObjectCommand,
  ListObjectsV2Command,
  type ListObjectsV2CommandOutput,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import { PassThrough, Readable } from 'node:stream';
import type {
  StorageDriver,
  PutObjectOptions,
  PutObjectResult,
  StorageObjectInfo,
} from './storage-driver.interface.js';

export interface S3DriverConfig {
  bucket: string;
  endpoint?: string;
  region?: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl?: string;
}

export class S3StorageDriver implements StorageDriver {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly endpoint?: string;
  private readonly publicBaseUrl?: string;

  constructor(config: S3DriverConfig) {
    this.bucket = config.bucket;
    this.endpoint = config.endpoint;
    this.publicBaseUrl = config.publicBaseUrl;

    this.client = new S3Client({
      region: config.region || 'auto',
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true,
    });
  }

  normalizeKey(rawKeyOrPath: string): string {
    let clean = rawKeyOrPath.replace(/\\/g, '/').replace(/^https?:\/\/[^/]+/, '');
    clean = clean
      .replace(/^\/uploads\/+/, '')
      .replace(/^\/media\/+/, '')
      .replace(new RegExp(`^/?${this.bucket}/+`), '')
      .replace(/^\/+/, '');
    return clean;
  }

  async putObject(options: PutObjectOptions): Promise<PutObjectResult> {
    const canonicalKey = this.normalizeKey(options.key);
    let trackedBytes = options.contentLength ?? 0;
    let bodyToUpload: Buffer | Uint8Array | Readable = options.body;

    if (options.body instanceof Readable) {
      trackedBytes = 0;
      const counterStream = new PassThrough();
      options.body.on('data', (chunk: Buffer) => {
        trackedBytes += chunk.length;
      });
      options.body.on('error', (err) => counterStream.destroy(err));
      options.body.pipe(counterStream);
      bodyToUpload = counterStream;
    } else {
      trackedBytes = options.body.byteLength;
    }

    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucket,
        Key: canonicalKey,
        Body: bodyToUpload,
        ContentType: options.mimeType,
        CacheControl: 'public, max-age=31536000, immutable',
      },
    });

    if (options.signal) {
      options.signal.addEventListener('abort', () => {
        upload.abort().catch(() => {});
      });
    }

    await upload.done();

    return {
      key: canonicalKey,
      url: this.getUrl(canonicalKey),
      sizeBytes: trackedBytes,
    };
  }

  async deleteObject(key: string): Promise<void> {
    const canonicalKey = this.normalizeKey(key);
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: canonicalKey,
      }),
    );
  }

  getUrl(key: string): string {
    const cleanKey = this.normalizeKey(key);
    if (this.publicBaseUrl) {
      const cleanBase = this.publicBaseUrl.replace(/\/+$/, '');
      return `${cleanBase}/${cleanKey}`;
    }
    if (this.endpoint) {
      const cleanEndpoint = this.endpoint.replace(/\/+$/, '');
      return `${cleanEndpoint}/${this.bucket}/${cleanKey}`;
    }
    return `https://${this.bucket}.s3.amazonaws.com/${cleanKey}`;
  }

  async listObjects(prefix: string): Promise<StorageObjectInfo[]> {
    const canonicalPrefix = this.normalizeKey(prefix);
    const results: StorageObjectInfo[] = [];
    let continuationToken: string | undefined = undefined;

    do {
      const response: ListObjectsV2CommandOutput = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: canonicalPrefix,
          ContinuationToken: continuationToken,
        }),
      );

      if (response.Contents) {
        for (const item of response.Contents) {
          if (item.Key) {
            results.push({
              key: item.Key,
              lastModified: item.LastModified,
              sizeBytes: item.Size,
            });
          }
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return results;
  }

  async createPresignedUploadUrl(options: {
    key: string;
    mimeType: string;
    maxSizeBytes: number;
  }): Promise<{ uploadUrl: string; key: string }> {
    const canonicalKey = this.normalizeKey(options.key);
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: canonicalKey,
      ContentType: options.mimeType,
      ContentLength: options.maxSizeBytes,
      CacheControl: 'public, max-age=31536000, immutable',
    });

    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: 900 });

    return {
      uploadUrl,
      key: canonicalKey,
    };
  }
}
