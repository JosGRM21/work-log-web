import { LocalDiskStorageDriver } from './local-disk-storage.driver.js';
import { S3StorageDriver } from './s3-storage.driver.js';
import type { StorageDriver } from './storage-driver.interface.js';

function createStorageDriver(): StorageDriver {
  const driverType = process.env.STORAGE_DRIVER || 'local';

  if (driverType === 's3') {
    const bucket = process.env.STORAGE_BUCKET;
    const accessKeyId = process.env.STORAGE_ACCESS_KEY;
    const secretAccessKey = process.env.STORAGE_SECRET_KEY;

    if (!bucket || !accessKeyId || !secretAccessKey) {
      throw new Error(
        'Configuración S3 incompleta: STORAGE_BUCKET, STORAGE_ACCESS_KEY y STORAGE_SECRET_KEY son obligatorios.',
      );
    }

    return new S3StorageDriver({
      bucket,
      endpoint: process.env.STORAGE_ENDPOINT,
      region: process.env.STORAGE_REGION || 'auto',
      accessKeyId,
      secretAccessKey,
      publicBaseUrl: process.env.STORAGE_PUBLIC_URL,
    });
  }

  return new LocalDiskStorageDriver();
}

export const storage = createStorageDriver();
export * from './storage-driver.interface.js';
