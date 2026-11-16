// API de autoria asistida (Fase A2 de planeacion_autoria_asistida.md del frontend).
// Montada en /autoria con una llave de proyecto (middleware/LlaveAutoria.js): todo
// lo que se lee o escribe pertenece al proyecto de la llave. Solo se puede borrar lo
// que creo la misma llave (Fase A6).
//
// El formato SIMPLE se compila del lado del cliente (frontend: herramientas/autoria.mjs,
// src/Clases/Autoria/Compilador.js); esta API recibe el resultado compilado
// ({nombre, grupos_figuras, eventos, escena}), lo valida y lo guarda.
const express = require("express");
const mongoose = require("mongoose");
const {Eventos} = require("../modelo/Eventos");
const {Animacion} = require("../modelo/Animacion");
const {VersionEventos} = require("../modelo/VersionEventos");

const router = express.Router();
const {esId, validar, metaFiguras, eventoGeneral, esEscena, crearAsset} = require("../controller/AutoriaComun");


// ---------------- rutas ----------------

// Assets y escenas del proyecto (liviano).
router.get("/catalogo", async (req, res) => {
    try {
        const docs = await Eventos.find({id_proyecto: req.id_proyecto})
            .select(["_id", "nombre", "eventos.nombre", "eventos.tiempo_final", "grupos_figuras.instancia", "fecha_actualizacion"]);
        res.json({id_proyecto: req.id_proyecto, documentos: docs.map((d) => ({
            id: d._id, nombre: d.nombre, tipo: esEscena(d) ? "escena" : "asset",
            eventos: (d.eventos || []).map((e) => ({nombre: e.nombre, tiempo_final: e.tiempo_final})),
            fecha_actualizacion: d.fecha_actualizacion,
        }))});
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
        const doc = await Eventos.create({
            id_proyecto: req.id_proyecto, nombre, eventos: req.body.eventos || eventoGeneral(),
            grupos_figuras: req.body.grupos_figuras, meta_figuras: await metaFiguras(req.id_proyecto),
            escena: req.body.escena || {},
            creado_por_llave: String(req.llave._id),
        });
        res.status(201).json({ok: true, id_eventos: doc._id, nombre});
    } catch (err) { res.status(500).send({ok: false, errores: [err.message]}); }
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
        const ultima = await VersionEventos.findOne({id_eventos: String(actual._id)}).sort({numero: -1}).select("numero");
        const respaldo = await VersionEventos.create({
            id_eventos: String(actual._id), numero: (ultima ? ultima.numero : 0) + 1,
            descripcion: `Respaldo automático antes de autoría (${req.llave.nombre})`, contenido: actual,
        });
        const cambios = {};
        for (const k of ["nombre", "grupos_figuras", "eventos", "escena"]) if (req.body[k] !== undefined) cambios[k] = req.body[k];
        const doc = await Eventos.findOneAndUpdate({_id: actual._id}, cambios, {new: true, runValidators: true});
        res.json({ok: true, id_eventos: doc._id, respaldo: {id_version: respaldo._id, numero: respaldo.numero}});
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
