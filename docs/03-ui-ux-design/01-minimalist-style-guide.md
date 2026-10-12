# Guía de Estilos Minimalista (Minimalist Style Guide)

## 1. Filosofía de Diseño

El diseño se rige bajo la premisa **"el contenido es la interfaz"**. Al tratarse de una bitácora de documentación técnica y visual, la interfaz debe operar como un lienzo neutral donde las fotografías y los videos sean los protagonistas absolutos. Se eliminan sombras pesadas, gradientes saturados, bordes excesivos y animaciones decorativas superfluas.

### Principios Fundamentales

1. **Espacio negativo intencional:** Márgenes y paddings generosos para reducir la carga cognitiva y dar respiración al contenido.
2. **Jerarquía tipográfica estricta:** La diferenciación de elementos se logra mediante el tamaño, el grosor y el contraste tipográfico, no con decoraciones gráficas.
3. **Contraste funcional:** Elementos interactivos evidentes por contexto y contraste, no por sobrecarga de color.

---

## 2. Paleta de Colores (Design Tokens)

Se emplea una escala monocromática de alta legibilidad combinada con acentos semánticos tenues para los tres estados del ciclo de vida de los trabajos.

### 2.1. Escala Neutral (Monocromo)

| Token                    | Valor Hex | Uso Principal                                            |
| :----------------------- | :-------- | :------------------------------------------------------- |
| `--color-bg-canvas`      | `#FAFAFA` | Fondo general de la aplicación (blanco cálido/neutro).   |
| `--color-bg-surface`     | `#FFFFFF` | Fondo de tarjetas, modales y barras de navegación.       |
| `--color-border-subtle`  | `#E5E7EB` | Líneas divisorias, bordes de tarjetas e inputs.          |
| `--color-text-primary`   | `#111827` | Títulos, encabezados y texto principal (alto contraste). |
| `--color-text-secondary` | `#6B7280` | Fechas, etiquetas, metadatos y subtítulos.               |
| `--color-text-muted`     | `#9CA3AF` | Placeholders y texto de ayuda secundario.                |

### 2.2. Acentos Semánticos (Estados de Trabajo)

Los estados se representan con tonos discretos y fondos desaturados para evitar distracciones visuales:

| Estado           | Token Color         | Color Fondo Badge             | Color Texto Badge |
| :--------------- | :------------------ | :---------------------------- | :---------------- |
| **Por Realizar** | `--state-pending`   | `#F3F4F6` (Gris tenue)        | `#374151`         |
| **En Curso**     | `--state-progress`  | `#EFF6FF` (Azul hielo)        | `#1D4ED8`         |
| **Terminado**    | `--state-completed` | `#ECFDF5` (Verde menta tenue) | `#047857`         |

### 2.3. Acciones Primarias y Peligro

- **Acción Principal (Botón Primario):** `#111827` (Negro neutro / gris muy oscuro) con texto `#FFFFFF`. Al hover: `#374151`.
- **Acción Destructiva (Eliminar):** `#DC2626` (Rojo discreto).

---

## 3. Sistema Tipográfico

- **Fuente Primaria:** Pila de fuentes sans-serif de sistema moderna o geométrica limpia:
  `font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;`
- **Escala de Tamaños:**

| Nivel                   | Tamaño (px / rem)    | Peso (Weight)     | Altura de Línea (Leading) |
| :---------------------- | :------------------- | :---------------- | :------------------------ |
| **Display / H1**        | `32px` / `2.0rem`    | `600` (Semi-bold) | `1.2`                     |
| **Título Trabajo / H2** | `24px` / `1.5rem`    | `600` (Semi-bold) | `1.3`                     |
| **Subtítulo / H3**      | `18px` / `1.125rem`  | `500` (Medium)    | `1.4`                     |
| **Cuerpo (Body)**       | `15px` / `0.9375rem` | `400` (Regular)   | `1.6`                     |
| **Metadatos / Caption** | `13px` / `0.8125rem` | `400` / `500`     | `1.4`                     |

---

## 4. Rejilla y Espaciado (Layout System)

- **Unidad Base:** Sistema de retícula basado en múltiplos de 8px (`4px`, `8px`, `16px`, `24px`, `32px`, `48px`, `64px`).
- **Ancho Máximo de Contenedor:**
  - Vista general / Feed: `max-w-6xl` (~1152px).
  - Vista de detalle de trabajo: `max-w-4xl` (~896px) para optimizar la longitud de línea de lectura.
  - Modales / Diálogos: `max-w-lg` (~512px).

---

## 5. Componentes de Interfaz

### 5.1. Tarjetas de Trabajo (Feed Cards)

- Borde fino continuo de 1px (`#E5E7EB`). Sin sombras por defecto.
- Radio de curvatura sutil: `rounded-lg` (8px).
- Área multimedia superior con relación de aspecto fija (`aspect-video` 16:9 o `aspect-[4/3]`) con objeto recortado `object-cover`.
- Transición de elevación al interactuar: elevación de borde sutil (`border-color: #9CA3AF`) sin saltos de tamaño.

### 5.2. Badges de Estado

- Estilo píldora (`rounded-full`), tamaño compacto (`py-1 px-3`, texto `text-xs font-medium`).
- Sin bordes duros; solo fondo tenue y texto de color contrastante.

### 5.3. Botones y Controles

- **Botón Primario:** Fondo `#111827`, texto `#FFFFFF`, esquinas ligeramente redondeadas (`rounded-md`), sin relieve.
- **Botón Secundario / Outline:** Fondo transparente, borde 1px `#E5E7EB`, texto `#374151`.
- **Botón Fantasma (Iconos de acción):** Fondo transparente, cambia a gris sutil al pasar el cursor.

### 5.4. Visor Multimedia (Galería y Video)

- Galería tipo cuadrícula adaptativa (2 columnas en móvil, 3 columnas en escritorio).
- Los videos deben contar con controles nativos limpios, con poster/miniatura predefinida y sin autoplay sonoro.
