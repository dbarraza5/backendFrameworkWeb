// Respaldo de proyectos (controller/RespaldoProyecto.js). Montado en /api, con sesion.
//   GET  /api/proyecto/:id_proyecto/exportar   -> .zip del proyecto (solo el dueno)
//   GET  /api/proyectos/exportar               -> .zip con todos los proyectos del usuario
//   POST /api/proyectos/importar  (multipart "archivo")  -> [{_id, nombre, conteos, ...}]
const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const Proyecto = require("../modelo/Proyecto");
const {exportarProyecto, exportarTodos, importar} = require("../controller/RespaldoProyecto");

const router = express.Router();
const MAX_BYTES = 1024 * 1024 * 1024;
const subir = multer({storage: multer.memoryStorage(), limits: {fileSize: MAX_BYTES}}).single("archivo");

function enviarZip(res, {zip, nombre}) {
    res.set("Content-Type", "application/zip");
    res.set("Content-Disposition", `attachment; filename="${nombre}"`);
    res.set("Access-Control-Expose-Headers", "Content-Disposition");
    res.send(zip);
}

const fallo = (res, err) => res.status(err.status || 500).send({error: err.message});

router.get("/proyecto/:id_proyecto/exportar", async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id_proyecto)) return res.status(400).send({error: "id de proyecto invalido"});
        const p = await Proyecto.findById(req.params.id_proyecto).select(["usuario_id"]);
        if (!p) return res.status(404).send({error: "proyecto no encontrado"});
        if (String(p.usuario_id) !== String(req.session.user.id)) return res.status(403).send({error: "el proyecto no es tuyo"});
        enviarZip(res, await exportarProyecto(p._id));
    } catch (err) { fallo(res, err); }
});

router.get("/proyectos/exportar", async (req, res) => {
    try { enviarZip(res, await exportarTodos(req.session.user.id)); } catch (err) { fallo(res, err); }
});

router.post("/proyectos/importar", (req, res) => {
    subir(req, res, async (err) => {
        if (err) return res.status(400).send({error: err.code === "LIMIT_FILE_SIZE" ? "el archivo supera 1 GB" : err.message});
        if (!req.file) return res.status(400).send({error: "falta el archivo .zip"});
        try { res.status(201).json(await importar(req.file.buffer, req.session.user.id)); } catch (e) { fallo(res, e); }
    });
});

module.exports = router;
