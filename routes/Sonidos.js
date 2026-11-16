// Sonidos de un proyecto (planeacion_sonido.md del frontend). Montado en /api, con sesion:
// solo el dueno del proyecto. Los archivos se guardan en
// storage/usuarios/<usuario>/proyectos/<proyecto>/sonidos/<id>.<ext>
const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const fs = require("node:fs");
const path = require("node:path");
const Proyecto = require("../modelo/Proyecto");
const {Eventos} = require("../modelo/Eventos");
const {Sonido, sonidoPublico} = require("../modelo/Sonido");

const router = express.Router();
const MAX_BYTES = 15 * 1024 * 1024;
const EXTENSIONES = {"audio/mpeg": "mp3", "audio/mp3": "mp3", "audio/ogg": "ogg", "audio/wav": "wav", "audio/x-wav": "wav",
    "audio/wave": "wav", "audio/webm": "webm", "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/aac": "aac", "audio/flac": "flac"};
const subir = multer({storage: multer.memoryStorage(), limits: {fileSize: MAX_BYTES}}).single("archivo");

const esId = (id) => mongoose.Types.ObjectId.isValid(String(id));

async function proyectoDelUsuario(id, req, res) {
    if (!esId(id)) { res.status(400).send({error: "id de proyecto invalido"}); return null; }
    const p = await Proyecto.findById(id).select(["_id", "usuario_id"]);
    if (!p) { res.status(404).send({error: "proyecto no encontrado"}); return null; }
    if (String(p.usuario_id) !== String(req.session.user.id)) { res.status(403).send({error: "el proyecto no es tuyo"}); return null; }
    return p;
}

// Sonido + su proyecto (comprobando que el proyecto sea del usuario)
async function sonidoDelUsuario(req, res) {
    if (!esId(req.params.id_sonido)) { res.status(400).send({error: "id de sonido invalido"}); return null; }
    const s = await Sonido.findById(req.params.id_sonido);
    if (!s) { res.status(404).send({error: "sonido no encontrado"}); return null; }
    const p = await proyectoDelUsuario(s.id_proyecto, req, res);
    return p ? {s, p} : null;
}

// Datos que calcula el navegador al decodificar el audio (duracion y forma de onda)
function metadatos(body) {
    const r = {};
    const d = parseFloat(body.duracion_ms);
    if (Number.isFinite(d) && d >= 0) r.duracion_ms = Math.round(d);
    if (body.picos) {
        try {
            const p = typeof body.picos === "string" ? JSON.parse(body.picos) : body.picos;
            if (Array.isArray(p)) r.picos = p.slice(0, 400).map((v) => Math.max(0, Math.min(1, Number(v) || 0)));
        } catch (e) { /* sin forma de onda */ }
    }
    return r;
}

function guardarArchivo(p, s, file) {
    const ext = EXTENSIONES[file.mimetype] || (path.extname(file.originalname || "").slice(1).toLowerCase() || "bin");
    const carpeta = `/home/app/storage/usuarios/${p.usuario_id}/proyectos/${p._id}/sonidos`;
    fs.mkdirSync(carpeta, {recursive: true});
    const ruta = `${carpeta}/${s._id}.${ext}`;
    // un archivo anterior con otra extension se borra
    if (s.archivo && s.archivo.ruta && s.archivo.ruta !== ruta) { try { fs.unlinkSync(s.archivo.ruta); } catch (e) { /* ya no estaba */ } }
    fs.writeFileSync(ruta, file.buffer);
    s.archivo = {ruta, tipo: file.mimetype, tamano: file.size, original: file.originalname};
    s.estado = "listo";
    s.revision = (s.revision || 0) + 1;
}

function conArchivo(req, res, siguiente) {
    subir(req, res, (err) => {
        if (err) return res.status(400).send({error: err.code === "LIMIT_FILE_SIZE" ? `el archivo supera ${MAX_BYTES / 1024 / 1024} MB` : err.message});
        if (req.file && !/^audio\//.test(req.file.mimetype) && !EXTENSIONES[req.file.mimetype]) {
            return res.status(400).send({error: `no es un archivo de audio (${req.file.mimetype})`});
        }
        siguiente();
    });
}

// Lista de sonidos del proyecto
router.get("/proyecto/:id_proyecto/sonidos", async (req, res) => {
    try {
        const p = await proyectoDelUsuario(req.params.id_proyecto, req, res);
        if (!p) return;
        const lista = await Sonido.find({id_proyecto: String(p._id)}).sort({nombre: 1});
        res.json(lista.map(sonidoPublico));
    } catch (err) { res.status(500).send({error: err.message}); }
});

// Crear: con archivo (multipart "archivo") queda listo; sin archivo, pendiente
router.post("/proyecto/:id_proyecto/sonidos", conArchivo, async (req, res) => {
    try {
        const p = await proyectoDelUsuario(req.params.id_proyecto, req, res);
        if (!p) return;
        const nombre = String((req.body && req.body.nombre) || (req.file && path.parse(req.file.originalname).name) || "").trim();
        if (!nombre) return res.status(400).send({error: "falta el nombre"});
        if (await Sonido.findOne({id_proyecto: String(p._id), nombre})) return res.status(409).send({error: `ya existe el sonido "${nombre}"`});
        const s = new Sonido({id_proyecto: String(p._id), nombre, nota: String(req.body.nota || ""), ...metadatos(req.body)});
        if (req.file) guardarArchivo(p, s, req.file);
        await s.save();
        res.status(201).json(sonidoPublico(s));
    } catch (err) { res.status(500).send({error: err.message}); }
});

// Subir o reemplazar el archivo (un pendiente pasa a listo)
router.put("/sonido/:id_sonido/archivo", conArchivo, async (req, res) => {
    try {
        const r = await sonidoDelUsuario(req, res);
        if (!r) return;
        if (!req.file) return res.status(400).send({error: "falta el archivo"});
        guardarArchivo(r.p, r.s, req.file);
        Object.assign(r.s, metadatos(req.body), {fecha_actualizacion: new Date()});
        await r.s.save();
        res.json(sonidoPublico(r.s));
    } catch (err) { res.status(500).send({error: err.message}); }
});

// Renombrar o cambiar la nota
router.patch("/sonido/:id_sonido", async (req, res) => {
    try {
        const r = await sonidoDelUsuario(req, res);
        if (!r) return;
        const b = req.body || {};
        if (b.nombre !== undefined) {
            const nombre = String(b.nombre).trim();
            if (!nombre) return res.status(400).send({error: "el nombre no puede quedar vacio"});
            if (await Sonido.findOne({id_proyecto: r.s.id_proyecto, nombre, _id: {$ne: r.s._id}})) return res.status(409).send({error: `ya existe el sonido "${nombre}"`});
            r.s.nombre = nombre;
        }
        if (b.nota !== undefined) r.s.nota = String(b.nota);
        r.s.fecha_actualizacion = new Date();
        await r.s.save();
        res.json(sonidoPublico(r.s));
    } catch (err) { res.status(500).send({error: err.message}); }
});

// Documentos del proyecto que usan el sonido (clips o reacciones)
async function usos(s) {
    const docs = await Eventos.find({id_proyecto: s.id_proyecto}).select(["nombre", "eventos", "grupos_figuras", "escena"]).lean();
    const id = String(s._id);
    return docs.filter((d) => JSON.stringify([d.eventos, d.grupos_figuras, d.escena]).includes(`"${id}"`)).map((d) => d.nombre);
}

router.get("/sonido/:id_sonido/usos", async (req, res) => {
    try {
        const r = await sonidoDelUsuario(req, res);
        if (!r) return;
        res.json({usos: await usos(r.s)});
    } catch (err) { res.status(500).send({error: err.message}); }
});

// Borrar: solo si nadie lo usa (con ?forzar=1 igual; las referencias quedan como "sonido borrado")
router.delete("/sonido/:id_sonido", async (req, res) => {
    try {
        const r = await sonidoDelUsuario(req, res);
        if (!r) return;
        const u = await usos(r.s);
        if (u.length && req.query.forzar !== "1") return res.status(409).send({error: `lo usan: ${u.join(", ")}`, usos: u});
        if (r.s.archivo && r.s.archivo.ruta) { try { fs.unlinkSync(r.s.archivo.ruta); } catch (e) { /* ya no estaba */ } }
        await r.s.deleteOne();
        res.json({borrado: r.s.nombre});
    } catch (err) { res.status(500).send({error: err.message}); }
});

// El archivo de audio
router.get("/sonido/:id_sonido/archivo", async (req, res) => {
    try {
        const r = await sonidoDelUsuario(req, res);
        if (!r) return;
        if (!r.s.archivo || !r.s.archivo.ruta || !fs.existsSync(r.s.archivo.ruta)) return res.status(404).send({error: "el sonido todavia no tiene archivo"});
        res.set("Content-Type", r.s.archivo.tipo || "application/octet-stream");
        res.set("Cache-Control", "private, max-age=31536000");      // la URL lleva ?r=<revision>
        fs.createReadStream(r.s.archivo.ruta).pipe(res);
    } catch (err) { res.status(500).send({error: err.message}); }
});

module.exports = router;
