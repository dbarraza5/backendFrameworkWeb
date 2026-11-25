// Notas de correccion ancladas a una escena (frontend documento/planeacion_autoria_ia.md, fase IA-6).
// Viven en escena.notas del documento de eventos: [{id, t, x, y, objeto?, parte?, texto, resuelta, respuesta?, fecha}].
// Funciones puras: se prueban sin base de datos (pruebas/notas.test.js).

const MAX_NOTAS = 300, MAX_TEXTO = 2000;
const num = (v) => typeof v === "number" && Number.isFinite(v);
const texto = (v, max) => (typeof v === "string" ? v.slice(0, max) : undefined);

// Valida y limpia la lista que manda el editor -> {notas, errores}
function normalizarNotas(lista) {
    const errores = [];
    if (!Array.isArray(lista)) return {notas: [], errores: ["notas es una lista"]};
    if (lista.length > MAX_NOTAS) errores.push(`como mucho ${MAX_NOTAS} notas`);
    const notas = [], ids = new Set();
    lista.slice(0, MAX_NOTAS).forEach((n, i) => {
        if (!n || typeof n !== "object") { errores.push(`nota #${i}: no es un objeto`); return; }
        const id = texto(n.id, 40);
        if (!id || ids.has(id)) { errores.push(`nota #${i}: falta id (o esta repetido)`); return; }
        if (!num(n.t) || n.t < 0) { errores.push(`nota ${id}: t es el instante en ms (>= 0)`); return; }
        if (!num(n.x) || !num(n.y)) { errores.push(`nota ${id}: x e y son el punto en el dibujo`); return; }
        const t = texto(n.texto, MAX_TEXTO);
        if (!t || !t.trim()) { errores.push(`nota ${id}: falta texto`); return; }
        ids.add(id);
        const o = {id, t: Math.round(n.t), x: Math.round(n.x * 10) / 10, y: Math.round(n.y * 10) / 10, texto: t.trim(), resuelta: n.resuelta === true,
            fecha: texto(n.fecha, 40) || new Date().toISOString()};
        for (const k of ["objeto", "parte"]) { const v = texto(n[k], 120); if (v) o[k] = v; }
        const r = texto(n.respuesta, MAX_TEXTO);
        if (r && r.trim()) o.respuesta = r.trim();
        notas.push(o);
    });
    return {notas, errores};
}

// La escena que manda la autoria no trae notas: se conservan las que ya estaban (las escribe el usuario)
function conservarNotas(escenaNueva, escenaActual) {
    if (!escenaNueva || typeof escenaNueva !== "object") return escenaNueva;
    const notas = escenaActual && Array.isArray(escenaActual.notas) ? escenaActual.notas : null;
    if (!notas || !notas.length || escenaNueva.notas !== undefined) return escenaNueva;
    return {...escenaNueva, notas};
}

module.exports = {normalizarNotas, conservarNotas, MAX_NOTAS};
