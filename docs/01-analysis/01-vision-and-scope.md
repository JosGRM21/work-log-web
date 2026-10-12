---
title: Vision and Scope
---

# Visión y Alcance (Vision and Scope)

## 1. Declaración del Problema

Actualmente, el registro visual y cronológico de proyectos o actividades (sin importar su ámbito: construcción, arte, mantenimiento, desarrollo técnico, etc.) suele dispersarse en chats, carpetas locales o redes sociales que imponen algoritmos, saturación visual y formatos rígidos. Se requiere una plataforma web limpia, neutral y centralizada que funcione como una bitácora digital, permitiendo documentar la evolución de cualquier trabajo mediante evidencias fotográficas y audiovisuales sin distracciones ni complejidad técnica innecesaria.

## 2. Visión del Producto

Proveer una aplicación web minimalista y moderna donde el usuario pueda consultar y gestionar el ciclo de vida de diversos trabajos (planificados, en ejecución o concluidos), organizados cronológicamente y respaldados por material multimedia de alta calidad, garantizando una experiencia de usuario rápida, fluida y sin sobrecarga cognitiva.

## 3. Objetivos del Sistema

- **Centralización simple:** Ofrecer un único punto de entrada para catalogar cualquier tipo de trabajo de forma agnóstica a la disciplina.
- **Trazabilidad visual y temporal:** Presentar el historial de cada trabajo mediante fotos, videos y marcas de tiempo ordenadas cronológicamente.
- **Acceso controlado:** Permitir la lectura pública o abierta del catálogo, restringiendo la creación, edición y eliminación exclusivamente a usuarios autorizados mediante credenciales seguras.
- **Eficiencia y ligereza:** Mantener una arquitectura ágil que priorice tiempos de carga inmediatos, bajo consumo de recursos y una interfaz despojada de elementos superfluos.

## 4. Actores del Sistema

- **Visitante (Lector no autenticado):**
  - Explora el catálogo general de trabajos.
  - Filtra por estado de avance (_Por Realizar_, _En Curso_, _Terminado_).
  - Ordena la vista por fechas.
  - Accede a la vista de detalle de cada trabajo para ver fotos y reproducir videos.
- **Administrador (Usuario autenticado):**
  - Posee todos los privilegios del Visitante.
  - Inicia y cierra sesión de manera segura.
  - Crea, edita y elimina registros de trabajos.
  - Sube y elimina archivos multimedia asociados a cada trabajo.
  - Modifica los estados de avance y las fechas de los proyectos.

## 5. Alcance del Proyecto (Scope)

### 5.1. Dentro del Alcance (In-Scope - MVP)

- Módulo de autenticación simple y seguro (login mediante correo/usuario y contraseña con persistencia de sesión).
- Gestión CRUD completa de trabajos (título, descripción general, fechas y estado).
- Carga, previsualización y eliminación de fotografías (formatos comunes: JPG, PNG, WebP).
- Carga, streaming y eliminación de videos cortos/medios (formato MP4/WebM).
- Organización y ordenamiento cronológico automático según la fecha del trabajo.
- Filtrado dinámico por estado de ejecución (_Por Realizar_, _En Curso_, _Terminado_).
- Diseño web responsive adaptado a pantallas móviles y de escritorio bajo estética minimalista.

### 5.2. Fuera del Alcance (Out-of-Scope)

- Registro público abierto de nuevos administradores (el alta de usuarios autorizados se gestiona de forma controlada/administrativa).
- Editor de video o herramientas avanzadas de retoque fotográfico dentro de la web.
- Comentarios públicos, reacciones o sistemas de interacción social tipo red social.
- Pasarelas de pago o cobros asociados a los trabajos.
- Sistema de mensajería o chat interno.

## 6. Supuestos y Dependencias

- Se dispondrá de un servicio de almacenamiento (local en servidor o almacenamiento de objetos tipo S3/Cloud Storage) con capacidad suficiente para hospedar los archivos multimedia.
- Los usuarios administradores contarán con una conexión a internet estable para la subida de archivos de video.
- La aplicación se desplegará en un entorno que soporte HTTPS para proteger la transmisión de credenciales y tokens de sesión.
