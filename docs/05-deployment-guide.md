# Manual de Despliegue a Producción y Operaciones (Fase 7)

Este documento detalla el procedimiento estándar para aprovisionar, configurar, desplegar y verificar **WorkLogWeb** en un entorno de producción de alta disponibilidad.

---

## 1. Aprovisionamiento de Infraestructura

### 1.1 Base de Datos PostgreSQL

- **Proveedores Recomendados:** Neon Serverless PostgreSQL, Supabase, o AWS Aurora/RDS PostgreSQL 16+.
- **Requisitos de Conexión:**
  - Habilitar cifrado obligatorio en tránsito mediante SSL (`sslmode=require`).
  - Obtener la URL de conexión transaccional con connection pooling (ej. PgBouncer o Neon pooler).

### 1.2 Almacenamiento de Objetos (Cloudflare R2 / AWS S3)

- **Bucket:** Crear un bucket denominado `work-log-web-production-media`.
- **CORS Configuration:**
  ```json
  [
    {
      "AllowedOrigins": ["https://tu-dominio.com"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3600
    }
  ]
  ```
- **Dominio Público CDN:** Asociar un subdominio (ej. `media.tu-dominio.com`) al bucket en Cloudflare R2 / CloudFront para entrega perimetral con compresión y caching.

---

## 2. Variables de Entorno de Producción

Configurar en el panel de hosting (Render / Railway / Vercel / Cloudflare Pages / AWS ECS):

| Variable                  | Descripción                                | Ejemplo / Valor                                      |
| :------------------------ | :----------------------------------------- | :--------------------------------------------------- |
| `NODE_ENV`                | Entorno de ejecución                       | `production`                                         |
| `PORT`                    | Puerto HTTP del servidor Express           | `3000`                                               |
| `DATABASE_URL`            | Cadena de conexión PostgreSQL con SSL      | `postgresql://user:pass@host/dbname?sslmode=require` |
| `SESSION_SECRET`          | Clave HMAC de al menos 32 caracteres       | Clave criptográfica aleatoria de 64 caracteres       |
| `CLIENT_URL`              | Dominio del frontend para CORS y cookies   | `https://tu-dominio.com`                             |
| `STORAGE_DRIVER`          | Controlador de almacenamiento              | `s3`                                                 |
| `STORAGE_BUCKET`          | Nombre del bucket                          | `work-log-web-production-media`                      |
| `STORAGE_ENDPOINT`        | Endpoint S3 compatible (ej. Cloudflare R2) | `https://<account_id>.r2.cloudflarestorage.com`      |
| `STORAGE_ACCESS_KEY`      | Token de acceso S3                         | `...`                                                |
| `STORAGE_SECRET_KEY`      | Clave secreta S3                           | `...`                                                |
| `STORAGE_PUBLIC_BASE_URL` | URL base pública de entrega CDN            | `https://media.tu-dominio.com`                       |

---

## 3. Despliegue y Migraciones

### 3.1 Ejecutar Migraciones de Base de Datos

En el paso de build o Release Command del host:

```bash
npm run prisma:deploy
```

Este comando aplica todas las migraciones SQL acumuladas sin alterar datos existentes y garantiza la creación de restricciones `CHECK` en PostgreSQL.

### 3.2 Semilla del Administrador Inicial

Para crear el usuario administrador inicial seguro en la BD de producción:

```bash
ADMIN_EMAIL="admin@tu-empresa.com" ADMIN_PASSWORD="TuPasswordUltraSegura2026!" npm run db:seed
```

### 3.3 Construcción del Frontend y Servidor

```bash
npm run build:client
npm run build # o levantar node/tsx src/server/index.ts
```

---

## 4. Configuración de Dominio y Certificados SSL/TLS (RNF-SEC-04)

1. En el proveedor DNS (Cloudflare, Route53, Namecheap):
   - Configurar registro `CNAME` o `A` apuntando al hosting.
   - Forzar redirección permanente `HTTP` a `HTTPS` (301 Moved Permanently).
   - Configurar TLS mínimo versión 1.2 o 1.3 con cifrados modernos (AES-GCM, CHACHA20-POLY1305).
   - Habilitar cabeceras HSTS (`Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`).

---

## 5. Smoke Testing Checklist en Producción

Una vez finalizado el despliegue, ejecutar la siguiente lista de verificación funcional y no funcional:

- [ ] **Acceso HTTPS:** Verificar candado SSL y redirección de `http://` a `https://`.
- [ ] **Feed Público:** Cargar `/` y confirmar tiempo de respuesta $< 250\text{ ms}$ y LCP $\le 2.0\text{ s}$.
- [ ] **Filtros y Orden:** Alternar filtros (_Por Realizar_, _En Curso_, _Terminados_) y orden cronológico.
- [ ] **Inicio de Sesión:** Iniciar sesión en `/login` con el usuario administrador.
- [ ] **Seguridad de Cookies:** Comprobar en DevTools > Application > Cookies que `session_id` tiene los flags `HttpOnly`, `Secure` y `SameSite=Lax`.
- [ ] **Creación de Trabajo:** Crear un nuevo trabajo con fechas y descripción.
- [ ] **Carga Multimedia:** Subir una imagen ($< 10\text{ MB}$) y un video ($< 150\text{ MB}$). Verificar subida exitosa al bucket y streaming progresivo en el reproductor.
- [ ] **Validación de Magic Bytes:** Intentar subir un binario ejecutable renombrado a `.png` y constatar el rechazo automático con `400 Bad Request`.
- [ ] **Eliminación y Purga Física:** Eliminar un recurso y verificar su purga inmediata tanto en base de datos como en el almacenamiento de objetos.
- [ ] **Cierre de Sesión:** Ejecutar logout y comprobar que la cookie queda invalidada.
