# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install
npx nodemon app.js   # actual run command used in Docker (nodemon -L app.js); no npm start script defined
```

`npm test` is a stub (`echo "Error: no test specified" && exit 1`) — there are no automated tests in this repo.

Server listens on port `5000`. MongoDB connection string is hardcoded in `app.js` (`mongodb://daniel:12345@db_mongo_docker:27017/framework-videojuego?authSource=admin`) — `db_mongo_docker` is the Docker Compose service name, so this only resolves inside the compose network, not standalone.

## Architecture

Full REST API reference (every route, request/response shapes, data model field tables) lives in `README.md` — read it before adding or changing an endpoint. Below is what isn't obvious just from reading `routes/`.

### Auth (double gate on every `/api/*` route)

`app.js` mounts `isAuthenticated` then `verifyToken` (both in `middleware/Autentificacion.js`) ahead of `routes/Api.js`:
- `isAuthenticated` checks `req.session.user` (Mongo-backed session via `connect-mongodb-session`).
- `verifyToken` checks the JWT in the `Authorization: Bearer` header (secret in `config.js`, `TOKEN_KEY`); on `TokenExpiredError` it also destroys the session and clears the cookie.

`routes/LoginRegistro.js` (mounted at `/user`) is public and issues both the session cookie and the JWT on login.

### Data hierarchy: `Proyecto` auto-spawns `Animacion` + `Eventos`

`modelo/Proyecto.js`'s `pre('save')` hook: creating a new `Proyecto` automatically creates a default root `Animacion` (via `crear_animacion`) and a default `Eventos` document (via `crear_evento`) linked by `id_proyecto`. There's no separate "create default animation" API call — it's implicit in `POST /api/proyecto`.

### `Eventos` intentionally duplicates the figure schema

`modelo/Eventos.js` imports `grupoFigurasSchema`/`metaFiguraSchema` from `modelo/Animacion.js` and embeds its own `grupos_figuras`/`meta_figuras` fields, separate from the `Animacion` document. This is deliberate, not dead duplication: an event's choreography works against its own synced snapshot of the figures rather than referencing the live `Animacion` document, so animating a group doesn't require the drawing to stay frozen.

### Image upload path convention

`controller/ImagenAnimacion.js` uses a multer `diskStorage` whose `destination` callback does double duty: it looks up the `Animacion` and its parent `Proyecto`, builds the storage path `storage/usuarios/{usuario_id}/proyectos/{proyecto_id}/animaciones/{animacion_id}/`, generates the image's Mongo `_id` up front, and pushes a placeholder record into `animacion.lista_imagenes` — all before the file itself is written. `req.params.id_imagen`/`path_imagen` are threaded through from `destination` to `filename` to communicate the generated id. Files are served back through `GET /api/imagen/:nombreImagen`, where the filename encodes `{usuario_id}_{proyecto_id}_{animacion_id}_{archivo}` and gets split back apart to reconstruct the path.
