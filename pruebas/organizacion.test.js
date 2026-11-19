// Pruebas de controller/Organizacion.js (sin base de datos):  node --test pruebas/
const {test} = require("node:test");
const assert = require("node:assert/strict");
const {tipoAutomatico, filaDocumento, validarCambio} = require("../controller/Organizacion");

const asset = {_id: "a", nombre: "Casa", grupos_figuras: [{nombre: "pared", clases: []}], escena: {reacciones: {al_tocar_suelo: {}}}};
const escena = (g) => ({_id: "e", nombre: "Calle", grupos_figuras: [{nombre: "default"}, g], escena: {}});

test("tipo automatico: escena si tiene instancia, efecto, camara o configuracion de escena", () => {
    assert.equal(tipoAutomatico(asset), "asset");
    assert.equal(tipoAutomatico(escena({instancia: {id_eventos: "x"}})), "escena");
    assert.equal(tipoAutomatico(escena({efecto: {tipo: "explosion"}})), "escena");
    assert.equal(tipoAutomatico(escena({clases: ["camara"]})), "escena");
    assert.equal(tipoAutomatico({grupos_figuras: [], escena: {orden_profundidad: true}}), "escena");
    assert.equal(tipoAutomatico({}), "asset");
});

test("fila: el tipo manual gana; principal solo cuenta en escenas", () => {
    assert.deepEqual([filaDocumento(asset).tipo, filaDocumento(asset).manual], ["asset", false]);
    const a2e = filaDocumento({...asset, organizacion: {tipo: "escena", principal: true}});
    assert.deepEqual([a2e.tipo, a2e.tipo_auto, a2e.manual, a2e.principal], ["escena", "asset", true, true]);
    assert.equal(filaDocumento({...asset, organizacion: {principal: true}}).principal, false);
});

test("validar cambio", () => {
    assert.deepEqual(validarCambio({tipo: "asset"}).cambios, {$set: {"organizacion.tipo": "asset"}});
    assert.deepEqual(validarCambio({tipo: null}).cambios, {$unset: {"organizacion.tipo": ""}});
    assert.deepEqual(validarCambio({principal: true, tipo: "escena"}).cambios, {$set: {"organizacion.tipo": "escena", "organizacion.principal": true}});
    assert.deepEqual(validarCambio({principal: false}).cambios, {$unset: {"organizacion.principal": ""}});
    assert.match(validarCambio({tipo: "pelicula"}).error, /tipo es/);
    assert.match(validarCambio({carpeta: "x"}).error, /desconocidos/);
    assert.match(validarCambio({}).error, /nada que cambiar/);
});

// ---- Fase 2: capitulos ----
const {capitulosDe, validarNombre, moverEn, validarOrden, escenaVacia} = require("../controller/Organizacion");

test("fila: el capitulo solo cuenta en escenas", () => {
    assert.equal(filaDocumento({...escena({clases: ["camara"]}), organizacion: {capitulo: "c1", orden: 2}}).capitulo, "c1");
    assert.equal(filaDocumento({...escena({clases: ["camara"]}), organizacion: {capitulo: "c1", orden: 2}}).orden, 2);
    assert.equal(filaDocumento({...asset, organizacion: {capitulo: "c1"}}).capitulo, null);
});

test("capitulos: nombre, mover y orden de escenas", () => {
    assert.deepEqual(capitulosDe({capitulos: [{_id: 1, nombre: "Uno"}]}), [{_id: "1", nombre: "Uno"}]);
    assert.deepEqual(capitulosDe({}), []);
    assert.equal(validarNombre("  Cap 1 ", "capitulo").nombre, "Cap 1");
    assert.match(validarNombre("   ", "capitulo").error, /falta/);
    assert.deepEqual(moverEn(["a", "b", "c"], 2, -1), ["a", "c", "b"]);
    assert.deepEqual(moverEn(["a", "b"], 0, -1), ["a", "b"]);
    assert.deepEqual(validarOrden({capitulo: "c1", ids: ["x", "y"]}, ["c1"]), {capitulo: "c1", ids: ["x", "y"]});
    assert.deepEqual(validarOrden({capitulo: null, ids: ["x"]}, []), {capitulo: null, ids: ["x"]});
    assert.match(validarOrden({capitulo: "zz", ids: ["x"]}, ["c1"]).error, /no existe/);
    assert.match(validarOrden({capitulo: "c1", ids: ["x", "x"]}, ["c1"]).error, /repetidos/);
});

test("escena vacia: se clasifica sola como escena", () => {
    const e = escenaVacia();
    assert.equal(tipoAutomatico(e), "escena");
    assert.equal(e.escena.precision, "decimal");
    assert.ok(e.grupos_figuras.some((g) => g.clases.includes("camara") && g.camara && g.camara.ancho === 1280));
});
