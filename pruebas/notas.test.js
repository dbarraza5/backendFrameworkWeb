// Pruebas de controller/Notas.js (notas de correccion, frontend planeacion_autoria_ia.md IA-6).
const {test} = require("node:test");
const assert = require("node:assert/strict");
const {normalizarNotas, conservarNotas} = require("../controller/Notas");

test("normaliza las notas del editor", () => {
    const {notas, errores} = normalizarNotas([
        {id: "n1", t: 1500.4, x: 640.123, y: 300, objeto: "tomas", parte: "mano", texto: "  la copa queda baja  ", fecha: "2026-11-24T10:00:00Z", extra: "x"},
        {id: "n2", t: 0, x: 1, y: 2, texto: "ok", resuelta: true, respuesta: "listo"},
    ]);
    assert.deepEqual(errores, []);
    assert.deepEqual(notas[0], {id: "n1", t: 1500, x: 640.1, y: 300, texto: "la copa queda baja", resuelta: false, fecha: "2026-11-24T10:00:00Z", objeto: "tomas", parte: "mano"});
    assert.equal(notas[1].resuelta, true);
    assert.equal(notas[1].respuesta, "listo");
});

test("rechaza notas mal formadas", () => {
    const {notas, errores} = normalizarNotas([{id: "a", t: -1, x: 0, y: 0, texto: "x"}, {id: "b", t: 1, x: 0, y: 0, texto: "  "},
        {id: "c", t: 1, x: 0, y: 0, texto: "bien"}, {id: "c", t: 2, x: 0, y: 0, texto: "repetida"}]);
    assert.equal(notas.length, 1);
    assert.equal(errores.length, 3);
    assert.deepEqual(normalizarNotas("x").errores, ["notas es una lista"]);
});

test("la autoria no borra las notas del usuario", () => {
    const actual = {orden_profundidad: true, notas: [{id: "n1", t: 1, x: 0, y: 0, texto: "a"}]};
    assert.deepEqual(conservarNotas({dialogos: []}, actual), {dialogos: [], notas: actual.notas});
    assert.deepEqual(conservarNotas({notas: []}, actual), {notas: []}, "si las manda, se respetan");
    assert.deepEqual(conservarNotas({a: 1}, {}), {a: 1});
});
