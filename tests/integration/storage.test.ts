import { describe, it, expect } from 'vitest';
import { Buffer } from 'node:buffer';
import { storage } from '../../src/server/infra/storage/index.js';

describe('StorageDriver Lifecycle (Integration)', () => {
  it('debe completar el ciclo de subida y eliminación física de un objeto', async () => {
    const testKey = `tests/healthcheck-${Date.now()}.txt`;
    const payload = Buffer.from('Bitácora de Trabajos - StorageDriver Verification');

    const result = await storage.putObject({
      key: testKey,
      body: payload,
      mimeType: 'text/plain',
      contentLength: payload.length,
    });

    expect(result.key).toBe(testKey);
    expect(result.sizeBytes).toBe(payload.length);
    expect(result.url).toBeTruthy();

    await expect(storage.deleteObject(testKey)).resolves.not.toThrow();
  });
});
