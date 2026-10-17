import { prisma } from '../db/client.js';
import { storage } from '../storage/index.js';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export async function purgeOrphanFiles(): Promise<{
  scanned: number;
  purged: number;
  purgedKeys: string[];
}> {
  console.log('[purge-orphans] Iniciando conciliación de archivos físicos huérfanos...');

  const registeredKeys = new Set<string>();
  let cursor: string | undefined = undefined;
  const BATCH_SIZE = 1000;

  while (true) {
    const dbAssets: Array<{ id: string; filePath: string; mediaType: string }> =
      await prisma.mediaAsset.findMany({
        take: BATCH_SIZE,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { id: 'asc' },
        select: {
          id: true,
          filePath: true,
          mediaType: true,
        },
      });

    if (dbAssets.length === 0) {
      break;
    }

    for (const asset of dbAssets) {
      const canonicalKey = storage.normalizeKey(asset.filePath);
      registeredKeys.add(canonicalKey);

      if (asset.mediaType === 'image') {
        const thumbKey = canonicalKey.replace(/\.[^.]+$/, '-thumb.webp');
        registeredKeys.add(thumbKey);
      }
    }

    if (dbAssets.length < BATCH_SIZE) {
      break;
    }

    cursor = dbAssets[dbAssets.length - 1].id;
  }

  console.log(`[purge-orphans] Claves registradas en PostgreSQL: ${registeredKeys.size}`);

  const physicalObjects = await storage.listObjects('works/');
  console.log(`[purge-orphans] Archivos encontrados en almacenamiento: ${physicalObjects.length}`);

  const now = Date.now();
  const purgedKeys: string[] = [];

  const orphanCandidates = physicalObjects.filter((obj) => {
    const canonicalKey = storage.normalizeKey(obj.key);
    if (!registeredKeys.has(canonicalKey)) {
      const ageMs = obj.lastModified ? now - obj.lastModified.getTime() : Infinity;
      return ageMs > TWO_HOURS_MS;
    }
    return false;
  });

  const BATCH_DELETE_CONCURRENCY = 10;
  for (let i = 0; i < orphanCandidates.length; i += BATCH_DELETE_CONCURRENCY) {
    const batch = orphanCandidates.slice(i, i + BATCH_DELETE_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (obj) => {
        const canonicalKey = storage.normalizeKey(obj.key);
        await storage.deleteObject(obj.key);
        return canonicalKey;
      }),
    );

    for (const res of results) {
      if (res.status === 'fulfilled') {
        purgedKeys.push(res.value);
        console.log(`[purge-orphans] Purgado archivo huérfano: ${res.value}`);
      } else {
        console.error(`[purge-orphans] Error al purgar archivo huérfano:`, res.reason);
      }
    }
  }

  console.log(
    `[purge-orphans] Conciliación completada. Archivos purgados: ${purgedKeys.length}/${physicalObjects.length}`,
  );

  return {
    scanned: physicalObjects.length,
    purged: purgedKeys.length,
    purgedKeys,
  };
}

// Ejecución directa si se invoca como script CLI
const isDirectExecution =
  process.argv[1] &&
  (process.argv[1].endsWith('purge-orphans.ts') || process.argv[1].endsWith('purge-orphans.js'));

if (isDirectExecution) {
  purgeOrphanFiles()
    .then(async () => {
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[purge-orphans] Error fatal en conciliación:', err);
      await prisma.$disconnect();
      process.exit(1);
    });
}
