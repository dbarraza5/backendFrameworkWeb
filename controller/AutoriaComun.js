// Comun a la API de autoria (routes/Autoria.js, con llave) y al editor (routes/Api.js,
// con sesion): validar lo compilado del formato simple y crear un asset (dibujo + eventos).
// Fases A2 y A5 de planeacion_autoria_asistida.md (frontend).
const mongoose = require("mongoose");
const {Eventos} = require("../modelo/Eventos");
const {Animacion} = require("../modelo/Animacion");

const esId = (id) => mongoose.Types.ObjectId.isValid(String(id));

// ---------------- validacion de lo compilado ----------------
async function validar(body, id_proyecto, {parcial = false} = {}) {
    const errores = [];
    const b = body || {};
    if (!parcial && !String(b.nombre || "").trim()) errores.push("falta nombre");
    if (!parcial || b.grupos_figuras !== undefined) {
        if (!Array.isArray(b.grupos_figuras) || !b.grupos_figuras.length) errores.push("grupos_figuras debe ser una lista no vacia");
        else {
            const nombres = new Set();
            for (const [i, g] of b.grupos_figuras.entries()) {
                if (!g || !g.nombre) { errores.push(`grupo #${i}: falta nombre`); continue; }
                if (nombres.has(g.nombre)) errores.push(`grupo "${g.nombre}": nombre repetido`);
                nombres.add(g.nombre);
                if (g._virtual) errores.push(`grupo "${g.nombre}": las partes virtuales de instancias no se guardan`);
            }
            // (un objeto enganchado a una parte de una instancia tiene de padre "<instancia>::<parte>": la parte
            //  existe solo en el motor, al cargar el asset; basta con que exista la instancia)
            const instancias = new Set(b.grupos_figuras.filter((g) => g && g.instancia).map((g) => g.nombre));
            for (const g of b.grupos_figuras) {
                if (!g || !g.nodo_padre || g.nodo_padre === "root" || nombres.has(g.nodo_padre)) continue;
                const k = g.nodo_padre.indexOf("::");
                if (k > 0 && instancias.has(g.nodo_padre.slice(0, k))) continue;
                errores.push(`grupo "${g.nombre}": su padre "${g.nodo_padre}" no existe`);
            }
            // las instancias solo pueden apuntar a documentos del mismo proyecto
            const ids = [...new Set(b.grupos_figuras.filter((g) => g && g.instancia && g.instancia.id_eventos).map((g) => String(g.instancia.id_eventos)))];
            const validos = ids.filter(esId);
            for (const id of ids.filter((x) => !esId(x))) errores.push(`instancia con id de asset invalido "${id}"`);
            if (validos.length) {
                const encontrados = await Eventos.find({_id: {$in: validos}, id_proyecto}).select("_id");
                const ok = new Set(encontrados.map((d) => String(d._id)));
                for (const id of validos) if (!ok.has(id)) errores.push(`instancia de un asset que no es de este proyecto o no existe (${id})`);
            }
        }
    }
    if (b.eventos !== undefined && !Array.isArray(b.eventos)) errores.push("eventos debe ser una lista");
    if (b.eventos && !b.eventos.some((e) => e && e.nombre === "EventoGeneral")) errores.push('eventos debe incluir "EventoGeneral"');
    return errores;
}

async function metaFiguras(id_proyecto) {
    const d = await Eventos.findOne({id_proyecto}).select("meta_figuras");
    return d ? d.meta_figuras : [];
}

const eventoGeneral = () => [{nombre: "EventoGeneral", nodo_padre: "Nodo_Default", visible: true, bucle: false,
    tiempo_bucle: 0, tiempo_inicio: 0, tiempo_final: 1000, x: 0, y: 0, reposicionar: true, tiempo_relativo: 0,
    objetos: [], macros: [], script: null}];

const esEscena = (d) => (d.grupos_figuras || []).some((g) => g.instancia && g.instancia.id_eventos);

// Crea un asset: dibujo (Animacion, para editarlo en el editor de dibujo) + documento de
// eventos (lo que se instancia). Devuelve {status, body}.
async function crearAsset(id_proyecto, body, {creado_por_llave} = {}) {
    const errores = await validar(body, id_proyecto);
    if (errores.length) return {status: 400, body: {ok: false, errores}};
    const nombre = String(body.nombre).trim();
    if (await Eventos.findOne({id_proyecto, nombre})) {
        return {status: 409, body: {ok: false, errores: [`ya existe "${nombre}" en el proyecto`]}};
    }
    const nombre_animacion = nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9_-]+/g, "_").toLowerCase();
    if (await Animacion.findOne({nombre_verificacion: `${id_proyecto}.${nombre_animacion}`})) {
        return {status: 409, body: {ok: false, errores: [`ya existe el dibujo "${nombre_animacion}"`]}};
    }
    const meta = await metaFiguras(id_proyecto);
    const plantilla = await Animacion.findOne({id_proyecto}).select(["meta_movimientos", "meta_figuras"]);
    const marca = creado_por_llave ? {creado_por_llave} : {};
    const dibujo = await Animacion.create({
        id_proyecto, nombre_animacion, descripcion: nombre, raiz: false,
        nombre_verificacion: `${id_proyecto}.${nombre_animacion}`,
        meta_figuras: plantilla ? plantilla.meta_figuras : meta,
        meta_movimientos: plantilla ? plantilla.meta_movimientos : [],
        grupos_figuras: body.grupos_figuras, lista_imagenes: [], ...marca,
    });
    const doc = await Eventos.create({
        id_proyecto, nombre, eventos: body.eventos || eventoGeneral(),
        grupos_figuras: body.grupos_figuras, meta_figuras: meta, escena: body.escena || {}, ...marca,
    });
    return {status: 201, body: {ok: true, id_eventos: doc._id, id_dibujo: dibujo._id, nombre}};
}

module.exports = {esId, validar, metaFiguras, eventoGeneral, esEscena, crearAsset};
