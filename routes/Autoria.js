// API de autoria asistida (Fase A2 de planeacion_autoria_asistida.md del frontend).
// Montada en /autoria con una llave de proyecto (middleware/LlaveAutoria.js): todo
// lo que se lee o escribe pertenece al proyecto de la llave. Solo se puede borrar lo
// que creo la misma llave (Fase A6).
//
// El formato SIMPLE se compila del lado del cliente (frontend: herramientas/autoria.mjs,
// src/Clases/Autoria/Compilador.js); esta API recibe el resultado compilado
// ({nombre, grupos_figuras, eventos, escena}), lo valida y lo guarda.
const express = require("express");
const {normalizarNotas, conservarNotas} = require("../controller/Notas");
const mongoose = require("mongoose");
const {Eventos} = require("../modelo/Eventos");
const {Animacion} = require("../modelo/Animacion");
const {VersionEventos} = require("../modelo/VersionEventos");

const router = express.Router();
const {esId, validar, metaFiguras, eventoGeneral, crearAsset} = require("../controller/AutoriaComun");
const Proyecto = require("../modelo/Proyecto");
const {filaDocumento, capitulosDe, CAMPOS_LISTA} = require("../controller/Organizacion");
const {capituloPorNombre, ubicarEnCapitulo} = require("../controller/OrganizacionDatos");


// ---------------- rutas ----------------

// Assets y escenas del proyecto (liviano). El tipo es el de la pagina del proyecto (automatico
// o elegido a mano) y las escenas traen su capitulo (planeacion_organizacion.md).
router.get("/catalogo", async (req, res) => {
    try {
        const p = await Proyecto.findById(req.id_proyecto).select("capitulos").lean();
        const capitulos = capitulosDe(p);
        const nombreCap = new Map(capitulos.map((c) => [c._id, c.nombre]));
        const docs = await Eventos.find({id_proyecto: req.id_proyecto})
            .select(CAMPOS_LISTA.concat(["eventos.nombre", "eventos.tiempo_final", "grupos_figuras.nombre"])).lean();
        res.json({id_proyecto: req.id_proyecto, capitulos: capitulos.map((c) => c.nombre), documentos: docs.map((d) => {
            const fila = filaDocumento(d);
            return {id: d._id, nombre: d.nombre, tipo: fila.tipo, principal: fila.principal,
                capitulo: (fila.capitulo && nombreCap.get(fila.capitulo)) || null, orden: fila.orden,
                eventos: (d.eventos || []).map((e) => ({nombre: e.nombre, tiempo_final: e.tiempo_final})),
                // enganches y nombres de las partes (IA-4: para colgar objetos de una parte de la instancia)
                enganches: (d.escena && d.escena.enganches) || null,
                caja: (d.escena && d.escena.caja) || null,
                partes: (d.grupos_figuras || []).map((g) => g.nombre).filter((n) => n && n !== "default"),
                fecha_actualizacion: d.fecha_actualizacion};
        })});
    } catch (err) { res.status(500).send({error: err.message}); }
});

// Documento completo (para leerlo, descompilarlo o modificarlo).
router.get("/eventos/:id", async (req, res) => {
    try {
        if (!esId(req.params.id)) return res.status(400).send({error: "id invalido"});
        const d = await Eventos.findOne({_id: req.params.id, id_proyecto: req.id_proyecto});
        if (!d) return res.status(404).send({error: "no existe en este proyecto"});
        res.json(d);
    } catch (err) { res.status(500).send({error: err.message}); }
});

// Version congelada (6C) de un documento del proyecto: la usa el render (Fase A3) para
// las instancias fijadas a una version. Mismo formato que GET /api/evento/version/:id.
router.get("/versiones/:id", async (req, res) => {
    try {
        if (!esId(req.params.id)) return res.status(400).send({error: "id invalido"});
        const v = await VersionEventos.findById(req.params.id).lean();
        const dueno = v && esId(v.id_eventos) ? await Eventos.exists({_id: v.id_eventos, id_proyecto: req.id_proyecto}) : null;
        if (!v || !dueno) return res.status(404).send({error: "no existe en este proyecto"});
        res.json({...v.contenido, _id: v.id_eventos,
            version: {_id: v._id, numero: v.numero, descripcion: v.descripcion, fecha_creacion: v.fecha_creacion}});
    } catch (err) { res.status(500).send({error: err.message}); }
});

// Sonidos del proyecto (planeacion_sonido.md del frontend). El asistente no sube audio:
// puede listarlos y crear sonidos PENDIENTES por nombre (con una nota de lo que debe
// sonar), que el seguimiento del editor le recuerda subir al usuario.
const {Sonido, sonidoPublico} = require("../modelo/Sonido");

router.get("/sonidos", async (req, res) => {
    try {
        const lista = await Sonido.find({id_proyecto: req.id_proyecto}).sort({nombre: 1});
        res.json(lista.map((s) => ({...sonidoPublico(s), picos: undefined})));
    } catch (err) { res.status(500).send({error: err.message}); }
});

// Voces generadas en la computadora del usuario con Kokoro (frontend documento/planeacion_voces.md):
// la herramienta herramientas/voces.mjs sube el WAV ya listo. Solo WAV (base64), hasta 5 MB.
// Si ya hay un sonido con ese nombre: lo reemplaza solo si lo creo esta misma llave.
//   POST /autoria/sonidos/voz {nombre, nota?, wav: "<base64>", duracion_ms, picos?: [0..1]}
router.post("/sonidos/voz", async (req, res) => {
    try {
        const b = req.body || {};
        const nombre = String(b.nombre || "").trim();
        if (!nombre) return res.status(400).json({ok: false, errores: ["falta el nombre"]});
        const datos = Buffer.from(String(b.wav || ""), "base64");
        if (datos.length < 44 || datos.toString("ascii", 0, 4) !== "RIFF" || datos.toString("ascii", 8, 12) !== "WAVE") {
            return res.status(400).json({ok: false, errores: ["wav debe ser un archivo WAV en base64"]});
        }
        if (datos.length > 5 * 1024 * 1024) return res.status(400).json({ok: false, errores: ["la voz supera 5 MB"]});
        const llave = String(req.llave._id);
        let s = await Sonido.findOne({id_proyecto: req.id_proyecto, nombre});
        if (s && s.creado_por_llave !== llave) return res.status(409).json({ok: false, errores: [`ya existe "${nombre}" y no lo creo esta llave`]});
        if (!s) s = new Sonido({id_proyecto: req.id_proyecto, nombre, creado_por_llave: llave});
        const p = await Proyecto.findById(req.id_proyecto).select(["usuario_id"]);
        const carpeta = `/home/app/storage/usuarios/${p.usuario_id}/proyectos/${p._id}/sonidos`;
        require("node:fs").mkdirSync(carpeta, {recursive: true});
        const ruta = `${carpeta}/${s._id}.wav`;
        require("node:fs").writeFileSync(ruta, datos);
        s.archivo = {ruta, tipo: "audio/wav", tamano: datos.length, original: nombre + ".wav"};
        s.estado = "listo";
        s.revision = (s.revision || 0) + 1;
        s.nota = String(b.nota || "voz generada con Kokoro").slice(0, 300);
        const d = Number(b.duracion_ms);
        if (Number.isFinite(d) && d >= 0) s.duracion_ms = Math.round(d);
        if (Array.isArray(b.picos)) s.picos = b.picos.slice(0, 400).map((v) => Math.max(0, Math.min(1, Number(v) || 0)));
        await s.save();
        res.status(201).json({ok: true, _id: s._id, nombre, revision: s.revision});
    } catch (err) { res.status(500).send({ok: false, errores: [err.message]}); }
});

router.post("/sonidos", async (req, res) => {
    try {
        const nombre = String((req.body && req.body.nombre) || "").trim();
        if (!nombre) return res.status(400).json({ok: false, errores: ["falta el nombre"]});
        if (await Sonido.findOne({id_proyecto: req.id_proyecto, nombre})) {
            return res.status(409).json({ok: false, errores: [`ya existe el sonido "${nombre}"`]});
        }
        const s = await Sonido.create({id_proyecto: req.id_proyecto, nombre, nota: String(req.body.nota || ""),
            creado_por_llave: String(req.llave._id)});
        res.status(201).json({ok: true, ...sonidoPublico(s)});
    } catch (err) { res.status(500).send({ok: false, errores: [err.message]}); }
});

// Valida sin guardar.
router.post("/validar", async (req, res) => {
    try {
        const errores = await validar(req.body, req.id_proyecto);
        res.status(errores.length ? 400 : 200).json({ok: !errores.length, errores});
    } catch (err) { res.status(500).send({error: err.message}); }
});

// Crear un asset: documento de eventos + dibujo (editable en el editor de dibujo).
router.post("/assets", async (req, res) => {
    try {
        const r = await crearAsset(req.id_proyecto, req.body, {creado_por_llave: String(req.llave._id)});
        res.status(r.status).json(r.body);
    } catch (err) { res.status(500).send({ok: false, errores: [err.message]}); }
});

// Crear una escena (solo documento de eventos).
router.post("/escenas", async (req, res) => {
    try {
        const errores = await validar(req.body, req.id_proyecto);
        if (errores.length) return res.status(400).json({ok: false, errores});
        const nombre = String(req.body.nombre).trim();
        if (await Eventos.findOne({id_proyecto: req.id_proyecto, nombre})) {
            return res.status(409).json({ok: false, errores: [`ya existe "${nombre}" en el proyecto`]});
        }
        // capitulo (por nombre; se crea si no existe): la escena queda al final de el
        const capitulo = req.body.capitulo == null ? null : await capituloPorNombre(req.id_proyecto, req.body.capitulo, {crear: true});
        const doc = await Eventos.create({
            id_proyecto: req.id_proyecto, nombre, eventos: req.body.eventos || eventoGeneral(),
            grupos_figuras: req.body.grupos_figuras, meta_figuras: await metaFiguras(req.id_proyecto),
            escena: req.body.escena || {},
            creado_por_llave: String(req.llave._id),
        });
        if (capitulo) await ubicarEnCapitulo(doc._id, req.id_proyecto, capitulo);
        res.status(201).json({ok: true, id_eventos: doc._id, nombre, ...(capitulo ? {capitulo: String(req.body.capitulo).trim()} : {})});
    } catch (err) { res.status(err.status || 500).send({ok: false, errores: [err.message]}); }
});

// Mover una escena a un capitulo (por nombre; se crea si no existe) o, con null, a "Sin capitulo".
// Queda al final. Solo organiza: no cambia el contenido ni hace respaldo.
router.put("/eventos/:id/capitulo", async (req, res) => {
    try {
        if (!esId(req.params.id)) return res.status(400).send({error: "id invalido"});
        const doc = await Eventos.findOne({_id: req.params.id, id_proyecto: req.id_proyecto}).select(CAMPOS_LISTA).lean();
        if (!doc) return res.status(404).json({ok: false, errores: ["no existe en este proyecto"]});
        if (filaDocumento(doc).tipo !== "escena") return res.status(400).json({ok: false, errores: ["solo las escenas van en capitulos (los assets son de todo el proyecto)"]});
        const nombre = (req.body || {}).capitulo;
        const capitulo = nombre == null ? null : await capituloPorNombre(req.id_proyecto, nombre, {crear: true});
        await ubicarEnCapitulo(doc._id, req.id_proyecto, capitulo);
        res.json({ok: true, id_eventos: doc._id, capitulo: capitulo ? String(nombre).trim() : null});
    } catch (err) { res.status(err.status || 500).send({ok: false, errores: [err.message]}); }
});

// Actualizar un documento existente. Antes se guarda un RESPALDO automatico como
// version congelada (Fase 6C), asi el cambio siempre se puede deshacer.
router.put("/eventos/:id", async (req, res) => {
    try {
        if (!esId(req.params.id)) return res.status(400).send({error: "id invalido"});
        const actual = await Eventos.findOne({_id: req.params.id, id_proyecto: req.id_proyecto}).lean();
        if (!actual) return res.status(404).json({ok: false, errores: ["no existe en este proyecto"]});
        const errores = await validar(req.body, req.id_proyecto, {parcial: true});
        if (errores.length) return res.status(400).json({ok: false, errores});
        // renombrar: el nombre nuevo no puede ser de otro documento del proyecto
        if (req.body.nombre !== undefined) {
            req.body.nombre = String(req.body.nombre).trim();
            if (!req.body.nombre) return res.status(400).json({ok: false, errores: ["el nombre no puede quedar vacio"]});
            if (req.body.nombre !== actual.nombre && await Eventos.findOne({id_proyecto: req.id_proyecto, nombre: req.body.nombre, _id: {$ne: actual._id}})) {
                return res.status(409).json({ok: false, errores: [`ya existe "${req.body.nombre}" en el proyecto`]});
            }
        }
        const ultima = await VersionEventos.findOne({id_eventos: String(actual._id)}).sort({numero: -1}).select("numero");
        const respaldo = await VersionEventos.create({
            id_eventos: String(actual._id), numero: (ultima ? ultima.numero : 0) + 1,
            descripcion: `Respaldo automático antes de autoría (${req.llave.nombre})`, contenido: actual,
        });
        const cambios = {};
        for (const k of ["nombre", "grupos_figuras", "eventos", "escena"]) if (req.body[k] !== undefined) cambios[k] = req.body[k];
        // las notas del usuario (IA-6) no vienen en el formato simple: se conservan
        if (cambios.escena !== undefined) cambios.escena = conservarNotas(cambios.escena, actual.escena);
        const doc = await Eventos.findOneAndUpdate({_id: actual._id}, cambios, {new: true, runValidators: true});
        // el dibujo de un asset creado por esta llave lleva el nombre en `descripcion` (asi lo encuentra "borrar")
        if (cambios.nombre && cambios.nombre !== actual.nombre) {
            await Animacion.updateMany({id_proyecto: req.id_proyecto, creado_por_llave: String(req.llave._id), descripcion: actual.nombre}, {descripcion: cambios.nombre});
        }
        res.json({ok: true, id_eventos: doc._id, respaldo: {id_version: respaldo._id, numero: respaldo.numero}});
    } catch (err) { res.status(500).send({ok: false, errores: [err.message]}); }
});

// IA-6: la autoria responde una nota de correccion del usuario: {resuelta?: bool, respuesta?: "que se hizo"}
router.put("/eventos/:id/notas/:id_nota", async (req, res) => {
    try {
        if (!esId(req.params.id)) return res.status(400).send({error: "id invalido"});
        const actual = await Eventos.findOne({_id: req.params.id, id_proyecto: req.id_proyecto}).select("escena.notas").lean();
        if (!actual) return res.status(404).json({ok: false, errores: ["no existe en este proyecto"]});
        const notas = (actual.escena && actual.escena.notas) || [];
        const k = notas.findIndex((n) => n.id === req.params.id_nota);
        if (k < 0) return res.status(404).json({ok: false, errores: [`no existe la nota ${req.params.id_nota}`]});
        const nueva = {...notas[k]};
        if (req.body.resuelta !== undefined) nueva.resuelta = req.body.resuelta === true;
        if (req.body.respuesta !== undefined) nueva.respuesta = req.body.respuesta;
        const lista = notas.map((n, i) => (i === k ? nueva : n));
        const {notas: limpias, errores} = normalizarNotas(lista);
        if (errores.length) return res.status(400).json({ok: false, errores});
        await Eventos.updateOne({_id: actual._id}, {$set: {"escena.notas": limpias}});
        res.json({ok: true, nota: limpias[k]});
    } catch (err) { res.status(500).send({ok: false, errores: [err.message]}); }
});

// Fase A6: borrar SOLO lo que creo esta misma llave (para limpiar pruebas). Lo del
// usuario, o lo creado por otra llave, no se puede borrar por esta API. Borra el
// documento de eventos, su dibujo (si es un asset creado por la llave) y sus versiones.
router.delete("/eventos/:id", async (req, res) => {
    try {
        if (!esId(req.params.id)) return res.status(400).send({error: "id invalido"});
        const doc = await Eventos.findOne({_id: req.params.id, id_proyecto: req.id_proyecto});
        if (!doc) return res.status(404).json({ok: false, errores: ["no existe en este proyecto"]});
        if (doc.creado_por_llave !== String(req.llave._id)) {
            return res.status(403).json({ok: false, errores: ["solo se puede borrar lo que creó esta misma llave"]});
        }
        // instancias que lo usan en otras escenas: no dejar referencias rotas
        const usado = await Eventos.find({id_proyecto: req.id_proyecto, _id: {$ne: doc._id}, "grupos_figuras.instancia.id_eventos": String(doc._id)}).select("nombre");
        if (usado.length && !req.query.forzar) {
            return res.status(409).json({ok: false, errores: [`lo usan como asset: ${usado.map((d) => d.nombre).join(", ")} (borrar esas primero, o ?forzar=1)`]});
        }
        const dibujo = await Animacion.deleteMany({id_proyecto: req.id_proyecto, creado_por_llave: String(req.llave._id), descripcion: doc.nombre});
        const versiones = await VersionEventos.deleteMany({id_eventos: String(doc._id)});
        await Eventos.deleteOne({_id: doc._id});
        res.json({ok: true, borrado: doc.nombre, dibujos: dibujo.deletedCount, versiones: versiones.deletedCount});
    } catch (err) { res.status(500).send({ok: false, errores: [err.message]}); }
});

module.exports = router
