const mongoose = require("mongoose")

// Sonido de un proyecto (planeacion_sonido.md del frontend). Escenas y assets lo usan por
// referencia (clips y reacciones con `sonido: <_id>`), nunca copian el audio.
// estado "pendiente": existe con nombre pero todavia no tiene archivo (el seguimiento
// del editor avisa que falta subirlo); "listo": tiene archivo.
const SonidoSchema = new mongoose.Schema({
    id_proyecto: {type: String, required: true, index: true, immutable: true},
    nombre: {type: String, required: true},
    estado: {type: String, enum: ["pendiente", "listo"], default: "pendiente"},
    archivo: {
        ruta: {type: String},             // ruta en el storage del backend
        tipo: {type: String},             // tipo MIME
        tamano: {type: Number},           // bytes
        original: {type: String},         // nombre del archivo subido
    },
    revision: {type: Number, default: 0}, // sube con cada archivo nuevo (cache del navegador)
    duracion_ms: {type: Number, default: 0},
    picos: {type: [Number], default: []}, // forma de onda reducida (0..1) para dibujarla
    nota: {type: String, default: ""},    // p. ej. "ladrido corto, seco"
    creado_por_llave: {type: String, default: null},
    fecha_creacion: {type: Date, default: Date.now, immutable: true},
    fecha_actualizacion: {type: Date, default: Date.now},
});

SonidoSchema.index({id_proyecto: 1, nombre: 1}, {unique: true});

const Sonido = mongoose.model("Sonido", SonidoSchema, "sonidos")

// Lo que se manda al cliente (sin la ruta interna del archivo)
const sonidoPublico = (s) => ({
    _id: s._id, id_proyecto: s.id_proyecto, nombre: s.nombre, estado: s.estado, revision: s.revision,
    duracion_ms: s.duracion_ms, picos: s.picos, nota: s.nota,
    archivo: s.archivo && s.archivo.ruta ? {tipo: s.archivo.tipo, tamano: s.archivo.tamano, original: s.archivo.original} : null,
    fecha_creacion: s.fecha_creacion, fecha_actualizacion: s.fecha_actualizacion,
});

module.exports = {Sonido, sonidoPublico}
