---
title: Functional Requirements
---

# Requisitos Funcionales (Functional Requirements)

Los requisitos funcionales describen las capacidades y comportamientos que el sistema debe implementar. Se estructuran mediante el identificador estándar `RF-[Módulo]-[Número]`.

---

## Módulo 1: Autenticación y Control de Acceso (AUTH)

### RF-AUTH-01: Inicio de Sesión

- **Descripción:** El sistema debe permitir a un usuario administrador ingresar al sistema suministrando un identificador (correo electrónico o nombre de usuario) y una contraseña.
- **Entradas:** Correo/usuario y contraseña.
- **Salida:** Token de sesión/cookie de autenticación válida y redirección a la vista con controles administrativos habilitados.
- **Validaciones:** En caso de credenciales incorrectas, el sistema debe mostrar un mensaje genérico de error sin revelar cuál de los campos falló.

### RF-AUTH-02: Cierre de Sesión

- **Descripción:** El sistema debe permitir al usuario autenticado invalidar su sesión activa en cualquier momento.
- **Salida:** Destrucción de la sesión activa y retorno a la vista de visitante común.

### RF-AUTH-03: Protección de Rutas y Operaciones

- **Descripción:** El sistema debe restringir todas las operaciones de escritura, edición y borrado (endpoints de API y vistas de formulario) a solicitudes que cuenten con una sesión autenticada válida. Cualquier intento no autorizado debe responder con código `401 Unauthorized` o `403 Forbidden`.

---

## Módulo 2: Gestión de Trabajos (WORK)

### RF-WORK-01: Registro de un Nuevo Trabajo

- **Descripción:** El usuario autenticado debe poder registrar un nuevo trabajo con sus datos esenciales.
- **Campos requeridos:**
  - Título del trabajo (texto corto).
  - Estado del trabajo (_Por Realizar_, _En Curso_, _Terminado_).
  - Fecha del trabajo (fecha de referencia para el orden cronológico).
- **Campos opcionales:**
  - Descripción o notas del trabajo (texto enriquecido básico o texto plano).
  - Fecha de culminación estimada o real.
- **Salida:** Trabajo creado y registrado con un identificador único.

### RF-WORK-02: Edición de Información del Trabajo

- **Descripción:** El usuario autenticado debe poder modificar cualquier campo textual, estado o fecha de un trabajo existente.
- **Validaciones:** Se debe registrar la marca de tiempo de la última modificación (`updated_at`).

### RF-WORK-03: Eliminación de un Trabajo

- **Descripción:** El usuario autenticado debe poder eliminar un trabajo de forma permanente.
- **Regla de integridad:** La eliminación de un trabajo debe solicitar una confirmación previa y desencadenar el borrado de todas las fotos y videos asociados tanto en base de datos como en el almacenamiento físico/servidor.

### RF-WORK-04: Transición de Estados

- **Descripción:** El sistema debe permitir actualizar el estado del trabajo entre:
  - `Por Realizar` (planificado/pendiente).
  - `En Curso` (en ejecución activa).
  - `Terminado` (completado/entregado).

---

## Módulo 3: Gestión de Archivos Multimedia (MEDIA)

### RF-MEDIA-01: Carga de Fotografías

- **Descripción:** El usuario autenticado debe poder adjuntar una o múltiples fotografías a un trabajo (ya sea durante la creación o en una edición posterior).
- **Formatos permitidos:** JPG, PNG, WEBP.
- **Validaciones:** El sistema debe validar el formato MIME y restringir el peso máximo por archivo según las cuotas definidas.

### RF-MEDIA-02: Carga de Videos

- **Descripción:** El usuario autenticado debe poder adjuntar videos que evidencien el trabajo realizado.
- **Formatos permitidos:** MP4, WEBM.
- **Validaciones:** Verificación de tamaño máximo y codificación compatible con navegadores web estándar.

### RF-MEDIA-03: Visualización y Reproducción Multimedia

- **Descripción:** Cualquier visitante debe poder visualizar las imágenes en tamaño adaptado/pantalla completa y reproducir los videos de forma nativa con controles estándar (reproducir, pausar, volumen y pantalla completa).

### RF-MEDIA-04: Eliminación Individual de Multimedia

- **Descripción:** El usuario autenticado debe poder eliminar una foto o un video específico de un trabajo sin necesidad de borrar el trabajo completo.

---

## Módulo 4: Exploración, Cronología y Filtros (FEED)

### RF-FEED-01: Listado Cronológico de Trabajos

- **Descripción:** El sistema debe presentar una vista principal tipo catálogo o feed donde los trabajos se listen organizados por fecha (de más reciente a más antiguo por defecto, con opción de invertir el orden).

### RF-FEED-02: Filtrado por Estado

- **Descripción:** El sistema debe ofrecer controles rápidos para filtrar el listado según el estado:
  - Ver todos.
  - Ver solo _En Curso_.
  - Ver solo _Terminados_.
  - Ver solo _Por Realizar_.

### RF-FEED-03: Vista Detallada del Trabajo

- **Descripción:** Al seleccionar un trabajo del listado, el sistema debe presentar una vista individual limpia que contenga:
  - Título, estado visible y fecha.
  - Descripción completa del trabajo.
  - Galería integrada de fotos y reproductor de los videos asociados.
