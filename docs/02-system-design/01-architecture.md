# Arquitectura del Sistema (System Architecture)

## 1. Visión General de la Arquitectura

El sistema sigue una arquitectura cliente-servidor desacoplada basada en servicios ligeros. Prioriza la simplicidad operativa, la baja latencia de entrega de activos y el mantenimiento mínimo, separando el consumo de datos de la persistencia de archivos binarios pesados.

```mermaid
graph TD
    subgraph Clientes ["Capa de Presentación (Clientes)"]
        UA[Visitante / Navegador Web]
        ADM[Administrador Autenticado]
    end

    subgraph Servidor ["Capa de Aplicación (Backend API)"]
        API[Servidor HTTP / REST API]
        AUTH[Middleware de Autenticación & CORS]
        VAL[Validador de Entrada & Magic Bytes]
    end

    subgraph Persistencia ["Capa de Persistencia & Almacenamiento"]
        DB[(Base de Datos Relacional)]
        STORE[Almacenamiento de Objetos / File System]
    end

    UA -->|GET consultas públicas| API
    ADM -->|POST/PUT/DELETE con Cookie de Sesión| AUTH
    AUTH --> VAL
    VAL --> API
    API -->|Metadatos, Relaciones, Estados| DB
    API -->|Carga / Borrado de Fotos y Videos| STORE
    STORE -.->|Streaming directo / CDN| UA
```

## 2. Capas del Sistema

### 2.1. Capa de Presentación (Frontend)

- **Rol:** Renderizado de la interfaz minimalista, gestión de navegación y estados de la UI.
- **Responsabilidades:**
  - Consumo asíncrono de los endpoints REST de la API.
  - Gestión de vistas públicas (Feed cronológico, detalle de trabajo con visor multimedia).
  - Gestión de vistas protegidas (Panel administrativo, modales de confirmación de borrado, carga de archivos mediante _drag-and-drop_).
  - Optimización en cliente: compresión preliminar de imágenes opcional antes del envío, reproductores de video ligeros con carga bajo demanda (_lazy loading_).

### 2.2. Capa de Aplicación y Lógica de Negocio (Backend API)

- **Rol:** Procesamiento de solicitudes, validación de reglas de negocio y control de acceso.
- **Componentes principales:**
  - **Módulo de Autenticación:** Verificación de credenciales con hash criptográfico y emisión de cookies de sesión seguras (`HttpOnly`, `SameSite`, `Secure`).
  - **Módulo de Trabajos:** Validación de esquemas, transiciones de estado (_Por Realizar_, _En Curso_, _Terminado_) y gestión de fechas.
  - **Módulo de Multimedia:** Inspección de cabeceras MIME (_magic bytes_), aplicación de límites de tamaño y derivación de archivos al servicio de almacenamiento.

### 2.3. Capa de Datos (Base de Datos Relacional)

- **Rol:** Almacenamiento exclusivo de datos estructurados e índices de búsqueda.
- **Contenido:** Tablas de usuarios, trabajos y metadatos de recursos multimedia (URLs, tipos MIME, pesos en bytes, orden y llaves foráneas).

### 2.4. Capa de Almacenamiento de Archivos (Object Storage / Media Store)

- **Rol:** Persistencia física de binarios (fotografías y videos).
- **Estrategia:** La base de datos nunca almacena archivos binarios directos (BLOBs); únicamente almacena rutas o identificadores únicos gestionados por esta capa (almacenamiento local aislado o buckets tipo S3 / Cloudflare R2).

## 3. Flujo de Trabajo: Subida y Gestión de Archivos

Para evitar saturar la memoria del servidor durante la carga de videos, la subida se procesa mediante transmisión por flujo (_streaming_) hacia el almacenamiento:

Fragmento de código

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Administrador
    participant Web as Frontend
    participant API as Backend API
    participant Store as Media Storage
    participant DB as Base de Datos

    Admin->>Web: Selecciona fotos/videos y envía formulario
    Web->>API: POST /api/v1/works/:id/media (Multipart Form Data + Cookie)
    API->>API: Valida sesión, tamaño y Magic Bytes
    API->>Store: Transmite binario (Genera clave única de archivo)
    Store-->>API: Confirmación y URL pública / path
    API->>DB: INSERT en tabla media_assets (work_id, url, tipo, tamaño)
    DB-->>API: Confirmación de registro
    API-->>Web: 201 Created (Lista de recursos asociados)
    Web-->>Admin: Actualiza galería visualmente
```

## 4. Estrategia de Borrado en Cascada Físico

Cuando se elimina un trabajo o un recurso específico, la aplicación garantiza que no queden archivos huérfanos:

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Administrador
    participant API as Backend API
    participant DB as Base de Datos
    participant Store as Media Storage

    Admin->>API: DELETE /api/v1/works/:id
    API->>API: Valida permisos de sesión
    API->>DB: Inicia Transacción: Obtiene URLs y borra registros
    DB-->>API: Registros eliminados exitosamente
    API->>Store: Elimina archivos físicos correspondientes
    Store-->>API: Archivos purgados
    API-->>Admin: 204 No Content
```

## 5. Decisiones Técnicas y Directrices de Despliegue

<table style="min-width: 75px;">
<colgroup><col style="min-width: 25px;"><col style="min-width: 25px;"><col style="min-width: 25px;"></colgroup><tbody><tr><td colspan="1" rowspan="1"><p><strong>Componente</strong></p></td><td colspan="1" rowspan="1"><p><strong>Opción Recomendada</strong></p></td><td colspan="1" rowspan="1"><p><strong>Justificación</strong></p></td></tr><tr><td colspan="1" rowspan="1"><p><strong>Arquitectura de API</strong></p></td><td colspan="1" rowspan="1"><p>Monolito modular REST</p></td><td colspan="1" rowspan="1"><p>Elimina la sobrecarga de microservicios para un proyecto de alcance acotado.</p></td></tr><tr><td colspan="1" rowspan="1"><p><strong>Motor de Base de Datos</strong></p></td><td colspan="1" rowspan="1"><p>PostgreSQL o SQLite</p></td><td colspan="1" rowspan="1"><p>ACID completo, integridad referencial estricta y bajo consumo de memoria.</p></td></tr><tr><td colspan="1" rowspan="1"><p><strong>Almacenamiento de Medios</strong></p></td><td colspan="1" rowspan="1"><p>Local Disk / S3 API</p></td><td colspan="1" rowspan="1"><p>Abstracción por adaptador para migrar entre disco local y buckets sin cambiar código.</p></td></tr><tr><td colspan="1" rowspan="1"><p><strong>Sesiones</strong></p></td><td colspan="1" rowspan="1"><p>Cookies HttpOnly firmadas</p></td><td colspan="1" rowspan="1"><p>Máxima mitigación frente a ataques XSS sin complejidad de refresco de tokens JWT.</p></td></tr></tbody>
</table>
