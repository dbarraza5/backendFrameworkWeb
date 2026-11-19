// Organizacion del proyecto (frontend documento/planeacion_organizacion.md, fases 1 y 2).
// Funciones puras: se prueban sin base de datos (pruebas/organizacion.test.js).

// Tipo automatico de un documento de eventos: "escena" si tiene instancias, efectos o camara,
// o configuracion de escena aparte de las reacciones de sonido; si no, "asset".
// (La misma regla que Descompilador.esEscena del frontend.)
function tipoAutomatico(doc) {
    const gs = (doc && doc.grupos_figuras) || [];
    const conEscena = gs.some((g) => (g.instancia && g.instancia.id_eventos) || (g.efecto && g.efecto.tipo) || (g.clases || []).includes("camara"));
    const esc = (doc && doc.escena) || {};
    const config = Object.keys(esc).filter((k) => k !== "reacciones" && esc[k] !== undefined && esc[k] !== null);
    return conEscena || config.length ? "escena" : "asset";
}

// Fila de la lista del proyecto: el tipo efectivo es el manual, o el automatico.
function filaDocumento(doc) {
    const org = (doc && doc.organizacion) || {};
    const tipo_auto = tipoAutomatico(doc);
    const manual = org.tipo === "escena" || org.tipo === "asset" ? org.tipo : null;
    const tipo = manual || tipo_auto;
    return {
        _id: String(doc._id), nombre: doc.nombre,
        fecha_creacion: doc.fecha_creacion, fecha_actualizacion: doc.fecha_actualizacion,
        tipo, tipo_auto, manual: !!manual,
        principal: tipo === "escena" && org.principal === true,
        // fase 2: capitulo (id de un capitulo del proyecto) y orden dentro de el; solo las escenas
        capitulo: tipo === "escena" && org.capitulo ? String(org.capitulo) : null,
        orden: typeof org.orden === "number" ? org.orden : null,
    };
}

// Valida un cambio de organizacion: {tipo?: "escena" | "asset" | null, principal?: bool}.
// Devuelve {cambios} (campos de mongo a $set / $unset) o {error}.
function validarCambio(body) {
    const b = body || {};
    const set = {}, unset = {};
    const desconocidos = Object.keys(b).filter((k) => !["tipo", "principal"].includes(k));
    if (desconocidos.length) return {error: `campos desconocidos: ${desconocidos.join(", ")} (validos: tipo, principal)`};
    if ("tipo" in b) {
        if (b.tipo === null) unset["organizacion.tipo"] = "";
        else if (b.tipo === "escena" || b.tipo === "asset") set["organizacion.tipo"] = b.tipo;
        else return {error: 'tipo es "escena", "asset" o null (automatico)'};
    }
    if ("principal" in b) {
        if (typeof b.principal !== "boolean") return {error: "principal es true o false"};
        if (b.principal) set["organizacion.principal"] = true; else unset["organizacion.principal"] = "";
    }
    if (!Object.keys(set).length && !Object.keys(unset).length) return {error: "no hay nada que cambiar"};
    return {cambios: {...(Object.keys(set).length ? {$set: set} : {}), ...(Object.keys(unset).length ? {$unset: unset} : {})}};
}

// Campos que hacen falta para clasificar sin traer las figuras.
// ---- Fase 2: capitulos (viven en el proyecto: proyecto.capitulos = [{_id, nombre}], en orden) ----

const capitulosDe = (p) => ((p && p.capitulos) || []).map((c) => ({_id: String(c._id), nombre: c.nombre}));

// Nombre de un capitulo o de una escena nueva.
function validarNombre(nombre, que) {
    const n = String(nombre == null ? "" : nombre).trim();
    if (!n) return {error: `falta el nombre del ${que}`};
    if (n.length > 80) return {error: `el nombre del ${que} es muy largo (maximo 80)`};
    return {nombre: n};
}

// Mueve el elemento i una posicion (paso -1 sube, +1 baja). Devuelve una copia.
function moverEn(lista, i, paso) {
    const j = i + paso, l = lista.slice();
    if (i < 0 || j < 0 || j >= l.length) return l;
    [l[i], l[j]] = [l[j], l[i]];
    return l;
}

// Orden de las escenas de un capitulo: {capitulo: id | null, ids: [id de escena...]}.
// Cada escena de ids pasa a ese capitulo con orden = su posicion. Devuelve {capitulo, ids} o {error}.
function validarOrden(body, ids_capitulos) {
    const b = body || {};
    const capitulo = b.capitulo == null ? null : String(b.capitulo);
    if (capitulo !== null && !ids_capitulos.includes(capitulo)) return {error: "el capitulo no existe en el proyecto"};
    if (!Array.isArray(b.ids) || !b.ids.length) return {error: "ids es la lista de escenas en su nuevo orden"};
    const ids = b.ids.map(String);
    if (new Set(ids).size !== ids.length) return {error: "ids repetidos"};
    return {capitulo, ids};
}

// Escena nueva vacia: el evento general, el grupo raiz y una camara en el centro (1280x720).
// Con precision decimal (planeacion_capacidades.md) y 5 s de duracion.
function escenaVacia() {
    const grupo = (nombre, extra) => ({nombre, nodo_padre: "root", visible: true, color: "#000000", cx: 0, cy: 0,
        capa: 0, clases: [], lista_figuras: [], lista_pintado: [], ...extra});
    return {
        eventos: [{nombre: "EventoGeneral", nodo_padre: "Nodo_Default", visible: true, bucle: false,
            tiempo_bucle: 0, tiempo_inicio: 0, tiempo_final: 5000, x: 0, y: 0, reposicionar: true, tiempo_relativo: 0,
            objetos: [], macros: [], script: null}],
        grupos_figuras: [
            grupo("default", {clases: ["root"], lista_pintado: [{color: "#0d67c8", visible: true, elementos: [[]]}]}),
            grupo("Cámara", {color: "#f0b429", cx: 640, cy: 360, capa: 999, clases: ["camara"], camara: {ancho: 1280, alto: 720, zoom: 1}}),
        ],
        escena: {precision: "decimal", orden_profundidad: true},
    };
}

const CAMPOS_LISTA = ["_id", "nombre", "fecha_actualizacion", "fecha_creacion", "organizacion", "escena",
    "grupos_figuras.instancia.id_eventos", "grupos_figuras.efecto.tipo", "grupos_figuras.clases"];

module.exports = {tipoAutomatico, filaDocumento, validarCambio, CAMPOS_LISTA,
    capitulosDe, validarNombre, moverEn, validarOrden, escenaVacia};
