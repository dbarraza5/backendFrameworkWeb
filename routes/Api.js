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

// Configuración de multer para guardar archivos en una carpeta específica
const storage = multer.diskStorage({
    destination: async function (req, file, cb) {
        const id_animacion = req.params.id_animacion;
        const animacion_ = await Animacion.findOne({ '_id': id_animacion }).exec();
        if (animacion_){
            const proyecto_ = await Proyecto.findOne({ '_id': animacion_.id_proyecto }).exec();
            const path_ = '/home/app/storage/usuarios/'+proyecto_.usuario_id
                +'/proyectos/'+animacion_.id_proyecto+'/animaciones/'+animacion_._id;
            crearCarpetas(path_);
            // Generar manualmente el _id
            const nuevoIdImagen = mongoose.Types.ObjectId();
            const nuevaImagen = {
                _id: nuevoIdImagen,
                path: path_,
                nombre: file.originalname,
                x: 0,
                y: 0,
                ancho: 243,
                alto: 324,
                ancho_original: 122,//dimensions.width,
                alto_original: 123,//dimensions.height,
                visible: true
            };
            animacion_.lista_imagenes.push(nuevaImagen);
            await animacion_.save();
            console.log("id imagen: "+nuevoIdImagen);
            req.params.id_imagen = nuevoIdImagen;
            req.params.path_imagen = path_;
            cb(null, path_);
        }
        //cb(null, '/home/app/storage/uploads/'); // Ruta donde se guardarán los archivostyr
    },
    filename: function (req, file, cb) {
        if(req.params.id_imagen){
            const ext_ = obtenerExtension(file.originalname);
            cb(null, req.params.id_imagen.toString()+"."+ext_); // Nombre del archivo original
        }

    }
});

function obtenerExtension(nombreArchivo) {
    const partes = nombreArchivo.split('.');
    if (partes.length === 1 || (partes[0] === '' && partes.length === 2)) {
        return '';
    }
    return partes.pop().toLowerCase();
}

const upload = multer({ storage: storage });

const fs = require('node:fs');
const sizeOf = require('image-size');

function crearCarpetas(folderName){
    //const folderName = 'storage/uploads';
    try {
        if (!fs.existsSync(folderName)) {
            fs.mkdirSync(folderName, { recursive: true });
        }
    } catch (err) {
        console.error(err);
    }
}



router_api.put("/animacion/agregar-imagen/:id_animacion", upload.single('image'), (async (req, res)=>{
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