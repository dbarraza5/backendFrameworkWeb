# API REST - Framework de Videojuegos

Backend Node.js/Express que expone servicios REST para gestionar proyectos, animaciones y eventos de un framework de videojuegos.

- **Puerto:** `5000`
- **Base de datos:** MongoDB (`framework-videojuego`)
- **Cliente permitido:** `http://localhost:3000`

---

## Autenticación

Todas las rutas bajo `/api` requieren dos capas de autenticación:

1. **Sesión activa** — cookie de sesión generada al hacer login.
2. **JWT** — token enviado en el header `Authorization: Bearer <token>`.

El token JWT expira en **240 minutos**. Al expirar, la sesión se destruye automáticamente.

---

## Rutas públicas — `/user`

### Registrar usuario

```
POST /user/register
```

**Body (JSON)**
```json
{
  "name": "Juan",
  "surname": "Pérez",
  "email": "juan@example.com",
  "password": "secreto123"
}
```

**Respuesta 200**
```json
{ "msj": "Usuario registrado exitosamente." }
```

---

### Login

```
POST /user/login
```

**Body (JSON)**
```json
{
  "email": "juan@example.com",
  "password": "secreto123"
}
```

**Respuesta 200**
```json
{
  "id": "<user_id>",
  "name": "Juan",
  "surname": "Pérez",
  "email": "juan@example.com",
  "token": "<jwt>"
}
```

Establece la cookie de sesión y devuelve el JWT para usar en las siguientes peticiones.

---

### Logout

```
GET /user/logout
```

Destruye la sesión del servidor y limpia la cookie.

**Respuesta 200:** `"ok"`

---

## Rutas protegidas — `/api`

Todas requieren:
- Cookie de sesión válida
- Header: `Authorization: Bearer <token>`

---

## Proyectos

### Obtener proyecto por ID

```
GET /api/proyecto/id/:id_proyecto
```

**Respuesta 200:** Documento del proyecto.

---

### Listar proyectos de un usuario

```
GET /api/proyecto/user/:id_usuario
```

**Respuesta 200:** Array de proyectos del usuario.

---

### Listar proyectos con sus animaciones

```
GET /api/proyecto-animacion/:id_usuario
```

Devuelve cada proyecto junto con un listado resumido de sus animaciones.

**Respuesta 200**
```json
[
  {
    "id_proyecto": "<id>",
    "nombre_proyecto": "Mi Proyecto",
    "animaciones": [
      {
        "nombre_proyecto": "Mi Proyecto",
        "id_animacion": "<id>",
        "nombre_animacion": "animacion-default",
        "fecha_actualizacion": "...",
        "fecha_creacion": "..."
      }
    ]
  }
]
```

---

### Crear proyecto

```
POST /api/proyecto
```

Al crear un proyecto se generan automáticamente:
- Una animación raíz (`animacion-default`)
- Un documento de eventos por defecto

**Body (JSON)**
```json
{
  "nombre": "Mi Proyecto",
  "descripcion": "Descripción opcional"
}
```

Validaciones: `nombre` entre 3 y 20 caracteres.

**Respuesta 200:** Documento del proyecto creado.

---

### Actualizar proyecto

```
PUT /api/proyecto/id/:id_proyecto
```

**Body (JSON)** — solo los campos a modificar:
```json
{
  "nombre": "Nuevo Nombre",
  "descripcion": "Nueva descripción"
}
```

Validaciones: `nombre` entre 3 y 20 caracteres (opcional).

**Respuesta 200:** Documento actualizado.

---

### Eliminar proyecto

```
DELETE /api/proyecto/id/:id_proyecto
```

Elimina el proyecto y todas sus animaciones asociadas.

**Respuesta 200:** Resultado de la operación.

---

## Animaciones

### Obtener animación por ID

```
GET /api/animacion/id/:id_animacion
```

Devuelve el documento completo de la animación incluyendo `grupos_figuras`, `lista_imagenes`, `meta_figuras` y `meta_movimientos`.

**Respuesta 404** si no existe.

---

### Obtener múltiples animaciones por IDs

```
POST /api/animaciones/lista
```

**Body (JSON)**
```json
{
  "ids": ["<id1>", "<id2>", "<id3>"]
}
```

Devuelve solo los campos `_id`, `nombre_animacion` y `grupos_figuras`.

---

### Listar animaciones de un proyecto (completo)

```
GET /api/animacion/proyecto/:id_proyecto
```

Devuelve todas las animaciones del proyecto con todos sus campos.

---

### Listar animaciones de un proyecto (resumido)

```
GET /api/animacion/proyecto-slim/:id_proyecto
```

Devuelve solo: `_id`, `nombre_animacion`, `raiz`, `id_copia_consolidado`, `consolidado`, `fecha_actualizacion`, `fecha_creacion`.

---

### Crear animación

```
POST /api/animacion
```

**Body (JSON)**
```json
{
  "id_proyecto": "<id_proyecto>",
  "nombre": "mi-animacion",
  "descripcion": "Descripción opcional"
}
```

**Respuesta 201:** Documento de la animación creada.

---

### Actualizar animación

```
PUT /api/animacion/id/:id_animacion
```

Actualiza cualquier campo de la animación. Actualiza automáticamente `fecha_actualizacion`.

Si se envía `grupos_figuras`, valida que no haya grupos con nombre duplicado.

**Body (JSON)** — ejemplo actualizando grupos de figuras:
```json
{
  "grupos_figuras": [
    {
      "nombre": "jugador",
      "nodo_padre": "root",
      "visible": true,
      "color": "#FF0000",
      "cx": 100,
      "cy": 200,
      "capa": 1,
      "clases": ["jugador"],
      "lista_figuras": [],
      "lista_pintado": []
    }
  ]
}
```

**Respuesta 200:** Documento actualizado.

---

### Eliminar animación

```
DELETE /api/animacion/id/:id_animacion
```

**Respuesta 200**
```json
{
  "message": "Animación eliminada correctamente",
  "id": "<id>"
}
```

---

## Imágenes de animaciones

### Subir imagen a una animación

```
PUT /api/animacion/agregar-imagen/:id_animacion
```

**Content-Type:** `multipart/form-data`

| Campo | Tipo | Descripción |
|---|---|---|
| `image` | File | Archivo de imagen |

La imagen se almacena en el sistema de archivos y se asocia a la animación. Se detecta automáticamente el ancho y alto de la imagen.

**Respuesta 200:** Objeto imagen actualizado con dimensiones.

---

### Actualizar posición/propiedades de una imagen

```
PUT /api/animacion/actualizar-imagen/:id_animacion
```

**Body (JSON)**
```json
{
  "_id": "<id_imagen>",
  "x": 50,
  "y": 100,
  "ancho": 200,
  "alto": 150,
  "opacidad": 0.8,
  "visible": true
}
```

**Respuesta 200:** Objeto imagen actualizado.

---

### Eliminar imagen de una animación

```
GET /api/animacion/eliminar-imagen/:id_animacion/:id_imagen
```

**Respuesta 200:** Lista actualizada de imágenes de la animación.

---

### Obtener archivo de imagen

```
GET /api/imagen/:nombreImagen
```

Sirve el archivo de imagen directamente. El nombre sigue el formato:
```
{id_usuario}_{id_proyecto}_{id_animacion}_{nombre_archivo}
```

**Respuesta:** Archivo binario de la imagen.

---

## Eventos

### Listar eventos de un proyecto (resumido)

```
GET /api/eventos/proyecto-slim/:id_proyecto
```

Devuelve solo: `_id`, `nombre`, `fecha_actualizacion`, `fecha_creacion`.

---

### Obtener evento por ID

```
GET /api/evento/id/:id_evento
```

Devuelve el documento completo del evento incluyendo el árbol de `eventos`, `grupos_figuras`, `meta_figuras` y `escena` (configuración de la escena, p. ej. `{"orden_profundidad": true}`).

**Respuesta 404** si no existe.

---

### Actualizar evento

```
PUT /api/evento/id/:id_evento
```

Actualiza cualquier campo del documento de eventos.

**Body (JSON)** — ejemplo actualizando el árbol de eventos:
```json
{
  "eventos": [
    {
      "nombre": "EventoPrincipal",
      "nodo_padre": "Nodo_Root",
      "visible": true,
      "bucle": true,
      "tiempo_bucle": 1200,
      "tiempo_inicio": 0,
      "tiempo_final": 3500,
      "x": 0,
      "y": 0,
      "reposicionar": true,
      "tiempo_relativo": 0,
      "objetos": [
        {
          "tipo": 1,
          "id_objeto": "jugador",
          "x_inicial": 0,
          "y_inicial": 0,
          "movimientos": [
            {
              "tipo": 1,
              "tipo_efecto": 1,
              "tiempo_inicio": 0,
              "tiempo_final": 500,
              "bucle": false,
              "tiempo_bucle": 0,
              "activo": true,
              "datos": { "velocidad": 120 }
            }
          ]
        }
      ],
      "macros": [],
      "script": null
    }
  ]
}
```

**Respuesta 200:** Documento actualizado.

---

### Versiones congeladas de un evento

Una versión es una foto del documento de eventos tal como estaba guardado en ese momento. Se usa para fijar una instancia por referencia a un estado del asset: la instancia guarda el `_id` de la versión en `instancia.version`.

Las versiones viven en la colección `versiones_eventos` (modelo `modelo/VersionEventos.js`). Son inmutables y se numeran 1, 2, 3… por documento.

#### Listar versiones

```
GET /api/evento/id/:id_evento/versiones
```

Devuelve la lista resumida, la más nueva primero:
```json
[{ "_id": "...", "id_eventos": "...", "numero": 2, "descripcion": "", "fecha_creacion": "2026-11-13T19:09:05.000Z" }]
```

#### Crear una versión

```
POST /api/evento/id/:id_evento/versiones
```

Copia el documento guardado actual.

- **Body (opcional):** `{ "descripcion": "texto" }`.
- **Respuesta 201:** la versión creada, en el mismo formato resumido.
- **Respuesta 404:** si el evento no existe.

#### Obtener una versión

```
GET /api/evento/version/:id_version
```

Devuelve el documento congelado con la misma forma que `GET /api/evento/id/:id_evento` (`_id` es el del documento original) más un campo `version`:
```json
{ "_id": "<id_eventos>", "eventos": [], "grupos_figuras": [], "version": { "_id": "...", "numero": 2, "descripcion": "", "fecha_creacion": "..." } }
```

**Respuesta 404** si no existe.

---

## Modelos de datos

### Animación — estructura de `grupos_figuras`

Cada grupo representa un objeto visual en la escena:

```json
{
  "nombre": "jugador",
  "nodo_padre": "root",
  "visible": true,
  "color": "#000000",
  "cx": 0,
  "cy": 0,
  "capa": 0,
  "clases": ["jugador"],
  "lista_figuras": [
    {
      "nombre": "cuerpo",
      "tipo_figura": "CIRCULO",
      "atributos": { "radiox": 10, "radioy": 10, "cx": 0, "cy": 0 }
    }
  ],
  "lista_pintado": [
    {
      "color": "#0d67c8",
      "visible": true,
      "elementos": [[]]
    }
  ]
}
```

**Tipos de figura disponibles:**

| Tipo | Atributos |
|---|---|
| `PUNTO` | `cx`, `cy` |
| `RECTA` | `x1`, `y1`, `x2`, `y2`, `cx`, `cy` |
| `CIRCULO` | `radiox`, `radioy`, `cx`, `cy` |

**Campos opcionales del grupo:**

| Campo | Para qué |
|---|---|
| `transformacion` `{rotacion, escala_x, escala_y, ancla_x, ancla_y}` | Transformación de instancia que el editor aplica al dibujar, sin modificar las figuras. |
| `instancia` `{id_eventos, nombre, version, evento, bucle, desfase}` | El grupo es el contenedor de una **instancia por referencia** de otro documento de eventos (asset). Sus partes no se guardan: el editor las carga del asset (o de la versión `version`, si está fijada) y las anima con `evento`. |
| `opacidad` | Opacidad base del grupo (0..1); se hereda a sus descendientes. |
| `claves` | Fotogramas clave por propiedad: `{x:[{t, v, interp}], y, rotacion, escala_x, escala_y, opacidad}`. `t` en ms de escena; `interp`: `lineal`, `suave`, `entrar`, `salir` o `mantener`. |
| `claves_bucle` | Qué hace el objeto después de su última clave: `repetir`, `ida_vuelta` o `continuar` (acumula posición y rotación por vuelta). Vacío: se queda en la última. |
| `camara` `{ancho, alto, zoom}` | Solo en el grupo cámara (clase `camara`): tamaño del cuadro y zoom. Su `cx, cy` es el centro de lo que ve. |
| `orden_profundidad` | Sus hijos se dibujan por `plano` y luego por la altura de sus pies (lo de más abajo, delante). |
| `plano` | Profundidad del grupo cuando su nivel ordena por profundidad: menor = detrás (por defecto 0). |

---

### Evento — estructura de `movimientos`

Cada movimiento pertenece a un objeto dentro de un evento:

| Campo | Tipo | Descripción |
|---|---|---|
| `tipo` | Number | Tipo de movimiento (ej. 1=traslación, 2=rotación) |
| `tipo_efecto` | Number | 1: afecta al grupo como objeto, 2: afecta a las figuras internas |
| `tiempo_inicio` | Number | Tiempo de inicio en ms |
| `tiempo_final` | Number | Tiempo de fin en ms |
| `bucle` | Boolean | Si el movimiento se repite |
| `tiempo_bucle` | Number | Duración del ciclo en ms |
| `activo` | Boolean | Si el movimiento está habilitado |
| `datos` | Object | Parámetros específicos del tipo (ej. `{ "velocidad": 120 }`, `{ "angulo": 45 }`) |

---

## Códigos de respuesta

| Código | Significado |
|---|---|
| 200 | Operación exitosa |
| 201 | Recurso creado |
| 400 | Datos inválidos en la petición |
| 401 | No autenticado (sin sesión o sin token) |
| 403 | Token inválido o expirado |
| 404 | Recurso no encontrado |
| 422 | Error de validación de campos |
| 500 | Error interno del servidor |
