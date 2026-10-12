import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import type {
  StorageDriver,
  PutObjectOptions,
  PutObjectResult,
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

  async putObject(options: PutObjectOptions): Promise<PutObjectResult> {
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucket,
        Key: options.key,
        Body: options.body,
        ContentType: options.mimeType,
      },
    });

    await upload.done();

    return {
      key: options.key,
      url: this.getUrl(options.key),
      sizeBytes: options.contentLength ?? 0,
    };
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  getUrl(key: string): string {
    if (this.publicBaseUrl) {
      const cleanBase = this.publicBaseUrl.replace(/\/+$/, '');
      const cleanKey = key.replace(/^\/+/, '');
      return `${cleanBase}/${cleanKey}`;
    }

    if (this.endpoint) {
      const cleanEndpoint = this.endpoint.replace(/\/+$/, '');
      return `${cleanEndpoint}/${this.bucket}/${key}`;
    }

    return `https://${this.bucket}.s3.amazonaws.com/${key}`;
  }
}
