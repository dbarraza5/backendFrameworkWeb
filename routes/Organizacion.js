// Organizacion del proyecto (frontend documento/planeacion_organizacion.md). Montado en /api, con sesion.
//   GET   /api/proyecto/:id_proyecto/documentos   -> {proyecto: {_id, nombre}, documentos: [fila...]} (solo el dueno)
//   PATCH /api/eventos/:id_evento/organizacion    {tipo?: "escena" | "asset" | null, principal?: bool}
// Fase 2 (capitulos; responden {capitulos: [{_id, nombre}]} en orden):
//   POST   /api/proyecto/:id/capitulos              {nombre}
//   PATCH  /api/proyecto/:id/capitulos/:id_cap      {nombre?, mover?: -1 | 1}
//   DELETE /api/proyecto/:id/capitulos/:id_cap      (sus escenas pasan a "sin capitulo"; no se borra ninguna)
//   PUT    /api/proyecto/:id/escenas/orden          {capitulo: id | null, ids: [...]} -> {documentos}
//   POST   /api/proyecto/:id/escenas                {nombre, capitulo?} -> escena vacia (fila)
const express = require("express");
const mongoose = require("mongoose");
const Proyecto = require("../modelo/Proyecto");
const {Eventos} = require("../modelo/Eventos");
const {filaDocumento, validarCambio, CAMPOS_LISTA, capitulosDe, validarNombre, moverEn, validarOrden, escenaVacia} = require("../controller/Organizacion");
const {metaFiguras} = require("../controller/AutoriaComun");
const {ordenAlFinal} = require("../controller/OrganizacionDatos");

const router = express.Router();
const fallo = (res, err) => res.status(err.status || 500).send({error: err.message});
const error = (status, message) => Object.assign(new Error(message), {status});

async function proyectoPropio(id_proyecto, req) {
    if (!mongoose.Types.ObjectId.isValid(id_proyecto)) throw error(400, "id de proyecto invalido");
    const p = await Proyecto.findById(id_proyecto).select(["usuario_id", "nombre", "capitulos"]);
    if (!p) throw error(404, "proyecto no encontrado");
    if (String(p.usuario_id) !== String(req.session.user.id)) throw error(403, "el proyecto no es tuyo");
    return p;
}

router.get("/proyecto/:id_proyecto/documentos", async (req, res) => {
    try {
        const p = await proyectoPropio(req.params.id_proyecto, req);
        const docs = await Eventos.find({id_proyecto: String(p._id)}).select(CAMPOS_LISTA).lean();
        res.json({proyecto: {_id: String(p._id), nombre: p.nombre}, capitulos: capitulosDe(p), documentos: docs.map(filaDocumento)});
    } catch (err) { fallo(res, err); }
});

router.patch("/eventos/:id_evento/organizacion", async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id_evento)) throw error(400, "id de documento invalido");
        const doc = await Eventos.findById(req.params.id_evento).select(CAMPOS_LISTA.concat(["id_proyecto"])).lean();
        if (!doc) throw error(404, "documento no encontrado");
        await proyectoPropio(doc.id_proyecto, req);
        const {cambios, error: msj} = validarCambio(req.body);
        if (msj) throw error(400, msj);
        // una sola escena principal por proyecto
        if (req.body.principal === true) {
            await Eventos.updateMany({id_proyecto: doc.id_proyecto, _id: {$ne: doc._id}, "organizacion.principal": true}, {$unset: {"organizacion.principal": ""}});
        }
        // (no toca fecha_actualizacion: organizar no es editar el contenido)
        await Eventos.updateOne({_id: doc._id}, cambios);
        const nuevo = await Eventos.findById(doc._id).select(CAMPOS_LISTA).lean();
        res.json(filaDocumento(nuevo));
    } catch (err) { fallo(res, err); }
});

// ---- Fase 2: capitulos ----
// (Proyecto.updateOne no pasa por el hook findOneAndUpdate: organizar no cambia la fecha del proyecto)

const capitulosActuales = async (id) => capitulosDe(await Proyecto.findById(id).select("capitulos").lean());

router.post("/proyecto/:id_proyecto/capitulos", async (req, res) => {
    try {
        const p = await proyectoPropio(req.params.id_proyecto, req);
        const {nombre, error: msj} = validarNombre((req.body || {}).nombre, "capitulo");
        if (msj) throw error(400, msj);
        if (capitulosDe(p).some((c) => c.nombre === nombre)) throw error(409, `ya hay un capitulo "${nombre}"`);
        await Proyecto.updateOne({_id: p._id}, {$push: {capitulos: {nombre}}});
        res.status(201).json({capitulos: await capitulosActuales(p._id)});
    } catch (err) { fallo(res, err); }
});

router.patch("/proyecto/:id_proyecto/capitulos/:id_cap", async (req, res) => {
    try {
        const p = await proyectoPropio(req.params.id_proyecto, req);
        const lista = capitulosDe(p), i = lista.findIndex((c) => c._id === req.params.id_cap);
        if (i < 0) throw error(404, "capitulo no encontrado");
        const b = req.body || {};
        const desconocidos = Object.keys(b).filter((k) => !["nombre", "mover"].includes(k));
        if (desconocidos.length) throw error(400, `campos desconocidos: ${desconocidos.join(", ")} (validos: nombre, mover)`);
        let nueva = lista;
        if ("nombre" in b) {
            const {nombre, error: msj} = validarNombre(b.nombre, "capitulo");
            if (msj) throw error(400, msj);
            if (lista.some((c, k) => k !== i && c.nombre === nombre)) throw error(409, `ya hay un capitulo "${nombre}"`);
            nueva = nueva.map((c, k) => (k === i ? {...c, nombre} : c));
        }
        if ("mover" in b) {
            if (b.mover !== -1 && b.mover !== 1) throw error(400, "mover es -1 (subir) o 1 (bajar)");
            nueva = moverEn(nueva, i, b.mover);
        }
        await Proyecto.updateOne({_id: p._id}, {$set: {capitulos: nueva.map((c) => ({_id: new mongoose.Types.ObjectId(c._id), nombre: c.nombre}))}});
        res.json({capitulos: await capitulosActuales(p._id)});
    } catch (err) { fallo(res, err); }
});

router.delete("/proyecto/:id_proyecto/capitulos/:id_cap", async (req, res) => {
    try {
        const p = await proyectoPropio(req.params.id_proyecto, req);
        if (!capitulosDe(p).some((c) => c._id === req.params.id_cap)) throw error(404, "capitulo no encontrado");
        // sus escenas no se borran: quedan sin capitulo (y sin orden)
        await Eventos.updateMany({id_proyecto: String(p._id), "organizacion.capitulo": req.params.id_cap},
            {$unset: {"organizacion.capitulo": "", "organizacion.orden": ""}});
        await Proyecto.updateOne({_id: p._id}, {$pull: {capitulos: {_id: new mongoose.Types.ObjectId(req.params.id_cap)}}});
        res.json({capitulos: await capitulosActuales(p._id)});
    } catch (err) { fallo(res, err); }
});

router.put("/proyecto/:id_proyecto/escenas/orden", async (req, res) => {
    try {
        const p = await proyectoPropio(req.params.id_proyecto, req);
        const {capitulo, ids, error: msj} = validarOrden(req.body, capitulosDe(p).map((c) => c._id));
        if (msj) throw error(400, msj);
        if (!ids.every((id) => mongoose.Types.ObjectId.isValid(id))) throw error(400, "id de escena invalido");
        const n = await Eventos.countDocuments({_id: {$in: ids}, id_proyecto: String(p._id)});
        if (n !== ids.length) throw error(400, "alguna escena no es de este proyecto");
        await Eventos.bulkWrite(ids.map((id, orden) => ({updateOne: {filter: {_id: id},
            update: capitulo ? {$set: {"organizacion.capitulo": capitulo, "organizacion.orden": orden}}
                : {$set: {"organizacion.orden": orden}, $unset: {"organizacion.capitulo": ""}}}})));
        const docs = await Eventos.find({_id: {$in: ids}}).select(CAMPOS_LISTA).lean();
        res.json({documentos: docs.map(filaDocumento)});
    } catch (err) { fallo(res, err); }
});

router.post("/proyecto/:id_proyecto/escenas", async (req, res) => {
    try {
        const p = await proyectoPropio(req.params.id_proyecto, req);
        const b = req.body || {};
        const {nombre, error: msj} = validarNombre(b.nombre, "escena");
        if (msj) throw error(400, msj);
        const capitulo = b.capitulo == null ? null : String(b.capitulo);
        if (capitulo && !capitulosDe(p).some((c) => c._id === capitulo)) throw error(400, "el capitulo no existe en el proyecto");
        const pid = String(p._id);
        if (await Eventos.findOne({id_proyecto: pid, nombre}).select("_id")) throw error(409, `ya existe "${nombre}" en el proyecto`);
        const orden = await ordenAlFinal(pid, capitulo);   // al final del capitulo
        const doc = await Eventos.create({id_proyecto: pid, nombre, ...escenaVacia(), meta_figuras: await metaFiguras(pid),
            organizacion: {...(capitulo ? {capitulo} : {}), orden}});
        const fila = await Eventos.findById(doc._id).select(CAMPOS_LISTA).lean();
        res.status(201).json(filaDocumento(fila));
    } catch (err) { fallo(res, err); }
});

module.exports = router;
