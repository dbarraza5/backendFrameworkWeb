const {LlaveAutoria, hashLlave} = require("../modelo/LlaveAutoria");

// Acceso a /autoria con una llave de proyecto (Fase A2): cabecera
// "X-Llave-Autoria: <llave>" o "Authorization: Llave <llave>".
// Deja en req.id_proyecto el proyecto de la llave.
async function verificarLlave(req, res, next) {
    try {
        const auth = req.headers["authorization"] || "";
        const llave = req.headers["x-llave-autoria"] || (auth.startsWith("Llave ") ? auth.slice(6).trim() : null);
        if (!llave) return res.status(401).send({error: "Falta la llave de autoria (cabecera X-Llave-Autoria)"});
        const doc = await LlaveAutoria.findOne({hash: hashLlave(llave), revocada: null});
        if (!doc) return res.status(401).send({error: "Llave de autoria invalida o revocada"});
        req.llave = doc;
        req.id_proyecto = doc.id_proyecto;
        LlaveAutoria.updateOne({_id: doc._id}, {$set: {ultimo_uso: new Date()}}).catch(() => {});
        next();
    } catch (err) {
        res.status(500).send({error: err.message});
    }
}

module.exports = {verificarLlave}
