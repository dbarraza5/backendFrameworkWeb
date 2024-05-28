const mongoose = require("mongoose");

const multer = require("multer");




const fs = require('node:fs');
const sizeOf = require('image-size');
const {Animacion} = require("../modelo/Animacion");
const Proyecto = require("../modelo/Proyecto")

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

function obtenerExtension(nombreArchivo) {
    const partes = nombreArchivo.split('.');
    if (partes.length === 1 || (partes[0] === '' && partes.length === 2)) {
        return '';
    }
    return partes.pop().toLowerCase();
}

const storage = multer.diskStorage({
    destination: async function (req, file, cb) {
        const id_animacion = req.params.id_animacion;
        const animacion_ = await Animacion.findOne({ '_id': id_animacion }).exec();
        if (!animacion_) {
            return cb(new Error('No se encontró la animación'), '/home/app/storage/uploads/');
        }
        console.log(animacion_);
        if (animacion_){
            const proyecto_ = await Proyecto.findOne({ '_id': animacion_.id_proyecto }).exec();
            const path_ = '/home/app/storage/usuarios/'+proyecto_.usuario_id
                +'/proyectos/'+animacion_.id_proyecto+'/animaciones/'+animacion_._id;
            crearCarpetas(path_);
            // Generar manualmente el _idsa
            const ext_ = obtenerExtension(file.originalname);
            const nuevoIdImagen = mongoose.Types.ObjectId();
            const url_ = `${proyecto_.usuario_id}_${animacion_.id_proyecto}_${animacion_._id}_${nuevoIdImagen}.${ext_}`;
            const nuevaImagen = {
                _id: nuevoIdImagen,
                path: path_+'/'+nuevoIdImagen.toString()+'.'+ext_,
                url: url_,
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
        }else{
            cb(new Error('No se encontró la animación'), '/home/app/storage/uploads/'); // Devolver error y ruta de destino
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

const upload = multer({ storage: storage });

const subirImagen = upload;

module.exports = {subirImagen}
//export default subirImagen;