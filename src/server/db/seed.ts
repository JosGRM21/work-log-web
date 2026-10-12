import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from './client.js';

async function main(): Promise<void> {
  console.log('Iniciando poblamiento de base de datos (db:seed)...');

  await prisma.mediaAsset.deleteMany();
  await prisma.workItem.deleteMany();
  await prisma.user.deleteMany();

  const saltRounds = 12;
  const passwordHash = await bcrypt.hash('PasswordSegura123!', saltRounds);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@empresa.com',
      passwordHash,
      fullName: 'Administrador Principal',
    },
  });

  console.log(`Usuario administrador creado: ${admin.email} (${admin.id})`);

  await prisma.workItem.create({
    data: {
      userId: admin.id,
      title: 'Mantenimiento Preventivo de Bomba de Agua',
      description:
        'Revisión periódica de rodamientos, sellos mecánicos y prueba de presión en línea de impulsión.',
      status: 'pending',
      referenceDate: new Date('2026-10-15T00:00:00Z'),
    },
  });

  const work2 = await prisma.workItem.create({
    data: {
      userId: admin.id,
      title: 'Fabricación de Portón Corredizo en Acero',
      description:
        'Corte y ensamblaje de tubos estructurales 80x40mm. Fase actual: soldadura de escuadras y riel guía.',
      status: 'in_progress',
      referenceDate: new Date('2026-10-10T00:00:00Z'),
      startDate: new Date('2026-10-05T00:00:00Z'),
    },
  });

  const work3 = await prisma.workItem.create({
    data: {
      userId: admin.id,
      title: 'Restauración de Mesa de Roble Clásica',
      description:
        'Lijado profundo, tratamiento contra polilla y triple capa de acabado en poliuretano satinado.',
      status: 'completed',
      referenceDate: new Date('2026-09-28T00:00:00Z'),
      startDate: new Date('2026-09-10T00:00:00Z'),
      endDate: new Date('2026-09-28T00:00:00Z'),
    },
  });

  await prisma.mediaAsset.createMany({
    data: [
      {
        workItemId: work2.id,
        filePath: '/uploads/porton-estructura.webp',
        mediaType: 'image',
        mimeType: 'image/webp',
        fileSizeBytes: 2450000n,
        sortOrder: 0,
      },
      {
        workItemId: work2.id,
        filePath: '/uploads/porton-soldadura-avance.mp4',
        mediaType: 'video',
        mimeType: 'video/mp4',
        fileSizeBytes: 42100000n,
        sortOrder: 1,
      },
      {
        workItemId: work3.id,
        filePath: '/uploads/mesa-resultado-final.webp',
        mediaType: 'image',
        mimeType: 'image/webp',
        fileSizeBytes: 3100000n,
        sortOrder: 0,
      },
    ],
  });

  console.log('Semillero ejecutado exitosamente con 3 trabajos y 3 recursos multimedia.');
}

main()
  .catch((error) => {
    console.error('Error durante la ejecución del seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
