

const mongoose = require("mongoose");

const express = require("express");
const Proyecto = require("../modelo/Proyecto")
const multer = require("multer");
const {Animacion} = require("../modelo/Animacion");
const {Eventos} = require("../modelo/Eventos");
const {VersionEventos} = require("../modelo/VersionEventos");
const {subirImagen} = require("../controller/ImagenAnimacion");
const router_api = express.Router();



router_api.get("/proyecto/id/:id_proyecto", (req, res)=>{
    const id_proyecto = req.params.id_proyecto;
    Proyecto.findOne({ 'id_proyecto': id_proyecto},function (err, pro) {
        if (err){
            return res.status(500).send({"error": err.message})
        }
        res.json(pro)
    });
});

const { check, validationResult  } = require('express-validator')

const reglas =[check("nombre")
        .optional()
        .isLength({ min: 3 , max:20})
        .withMessage("the name must have minimum length of 3 and max 20")
        .trim(),]

router_api.post("/proyecto",reglas, ((req, res)=>{
    const error = validationResult(req).formatWith(({ msg }) => msg);
    const hasError = !error.isEmpty();

    if (hasError) {
        res.status(422).json({ error: error.array() });
    } else {
        const usuario_id = req.session.user.id
        const datos={
            ...req.body,
            usuario_id: usuario_id
        }
        const proyecto = new Proyecto(datos)
        proyecto.save((error, resultado) => {
            if(error){
                res.status(500).send({"error": error.message})
            }else{
                res.send(resultado)
            }
        })
    }
}));


router_api.put("/proyecto/id/:id_proyecto",reglas, ((req, res)=>{

    const error = validationResult(req).formatWith(({ msg }) => msg);

    const hasError = !error.isEmpty();

    if (hasError) {
        res.status(422).json({ error: error.array() });
    } else {
        const id_proyecto = req.params.id_proyecto;
        const filter = { '_id': id_proyecto };
        const update = {...req.body}

        const doc =  Proyecto.findOneAndUpdate(filter, update, { returnDocument:"after" },function( error, result){
            if(error)
            {
                return res.status(500).json({"error": error.message})
            }else{
                return res.json(result)
            }
        })
    }
}));

router_api.delete("/proyecto/id/:id_proyecto", ((req, res)=>{
        const usuario_id = req.session.user.id;
        const id_proyecto = req.params.id_proyecto;
        const filter = { '_id': id_proyecto, usuario_id:  usuario_id};

        const doc =  Proyecto.deleteOne(filter,function( error, result){
            if(error)
            {
                return res.status(500).json({"error": error.message})
            }else{
                return res.json(result)
            }
        })

}));

router_api.get("/proyecto/user/:id_usuario", (req, res)=>{
    const id_usuario = req.params.id_usuario;
    //console.log("[Cookie]")
    //console.log(req.cookies)
    const lista = Proyecto.find({'usuario_id':id_usuario },function (err, pro) {
        if (err){
            return res.status(500).send({"error": err.message})
        }
        return res.json(pro)
    });

});


router_api.get("/proyecto-animacion/:id_usuario", async (req, res) => {
    try {
        const { id_usuario } = req.params;

        // 1) Traer proyectos del usuario
        const proyectos = await Proyecto.find({ usuario_id: id_usuario }).exec();

        // 2) Para cada proyecto, traer sus animaciones
        const lista_animaciones_proyectos = await Promise.all(
            proyectos.map(async (proyecto) => {
                // solo los campos que se devuelven: traer grupos_figuras de todos los dibujos tardaba ~12 s
                // y bloqueaba el servidor (todas las demas peticiones esperaban detras)
                const animaciones_raw = await Animacion.find({ id_proyecto: proyecto._id })
                    .select("nombre_proyecto nombre_animacion fecha_actualizacion fecha_creacion").lean();

                const animaciones = animaciones_raw.map((animacion)=>{
                    return {
                        //"id_proyecto": animacion.id_proyecto,
                        "nombre_proyecto": animacion.nombre_proyecto,
                        "id_animacion": animacion._id,
                        "nombre_animacion": animacion.nombre_animacion,
                        //"grupos_figuras": animacion.grupos_figuras,
                        "fecha_actualizacion": animacion.fecha_actualizacion,
                        "fecha_creacion": animacion.fecha_creacion,
                    };
                });
                return {
                    id_proyecto: proyecto._id,
                    nombre_proyecto: proyecto.nombre, // opcional: agregar más campos
                    animaciones,
                };
            })
        );

        // 3) Enviar la respuesta ya resuelta
        return res.json(lista_animaciones_proyectos);
    } catch (err) {
        console.error("Error en /proyecto-animacion:", err);
        return res.status(500).json({ error: err.message });
    }
});

router_api.post("/animaciones/lista", async (req, res) => {
    try {
        const { ids } = req.body; // espera algo como { "ids": ["id1", "id2", "id3"] }

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: "Debes enviar un array de IDs" });
        }

        const animaciones = await Animacion.find({ _id: { $in: ids } },
            { grupos_figuras: 1, _id: 1, nombre_animacion: 1 } );

        if (!animaciones || animaciones.length === 0) {
            return res.status(404).json({ error: "No se encontraron animaciones con esos IDs" });
        }

        return res.json(animaciones);
    } catch (error) {
        console.error("Error al recuperar animaciones:", error);
        return res.status(500).json({ error: error.message });
    }
});

router_api.get("/animacion/id/:id_animacion", (req, res)=>{

    const id_animacion = req.params.id_animacion;

    Animacion.findOne({ '_id': id_animacion},function (err, pro) {
        if (err ){
            return res.status(500).send({"error": err.message})
        }
        if(pro==null){
            return res.status(404).send({"error": "Animacion no encontrada"})
        }
        res.json(pro)
    });

});

router_api.put("/animacion/id/:id_animacion", ((req, res)=>{
    const id_animacion = req.params.id_animacion;
    const filter = { '_id': id_animacion };
    const update = {...req.body}
    const opciones = {
        new: true, // Devuelve el documento actualizado
        runValidators: true // Habilita la validación
    };

    if(update.grupos_figuras){
        const nombres = update.grupos_figuras.map((grupo) => grupo.nombre);

        if (new Set(nombres).size !== nombres.length) {
            return res.status(500).send({"error": 'No se permiten objetos con el mismo valor en el atributo nombre'})
        }
    }

    const doc =  Animacion.findOneAndUpdate(filter, update, opciones, function( error, result){
        if(error)
        {
            return res.status(500).send({"error": error.message})
        }else{
            return res.send(result)
        }
    })
}));

router_api.delete("/animacion/id/:id_animacion", (req, res) => {
    const id_animacion = req.params.id_animacion;

    Animacion.findByIdAndDelete(id_animacion, (error, result) => {
        if (error) {
            return res.status(500).send({ "error": error.message });
        }

        if (!result) {
            return res.status(404).send({ "error": "Animación no encontrada" });
        }

        return res.send({
            message: "Animación eliminada correctamente",
            id: result._id
        });
    });
});


router_api.post("/animacion", async (req, res) => {
    try {
        const { id_proyecto, nombre, descripcion } = req.body;

        const data_animacion = crear_animacion(id_proyecto, null, nombre, true, descripcion);
        const animacion = await Animacion.create(data_animacion);

        // 201 Created + JSON con el id en string
        return res.status(201).json(animacion);//json({ id: animacion._id.toString() });
        // Alternativa: res.status(201).json({ id: animacion.id }); // 'id' es el virtual string de Mongoose
    } catch (err) {
        console.error("Error al crear animación:", err);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
});

router_api.get('/imagen/:nombreImagen', (req, res) => {
    const nombreImagen = req.params.nombreImagen;
    const arreglo = nombreImagen.split("_");
    const id_usuario=arreglo[0];
    const id_proyecto=arreglo[1];
    const id_animacion=arreglo[2];
    const nombre_archivo = arreglo[3];
    const path_ = '/home/app/storage/usuarios/'+id_usuario
    +'/proyectos/'+id_proyecto+'/animaciones/'+id_animacion+'/'+nombre_archivo;
    //res.json({path: path_})
    res.sendFile(path_);
    //res.sendFile(`${__dirname}/public/${nombreImagen}`);
});

const sizeOf = require('image-size');
const {crear_animacion} = require("../modelo/Animacion");


/*const imagen_ = {
        nombre: req.file.originalname,
        tamaño: req.file.size, // Tamaño en bytes
        tipo: req.file.mimetype, // Tipo MIME del archivo
        ruta: req.file.path, // Ruta donde se guarda el archivodf
        ancho: dimensions.width, // Ancho de la imagen en píxelesewr
        alto: dimensions.height, // Alto de la imagen en píxeles
        path: req.params.path_imagen,
        id_imagen: req.params.id_imagen,
        animacion: animacion_,
    };*/

const uploadSingleImage = subirImagen.single('image');


router_api.put("/animacion/agregar-imagen/:id_animacion", (req, res) => {
    uploadSingleImage(req, res, async function (err) {
        try {
            if (err) {
                return res.status(400).send({ message: err.message});
            }

            // Everything went fine with Multer, continue with your logic
            const id_animacion = req.params.id_animacion;
            const animacion_ = await Animacion.findOne({ '_id': id_animacion }).exec();

            if (!animacion_) {
                return res.status(404).json({ message: 'No se encontró la animación' });
            }

            // Aquí puedes obtener los detalles de la imagen subida
            const dimensions = sizeOf(req.file.path);

            const idImagenObjId = mongoose.Types.ObjectId(req.params.id_imagen);
            let imagen_subida = null;

            // Actualizar la lista de imágenes de la animación
            animacion_.lista_imagenes = animacion_.lista_imagenes.map((img) => {
                if (idImagenObjId.equals(img._id)) {
                    console.log("actualiza la imagen");
                    img.ancho = dimensions.width;
                    img.alto = dimensions.height;
                    img.ancho_original = dimensions.width;
                    img.alto_original = dimensions.height;
                    imagen_subida = img.toObject();
                }
                return img;
            });
            await animacion_.save();

            // Devolver los detalles de la imagen actualizada en la respuesta
            res.json(imagen_subida);
        } catch (error) {
            console.error('Error en la carga de imagen o en la actualización:', error);
            res.status(500).json({ message: 'Error en el servidor al procesar la solicitud' });
        }
    });
});

router_api.put("/animacion/actualizar-imagen/:id_animacion", (async (req, res)=>{
    try{
        const id_animacion = req.params.id_animacion;
        const update = {...req.body};
        // Aquí puedes obtener los detalles de la imagen

        const animacion_ = await Animacion.findOne({ '_id': id_animacion }).exec();

        //res.json(req.body);
        //return res.send(animacion_)

        let imagen_subida = null;
        const idImagenObjId = mongoose.Types.ObjectId(update._id);
        animacion_.lista_imagenes = animacion_.lista_imagenes.map((img)=>{
            if(idImagenObjId.equals(img._id)){
                console.log("actualiza la imagen");
                //img.path =
                img.x = update.x;
                img.y = update.y;
                img.ancho = update.ancho;
                img.alto = update.alto;
                img.opacidad = update.opacidad;
                img.visible = update.visible;
                imagen_subida = img;
            }
            return img;
        });
        //animacion_.lista_imagenes = [];
        await animacion_.save();

        // Devolver los detalles de la imagen en la respuesta
        res.json(imagen_subida);
    } catch (error) {
        console.error('Error en actualizar de imagen:', error);
        res.status(500).json({ message: 'Error en el servidor al procesar la solicitud' });
    }
}));

router_api.get("/animacion/eliminar-imagen/:id_animacion/:id_imagen", (async (req, res)=>{
    try{
        const id_animacion = req.params.id_animacion;
        const id_imagen = req.params.id_imagen;
        // Aquí puedes obtener los detalles de la imagen

        const animacion_ = await Animacion.findOne({ '_id': id_animacion }).exec();

        let imagen_subida = null;
        const idImagenObjId = mongoose.Types.ObjectId(id_imagen);
        animacion_.lista_imagenes = animacion_.lista_imagenes.filter((img)=>{
            return !idImagenObjId.equals(img._id);
        });
        //animacion_.lista_imagenes = [];
        await animacion_.save();

        // Devolver los detalles de la imagen en la respuesta
        res.json(animacion_.lista_imagenes);
    } catch (error) {
        console.error('Error en actualizar de imagen:', error);
        res.status(500).json({ message: 'Error en el servidor al procesar la solicitud' });
    }
}));

router_api.get("/animacion/proyecto/:id_proyecto", (req, res)=>{
    const id_proyecto = req.params.id_proyecto;
    Animacion.find({ 'id_proyecto': id_proyecto},function (err, pro) {
        if (err){
            return res.status(500).send({"error": err.message})
        }
        res.json(pro)
    });
});


router_api.get("/animacion/proyecto-slim/:id_proyecto", (req, res)=>{
    const id_proyecto = req.params.id_proyecto;
    Animacion.find({ 'id_proyecto': id_proyecto},function (err, pro) {
        if (err){
            return res.status(500).send({"error": err.message})
        }
        res.json(pro)
    }).select(["_id", "nombre_animacion", "raiz", "id_copia_consolidado", "consolidado", "fecha_actualizacion", "fecha_creacion"]);
});


router_api.get("/eventos/proyecto-slim/:id_proyecto", (req, res)=>{
    const id_proyecto = req.params.id_proyecto;
    Eventos.find({ 'id_proyecto': id_proyecto},function (err, pro) {
        if (err){
            return res.status(500).send({"error": err.message})
        }
        res.json(pro)
    }).select(["_id", "nombre", "fecha_actualizacion", "fecha_creacion"]);
});

// Documento plano (lean): armar un documento Mongoose de un asset grande (~2 MB) costaba ~0.9 s de CPU
// y frenaba al resto de las peticiones. normalizarEvento deja la respuesta igual a la de antes
// (Mongoose omite los objetos vacios y rellena creado_por_llave con null).
function normalizarEvento(doc) {
    for (const k of ["escena", "organizacion"]) {
        if (doc[k] && typeof doc[k] === "object" && !Array.isArray(doc[k]) && Object.keys(doc[k]).length === 0) delete doc[k];
    }
    if (doc.creado_por_llave === undefined) doc.creado_por_llave = null;
    return doc;
}
router_api.get("/evento/id/:id_evento", async (req, res)=>{
    try {
        const pro = await Eventos.findOne({ '_id': req.params.id_evento }).lean();
        if (pro == null) return res.status(404).send({"error": "evento no encontrada"});
        res.json(normalizarEvento(pro));
    } catch (err) {
        return res.status(500).send({"error": err.message});
    }
});

router_api.put("/evento/id/:id_evento", ((req, res)=>{
    const id_evento = req.params.id_evento;
    const filter = { '_id': id_evento };
    const update = {...req.body}
    const opciones = {
        new: true, // Devuelve el documento actualizado
        runValidators: true // Habilita la validación
    };
    // const nombres = update.grupos_figuras.map((grupo) => grupo.nombre);
    //
    // if (new Set(nombres).size !== nombres.length) {
    //     return res.status(500).send({"error": 'No se permiten objetos con el mismo valor en el atributo nombre'})
    // }

    const doc =  Eventos.findOneAndUpdate(filter, update, opciones, function( error, result){
        if(error)
        {
            return res.status(500).send({"error": error.message})
        }else{
            return res.send(result)
        }
    })
}));


// ---- Llaves de autoria asistida (Fase A2): las administra el dueno del proyecto ----
const {LlaveAutoria, hashLlave, generarLlave} = require("../modelo/LlaveAutoria");

async function proyectoDelUsuario(req, res) {
    const id = req.params.id_proyecto;
    if (!mongoose.Types.ObjectId.isValid(id)) { res.status(400).send({"error": "id de proyecto invalido"}); return null; }
    const p = await Proyecto.findById(id).select(["_id", "usuario_id", "nombre"]);
    if (!p) { res.status(404).send({"error": "proyecto no encontrado"}); return null; }
    if (String(p.usuario_id) !== String(req.session.user.id)) { res.status(403).send({"error": "el proyecto no es tuyo"}); return null; }
    return p;
}

router_api.get("/proyecto/:id_proyecto/llaves", async (req, res) => {
    try {
        const p = await proyectoDelUsuario(req, res);
        if (!p) return;
        const llaves = await LlaveAutoria.find({id_proyecto: String(p._id)}).select("-hash").sort({creada: -1});
        res.json(llaves);
    } catch (err) { res.status(500).send({"error": err.message}); }
});

// Crea una llave. La llave completa se devuelve UNA sola vez (solo se guarda su hash).
router_api.post("/proyecto/:id_proyecto/llaves", async (req, res) => {
    try {
        const p = await proyectoDelUsuario(req, res);
        if (!p) return;
        const llave = generarLlave();
        const doc = await LlaveAutoria.create({id_proyecto: String(p._id), nombre: String((req.body && req.body.nombre) || "Asistente").trim() || "Asistente",
            prefijo: llave.slice(0, 13), hash: hashLlave(llave)});
        res.status(201).json({_id: doc._id, nombre: doc.nombre, prefijo: doc.prefijo, creada: doc.creada, llave});
    } catch (err) { res.status(500).send({"error": err.message}); }
});

router_api.delete("/proyecto/:id_proyecto/llaves/:id_llave", async (req, res) => {
    try {
        const p = await proyectoDelUsuario(req, res);
        if (!p) return;
        const r = await LlaveAutoria.findOneAndUpdate({_id: req.params.id_llave, id_proyecto: String(p._id), revocada: null},
            {$set: {revocada: new Date()}}, {new: true}).select("-hash");
        if (!r) return res.status(404).send({"error": "llave no encontrada o ya revocada"});
        res.json(r);
    } catch (err) { res.status(500).send({"error": err.message}); }
});

// ---- Crear un asset desde el editor (Fase A5: Biblioteca -> Generar...) ----
// Body: lo compilado del formato simple {nombre, grupos_figuras, eventos, escena}.
// Crea el dibujo + el documento de eventos, igual que POST /autoria/assets.
router_api.post("/proyecto/:id_proyecto/assets", async (req, res) => {
    try {
        const p = await proyectoDelUsuario(req, res);
        if (!p) return;
        const {crearAsset} = require("../controller/AutoriaComun");
        const r = await crearAsset(String(p._id), req.body);
        res.status(r.status).json(r.body);
    } catch (err) { res.status(500).send({ok: false, errores: [err.message]}); }
});

// ---- Crear un documento de Eventos ("Guardar como" del editor) ----
// Body: {id_proyecto, nombre, eventos, grupos_figuras, meta_figuras?, escena?}
router_api.post("/eventos", async (req, res) => {
    try {
        const b = req.body || {};
        if (!b.id_proyecto || !String(b.nombre || "").trim()) {
            return res.status(400).send({"error": "Faltan id_proyecto o nombre"});
        }
        const proyecto = await Proyecto.findById(b.id_proyecto).select("_id");
        if (!proyecto) return res.status(404).send({"error": "proyecto no encontrado"});
        const doc = await Eventos.create({
            id_proyecto: String(b.id_proyecto), nombre: String(b.nombre).trim(),
            eventos: Array.isArray(b.eventos) ? b.eventos : [],
            grupos_figuras: Array.isArray(b.grupos_figuras) ? b.grupos_figuras : [],
            meta_figuras: Array.isArray(b.meta_figuras) ? b.meta_figuras : [],
            escena: b.escena || {},
        });
        res.status(201).json({_id: doc._id, nombre: doc.nombre, id_proyecto: doc.id_proyecto});
    } catch (err) {
        res.status(500).send({"error": err.message});
    }
});

// ---- Versiones congeladas de un documento de Eventos (Fase 6C) ----

// Lista liviana de las versiones de un documento (la mas nueva primero).
router_api.get("/evento/id/:id_evento/versiones", async (req, res) => {
    try {
        const lista = await VersionEventos.find({id_eventos: req.params.id_evento})
            .select(["_id", "id_eventos", "numero", "descripcion", "fecha_creacion"])
            .sort({numero: -1});
        res.json(lista);
    } catch (err) {
        res.status(500).send({"error": err.message});
    }
});

// Toma una foto del estado actual (guardado) del documento como version nueva.
router_api.post("/evento/id/:id_evento/versiones", async (req, res) => {
    try {
        const doc = await Eventos.findById(req.params.id_evento).lean();
        if (!doc) return res.status(404).send({"error": "evento no encontrado"});
        const ultima = await VersionEventos.findOne({id_eventos: String(doc._id)}).sort({numero: -1}).select("numero");
        const version = await VersionEventos.create({
            id_eventos: String(doc._id),
            numero: (ultima ? ultima.numero : 0) + 1,
            descripcion: String((req.body && req.body.descripcion) || ""),
            contenido: doc,
        });
        res.status(201).json({_id: version._id, id_eventos: version.id_eventos, numero: version.numero,
            descripcion: version.descripcion, fecha_creacion: version.fecha_creacion});
    } catch (err) {
        res.status(500).send({"error": err.message});
    }
});

// Documento de una version, con la misma forma que GET /evento/id/:id (mas `version`).
router_api.get("/evento/version/:id_version", async (req, res) => {
    try {
        const v = await VersionEventos.findById(req.params.id_version).lean();
        if (!v) return res.status(404).send({"error": "version no encontrada"});
        res.json({...v.contenido, _id: v.id_eventos,
            version: {_id: v._id, numero: v.numero, descripcion: v.descripcion, fecha_creacion: v.fecha_creacion}});
    } catch (err) {
        res.status(500).send({"error": err.message});
    }
});


module.exports = router_api