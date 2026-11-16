const mongoose = require("mongoose")
const crypto = require("crypto")

// Llave de API para la autoria asistida (Fase A2 del editor): da acceso a /autoria
// para UN proyecto, sin sesion de navegador ni contrasena. Solo se guarda el hash
// (sha256) de la llave; la llave completa se muestra una unica vez al crearla.
// Permisos: leer y crear/actualizar assets y escenas del proyecto, y borrar solo lo que
// creo esta misma llave (Fase A6).
const LlaveAutoriaSchema = new mongoose.Schema({
    id_proyecto: {type: String, required: true, index: true, immutable: true},
    nombre: {type: String, required: true},
    prefijo: {type: String, required: true},          // para reconocerla en la lista
    hash: {type: String, required: true, unique: true, immutable: true},
    creada: {type: Date, default: Date.now, immutable: true},
    ultimo_uso: {type: Date, default: null},
    revocada: {type: Date, default: null},
});

const hashLlave = (llave) => crypto.createHash("sha256").update(String(llave)).digest("hex");

const generarLlave = () => "anim_" + crypto.randomBytes(24).toString("hex");

const LlaveAutoria = mongoose.model("LlaveAutoria", LlaveAutoriaSchema, "llaves_autoria")

module.exports = {LlaveAutoria, hashLlave, generarLlave}
