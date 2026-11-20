// Respaldo de proyectos: exportar un proyecto completo a un .zip y volver a importarlo
// (por ejemplo, si se pierde la base). El zip trae TODO lo del proyecto:
//   manifiesto.json          formato, version, proyecto, conteos
//   LEEME.txt                que es cada cosa
//   datos/proyecto.json      el documento del proyecto           (Extended JSON de MongoDB)
//   datos/animaciones.json   dibujos (coleccion animacions)
//   datos/eventos.json       assets y escenas (coleccion eventos)
//   datos/versiones.json     versiones congeladas de los eventos (versiones_eventos)
//   datos/sonidos.json       sonidos del proyecto
//   archivos/...             la carpeta del proyecto en el storage (imagenes, audio...)
// Un respaldo de VARIOS proyectos es un zip con proyectos/<nombre>.zip (uno por proyecto).
//
// Importar crea un proyecto NUEVO del usuario que importa: todos los ids (proyecto,
// documentos, usuario) se cambian por nuevos y cada referencia se corrige, en los datos
// y en las rutas de los archivos. Asi se puede importar dos veces, o en otra cuenta.
// Las llaves de autoria no se exportan (son credenciales).
const fs = require("node:fs");
const path = require("node:path");
const mongoose = require("mongoose");
const {EJSON} = mongoose.mongo.BSON;
const {crearZip, leerZip} = require("../lib/Zip");

const FORMATO = "respaldo-proyecto-animacion";
const FORMATO_VARIOS = "respaldo-proyectos-animacion";
const VERSION = 1;
const RAIZ_STORAGE = "/home/app/storage";
const COLECCIONES = [
    // [archivo en el zip, coleccion, filtro por proyecto]
    ["animaciones", "animacions", (pid) => ({id_proyecto: pid})],
    ["eventos", "eventos", (pid) => ({id_proyecto: pid})],
    ["sonidos", "sonidos", (pid) => ({id_proyecto: pid})],
];

const db = () => mongoose.connection.db;
const carpetaProyecto = (uid, pid) => path.join(RAIZ_STORAGE, "usuarios", String(uid), "proyectos", String(pid));
const json = (x) => EJSON.stringify(x, null, 1, {relaxed: true});

function listarArchivos(dir, base = dir) {
    if (!fs.existsSync(dir)) return [];
    const r = [];
    for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) r.push(...listarArchivos(p, base));
        else if (e.isFile()) r.push(path.relative(base, p).split(path.sep).join("/"));
    }
    return r;
}

const nombreArchivo = (s) => String(s || "proyecto").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "proyecto";

// ---------------------------------------------------------------- exportar
async function exportarProyecto(id_proyecto) {
    const pid = new mongoose.Types.ObjectId(String(id_proyecto));
    const proyecto = await db().collection("proyectos").findOne({_id: pid});
    if (!proyecto) throw Object.assign(new Error("proyecto no encontrado"), {status: 404});
    const spid = String(pid);
    const datos = {};
    for (const [clave, col, filtro] of COLECCIONES) datos[clave] = await db().collection(col).find(filtro(spid)).toArray();
    const idsEventos = datos.eventos.map((e) => String(e._id));
    datos.versiones = idsEventos.length ? await db().collection("versiones_eventos").find({id_eventos: {$in: idsEventos}}).toArray() : [];

    const carpeta = carpetaProyecto(proyecto.usuario_id, spid);
    const archivos = listarArchivos(carpeta);
    const conteos = Object.fromEntries(Object.entries(datos).map(([k, v]) => [k, v.length]));
    const manifiesto = {
        formato: FORMATO, version: VERSION, exportado: new Date().toISOString(),
        proyecto: {_id: spid, nombre: proyecto.nombre, descripcion: proyecto.descripcion || ""},
        usuario_id: String(proyecto.usuario_id), conteos, archivos: archivos.length,
    };
    const entradas = [
        {nombre: "manifiesto.json", datos: JSON.stringify(manifiesto, null, 1)},
        {nombre: "LEEME.txt", datos: leeme(manifiesto)},
        {nombre: "datos/proyecto.json", datos: json(proyecto)},
        ...Object.entries(datos).map(([k, v]) => ({nombre: `datos/${k}.json`, datos: json(v)})),
        ...archivos.map((a) => ({nombre: `archivos/${a}`, datos: fs.readFileSync(path.join(carpeta, a)),
            comprimir: !/\.(png|jpe?g|gif|webp|mp3|ogg|m4a|aac|webm|flac|mp4)$/i.test(a)})),
    ];
    return {zip: crearZip(entradas), nombre: `${nombreArchivo(proyecto.nombre)}.zip`, manifiesto};
}

async function exportarTodos(usuario_id) {
    const proyectos = await db().collection("proyectos").find({usuario_id: String(usuario_id)}).sort({nombre: 1}).toArray();
    const usados = new Set(), entradas = [], lista = [];
    for (const p of proyectos) {
        const {zip, nombre, manifiesto} = await exportarProyecto(p._id);
        let n = nombre, i = 2;
        while (usados.has(n)) n = nombre.replace(/\.zip$/, `_${i++}.zip`);
        usados.add(n);
        entradas.push({nombre: `proyectos/${n}`, datos: zip, comprimir: false});
        lista.push({archivo: `proyectos/${n}`, nombre: manifiesto.proyecto.nombre, conteos: manifiesto.conteos, archivos: manifiesto.archivos});
    }
    const manifiesto = {formato: FORMATO_VARIOS, version: VERSION, exportado: new Date().toISOString(), proyectos: lista};
    entradas.unshift({nombre: "manifiesto.json", datos: JSON.stringify(manifiesto, null, 1)},
        {nombre: "LEEME.txt", datos: `Respaldo de ${lista.length} proyecto(s) del editor de animacion.\n` +
            `Cada proyecto es un .zip dentro de proyectos/ (se puede importar este archivo completo o cada uno por separado).\n`});
    const fecha = new Date().toISOString().slice(0, 10);
    return {zip: crearZip(entradas), nombre: `proyectos_${fecha}.zip`, manifiesto};
}

function leeme(m) {
    return [
        `Respaldo del proyecto "${m.proyecto.nombre}" (editor de animacion), exportado ${m.exportado}.`,
        ``,
        `Para recuperarlo: pagina de Proyectos -> Importar, y elegir este .zip. Se crea un proyecto nuevo`,
        `(con ids nuevos); las referencias entre documentos y los archivos se corrigen solos.`,
        ``,
        `Contenido (formato ${m.formato} v${m.version}):`,
        `  manifiesto.json         datos del respaldo y cantidades`,
        `  datos/proyecto.json     el proyecto`,
        `  datos/animaciones.json  dibujos (${m.conteos.animaciones})`,
        `  datos/eventos.json      assets y escenas (${m.conteos.eventos})`,
        `  datos/versiones.json    versiones congeladas de assets (${m.conteos.versiones})`,
        `  datos/sonidos.json      sonidos (${m.conteos.sonidos})`,
        `  archivos/               imagenes y audio del proyecto (${m.archivos} archivo(s))`,
        ``,
        `Los .json estan en Extended JSON de MongoDB ({"$oid": ...} para ids, {"$date": ...} para fechas):`,
        `se pueden leer con cualquier editor o cargar con mongoimport --jsonArray.`,
        ``,
    ].join("\n");
}

// ---------------------------------------------------------------- importar
const HEX = /[0-9a-f]{24}/g;

// Reemplaza cada id viejo (en ObjectId, en textos y en claves) por el nuevo
function cambiarIds(x, mapa) {
    const texto = (s) => s.replace(HEX, (h) => mapa.get(h) || h);
    if (typeof x === "string") return texto(x);
    if (x instanceof mongoose.mongo.ObjectId) { const n = mapa.get(x.toHexString()); return n ? new mongoose.mongo.ObjectId(n) : x; }
    if (Array.isArray(x)) return x.map((v) => cambiarIds(v, mapa));
    if (x && typeof x === "object" && x.constructor === Object) {
        const r = {};
        for (const [k, v] of Object.entries(x)) r[texto(k)] = cambiarIds(v, mapa);
        return r;
    }
    return x;                                    // numeros, fechas, binarios...
}

function leerJson(entradas, nombre) {
    const e = entradas.find((x) => x.nombre === nombre);
    if (!e) throw Object.assign(new Error(`al respaldo le falta ${nombre}`), {status: 400});
    try { return EJSON.parse(e.datos.toString("utf8")); }
    catch (err) { throw Object.assign(new Error(`${nombre} no es JSON valido: ${err.message}`), {status: 400}); }
}

async function nombreLibre(usuario_id, nombre) {
    const col = db().collection("proyectos");
    for (let i = 1; ; i++) {
        const n = i === 1 ? nombre : `${nombre} (importado${i > 2 ? " " + (i - 1) : ""})`;
        if (!(await col.findOne({nombre_verificador: `${usuario_id}.${n}`}))) return n;
    }
}

async function importarProyecto(entradas, usuario_id) {
    const manifiesto = leerJson(entradas, "manifiesto.json");
    if (manifiesto.formato !== FORMATO) throw Object.assign(new Error("el .zip no es un respaldo de proyecto de este editor"), {status: 400});
    if (!(manifiesto.version <= VERSION)) throw Object.assign(new Error(`respaldo de una version mas nueva (${manifiesto.version}); actualiza el editor`), {status: 400});

    const proyecto = leerJson(entradas, "datos/proyecto.json");
    const datos = {};
    for (const k of ["animaciones", "eventos", "versiones", "sonidos"]) datos[k] = leerJson(entradas, `datos/${k}.json`);
    const pidViejo = String(proyecto._id), uidViejo = String(proyecto.usuario_id);

    // coherencia: todo pertenece al proyecto del respaldo
    for (const k of ["animaciones", "eventos", "sonidos"]) {
        if (!Array.isArray(datos[k])) throw Object.assign(new Error(`datos/${k}.json no es una lista`), {status: 400});
        const ajeno = datos[k].find((d) => String(d.id_proyecto) !== pidViejo);
        if (ajeno) throw Object.assign(new Error(`datos/${k}.json tiene un documento de otro proyecto`), {status: 400});
    }
    const idsEventos = new Set(datos.eventos.map((e) => String(e._id)));
    datos.versiones = (datos.versiones || []).filter((v) => idsEventos.has(String(v.id_eventos)));

    // ids nuevos
    const mapa = new Map();
    const nuevo = () => new mongoose.mongo.ObjectId().toHexString();
    mapa.set(pidViejo, nuevo());
    if (uidViejo !== String(usuario_id)) mapa.set(uidViejo, String(usuario_id));
    for (const k of Object.keys(datos)) for (const d of datos[k]) mapa.set(String(d._id), nuevo());
    // capitulos (planeacion_organizacion.md): ids nuevos; las escenas los nombran en organizacion.capitulo
    for (const c of proyecto.capitulos || []) if (c && c._id) mapa.set(String(c._id), nuevo());
    const pid = mapa.get(pidViejo);

    // referencias a documentos que no vienen en el respaldo (instancias de otro proyecto)
    const externas = new Set();
    for (const e of datos.eventos) for (const g of e.grupos_figuras || []) {
        const r = g.instancia && g.instancia.id_eventos && String(g.instancia.id_eventos);
        if (r && !mapa.has(r)) externas.add(r);
    }

    const nombre = await nombreLibre(String(usuario_id), proyecto.nombre);
    const docProyecto = {...cambiarIds(proyecto, mapa), nombre, nombre_verificador: `${usuario_id}.${nombre}`,
        usuario_id: String(usuario_id), fecha_actualizacion: new Date()};
    const docs = Object.fromEntries(Object.entries(datos).map(([k, v]) => [k, v.map((d) => cambiarIds(d, mapa))]));
    for (const s of docs.sonidos) s.creado_por_llave = null;
    for (const e of docs.eventos) if (e.creado_por_llave) e.creado_por_llave = null;

    // archivos: misma ruta relativa dentro de la carpeta del proyecto nuevo (con ids cambiados)
    const carpeta = carpetaProyecto(usuario_id, pid);
    const archivos = [];
    for (const e of entradas) {
        if (!e.nombre.startsWith("archivos/")) continue;
        const rel = cambiarIds(e.nombre.slice("archivos/".length), mapa);
        const destino = path.resolve(carpeta, rel);
        if (!rel || rel.split("/").includes("..") || !destino.startsWith(carpeta + path.sep)) {
            throw Object.assign(new Error(`ruta de archivo no permitida en el respaldo: ${e.nombre}`), {status: 400});
        }
        archivos.push([destino, e.datos]);
    }

    const insertados = [];
    try {
        for (const [destino, contenido] of archivos) {
            fs.mkdirSync(path.dirname(destino), {recursive: true});
            fs.writeFileSync(destino, contenido);
        }
        await db().collection("proyectos").insertOne(docProyecto);
        insertados.push(["proyectos", {_id: docProyecto._id}]);
        for (const [clave, col] of [["animaciones", "animacions"], ["eventos", "eventos"], ["versiones", "versiones_eventos"], ["sonidos", "sonidos"]]) {
            if (!docs[clave].length) continue;
            await db().collection(col).insertMany(docs[clave], {ordered: true});
            insertados.push([col, {_id: {$in: docs[clave].map((d) => d._id)}}]);
        }
    } catch (err) {
        // deshacer: nada a medias
        for (const [col, filtro] of insertados) await db().collection(col).deleteMany(filtro).catch(() => null);
        fs.rmSync(carpeta, {recursive: true, force: true});
        throw err;
    }
    return {
        _id: pid, nombre, renombrado: nombre !== proyecto.nombre,
        conteos: Object.fromEntries(Object.entries(docs).map(([k, v]) => [k, v.length])),
        archivos: archivos.length,
        avisos: externas.size ? [`${externas.size} instancia(s) apuntan a assets de otro proyecto que no vienen en el respaldo`] : [],
    };
}

// Un zip de un proyecto, o de varios (proyectos/*.zip)
async function importar(buffer, usuario_id) {
    const entradas = leerZip(buffer);
    const m = entradas.find((e) => e.nombre === "manifiesto.json");
    if (!m) throw Object.assign(new Error("el .zip no tiene manifiesto.json: no es un respaldo de este editor"), {status: 400});
    let formato;
    try { formato = JSON.parse(m.datos.toString("utf8")).formato; } catch (e) { formato = null; }
    if (formato === FORMATO_VARIOS) {
        const r = [];
        for (const e of entradas.filter((x) => /^proyectos\/[^/]+\.zip$/.test(x.nombre))) {
            try { r.push(await importarProyecto(leerZip(e.datos), usuario_id)); }
            catch (err) { r.push({archivo: e.nombre, error: err.message}); }
        }
        return r;
    }
    return [await importarProyecto(entradas, usuario_id)];
}

module.exports = {exportarProyecto, exportarTodos, importar, cambiarIds, FORMATO, VERSION};
