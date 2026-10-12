---
title: Business Rules
---

# Reglas de Negocio (Business Rules)

Las reglas de negocio formalizan la lógica operativa, restricciones de integridad y directrices de dominio que rigen el comportamiento del sistema. Se identifican mediante `RN-[Número]`.

---

### RN-01: Estados del Ciclo de Vida del Trabajo

- **Descripción:** Todo trabajo registrado en el sistema debe pertenecer obligatoriamente a uno, y solo a uno, de los siguientes estados:
  - `Por Realizar`: Actividad planificada que aún no ha iniciado.
  - `En Curso`: Actividad con tareas en desarrollo activo.
  - `Terminado`: Actividad concluida y documentada.
- **Transiciones Permitidas:** Las transiciones de estado son flexibles; el usuario administrador puede mover un trabajo entre cualquier estado según la evolución real del proyecto.

### RN-02: Consistencia y Coherencia Temporal de Fechas

- **Descripción:** Cada trabajo cuenta con una fecha principal de referencia (utilizada para el ordenamiento cronológico) y, opcionalmente, con un rango de fechas (`fecha_inicio` y `fecha_fin`).
- **Restricción:**
  - Si se especifican tanto `fecha_inicio` como `fecha_fin`, se debe cumplir invariablemente que:\
    $$
    $$

\text{fecha\_fin} \ge \text{fecha\_inicio}

$$
  - La fecha de referencia por defecto será la fecha de creación si no se indica una fecha manual durante el registro.

### RN-03: Límites Cuantitativos por Trabajo

- **Descripción:** Para evitar la degradación de la vista de detalle y el abuso de capacidad de almacenamiento:
  - Un trabajo puede contener un máximo de 20 fotografías asociadas.
  - Un trabajo puede contener un máximo de 4 videos asociados.
  - No es obligatorio subir multimedia al momento de crear el trabajo (un trabajo puede crearse únicamente con título y estado).

### RN-04: Borrado en Cascada y Limpieza Física de Archivos

- **Descripción:** Cuando se elimina un registro de trabajo:
  - Se deben eliminar todas las referencias multimedia asociadas en la base de datos de manera atómica (transacción).
  - El sistema debe activar el proceso de eliminación física de los archivos correspondientes en el disco/almacenamiento de objetos para evitar archivos huérfanos (*orphan files*).

### RN-05: Autorización para Operaciones de Modificación (Mutaciones)

- **Descripción:**
  - Las operaciones de **lectura** (`SELECT` / `GET`) son públicas e irrestrictas: cualquier visitante anónimo puede ver el catálogo y los detalles de los trabajos.
  - Las operaciones de **escritura** (`INSERT`, `UPDATE`, `DELETE`) están estrictamente reservadas para usuarios con sesión autenticada activa.

### RN-06: Ordenamiento Cronológico Predeterminado

- **Descripción:** La vista principal (feed o catálogo) debe mostrar los trabajos ordenados de forma descendente por la fecha de referencia:
  - El trabajo con la fecha más reciente aparecerá en la primera posición.
  - El usuario debe tener la opción de alternar al orden ascendente (del más antiguo al más reciente) mediante un control de ordenación simple.

### RN-07: Inmutabilidad del Identificador Único

- **Descripción:** Cada trabajo y cada recurso multimedia debe contar con un identificador único global (UUID v4 o ID numérico autoincremental no reutilizable). Este identificador no puede ser modificado una vez creado.
$$
