---
title: Non-Functional Requirements
---

# Requisitos No Funcionales (Non-Functional Requirements)

Los requisitos no funcionales definen los atributos de calidad, restricciones técnicas y estándares de rendimiento bajo los cuales debe operar el sistema. Se clasifican bajo la nomenclatura `RNF-[Categoría]-[Número]`.

---

## 1. Usabilidad y Diseño (USAB)

### RNF-USAB-01: Estética Minimalista y Reducción Cognitiva

- **Descripción:** La interfaz de usuario debe priorizar el espacio negativo (espacio en blanco), tipografía legible y una paleta de colores neutra (escala de grises con acento puntual).
- **Métrica:** Ninguna pantalla debe contener elementos decorativos no funcionales que compitan con el contenido fotográfico y en video.

### RNF-USAB-02: Diseño Adaptativo (Responsive Web Design)

- **Descripción:** La aplicación debe proporcionar una experiencia visualmente coherente y operativa en pantallas móviles, tablets y monitores de escritorio.
- **Métrica:** El diseño debe adaptarse fluidamente a breakpoints estándar: Mobile (&lt; 640px), Tablet (640px - 1024px) y Desktop (&gt; 1024px) sin desbordamiento horizontal (_horizontal scroll_ no deseado).

### RNF-USAB-03: Retroalimentación de Operaciones

- **Descripción:** Las acciones asíncronas (subida de archivos pesados, guardado o borrado) deben ofrecer indicadores visuales de progreso (barras de porcentaje, skeletons de carga o spinners sutiles).

---

## 2. Rendimiento y Eficiencia (PERF)

### RNF-PERF-01: Optimización de Recursos Multimedia

- **Descripción:** Las imágenes deben servirse en formatos comprimidos y modernos (WebP o AVIF como preferencia), implementando carga diferida (_lazy loading_) nativa para todo el contenido fuera del viewport inicial.
- **Métrica:** La carga inicial del feed principal (LCP - _Largest Contentful Paint_) no debe exceder los 2.0 segundos en conexiones de banda ancha estándar.

### RNF-PERF-02: Streaming de Video Fluido

- **Descripción:** Los videos deben reproducirse progresivamente sin requerir la descarga completa del archivo previo al inicio de la reproducción (_Fast Start / moov atom_ al inicio en contenedores MP4).

### RNF-PERF-03: Tiempo de Respuesta de la API

- **Descripción:** Las operaciones de lectura en endpoints públicos (`GET /api/trabajos`) deben responder en un tiempo inferior a 250 ms bajo condiciones normales de carga.

---

## 3. Seguridad y Protección de Datos (SEC)

### RNF-SEC-01: Gestión Segura de Credenciales

- **Descripción:** Las contraseñas nunca deben almacenarse en texto plano. Se debe aplicar una función de derivación de claves criptográficamente robusta (Argon2id o bcrypt con un factor de trabajo adecuado).

### RNF-SEC-02: Manejo de Sesión y Autenticación

- **Descripción:** Las credenciales de sesión (tokens de acceso o identificadores de sesión) deben transmitirse a través de cookies con los flags `HttpOnly`, `Secure` y `SameSite=Strict/Lax` para mitigar ataques XSS y CSRF.

### RNF-SEC-03: Validación Rigurosa de Carga de Archivos

- **Descripción:** El servidor debe validar el tipo real del archivo inspeccionando los primeros bytes de cabecera (_magic bytes_) y el Content-Type MIME, impidiendo la subida y ejecución de scripts arbitrarios (`.exe`, `.sh`, `.php`, `.js`, etc.).

### RNF-SEC-04: Cifrado en Tránsito

- **Descripción:** Toda la comunicación entre cliente y servidor debe forzarse mediante el protocolo HTTPS con TLS 1.3 o TLS 1.2.

---

## 4. Almacenamiento y Compatibilidad (STOR / COMP)

### RNF-STOR-01: Límites de Tamaño por Archivo

- **Descripción:** Para proteger la estabilidad del servidor y el ancho de banda, se fijan límites estrictos:
  - Fotos: Tamaño máximo de 10 MB por archivo.
  - Videos: Tamaño máximo de 150 MB por archivo.

### RNF-STOR-02: Abstracción de la Capa de Almacenamiento

- **Descripción:** La lógica de subida y borrado de archivos debe residir tras una interfaz o servicio desacoplado, permitiendo cambiar el almacenamiento local a almacenamiento de objetos (Amazon S3, Cloudflare R2, Supabase Storage) sin modificar la capa de negocio.

### RNF-COMP-01: Compatibilidad de Navegadores

- **Descripción:** La aplicación debe funcionar sin degradación funcional en las versiones estables recientes de Google Chrome, Mozilla Firefox, Apple Safari y Microsoft Edge.
