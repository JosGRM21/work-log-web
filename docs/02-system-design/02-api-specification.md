# Especificación de la API REST (API Specification)

## 1. Convenciones Globales

- **URL Base:** `/api/v1`
- **Formato de Intercambio:** `application/json` (excepto endpoints de subida de archivos que usan `multipart/form-data`).
- **Autenticación:** Cookie de sesión segura enviada automáticamente por el navegador en cada solicitud mutativa.
- **Estructura Estándar de Respuesta de Error:**

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Descripción clara del motivo del fallo",
    "details": []
  }
}
```

## 2. Códigos de Estado HTTP Utilizados

<table style="min-width: 50px;">
<colgroup><col style="min-width: 25px;"><col style="min-width: 25px;"></colgroup><tbody><tr><td colspan="1" rowspan="1"><p><strong>Código</strong></p></td><td colspan="1" rowspan="1"><p><strong>Descripción</strong></p></td></tr><tr><td colspan="1" rowspan="1"><p><code>200 OK</code></p></td><td colspan="1" rowspan="1"><p>Operación de lectura o actualización procesada con éxito.</p></td></tr><tr><td colspan="1" rowspan="1"><p><code>201 Created</code></p></td><td colspan="1" rowspan="1"><p>Creación exitosa de un recurso (trabajo o archivo multimedia).</p></td></tr><tr><td colspan="1" rowspan="1"><p><code>204 No Content</code></p></td><td colspan="1" rowspan="1"><p>Eliminación exitosa sin cuerpo de retorno.</p></td></tr><tr><td colspan="1" rowspan="1"><p><code>400 Bad Request</code></p></td><td colspan="1" rowspan="1"><p>Parámetros o cuerpo de petición inválidos o con formato incorrecto.</p></td></tr><tr><td colspan="1" rowspan="1"><p><code>401 Unauthorized</code></p></td><td colspan="1" rowspan="1"><p>La solicitud requiere sesión activa y no se suministraron credenciales válidas.</p></td></tr><tr><td colspan="1" rowspan="1"><p><code>403 Forbidden</code></p></td><td colspan="1" rowspan="1"><p>Credenciales reconocidas pero sin permisos para el recurso solicitado.</p></td></tr><tr><td colspan="1" rowspan="1"><p><code>404 Not Found</code></p></td><td colspan="1" rowspan="1"><p>El recurso solicitado no existe.</p></td></tr><tr><td colspan="1" rowspan="1"><p><code>413 Payload Too Large</code></p></td><td colspan="1" rowspan="1"><p>El archivo subido excede el límite permitido (10 MB fotos, 150 MB videos).</p></td></tr><tr><td colspan="1" rowspan="1"><p><code>500 Internal Server Error</code></p></td><td colspan="1" rowspan="1"><p>Error no controlado en el servidor.</p></td></tr></tbody>
</table>

## 3. Endpoints del Módulo de Autenticación (`/auth`)

### 3.1. Iniciar Sesión

- **Ruta:** `POST /auth/login`
- **Acceso:** Público
- **Cuerpo de la Petición:**

```json
{
  "identifier": "admin@empresa.com",
  "password": "PasswordSegura123!"
}
```

- **Respuesta Exitosa (`200 OK`):**
  - _Cabeceras:_ `Set-Cookie: session_id=...; HttpOnly; Secure; SameSite=Lax; Path=/`

```json
{
  "message": "Sesión iniciada con éxito",
  "user": {
    "id": "usr_9a8b7c6d",
    "name": "Administrador",
    "email": "admin@empresa.com"
  }
}
```

### 3.2. Cerrar Sesión

- **Ruta:** `POST /auth/logout`
- **Acceso:** Protegido (Sesión activa)
- **Respuesta Exitosa (`200 OK`):**
  - _Cabeceras:_ `Set-Cookie: session_id=; HttpOnly; Max-Age=0; Path=/`

```json
{
  "message": "Sesión cerrada correctamente"
}
```

### 3.3. Verificar Estado de Sesión Actual

- **Ruta:** `GET /auth/me`
- **Acceso:** Público (Retorna el estado de autenticación del cliente actual)
- **Respuesta Exitosa (`200 OK`):**

```json
{
  "authenticated": true,
  "user": {
    "id": "usr_9a8b7c6d",
    "name": "Administrador",
    "email": "admin@empresa.com"
  }
}
```

## 4. Endpoints del Módulo de Trabajos (`/works`)

### 4.1. Listar Trabajos (Catálogo / Feed)

- **Ruta:** `GET /works`
- **Acceso:** Público
- **Parámetros de Consulta (Query Params):**
  - `status` _(opcional)_: Filtrar por `pending` (Por Realizar), `in_progress` (En Curso), `completed` (Terminado).
  - `order` _(opcional, defecto_ `desc`_)_: `desc` (más reciente primero) o `asc` (más antiguo primero).
  - `limit` _(opcional, defecto_ `20`_)_: Cantidad de registros por página.
  - `offset` _(opcional, defecto_ `0`_)_: Desplazamiento para paginación.
- **Respuesta Exitosa (`200 OK`):**

```json
{
  "data": [
    {
      "id": "wrk_101",
      "title": "Restauración de Mueble Clásico",
      "status": "completed",
      "reference_date": "2026-09-15",
      "media_preview": {
        "url": "/media/uploads/mueble-final.webp",
        "type": "image"
      },
      "media_count": {
        "images": 6,
        "videos": 1
      },
      "created_at": "2026-09-10T14:30:00Z"
    }
  ],
  "meta": {
    "total": 45,
    "limit": 20,
    "offset": 0
  }
}
```

### 4.2. Obtener Detalle de un Trabajo

- **Ruta:** `GET /works/:id`
- **Acceso:** Público
- **Respuesta Exitosa (`200 OK`):**

```json
{
  "id": "wrk_101",
  "title": "Restauración de Mueble Clásico",
  "description": "Limpieza, lijado y aplicación de barniz natural en madera de roble.",
  "status": "completed",
  "reference_date": "2026-09-15",
  "start_date": "2026-09-10",
  "end_date": "2026-09-15",
  "created_at": "2026-09-10T14:30:00Z",
  "updated_at": "2026-09-16T10:00:00Z",
  "media": [
    {
      "id": "med_501",
      "url": "/media/uploads/mueble-antes.webp",
      "type": "image",
      "size_bytes": 1450230,
      "sort_order": 0,
      "created_at": "2026-09-10T15:00:00Z"
    },
    {
      "id": "med_502",
      "url": "/media/uploads/proceso-lijado.mp4",
      "type": "video",
      "size_bytes": 45600120,
      "sort_order": 1,
      "created_at": "2026-09-12T11:20:00Z"
    }
  ]
}
```

### 4.3. Crear un Trabajo

- **Ruta:** `POST /works`
- **Acceso:** Protegido
- **Cuerpo de la Petición:**

```json
{
  "title": "Fabricación de Estantería Industrial",
  "description": "Estructura en tubo rectangular de acero con repisas en madera.",
  "status": "in_progress",
  "reference_date": "2026-10-01",
  "start_date": "2026-10-01",
  "end_date": null
}
```

- **Respuesta Exitosa (`201 Created`):**

```json
{
  "id": "wrk_102",
  "title": "Fabricación de Estantería Industrial",
  "status": "in_progress",
  "reference_date": "2026-10-01",
  "created_at": "2026-10-01T09:00:00Z"
}
```

### 4.4. Actualizar un Trabajo

- **Ruta:** `PATCH /works/:id`
- **Acceso:** Protegido
- **Cuerpo de la Petición (Campos parciales a modificar):**

```json
{
  "status": "completed",
  "end_date": "2026-10-08"
}
```

- **Respuesta Exitosa (`200 OK`):**

```json
{
  "id": "wrk_102",
  "title": "Fabricación de Estantería Industrial",
  "status": "completed",
  "updated_at": "2026-10-08T18:00:00Z"
}
```

### 4.5. Eliminar un Trabajo

- **Ruta:** `DELETE /works/:id`
- **Acceso:** Protegido
- **Respuesta Exitosa:** `204 No Content` (Sin cuerpo).

## 5. Endpoints del Módulo de Archivos Multimedia (`/media`)

### 5.1. Subir Archivos a un Trabajo

- **Ruta:** `POST /works/:id/media`
- **Acceso:** Protegido
- **Cabecera Requerida:** `Content-Type: multipart/form-data`
- **Cuerpo de la Petición:**
  - `files`: Uno o varios archivos binarios (`.jpg`, `.png`, `.webp`, `.mp4`, `.webm`).
- **Respuesta Exitosa (`201 Created`):**

```json
{
  "uploaded": [
    {
      "id": "med_503",
      "work_id": "wrk_102",
      "url": "/media/uploads/soldadura-detalle.webp",
      "type": "image",
      "size_bytes": 2104500,
      "sort_order": 0
    }
  ]
}
```

### 5.2. Eliminar un Archivo Multimedia Individual

- **Ruta:** `DELETE /media/:id`
- **Acceso:** Protegido
- **Respuesta Exitosa:** `204 No Content`
