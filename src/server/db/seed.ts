import 'dotenv/config';
import { prisma } from './client.js';
import { hashPassword } from '../utils/password.js';

async function main(): Promise<void> {
  const isProduction = process.env.NODE_ENV === 'production';
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@empresa.com').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || (isProduction ? '' : 'PasswordSegura123!');
  const adminFullName = (process.env.ADMIN_FULL_NAME || 'Administrador Principal').trim();

  if (isProduction && (!process.env.ADMIN_EMAIL || !adminPassword || adminPassword.length < 12)) {
    throw new Error(
      'En producción es obligatorio definir ADMIN_EMAIL y ADMIN_PASSWORD (mínimo 12 caracteres).',
    );
  }

  const passwordHash = await hashPassword(adminPassword);

  if (isProduction) {
    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        fullName: adminFullName,
      },
      create: {
        email: adminEmail,
        passwordHash,
        fullName: adminFullName,
      },
    });
    console.log(`Administrador de producción asegurado: ${admin.email} (${admin.id})`);
    return;
  }

  console.log('Iniciando poblamiento de base de datos de desarrollo/pruebas (db:seed)...');

  await prisma.mediaAsset.deleteMany();
  await prisma.workItem.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash,
      fullName: adminFullName,
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
        filePath: 'porton-estructura.webp',
        mediaType: 'image',
        mimeType: 'image/webp',
        fileSizeBytes: 2450000n,
        sortOrder: 0,
      },
      {
        workItemId: work2.id,
        filePath: 'porton-soldadura-avance.mp4',
        mediaType: 'video',
        mimeType: 'video/mp4',
        fileSizeBytes: 42100000n,
        sortOrder: 1,
      },
      {
        workItemId: work3.id,
        filePath: 'mesa-resultado-final.webp',
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
