

const mongoose = require("mongoose");

const express = require("express");
const Proyecto = require("../modelo/Proyecto")
const multer = require("multer");
const {Animacion} = require("../modelo/Animacion");
const {Eventos} = require("../modelo/Eventos");
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
                const animaciones_raw = await Animacion.find({ id_proyecto: proyecto._id }).exec();

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


router_api.post("/animacion", async (req, res) => {
    try {
        const { id_proyecto, nombre, descripcion } = req.body;

        const data_animacion = crear_animacion(id_proyecto, null, nombre, true, descripcion);
        const animacion = await Animacion.create(data_animacion);

        // 201 Created + JSON con el id en string
        return res.status(201).json({ id: animacion._id.toString() });
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

router_api.get("/evento/id/:id_evento", (req, res)=>{

    const id_evento = req.params.id_evento;

    Eventos.findOne({ '_id': id_evento},function (err, pro) {
        if (err ){
            return res.status(500).send({"error": err.message})
        }
        if(pro==null){
            return res.status(404).send({"error": "evento no encontrada"})
        }
        res.json(pro)
    });

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


module.exports = router_api