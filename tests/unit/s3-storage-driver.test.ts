import { describe, it, expect } from 'vitest';
import { S3StorageDriver } from '../../src/server/infra/storage/s3-storage.driver.js';

describe('S3StorageDriver (Unit - Cloudflare R2 Compatibility)', () => {
  const driver = new S3StorageDriver({
    bucket: 'work-log-web-media',
    endpoint: 'https://1234567890abcdef.r2.cloudflarestorage.com',
    region: 'auto',
    accessKeyId: 'test-access-key',
    secretAccessKey: 'test-secret-key',
    publicBaseUrl: 'https://media.example.com',
  });

  it('debe normalizar claves canónicas, URLs completas y prefijos heredados (/uploads, /media, /<bucket>)', () => {
    expect(driver.normalizeKey('works/123/abc.webp')).toBe('works/123/abc.webp');
    expect(driver.normalizeKey('https://pub-old.r2.dev/works/123/abc.jpg')).toBe(
      'works/123/abc.jpg',
    );
    expect(driver.normalizeKey('/uploads/works/123/abc.png')).toBe('works/123/abc.png');
    expect(driver.normalizeKey('/media/works/123/abc.mp4')).toBe('works/123/abc.mp4');
    expect(driver.normalizeKey('/work-log-web-media/works/123/abc.webp')).toBe(
      'works/123/abc.webp',
    );

    expect(driver.getUrl('https://pub-old.r2.dev/works/123/abc.jpg')).toBe(
      'https://media.example.com/works/123/abc.jpg',
    );
    expect(driver.getUrl('/media/works/123/abc.mp4')).toBe(
      'https://media.example.com/works/123/abc.mp4',
    );
  });

  it('debe generar URLs prefirmadas compatibles con R2 sin parámetros x-amz-checksum-crc32', async () => {
    const { key, uploadUrl } = await driver.createPresignedUploadUrl({
      key: 'works/abc/def.webp',
      mimeType: 'image/webp',
      sizeBytes: 12345,
    });

    expect(key).toBe('works/abc/def.webp');
    const parsed = new URL(uploadUrl);
    expect(parsed.searchParams.has('x-amz-checksum-crc32')).toBe(false);
    expect(parsed.searchParams.has('x-amz-sdk-checksum-algorithm')).toBe(false);
    expect(parsed.searchParams.get('X-Amz-SignedHeaders')).toBe('content-length;content-type;host');
  });
});
