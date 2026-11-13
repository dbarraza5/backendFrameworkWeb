const mongoose = require("mongoose")

// Version congelada de un documento de Eventos (Fase 6C del editor). Una instancia
// por referencia puede quedar "fijada" a una version: usa esta foto del asset
// (dibujo + eventos) aunque el documento original siga cambiando.
// `contenido` guarda el documento tal cual (Mixed): no se valida contra el schema
// de Eventos para que la foto conserve todo lo que tenia al momento de tomarla.
const VersionEventosSchema = new mongoose.Schema({
    id_eventos: {
        type: String,
        required: true,
        index: true,
        immutable: true,
    },
    numero: {
        type: Number,
        required: true,
        immutable: true,
    },
    descripcion: {
        type: String,
        default: "",
    },
    fecha_creacion: {
        type: Date,
        default: Date.now,
        immutable: true,
    },
    contenido: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },
});

VersionEventosSchema.index({id_eventos: 1, numero: 1}, {unique: true});

const VersionEventos = mongoose.model("VersionEventos", VersionEventosSchema, "versiones_eventos")

module.exports = {VersionEventos}
