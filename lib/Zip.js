// Zip minimo sin dependencias (respaldo de proyectos): escribir y leer archivos .zip
// con metodo 0 (sin comprimir) u 8 (deflate). Sin zip64: hasta 4 GB y 65535 archivos.
const zlib = require("node:zlib");

const TABLA = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c >>> 0;
    }
    return t;
})();

function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = TABLA[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

function fechaDos(d) {
    const hora = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const dia = ((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    return {hora, dia};
}

// entradas: [{nombre, datos: Buffer|string, comprimir?: bool}]  ->  Buffer
function crearZip(entradas, fecha = new Date()) {
    const {hora, dia} = fechaDos(fecha);
    const partes = [], central = [];
    let offset = 0;
    for (const e of entradas) {
        const datos = Buffer.isBuffer(e.datos) ? e.datos : Buffer.from(String(e.datos), "utf8");
        const nombre = Buffer.from(e.nombre, "utf8");
        const crc = crc32(datos);
        let metodo = 0, cuerpo = datos;
        if (e.comprimir !== false && datos.length > 64) {
            const d = zlib.deflateRawSync(datos, {level: 6});
            if (d.length < datos.length) { metodo = 8; cuerpo = d; }
        }
        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6);
        local.writeUInt16LE(metodo, 8); local.writeUInt16LE(hora, 10); local.writeUInt16LE(dia, 12);
        local.writeUInt32LE(crc, 14); local.writeUInt32LE(cuerpo.length, 18); local.writeUInt32LE(datos.length, 22);
        local.writeUInt16LE(nombre.length, 26); local.writeUInt16LE(0, 28);
        const c = Buffer.alloc(46);
        c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8);
        c.writeUInt16LE(metodo, 10); c.writeUInt16LE(hora, 12); c.writeUInt16LE(dia, 14);
        c.writeUInt32LE(crc, 16); c.writeUInt32LE(cuerpo.length, 20); c.writeUInt32LE(datos.length, 24);
        c.writeUInt16LE(nombre.length, 28); c.writeUInt32LE(offset, 42);
        partes.push(local, nombre, cuerpo);
        central.push(c, nombre);
        offset += 30 + nombre.length + cuerpo.length;
    }
    const tamCentral = central.reduce((s, b) => s + b.length, 0);
    const fin = Buffer.alloc(22);
    fin.writeUInt32LE(0x06054b50, 0); fin.writeUInt16LE(entradas.length, 8); fin.writeUInt16LE(entradas.length, 10);
    fin.writeUInt32LE(tamCentral, 12); fin.writeUInt32LE(offset, 16);
    return Buffer.concat([...partes, ...central, fin]);
}

// Buffer -> [{nombre, datos: Buffer}]   (maxTotal: limite de bytes descomprimidos)
function leerZip(buf, {maxTotal = 2 * 1024 * 1024 * 1024} = {}) {
    let eocd = -1;
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
        if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error("no es un archivo .zip valido");
    const cantidad = buf.readUInt16LE(eocd + 10);
    let p = buf.readUInt32LE(eocd + 16);
    const r = [];
    let total = 0;
    for (let k = 0; k < cantidad; k++) {
        if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("zip danado (directorio central)");
        const metodo = buf.readUInt16LE(p + 10), crc = buf.readUInt32LE(p + 16);
        const tamC = buf.readUInt32LE(p + 20), tam = buf.readUInt32LE(p + 24);
        const ln = buf.readUInt16LE(p + 28), le = buf.readUInt16LE(p + 30), lc = buf.readUInt16LE(p + 32);
        const local = buf.readUInt32LE(p + 42);
        const nombre = buf.slice(p + 46, p + 46 + ln).toString("utf8");
        p += 46 + ln + le + lc;
        if (nombre.endsWith("/")) continue;                 // carpeta
        if (buf.readUInt32LE(local) !== 0x04034b50) throw new Error(`zip danado (${nombre})`);
        const ini = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
        const cuerpo = buf.slice(ini, ini + tamC);
        total += tam;
        if (total > maxTotal) throw new Error("el contenido del zip es demasiado grande");
        let datos;
        if (metodo === 0) datos = Buffer.from(cuerpo);
        else if (metodo === 8) datos = zlib.inflateRawSync(cuerpo, {maxOutputLength: Math.max(1, tam)});
        else throw new Error(`metodo de compresion no soportado en ${nombre}`);
        if (datos.length !== tam || crc32(datos) !== crc) throw new Error(`zip danado: ${nombre} no coincide`);
        r.push({nombre, datos});
    }
    return r;
}

module.exports = {crearZip, leerZip, crc32};
