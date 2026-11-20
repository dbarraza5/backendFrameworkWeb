// Organizacion del proyecto con base de datos (frontend documento/planeacion_organizacion.md).
// Lo usan la pagina del proyecto (routes/Organizacion.js) y la autoria (routes/Autoria.js).
const mongoose = require("mongoose");
const Proyecto = require("../modelo/Proyecto");
const {Eventos} = require("../modelo/Eventos");
const {capitulosDe, validarNombre} = require("./Organizacion");

// Id del capitulo con ese nombre; con crear: true lo crea al final si no existe.
// (Proyecto.updateOne no pasa por el hook findOneAndUpdate: no cambia la fecha del proyecto)
async function capituloPorNombre(id_proyecto, nombre, {crear = false} = {}) {
    const {nombre: n, error} = validarNombre(nombre, "capitulo");
    if (error) throw Object.assign(new Error(error), {status: 400});
    const p = await Proyecto.findById(id_proyecto).select("capitulos").lean();
    if (!p) throw Object.assign(new Error("proyecto no encontrado"), {status: 404});
    const c = capitulosDe(p).find((x) => x.nombre === n);
    if (c) return c._id;
    if (!crear) throw Object.assign(new Error(`no existe el capitulo "${n}"`), {status: 404});
    const _id = new mongoose.Types.ObjectId();
    await Proyecto.updateOne({_id: p._id}, {$push: {capitulos: {_id, nombre: n}}});
    return String(_id);
}

// Siguiente orden libre al final de un capitulo (null = "Sin capitulo").
async function ordenAlFinal(id_proyecto, capitulo) {
    const ultima = await Eventos.findOne({id_proyecto: String(id_proyecto), "organizacion.capitulo": capitulo || {$exists: false},
        "organizacion.orden": {$type: "number"}}).sort({"organizacion.orden": -1}).select("organizacion").lean();
    return ultima ? ultima.organizacion.orden + 1 : 0;
}

// Pone un documento al final de un capitulo (o en "Sin capitulo" con null).
async function ubicarEnCapitulo(id_evento, id_proyecto, capitulo) {
    const orden = await ordenAlFinal(id_proyecto, capitulo);
    await Eventos.updateOne({_id: id_evento}, capitulo
        ? {$set: {"organizacion.capitulo": capitulo, "organizacion.orden": orden}}
        : {$set: {"organizacion.orden": orden}, $unset: {"organizacion.capitulo": ""}});
}

module.exports = {capituloPorNombre, ordenAlFinal, ubicarEnCapitulo};
