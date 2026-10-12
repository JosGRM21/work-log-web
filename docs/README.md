# Bitácora de Trabajos – Documentación del Sistema

Plataforma web minimalista y moderna para el registro, seguimiento y documentación visual (fotografías y videos) de proyectos o tareas en cualquier disciplina. El sistema permite catalogar trabajos en tres estados (_Por Realizar_, _En Curso_, _Terminado_), organizados cronológicamente y respaldados por evidencia multimedia, con acceso público de consulta y gestión protegida mediante autenticación.

## 1. Mapa de la Documentación

```text
docs/
├── README.md                           <- Índice general y guía de navegación
├── 01-analysis/                        <- Ingeniería de Requisitos
│   ├── 01-vision-and-scope.md          <- Objetivos, actores, límites del MVP y supuestos
│   ├── 02-functional-requirements.md   <- Requisitos funcionales (Auth, Work, Media, Feed)
│   ├── 03-non-functional-requirements.md <- Rendimiento, seguridad, diseño y almacenamiento
│   └── business-rules.md               <- Lógica de negocio, estados y restricciones
├── 02-system-design/                   <- Diseño Técnico y de Datos
│   ├── 01-architecture.md              <- Capas del sistema, flujos Mermaid y almacenamiento
│   ├── 02-api-specification.md         <- Contratos de endpoints REST y códigos HTTP
│   ├── 03-data-model.md                <- Diagrama ER, diccionario de datos y DDL SQL
│   └── 04-tech-stack.md                <- Pila tecnológica e infraestructura seleccionada
├── 03-ui-ux-design/                    <- Diseño de Experiencia e Interfaz
│   ├── 01-minimalist-style-guide.md    <- Tokens visuales, tipografía, paleta y componentes
│   └── 02-views-and-navigation.md      <- Flujo de navegación y wireframes esquemáticos
└── 04-implementation-plan/             <- Planificación y Ejecución
    └── implementation-plan.md          <- Plan detallado por fases, DoD, riesgos y trazabilidad
```

## 2. Índice Detallado por Módulos

### 01-analysis/ (Análisis y Requisitos)

| Documento                               | Enfoque Principal                                                                                                                                                    | Estado       |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **`01-vision-and-scope.md`**            | Define el problema de dispersión de registros, objetivos del producto, delimitación del MVP (_In-Scope_ vs. _Out-of-Scope_) y roles (_Visitante_ y _Administrador_). | `Completado` |
| **`02-functional-requirements.md`**     | Especificación formal de los módulos: autenticación (`RF-AUTH`), gestión de trabajos (`RF-WORK`), multimedia (`RF-MEDIA`) y exploración/filtros (`RF-FEED`).         | `Completado` |
| **`03-non-functional-requirements.md`** | Atributos de calidad: rendimiento de streaming y lazy loading, política de cookies `HttpOnly`, validación de _magic bytes_ y cuotas de archivos.                     | `Completado` |
| **`business-rules.md`**                 | Reglas de dominio: ciclo de vida de tres estados, validación temporal ($\text{fecha\_fin} \ge \text{fecha\_inicio}$), límites de medios y borrado en cascada.        | `Completado` |

### 02-system-design/ (Diseño de Sistema y Datos)

| Documento                     | Enfoque Principal                                                                                                                                                      | Estado       |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **`01-architecture.md`**      | Arquitectura cliente-servidor monolítica desacoplada, pipeline de subida de medios en streaming, purga física de archivos y diagramas de secuencia Mermaid.            | `Completado` |
| **`02-api-specification.md`** | Contratos REST para endpoints `/auth`, `/works` y `/media`, estructuras de payload JSON, multipart form data y códigos de error normalizados.                          | `Completado` |
| **`03-data-model.md`**        | Esquema relacional en 3FN, claves foráneas con `CASCADE`, restricciones a nivel de motor (Check constraints), índices optimizados y script DDL en SQL ANSI/PostgreSQL. | `Completado` |
| **`04-tech-stack.md`**        | Selección de tecnologías, entorno de ejecución, ORM, almacenamiento de objetos y plataforma de despliegue.                                                             | `Completado` |

### 03-ui-ux-design/ (Diseño UI/UX)

| Documento                          | Enfoque Principal                                                                                                                                                      | Estado       |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **`01-minimalist-style-guide.md`** | Principios de diseño ("el contenido es la interfaz"), escala monocromática neutra, badges de estado desaturados, sistema de espaciado modular y tipografía sans-serif. | `Completado` |
| **`02-views-and-navigation.md`**   | Diagrama de flujo público vs. privado, mapa de rutas y wireframes en texto para el feed principal, vista de detalle, modal de login y formulario de edición.           | `Completado` |

### 04-implementation-plan/ (Plan de Implementación)

| Documento                    | Enfoque Principal                                                                                                                                      | Estado       |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| **`implementation-plan.md`** | Hoja de ruta técnica de 8 etapas (Fases 0 a 7), definición de terminado (DoD), matriz de trazabilidad con requisitos y mitigación de riesgos técnicos. | `Completado` |
