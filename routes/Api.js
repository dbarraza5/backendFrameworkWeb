

const mongoose = require("mongoose");

const express = require("express");
const Proyecto = require("../modelo/Proyecto")
const multer = require("multer");
const {Animacion} = require("../modelo/Animacion");

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
    const nombres = update.grupos_figuras.map((grupo) => grupo.nombre);

    if (new Set(nombres).size !== nombres.length) {
        return res.status(500).send({"error": 'No se permiten objetos con el mismo valor en el atributo nombre'})
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
const {subirImagen} = require("../controller/ImagenAnimacion");

router_api.put("/animacion/agregar-imagen/:id_animacion", subirImagen.single('image'), (async (req, res)=>{
    const id_animacion = req.params.id_animacion;
    const filter = { '_id': id_animacion };
    const update = {...req.body}
    // Aquí puedes obtener los detalles de la imagen

    const animacion_ = await Animacion.findOne({ '_id': id_animacion }).exec();
    const dimensions = sizeOf(req.file.path);
    const imagen_ = {
        nombre: req.file.originalname,
        tamaño: req.file.size, // Tamaño en bytes
        tipo: req.file.mimetype, // Tipo MIME del archivo
        ruta: req.file.path, // Ruta donde se guarda el archivo
        ancho: dimensions.width, // Ancho de la imagen en píxelesewr
        alto: dimensions.height, // Alto de la imagen en píxeles
        path: req.params.path_imagen,
        id_imagen: req.params.id_imagen,
        animacion: animacion_,
    };

    console.log("numero de imagenes: "+animacion_.lista_imagenes.length)
    const idImagenObjId = mongoose.Types.ObjectId(req.params.id_imagen);
    animacion_.lista_imagenes = animacion_.lista_imagenes.map((img)=>{
        if(idImagenObjId.equals(img._id)){
            console.log("actualiza la imagen");
            img.ancho = dimensions.width;
            img.alto = dimensions.height;
            img.ancho_original = dimensions.width;
            img.alto_original = dimensions.height;
        }
        return img;
    });

    //animacion_.lista_imagenes = [];
    await animacion_.save();

    // Devolver los detalles de la imagen en la respuesta
    res.json(imagen_);
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


module.exports = router_api